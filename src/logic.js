// Pure budget logic. Mirrors the formulas in the original spreadsheet.
// Dates are plain 'YYYY-MM-DD' strings so they compare correctly as text.

export const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
export const MONTHS_SHORT = MONTHS.map((m) => m.slice(0, 3));
export const INCOME = 'Income';

const pad = (n) => String(n).padStart(2, '0');

export function monthStart(year, month) {
  return `${year}-${pad(month)}-01`;
}

export function monthEnd(year, month) {
  const last = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return `${year}-${pad(month)}-${pad(last)}`;
}

export function todayString(now = new Date()) {
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

export function isValidDate(s) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const [y, m, d] = s.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

export function shiftDate(s, days) {
  const [y, m, d] = s.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  return `${dt.getUTCFullYear()}-${pad(dt.getUTCMonth() + 1)}-${pad(dt.getUTCDate())}`;
}

export const round2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;

export function money(n, { sign = false } = {}) {
  const v = round2(n || 0);
  const abs = Math.abs(v).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  const prefix = v < 0 ? '-' : sign && v > 0 ? '+' : '';
  return `${prefix}$${abs}`;
}

export function percent(n, digits = 0) {
  return `${(n * 100).toFixed(digits)}%`;
}

function sumWhere(transactions, pred) {
  let t = 0;
  for (const x of transactions) if (pred(x)) t += x.amount;
  return t;
}

const inRange = (x, start, end) => x.date >= start && x.date <= end;

export function statusFor(actual, budget, threshold) {
  if (budget === 0 && actual === 0) return '-';
  if (actual > budget) return 'Over budget';
  if (actual >= threshold * budget) return 'Near limit';
  return 'On track';
}

// Rollover: unspent (or overspent) budget from earlier months of the same
// year carries into this month, for categories with rollover switched on.
export function carryFor(data, b, year, month) {
  if (!b.rollover || month <= 1) return 0;
  const spent = sumWhere(data.transactions, (x) => x.category === b.category && inRange(x, `${year}-01-01`, monthEnd(year, month - 1)));
  return round2(b.monthly * (month - 1) - spent);
}

export function daysLeftIn(year, month, today) {
  const start = monthStart(year, month), end = monthEnd(year, month);
  const total = Number(end.slice(8));
  if (today > end) return 0;
  if (today < start) return total;
  return total - Number(today.slice(8)) + 1;
}

export function dashboard(data, year, month, today = todayString()) {
  const { transactions, budgets, settings } = data;
  const start = monthStart(year, month);
  const end = monthEnd(year, month);
  const ytdStart = `${year}-01-01`;
  const thr = settings.warnThreshold;
  const daysLeft = daysLeftIn(year, month, today);

  const income = sumWhere(transactions, (x) => x.category === INCOME && inRange(x, start, end));

  const rows = budgets.map((b) => {
    const actual = sumWhere(transactions, (x) => x.category === b.category && inRange(x, start, end));
    const ytdActual = sumWhere(transactions, (x) => x.category === b.category && inRange(x, ytdStart, end));
    const carry = carryFor(data, b, year, month);
    const available = round2(b.monthly + carry);
    const remaining = round2(available - actual);
    return {
      category: b.category,
      type: b.type,
      rollover: !!b.rollover,
      budget: b.monthly,
      carry,
      available,
      actual: round2(actual),
      remaining,
      perDay: daysLeft > 0 && remaining > 0 ? remaining / daysLeft : 0,
      pctUsed: available <= 0 ? null : actual / available,
      status: statusFor(actual, available, thr),
      ytdActual: round2(ytdActual),
      ytdBudget: b.monthly * month,
    };
  });

  const add = (k) => round2(rows.reduce((a, r) => a + r[k], 0));
  const totals = {
    budget: add('budget'), available: add('available'), actual: add('actual'),
    remaining: add('remaining'), ytdActual: add('ytdActual'), ytdBudget: add('ytdBudget'),
  };
  totals.pctUsed = totals.available <= 0 ? null : totals.actual / totals.available;
  totals.status = statusFor(totals.actual, totals.available, thr);
  totals.perDay = daysLeft > 0 && totals.remaining > 0 ? totals.remaining / daysLeft : 0;

  const spending = totals.actual;
  const net = round2(income - spending);
  const all = sumWhere(transactions, (x) => inRange(x, start, end));
  const unmatched = round2(all - income - spending);

  return {
    start, end, income, spending, net, daysLeft,
    savingsRate: income === 0 ? 0 : net / income,
    budgetUsed: totals.budget === 0 ? 0 : spending / totals.budget,
    rows, totals, unmatched,
  };
}

export function yearTable(data, year) {
  const out = [];
  for (let m = 1; m <= 12; m++) {
    const s = monthStart(year, m);
    const e = monthEnd(year, m);
    const income = sumWhere(data.transactions, (x) => x.category === INCOME && inRange(x, s, e));
    const spending = sumWhere(data.transactions, (x) => x.category !== INCOME && inRange(x, s, e));
    const net = income - spending;
    out.push({ month: m, label: MONTHS_SHORT[m - 1], income: round2(income), spending: round2(spending), net: round2(net), rate: income === 0 ? null : net / income });
  }
  const income = round2(out.reduce((a, r) => a + r.income, 0));
  const spending = round2(out.reduce((a, r) => a + r.spending, 0));
  const net = round2(income - spending);
  return { months: out, total: { income, spending, net, rate: income === 0 ? null : net / income } };
}

export function heatmap(data, year) {
  const cats = data.budgets.map((b) => b.category);
  const grid = cats.map((category) => {
    const cells = [];
    for (let m = 1; m <= 12; m++) {
      const s = monthStart(year, m);
      const e = monthEnd(year, m);
      cells.push(round2(sumWhere(data.transactions, (x) => x.category === category && inRange(x, s, e))));
    }
    return { category, cells, total: round2(cells.reduce((a, v) => a + v, 0)) };
  });
  const max = Math.max(0, ...grid.flatMap((g) => g.cells));
  return { grid, max };
}

// ---- Planned and recurring ----

export function perYear(item) {
  if (item.frequency === 'Monthly') return item.cost * 12;
  if (item.frequency === 'Annually') return item.cost;
  return 0;
}

export function share(item) {
  return item.people > 0 ? item.cost / item.people : 0;
}

export function planSummary(recurring) {
  const subs = recurring.subscriptions.reduce((a, s) => a + perYear(s), 0);
  const bills = recurring.bills.reduce((a, s) => a + perYear(s), 0);
  const gifts = recurring.gifts.reduce((a, g) => a + share(g), 0);
  const badminton = recurring.badminton.reduce((a, b) => a + b.cost, 0);
  const lines = [
    { label: 'Subscriptions', perYear: subs },
    { label: 'Annual bills', perYear: bills },
    { label: 'Gifts and birthdays', perYear: gifts },
    { label: 'Badminton', perYear: badminton },
  ].map((l) => ({ ...l, perMonth: l.perYear / 12 }));
  const totalYear = lines.reduce((a, l) => a + l.perYear, 0);
  return { lines, totalYear, totalMonth: totalYear / 12 };
}

export function tripTotals(trips) {
  const map = new Map();
  for (const t of trips) map.set(t.group, (map.get(t.group) || 0) + share(t));
  return [...map.entries()].map(([group, total]) => ({ group, total }));
}

// ---- CSV (same columns as the Transactions tab, so it pastes straight into Google Sheets) ----

const csvCell = (v) => {
  const s = v == null ? '' : String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export function transactionsToCsv(transactions) {
  const header = ['Date', 'Description', 'Category', 'Amount', 'Payment Method', 'Notes', 'Store'];
  const sorted = [...transactions].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  const lines = sorted.map((t) =>
    [t.date, t.description, t.category, t.amount.toFixed(2), t.method, t.notes, t.store || ''].map(csvCell).join(',')
  );
  return [header.join(','), ...lines].join('\n') + '\n';
}

export function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = '';
  let q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (c === '"') q = false;
      else cell += c;
    } else if (c === '"') q = true;
    else if (c === ',') { row.push(cell); cell = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(cell); cell = '';
      if (row.some((v) => v !== '')) rows.push(row);
      row = [];
    } else cell += c;
  }
  row.push(cell);
  if (row.some((v) => v !== '')) rows.push(row);
  return rows;
}

export function csvToTransactions(text, validCategories) {
  const rows = parseCsv(text);
  if (rows.length < 2) return { transactions: [], skipped: 0 };
  const head = rows[0].map((h) => h.trim().toLowerCase());
  const col = (name) => head.indexOf(name);
  const iDate = col('date'), iDesc = col('description'), iCat = col('category'),
    iAmt = col('amount'), iMeth = col('payment method'), iNotes = col('notes'), iStore = col('store');
  if (iDate < 0 || iCat < 0 || iAmt < 0) throw new Error('CSV needs Date, Category and Amount columns');
  const out = [];
  let skipped = 0;
  for (const r of rows.slice(1)) {
    const date = (r[iDate] || '').trim().slice(0, 10);
    const amount = parseFloat(String(r[iAmt] || '').replace(/[$,]/g, ''));
    const category = (r[iCat] || '').trim();
    if (!isValidDate(date) || Number.isNaN(amount) || !validCategories.includes(category)) { skipped++; continue; }
    out.push({
      date, amount: Math.abs(amount), category,
      description: iDesc >= 0 ? r[iDesc] || '' : '',
      method: iMeth >= 0 ? r[iMeth] || '' : '',
      notes: iNotes >= 0 ? r[iNotes] || '' : '',
      store: iStore >= 0 ? r[iStore] || '' : '',
    });
  }
  return { transactions: out, skipped };
}

let counter = 0;
export function newId() {
  counter += 1;
  return `t${Date.now().toString(36)}${counter}${Math.random().toString(36).slice(2, 6)}`;
}

// ---- Version 2 additions ----

export const DATA_VERSION = 2;

export function migrate(data) {
  const d = JSON.parse(JSON.stringify(data));
  if ((d.version || 1) < 2) {
    d.transactions = d.transactions.map((t) => {
      return { ...t, store: t.store != null ? t.store : '' };
    });
    d.budgets = d.budgets.map((b) => ({ rollover: false, ...b }));
    d.goals = d.goals || [];
    const withDue = (x) => ({ dueDate: '', remind: false, ...x });
    d.recurring.subscriptions = d.recurring.subscriptions.map(withDue);
    d.recurring.bills = d.recurring.bills.map(withDue);
    d.settings = { theme: 'system', budgetAlerts: true, billReminders: true, remindDaysBefore: 2, ...d.settings };
    d.version = 2;
  }
  for (const t of d.transactions) {
    // Ids double as cloud document names, so they must exist and contain no slashes.
    if (!t.id || String(t.id).includes('/')) t.id = newId();
    if (t.store == null) t.store = '';
    if (t.split === undefined) t.split = null;
    if (t.receipt === undefined) t.receipt = null;
  }
  // Subscriptions and bills need stable ids so list rows keep the right values after a delete.
  for (const list of [d.recurring.subscriptions, d.recurring.bills]) {
    for (const item of list) if (!item.id) item.id = newId();
  }
  return d;
}

const isImported = (t) => /\(imported\)$/.test(t.description || '');

export function txTitle(t) {
  return t.store || t.description || t.category;
}

// Stores you have used, most frequent first, with the last category and method used there.
export function storeIndex(transactions) {
  const map = new Map();
  const sorted = [...transactions].sort((a, b) => (a.date < b.date ? -1 : 1));
  for (const t of sorted) {
    const name = (t.store || '').trim();
    if (!name) continue;
    const key = name.toLowerCase();
    const cur = map.get(key) || { store: name, count: 0 };
    cur.count += 1;
    cur.category = t.category;
    cur.method = t.method;
    cur.lastDate = t.date;
    map.set(key, cur);
  }
  return [...map.values()].sort((a, b) => b.count - a.count || (a.lastDate < b.lastDate ? 1 : -1));
}

export function storeSuggestions(index, text, limit = 5) {
  const q = text.trim().toLowerCase();
  if (!q) return [];
  return index.filter((s) => s.store.toLowerCase().includes(q) && s.store.toLowerCase() !== q).slice(0, limit);
}

// Recent real purchases (not the imported monthly totals), one per store/category/amount.
export function recentTemplates(transactions, limit = 6) {
  const seen = new Set();
  const out = [];
  const sorted = [...transactions].filter((t) => !isImported(t) && t.category !== INCOME && t.amount > 0)
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
  for (const t of sorted) {
    const key = `${txTitle(t)}|${t.category}|${t.amount}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(t);
    if (out.length >= limit) break;
  }
  return out;
}

export function splitShare(total, people) {
  return people > 0 ? round2(total / people) : round2(total);
}

export function monthSummary(data, year, month) {
  const s = monthStart(year, month), e = monthEnd(year, month);
  const spend = data.transactions.filter((t) => t.category !== INCOME && inRange(t, s, e));
  const total = spend.reduce((a, t) => a + t.amount, 0);
  const byCat = new Map();
  for (const t of spend) byCat.set(t.category, (byCat.get(t.category) || 0) + t.amount);
  const top = [...byCat.entries()].sort((a, b) => b[1] - a[1])[0] || null;
  const real = spend.filter((t) => !isImported(t));
  const biggest = [...real].sort((a, b) => b.amount - a.amount)[0] || null;
  const pm = month === 1 ? { y: year - 1, m: 12 } : { y: year, m: month - 1 };
  const prev = sumWhere(data.transactions, (t) => t.category !== INCOME && inRange(t, monthStart(pm.y, pm.m), monthEnd(pm.y, pm.m)));
  return {
    total: round2(total),
    count: real.length,
    top: top ? { category: top[0], amount: round2(top[1]), share: total ? top[1] / total : 0 } : null,
    biggest,
    prev: round2(prev),
    change: prev === 0 ? null : (total - prev) / prev,
  };
}

// Spending and income for the n months ending at (year, month).
export function trend(data, year, month, n = 6) {
  const out = [];
  let y = year, m = month;
  for (let i = 0; i < n; i++) {
    const s = monthStart(y, m), e = monthEnd(y, m);
    out.unshift({
      year: y, month: m, label: MONTHS_SHORT[m - 1],
      spending: round2(sumWhere(data.transactions, (t) => t.category !== INCOME && inRange(t, s, e))),
      income: round2(sumWhere(data.transactions, (t) => t.category === INCOME && inRange(t, s, e))),
    });
    m -= 1;
    if (m < 1) { m = 12; y -= 1; }
  }
  return out;
}

export function categoryBreakdown(data, year, month) {
  const s = monthStart(year, month), e = monthEnd(year, month);
  const map = new Map();
  for (const t of data.transactions) {
    if (t.category === INCOME || !inRange(t, s, e)) continue;
    map.set(t.category, (map.get(t.category) || 0) + t.amount);
  }
  const total = [...map.values()].reduce((a, v) => a + v, 0);
  return [...map.entries()].map(([category, amount]) => ({ category, amount: round2(amount), share: total ? amount / total : 0 }))
    .sort((a, b) => b.amount - a.amount);
}

// What a category looked like before and after a new transaction, for alerts.
export function budgetAlert(before, after, tx, threshold) {
  if (tx.category === INCOME) return null;
  const [y, m] = tx.date.split('-').map(Number);
  const b = before.budgets.find((x) => x.category === tx.category);
  if (!b) return null;
  const was = dashboard(before, y, m).rows.find((r) => r.category === tx.category);
  const now = dashboard(after, y, m).rows.find((r) => r.category === tx.category);
  if (!was || !now || now.available <= 0) return null;
  if (now.actual > now.available && was.actual <= was.available) {
    return { level: 'over', title: `${tx.category} is over budget`, body: `${money(now.actual)} spent of ${money(now.available)} in ${MONTHS[m - 1]}.` };
  }
  if (now.actual >= threshold * now.available && was.actual < threshold * was.available && now.actual <= now.available) {
    return { level: 'near', title: `${tx.category} is at ${percent(now.actual / now.available)}`, body: `${money(now.remaining)} left for ${MONTHS[m - 1]}.` };
  }
  return null;
}

// ---- Goals ----

export function monthsBetween(from, to) {
  const [y1, m1] = from.split('-').map(Number);
  const [y2, m2] = to.split('-').map(Number);
  return (y2 - y1) * 12 + (m2 - m1);
}

export function goalStatus(goal, today = todayString()) {
  const remaining = Math.max(0, goal.target - goal.saved);
  const pct = goal.target > 0 ? Math.min(1, goal.saved / goal.target) : 0;
  let perMonth = null, monthsLeft = null, overdue = false;
  if (goal.targetDate && isValidDate(goal.targetDate)) {
    monthsLeft = monthsBetween(today, goal.targetDate) + 1;
    if (goal.targetDate < today) { overdue = remaining > 0; monthsLeft = 0; }
    perMonth = remaining > 0 && monthsLeft > 0 ? remaining / monthsLeft : 0;
  }
  return { remaining: round2(remaining), pct, perMonth, monthsLeft, overdue, done: remaining === 0 && goal.target > 0 };
}

// ---- Reminders ----

function addMonths(dateStr, n) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const target = new Date(Date.UTC(y, m - 1 + n, 1));
  const last = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
  return `${target.getUTCFullYear()}-${pad(target.getUTCMonth() + 1)}-${pad(Math.min(d, last))}`;
}

export function nextDue(item, today = todayString()) {
  if (!item.dueDate || !isValidDate(item.dueDate)) return null;
  const step = item.frequency === 'Monthly' ? 1 : item.frequency === 'Annually' ? 12 : 0;
  let k = 0;
  let due = item.dueDate;
  while (step && due < today && k < 600) { k += 1; due = addMonths(item.dueDate, step * k); }
  return due;
}

// Reminder dates (local 9am, N days before each due date) for the next 60 days.
export function upcomingReminders(recurring, daysBefore, today = todayString(), horizonDays = 60) {
  const out = [];
  const limit = shiftDate(today, horizonDays);
  for (const item of [...recurring.subscriptions, ...recurring.bills]) {
    if (!item.remind || !item.name) continue;
    const step = item.frequency === 'Monthly' ? 1 : item.frequency === 'Annually' ? 12 : 0;
    let due = nextDue(item, today);
    let k = 0;
    while (due && due <= limit && k < 6) {
      const remindOn = shiftDate(due, -daysBefore);
      if (remindOn >= today) out.push({ name: item.name, cost: item.cost, due, remindOn });
      if (!step) break;
      k += 1;
      due = addMonths(due, step);
    }
  }
  return out.sort((a, b) => (a.remindOn < b.remindOn ? -1 : 1));
}

export function upcomingBills(recurring, today = todayString(), limit = 5) {
  return [...recurring.subscriptions, ...recurring.bills]
    .filter((i) => i.name && i.dueDate)
    .map((i) => ({ name: i.name, cost: i.cost, due: nextDue(i, today) }))
    .filter((i) => i.due)
    .sort((a, b) => (a.due < b.due ? -1 : 1))
    .slice(0, limit);
}
