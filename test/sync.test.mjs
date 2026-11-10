// Run: npm test (or node test/sync.test.mjs)
import * as S from '../src/sync.js';
import assert from 'assert/strict';

const tx = (id, amount, extra = {}) => ({ id, date: '2026-10-01', category: 'Groceries', amount, store: '', ...extra });
const data = (txs, settings = { theme: 'system' }) => ({ version: 2, budgets: [{ category: 'Groceries', monthly: 100 }], settings, transactions: txs });

// split and join round trip, undefined dropped (Firestore rejects it)
const d = data([tx('a', 1, { notes: undefined }), tx('b', 2)]);
const st = S.splitData(d);
assert.deepEqual(Object.keys(st.tx).sort(), ['a', 'b']);
assert.equal('transactions' in st.meta, false);
assert.equal('notes' in st.tx.a, false);
assert.equal(S.joinData(st).transactions.length, 2);

// deepEqual ignores key order and undefined
assert.ok(S.deepEqual({ a: 1, b: { c: [1, 2] } }, { b: { c: [1, 2] }, a: 1, z: undefined }));
assert.ok(!S.deepEqual({ a: [1, 2] }, { a: [2, 1] }));

// diff: changed, added and removed transactions, and meta only when it changed
const base = S.splitData(data([tx('a', 1), tx('b', 2)]));
const local = S.splitData(data([tx('a', 5), tx('c', 3)]));
const ch = S.diff(base, local);
assert.deepEqual(ch.upserts.map((t) => t.id).sort(), ['a', 'c']);
assert.deepEqual(ch.deletes, ['b']);
assert.equal(ch.meta, null);
assert.equal(S.diff(base, base).empty, true);
const metaChanged = S.diff(base, S.splitData(data([tx('a', 1), tx('b', 2)], { theme: 'dark' })));
assert.equal(metaChanged.meta.settings.theme, 'dark');
assert.equal(metaChanged.upserts.length, 0);

// merge: local edits win, untouched items follow the cloud
{
  const b = S.splitData(data([tx('a', 1), tx('b', 2), tx('c', 3)]));
  const l = S.splitData(data([tx('a', 10), tx('b', 2), tx('c', 3), tx('new', 4)], { theme: 'system' })); // edited a, added new
  const r = S.splitData(data([tx('a', 1), tx('b', 20), tx('r', 7)], { theme: 'dark' })); // cloud edited b, deleted c, added r, changed theme
  const m = S.merge(l, b, r);
  assert.equal(m.tx.a.amount, 10, 'local edit kept');
  assert.equal(m.tx.b.amount, 20, 'cloud edit taken');
  assert.equal(m.tx.c, undefined, 'cloud delete taken');
  assert.equal(m.tx.r.amount, 7, 'cloud add taken');
  assert.equal(m.tx.new.amount, 4, 'local add kept');
  assert.equal(m.meta.settings.theme, 'dark', 'untouched meta follows cloud');
  // after merging, the cloud only needs the local edits
  const up = S.diff(r, m);
  assert.deepEqual(up.upserts.map((t) => t.id).sort(), ['a', 'new']);
  assert.deepEqual(up.deletes, []);
  assert.equal(up.meta, null);
}

// a local delete survives a cloud snapshot that still has the item
{
  const b = S.splitData(data([tx('a', 1), tx('b', 2)]));
  const l = S.splitData(data([tx('a', 1)]));
  const m = S.merge(l, b, b);
  assert.equal(m.tx.b, undefined);
  assert.deepEqual(S.diff(b, m).deletes, ['b']);
}

// first sync: a cloud account with data wins; an empty one gets this phone's data
{
  const phone = S.splitData(data([tx('p', 1)]));
  const cloud = S.splitData(data([tx('c', 2)]));
  assert.equal(S.firstSync(phone, cloud).next, cloud);
  const empty = S.firstSync(phone, { meta: {}, tx: {} });
  assert.equal(empty.next, phone);
  assert.deepEqual(S.diff(empty.base, phone).upserts.map((t) => t.id), ['p'], 'everything uploads');
}

console.log('all sync tests passed');
