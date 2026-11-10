// Run: npm test (or node test/new_features.mjs)
import * as L from '../src/logic.js';
import fs from 'fs';
import assert from 'assert/strict';
const seed = JSON.parse(fs.readFileSync(new URL('./fixtures/real-seed.json', import.meta.url)));
const d = L.migrate(seed);
assert.equal(d.version, 2);
assert.equal(d.transactions.find((t) => t.store === 'Cotti Coffee').description, '');
assert.equal(L.migrate(d).transactions.length, d.transactions.length, 'migrate is idempotent');

// rollover off: unchanged; on: carry = budget*(m-1) - spent Jan..m-1
const off = L.dashboard(d, 2026, 10, '2026-10-13').rows.find((r) => r.category === 'Eating Out');
assert.equal(off.available, 250);
const d2 = { ...d, budgets: d.budgets.map((b) => (b.category === 'Groceries' ? { ...b, rollover: true } : b)) };
const g = L.dashboard(d2, 2026, 10, '2026-10-13').rows.find((r) => r.category === 'Groceries');
assert.equal(g.carry, 30 * 9 - 42); assert.equal(g.available, 30 + 228);

// days left and per day
const oct = L.dashboard(d, 2026, 10, '2026-10-13');
assert.equal(oct.daysLeft, 19);
assert.ok(Math.abs(oct.rows.find((r) => r.category === 'Eating Out').perDay - 86 / 19) < 1e-9);
assert.equal(L.dashboard(d, 2026, 9, '2026-10-13').daysLeft, 0);
assert.equal(L.dashboard(d, 2026, 11, '2026-10-13').daysLeft, 30);

// alerts
const add = (data, tx) => ({ ...data, transactions: [...data.transactions, tx] });
const tx1 = { id: 'x', date: '2026-10-13', category: 'Eating Out', amount: 70, store: 'A', method: '' }; // 164 -> 234 = 93.6%
assert.equal(L.budgetAlert(d, add(d, tx1), tx1, 0.9).level, 'near');
const tx2 = { ...tx1, amount: 100 }; // 264 > 250
assert.equal(L.budgetAlert(d, add(d, tx2), tx2, 0.9).level, 'over');
const tx3 = { ...tx1, amount: 5 };
assert.equal(L.budgetAlert(d, add(d, tx3), tx3, 0.9), null);
const fuel = { ...tx1, category: 'Fuel', amount: 5 }; // already over, no repeat
assert.equal(L.budgetAlert(d, add(d, fuel), fuel, 0.9), null);

// store index / suggestions / templates
const idx = L.storeIndex(d.transactions);
assert.equal(idx.find((s) => s.store === 'Chemist Warehouse').category, 'Health');
assert.deepEqual(L.storeSuggestions(idx, 'chem').map((s) => s.store), ['Chemist Warehouse']);
assert.ok(L.recentTemplates(d.transactions).every((t) => !/imported/.test(t.description)));

// split
assert.equal(L.splitShare(100, 3), 33.33);

// goals
const st = L.goalStatus({ target: 1200, saved: 200, targetDate: '2027-03-31' }, '2026-10-13');
assert.equal(st.monthsLeft, 6); assert.ok(Math.abs(st.perMonth - 1000 / 6) < 1e-9);
assert.equal(L.goalStatus({ target: 100, saved: 100, targetDate: '' }).done, true);

// due dates and reminders
assert.equal(L.nextDue({ dueDate: '2026-01-31', frequency: 'Monthly' }, '2026-10-13'), '2026-10-31');
assert.equal(L.nextDue({ dueDate: '2025-06-01', frequency: 'Annually' }, '2026-10-13'), '2027-06-01');
const rem = L.upcomingReminders({ subscriptions: [{ name: 'Netflix', cost: 20.99, frequency: 'Monthly', dueDate: '2026-01-20', remind: true }], bills: [] }, 2, '2026-10-13');
assert.deepEqual(rem.map((r) => r.remindOn), ['2026-10-18', '2026-11-18']);

// summary, trend, breakdown
const sm = L.monthSummary(d, 2026, 10);
assert.equal(sm.total, 540.89); assert.equal(sm.top.category, 'Eating Out'); assert.equal(sm.prev, 1192.32);
assert.equal(L.trend(d, 2026, 2, 6)[0].label, 'Sep');
assert.equal(L.categoryBreakdown(d, 2026, 10).reduce((a, x) => a + x.amount, 0).toFixed(2), '540.89');

// csv with store round trip
const back = L.csvToTransactions(L.transactionsToCsv(d.transactions), d.categories);
assert.equal(back.transactions.filter((t) => t.store).length, 4);
console.log('all new feature tests passed');

// ids: every transaction, subscription and bill gets a stable id without slashes
const withBad = L.migrate({ ...d, transactions: [{ ...d.transactions[0], id: 'a/b' }, { ...d.transactions[1], id: undefined }] });
assert.ok(withBad.transactions.every((t) => t.id && !t.id.includes('/')));
assert.ok(d.recurring.subscriptions.every((s) => s.id) && d.recurring.bills.every((s) => s.id));
const again = L.migrate(d);
assert.deepEqual(again.recurring.subscriptions.map((s) => s.id), d.recurring.subscriptions.map((s) => s.id), 'ids are kept');
console.log('id tests passed');
