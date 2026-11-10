// Run: npm test. Restores a backup from the other version of the app ("version 3", trackers
// instead of badminton, no categories) and runs every calculation the screens use on it.
import * as L from '../src/logic.js';
import * as S from '../src/sync.js';
import fs from 'fs';
import assert from 'assert/strict';

const file = new URL('./fixtures/other-app-backup.json', import.meta.url);
if (!fs.existsSync(file)) { console.log('skipped backup import test (no fixture)'); process.exit(0); }
const raw = JSON.parse(fs.readFileSync(file));
assert.equal(raw.recurring.badminton, undefined, 'fixture really is the other format');

const d = L.migrate(raw);
assert.equal(d.transactions.length, raw.transactions.length, 'no transactions lost');
assert.deepEqual(d.recurring.badminton.map((b) => b.cost), [12.5, 0, 15.75, 0, 15.75, 21, 0, 21, 0, 0, 9, 0], 'badminton taken from the tracker');
assert.ok(d.categories.includes('Income') && d.categories.includes('Fuel'));
assert.equal(d.settings.warnThreshold, 0.75, 'settings kept');
assert.equal(d.recurring.trackers.length, 1, 'extra fields kept');
assert.deepEqual(L.migrate(d), d, 'running it again changes nothing');

// Everything the screens calculate
const plan = L.planSummary(d.recurring);
assert.equal(plan.lines.find((l) => l.label === 'Badminton').perYear, 95);
L.tripTotals(d.recurring.trips);
const dash = L.dashboard(d, 2026, 11, '2026-11-10');
assert.ok(dash.rows.length === 11 && Number.isFinite(dash.totals.remaining));
L.yearTable(d, 2026); L.heatmap(d, 2026); L.monthSummary(d, 2026, 11); L.trend(d, 2026, 11); L.categoryBreakdown(d, 2026, 11);
L.upcomingBills(d.recurring); L.upcomingReminders(d.recurring, 2);
for (const g of d.goals) L.goalStatus(g);
L.storeIndex(d.transactions); L.recentTemplates(d.transactions);

// Cloud round trip keeps it intact (Firestore rejects nested arrays and undefined)
const st = S.splitData(d);
const nested = (v) => Array.isArray(v) ? v.some((x) => Array.isArray(x) || nested(x)) : v && typeof v === 'object' ? Object.values(v).some(nested) : false;
assert.equal(nested(st.meta), false, 'no arrays directly inside arrays');
assert.deepEqual(L.migrate(S.joinData(st)).transactions.length, d.transactions.length);

// A half broken copy (what got saved after the crash) is repaired too
const broken = { ...d, recurring: { subscriptions: d.recurring.subscriptions } };
delete broken.recurring.badminton;
const fixed = L.migrate(broken);
assert.equal(fixed.recurring.badminton.length, 12);
assert.deepEqual(fixed.recurring.gifts, []);
L.planSummary(fixed.recurring);
console.log('backup import tests passed');
