// Run: npm test (or node test/improvements.test.mjs)
// Uses made-up data only, so it runs without the private fixtures.
import * as L from '../src/logic.js';
import * as S from '../src/sync.js';
import assert from 'assert/strict';

const tx = (id, date, category, amount, extra = {}) => ({ id, date, category, amount, store: '', description: '', method: 'Credit Card', notes: '', ...extra });
const make = (transactions = []) => L.migrate({
  budgets: [{ category: 'Groceries', monthly: 400 }, { category: 'Fuel', monthly: 120 }, { category: 'Fun', monthly: 0 }],
  transactions,
  recurring: {
    subscriptions: [{ id: 's1', name: 'Netflix', cost: 19, frequency: 'Monthly', category: 'Fun', dueDate: '2026-01-15' }],
    bills: [{ id: 'b1', name: 'Rego', cost: 800, frequency: 'Annually', category: 'Fuel' }],
  },
});

// ---- Friendly dates ----
const TODAY = '2026-11-10'; // a Tuesday
assert.equal(L.daysBetween('2026-11-10', '2026-11-12'), 2);
assert.equal(L.daysBetween('2026-03-01', '2026-02-27'), -2);
assert.equal(L.daysBetween('2026-10-03', '2026-10-05'), 2); // across the daylight saving change in Australia
assert.equal(L.dayLabel('2026-11-10', TODAY), 'Today');
assert.equal(L.dayLabel('2026-11-09', TODAY), 'Yesterday');
assert.equal(L.dayLabel('2026-11-11', TODAY), 'Tomorrow');
assert.equal(L.dayLabel('2026-11-03', TODAY), 'Tue 3 Nov');
assert.equal(L.dayLabel('2025-12-25', TODAY), 'Thu 25 Dec 2025');
assert.equal(L.dayLabel('not a date', TODAY), 'not a date');
assert.equal(L.dayLabel('', TODAY), '');
assert.equal(L.dueLabel('2026-11-10', TODAY), 'Today');
assert.equal(L.dueLabel('2026-11-11', TODAY), 'Tomorrow');
assert.equal(L.dueLabel('2026-11-15', TODAY), 'in 5 days');
assert.equal(L.dueLabel('2026-11-24', TODAY), 'in 14 days');
assert.equal(L.dueLabel('2026-11-25', TODAY), 'Wed 25 Nov');
assert.equal(L.dueLabel('2026-11-08', TODAY), 'Sun 8 Nov');

// ---- Activity list ----
const list = [
  tx('a', '2026-11-02', 'Groceries', 50, { store: 'Coles' }),
  tx('b', '2026-11-05', 'Fuel', 80.5, { store: 'BP', method: 'Debit Card' }),
  tx('c', '2026-11-05', 'Groceries', 20, { store: 'Aldi', notes: 'party snacks' }),
  tx('d', '2026-10-20', 'Groceries', 33, { store: 'Coles' }),
  tx('e', '2026-11-05', 'Income', 3800, { description: 'Salary' }),
  tx('f', '2025-11-05', 'Fun', 15, { description: 'Coles gift card' }),
];
const nov = { year: 2026, month: 11 };
const ids = (l) => l.map((t) => t.id).join('');
// newest day first; on the same day the one added last comes first
assert.equal(ids(L.findTransactions(list, nov)), 'ecba');
assert.equal(ids(L.findTransactions(list, { ...nov, category: 'Groceries' })), 'ca');
assert.equal(ids(L.findTransactions(list, { ...nov, method: 'Debit Card' })), 'b');
// search text looks through every month and year, and matches store, description and notes
assert.equal(ids(L.findTransactions(list, { ...nov, q: ' coles ' })), 'adf');
assert.equal(ids(L.findTransactions(list, { ...nov, q: 'COLES', category: 'Groceries' })), 'ad');
assert.equal(ids(L.findTransactions(list, { ...nov, q: 'snacks' })), 'c');
// amounts can be searched, with or without the dollar sign
assert.equal(ids(L.findTransactions(list, { ...nov, q: '80.50' })), 'b');
assert.equal(ids(L.findTransactions(list, { ...nov, q: '$33' })), 'd');
assert.equal(L.findTransactions(list, { ...nov, q: 'zzz' }).length, 0);
// the input list is left alone
assert.equal(ids(list), 'abcdef');

const groups = L.groupByDay(L.findTransactions(list, nov));
assert.deepEqual(groups.map((g) => g.date), ['2026-11-05', '2026-11-02']);
assert.equal(groups[0].items.length, 3);
assert.equal(groups[0].spent, 100.5);
assert.equal(groups[0].income, 3800);
assert.equal(groups[1].spent, 50);
assert.deepEqual(L.groupByDay([]), []);

// ---- Payment method to start on ----
assert.equal(L.lastMethod(list), 'Credit Card'); // 'e' is the last one added on the newest day
assert.equal(L.lastMethod([...list, tx('g', '2026-11-09', 'Fun', 5, { method: 'Cash' })]), 'Cash');
assert.equal(L.lastMethod([], 'Debit Card'), 'Debit Card');
assert.equal(L.lastMethod([tx('x', '2026-01-01', 'Fun', 1, { method: '' })], 'Cash'), 'Cash');

// ---- Categories ----
const d0 = make(list);
assert.deepEqual(d0.categories, ['Groceries', 'Fuel', 'Fun', 'Income']);
assert.equal(L.categoryCount(d0, 'Groceries'), 3);
assert.equal(L.categoryCount(d0, 'Nope'), 0);

// names that cannot be used
assert.ok(L.categoryProblem(d0, '   '));
assert.ok(L.categoryProblem(d0, 'x'.repeat(31)));
assert.ok(L.categoryProblem(d0, 'income'));
assert.ok(L.categoryProblem(d0, ' fuel '));
assert.equal(L.categoryProblem(d0, 'Pets'), null);
// renaming: its own name in other capitals is fine, another category's name is not
assert.equal(L.categoryProblem(d0, 'FUEL', 'Fuel'), null);
assert.ok(L.categoryProblem(d0, 'Fun', 'Fuel'));

// add
const d1 = L.addCategory(d0, '  Pets ');
assert.deepEqual(d1.budgets.at(-1), { category: 'Pets', monthly: 0, type: 'Flexible', notes: '', rollover: false });
assert.deepEqual(d1.categories, ['Groceries', 'Fuel', 'Fun', 'Pets', 'Income']);
assert.equal(d0.budgets.length, 3); // original untouched

// rename: budget keeps its amount, transactions and plans follow
const d2 = L.renameCategory(d0, 'Fuel', ' Petrol ');
assert.deepEqual(d2.budgets.map((b) => b.category), ['Groceries', 'Petrol', 'Fun']);
assert.equal(d2.budgets[1].monthly, 120);
assert.equal(d2.transactions.find((t) => t.id === 'b').category, 'Petrol');
assert.equal(d2.recurring.bills[0].category, 'Petrol');
assert.equal(d2.recurring.subscriptions[0].category, 'Fun');
assert.equal(L.categoryCount(d2, 'Fuel'), 0);
assert.deepEqual(d2.categories, ['Groceries', 'Petrol', 'Fun', 'Income']);
assert.equal(L.renameCategory(d0, 'Fuel', 'Fuel '), d0); // nothing to do
assert.equal(d0.transactions.find((t) => t.id === 'b').category, 'Fuel'); // original untouched
// the month's numbers move with the rename
assert.equal(L.dashboard(d2, 2026, 11, TODAY).rows.find((r) => r.category === 'Petrol').actual, 80.5);
assert.equal(L.dashboard(d2, 2026, 11, TODAY).unmatched, 0);

// remove: transactions are kept under Uncategorised, plans lose the category
const d3 = L.removeCategory(d0, 'Fun');
assert.deepEqual(d3.budgets.map((b) => b.category), ['Groceries', 'Fuel', L.FALLBACK_CATEGORY]);
assert.equal(d3.transactions.length, list.length);
assert.equal(d3.transactions.find((t) => t.id === 'f').category, L.FALLBACK_CATEGORY);
assert.equal(d3.recurring.subscriptions[0].category, '');
assert.equal(d3.recurring.bills[0].category, 'Fuel');
// an unused category just goes, and no Uncategorised is added for it
const d4 = L.removeCategory(L.addCategory(d0, 'Pets'), 'Pets');
assert.deepEqual(d4.budgets.map((b) => b.category), ['Groceries', 'Fuel', 'Fun']);
// a second removal reuses the existing Uncategorised
const d5 = L.removeCategory(d3, 'Fuel');
assert.deepEqual(d5.budgets.map((b) => b.category), ['Groceries', L.FALLBACK_CATEGORY]);
assert.equal(L.categoryCount(d5, L.FALLBACK_CATEGORY), 2);
// Uncategorised cannot be removed while it holds transactions, and can once it is empty
assert.ok(L.removeCategoryProblem(d5, L.FALLBACK_CATEGORY));
assert.equal(L.removeCategoryProblem(d5, 'Groceries'), null);
assert.equal(L.removeCategoryProblem(L.addCategory(d0, L.FALLBACK_CATEGORY), L.FALLBACK_CATEGORY), null);
// results still pass through migrate unchanged
assert.deepEqual(L.migrate(d5), d5);
assert.deepEqual(L.migrate(d2), d2);

// ---- migrate ----
// the category list always follows the budgets, even when the saved one is stale
const stale = L.migrate({ budgets: [{ category: 'Food', monthly: 1 }], categories: ['Old', 'Income'], transactions: [] });
assert.deepEqual(stale.categories, ['Food', 'Income']);
// subscriptions and bills get a category field, and keep one they already have
assert.equal(L.migrate({ recurring: { bills: [{ name: 'Water', cost: 90 }] } }).recurring.bills[0].category, '');
assert.equal(d0.recurring.subscriptions[0].category, 'Fun');

// ---- Coming up ----
const up = L.upcomingBills(d0.recurring, TODAY);
assert.equal(up.length, 1); // only items with a due date
assert.deepEqual(up[0], { id: 's1', name: 'Netflix', cost: 19, category: 'Fun', due: '2026-11-15' });

// ---- Sync: a refused upload is marked as not sent ----
const state = (txs, theme = 'system') => S.splitData({ budgets: [], settings: { theme }, transactions: txs });
const t = (id, amount) => ({ id, date: '2026-11-01', category: 'Fun', amount });
{
  // cloud has a and b; the phone edits a, deletes b, adds c and changes a setting
  const prev = state([t('a', 1), t('b', 2)]);
  const local = state([t('a', 5), t('c', 3)], 'dark');
  const changes = S.diff(prev, local);
  // flush() moves base forward to local before the write; the write then fails
  const back = S.unsend(local, prev, changes);
  assert.deepEqual(back, prev);
  // so the same changes are found again next time
  const again = S.diff(back, local);
  assert.deepEqual(again.upserts.map((x) => x.id).sort(), ['a', 'c']);
  assert.deepEqual(again.deletes, ['b']);
  assert.equal(again.meta.settings.theme, 'dark');
  // and a cloud update arriving meanwhile cannot undo the phone's edits
  const merged = S.merge(local, back, prev);
  assert.deepEqual(merged, local);
}
{
  // only what was in the failed write goes back; a later successful write stays sent
  const prev = state([t('a', 1)]);
  const mid = state([t('a', 1), t('b', 2)]); // first write: add b (fails)
  const first = S.diff(prev, mid);
  const now = state([t('a', 9), t('b', 2)]); // second write: edit a (succeeds), base is now `now`
  const back = S.unsend(now, prev, first);
  assert.equal(back.tx.a.amount, 9);
  assert.equal('b' in back.tx, false);
  assert.equal(back.meta, now.meta); // meta was not part of the failed write
  const again = S.diff(back, now);
  assert.deepEqual(again.upserts.map((x) => x.id), ['b']);
  assert.equal(again.meta, null);
}
{
  // without unsend, the old behaviour: the cloud's copy would win and the edit would be lost
  const prev = state([t('a', 1)]);
  const local = state([t('a', 5)]);
  assert.equal(S.merge(local, local, prev).tx.a.amount, 1);
  assert.equal(S.merge(local, S.unsend(local, prev, S.diff(prev, local)), prev).tx.a.amount, 5);
}

console.log('improvement tests passed');
