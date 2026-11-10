// How app data maps onto Firestore, and how cloud changes merge with edits made on the phone.
// Pure functions, so they are tested without Firebase (test/sync.test.mjs).
//
// Cloud layout:
//   users/{uid}                     everything except transactions ("meta")
//   users/{uid}/transactions/{id}   one document per transaction
//
// A "state" here is { meta: {...}, tx: { [id]: transaction } }.
// "base" is the last state known to be in the cloud. Comparing the phone's data with base
// tells us what was edited locally and still needs uploading.

export const EMPTY = Object.freeze({ meta: {}, tx: {} });

export function deepEqual(a, b) {
  if (a === b) return true;
  if (a == null || b == null || typeof a !== 'object' || typeof b !== 'object') return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  if (Array.isArray(a)) return a.length === b.length && a.every((v, i) => deepEqual(v, b[i]));
  const ka = Object.keys(a).filter((k) => a[k] !== undefined);
  const kb = Object.keys(b).filter((k) => b[k] !== undefined);
  return ka.length === kb.length && ka.every((k) => deepEqual(a[k], b[k]));
}

// Firestore rejects undefined values, so round trip through JSON to drop them.
const clean = (v) => JSON.parse(JSON.stringify(v));

export function splitData(data) {
  const { transactions, ...meta } = clean(data);
  const tx = {};
  for (const t of transactions) tx[t.id] = t;
  return { meta, tx };
}

export function joinData(state) {
  return { ...state.meta, transactions: Object.values(state.tx) };
}

export function hasData(state) {
  return Object.keys(state.meta).length > 0 || Object.keys(state.tx).length > 0;
}

// What to write so the cloud (base) matches the phone (local).
export function diff(base, local) {
  const upserts = [];
  const deletes = [];
  for (const [id, t] of Object.entries(local.tx)) if (!deepEqual(base.tx[id], t)) upserts.push(t);
  for (const id of Object.keys(base.tx)) if (!(id in local.tx)) deletes.push(id);
  const meta = deepEqual(base.meta, local.meta) ? null : local.meta;
  return { meta, upserts, deletes, empty: !meta && upserts.length === 0 && deletes.length === 0 };
}

// Three way merge: anything edited on the phone since base wins, everything else takes the cloud copy.
// Meta merges per top level key (budgets, settings, goals, ...), transactions per id.
function mergeMaps(local, base, remote) {
  const out = {};
  const keys = new Set([...Object.keys(local), ...Object.keys(base), ...Object.keys(remote)]);
  for (const k of keys) {
    const v = deepEqual(local[k], base[k]) ? remote[k] : local[k];
    if (v !== undefined) out[k] = v;
  }
  return out;
}

export function merge(local, base, remote) {
  return { meta: mergeMaps(local.meta, base.meta, remote.meta), tx: mergeMaps(local.tx, base.tx, remote.tx) };
}

// First sync on this phone for an account (no base yet): a cloud account that already has
// data wins; an empty account gets this phone's data uploaded.
export function firstSync(local, remote) {
  if (hasData(remote)) return { next: remote, base: remote };
  return { next: local, base: EMPTY };
}

// A write failed, so for everything in that write the cloud still holds what it held before
// (prev). Put those entries back into base; the next sync then sees them as still to upload,
// and a cloud update can no longer undo the edit on this phone.
export function unsend(base, prev, changes) {
  const tx = { ...base.tx };
  for (const id of [...changes.upserts.map((t) => t.id), ...changes.deletes]) {
    if (id in prev.tx) tx[id] = prev.tx[id]; else delete tx[id];
  }
  return { meta: changes.meta ? prev.meta : base.meta, tx };
}
