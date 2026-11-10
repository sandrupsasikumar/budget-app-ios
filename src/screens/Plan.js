import React, { useState } from 'react';
import { View, Pressable } from 'react-native';
import { Card, H, Btn, Chip, ChipRow, Field, Label, Screen, T, Row, Icon, Bar, useNumberText } from '../ui';
import { useTheme } from '../theme';
import { isWeb, confirmAction } from '../platform';
import DateField from '../DateField';
import {
  money, perYear, share, planSummary, MONTHS, goalStatus, nextDue, dueLabel, dayLabel, isValidDate, newId, todayString,
} from '../logic';

const Del = ({ onPress, label = 'Remove' }) => {
  const c = useTheme();
  return (
    <Pressable accessibilityLabel={label} onPress={onPress} hitSlop={8} style={{ padding: 6 }}>
      <Icon name="close" size={18} color={c.bad} />
    </Pressable>
  );
};

function NumField({ value, onChange, width = 90, label, placeholder = '0' }) {
  const [t, setT] = useNumberText(value, (v) => (v ? String(v) : ''), (s) => { const n = parseFloat(s); return Number.isNaN(n) ? 0 : n; });
  return (
    <Field style={{ width }} label={label} value={t} keyboardType="decimal-pad" placeholder={placeholder}
      onChangeText={(v) => { setT(v); const n = parseFloat(v); onChange(Number.isNaN(n) ? 0 : n); }} />
  );
}

// ---------- Goals ----------

function GoalCard({ g, onChange, onDelete }) {
  const c = useTheme();
  const st = goalStatus(g, todayString());
  const [add, setAdd] = useState('');
  const [editing, setEditing] = useState(false);
  const contribute = (sign) => {
    const n = parseFloat(add);
    if (Number.isNaN(n) || n <= 0) return;
    onChange({ ...g, saved: Math.max(0, Math.round((g.saved + sign * n) * 100) / 100) });
    setAdd('');
  };
  return (
    <View style={{ paddingVertical: 12, borderTopWidth: 1, borderTopColor: c.line, gap: 8 }}>
      <Row style={{ justifyContent: 'space-between' }}>
        <Row style={{ gap: 6, flex: 1 }}>
          <Icon name={st.done ? 'checkmark-circle' : 'flag-outline'} size={18} color={st.done ? c.good : c.accent} />
          <T weight="700" style={{ flexShrink: 1 }}>{g.name || 'Untitled goal'}</T>
        </Row>
        <Pressable onPress={() => setEditing((v) => !v)} hitSlop={8}><T size={13} color={c.accent} weight="700">{editing ? 'Done' : 'Edit'}</T></Pressable>
      </Row>
      <Bar value={g.saved} max={g.target} color={st.done ? c.good : c.accent} height={10} />
      <Row style={{ justifyContent: 'space-between' }}>
        <T size={13}><T size={13} weight="800">{money(g.saved)}</T> of {money(g.target)}</T>
        <T size={13} muted>{Math.round(st.pct * 100)}%</T>
      </Row>
      {!st.done && st.perMonth != null && (
        <T size={12} color={st.overdue ? c.bad : c.muted}>
          {st.overdue ? `Target date passed with ${money(st.remaining)} to go` : `Save ${money(st.perMonth)} a month to reach it by ${dayLabel(g.targetDate)}`}
        </T>
      )}
      {!st.done && st.perMonth == null && <T size={12} muted>{money(st.remaining)} to go. Add a target date to see a monthly amount.</T>}
      <Row style={{ gap: 8 }}>
        <Field style={{ flex: 1 }} value={add} onChangeText={setAdd} keyboardType="decimal-pad" placeholder="Amount" accessibilityLabel={`Amount for ${g.name}`} />
        <Btn title="Add" icon="add" onPress={() => contribute(1)} />
        <Btn title="Take out" kind="soft" onPress={() => contribute(-1)} />
      </Row>
      {editing && (
        <View style={{ gap: 8 }}>
          <Field label="Name" value={g.name} onChangeText={(v) => onChange({ ...g, name: v })} />
          <Row style={{ gap: 8 }}>
            <NumField label="Target ($)" value={g.target} width={120} onChange={(n) => onChange({ ...g, target: n })} />
            <DateField style={{ flex: 1 }} label="Target date (optional)" optional value={g.targetDate}
              onChange={(v) => onChange({ ...g, targetDate: v })} />
          </Row>
          <Btn title="Delete goal" kind="danger" icon="trash-outline" onPress={onDelete} />
        </View>
      )}
    </View>
  );
}

function Goals({ goals, onChange }) {
  const c = useTheme();
  const [name, setName] = useState(''), [target, setTarget] = useState(''), [date, setDate] = useState('');
  const total = goals.reduce((a, g) => a + g.saved, 0);
  const add = () => {
    const t = parseFloat(target);
    if (!name.trim() || Number.isNaN(t) || t <= 0) return;
    if (date && !isValidDate(date)) return;
    onChange([...goals, { id: newId(), name: name.trim(), target: t, saved: 0, targetDate: date }]);
    setName(''); setTarget(''); setDate('');
  };
  return (
    <Card>
      <H right={goals.length ? <T weight="800">{money(total)} saved</T> : null}
        sub="Track money you are putting aside. This is separate from spending.">Savings goals</H>
      {goals.length === 0 && <T muted size={14}>No goals yet. Try a trip fund or an emergency fund.</T>}
      {goals.map((g, i) => (
        <GoalCard key={g.id} g={g} onChange={(ng) => onChange(goals.map((x, j) => (j === i ? ng : x)))} onDelete={() => onChange(goals.filter((_, j) => j !== i))} />
      ))}
      <View style={{ gap: 8, marginTop: 10, paddingTop: 12, borderTopWidth: 1, borderTopColor: c.line }}>
        <T size={13} weight="700">New goal</T>
        <Field value={name} onChangeText={setName} placeholder="Name, e.g. Japan trip" />
        <Row style={{ gap: 8 }}>
          <Field style={{ flex: 1 }} value={target} onChangeText={setTarget} keyboardType="decimal-pad" placeholder="Target $" />
        </Row>
        <DateField label="Target date (optional)" optional value={date} onChange={setDate} />
        <Btn title="Add goal" icon="flag-outline" onPress={add} disabled={!name.trim() || !(parseFloat(target) > 0) || (!!date && !isValidDate(date))} />
      </View>
    </Card>
  );
}

// ---------- Subscriptions and bills ----------

// One line per item; tap it to open the editor underneath.
// categories: budget category names. onLog(item): record a payment of it as an expense.
function CostList({ title, items, onChange, remindersOn, categories, onLog }) {
  const c = useTheme();
  const [open, setOpen] = useState(null);
  const set = (i, patch) => onChange(items.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  const today = todayString();
  const add = () => {
    const id = newId();
    onChange([...items, { id, name: '', cost: 0, frequency: 'Monthly', dueDate: '', remind: true, category: '' }]);
    setOpen(id);
  };
  const remove = (x, i) => {
    const go = () => onChange(items.filter((_, j) => j !== i));
    if (x.name) confirmAction(`Remove ${x.name}?`, 'Expenses already logged for it are kept.', 'Remove', go); else go();
  };
  return (
    <Card>
      <H right={<T weight="800">{money(items.reduce((a, x) => a + perYear(x), 0))} / yr</T>}
        sub={isWeb ? 'Tap one to change it. Add a due date to see it under Coming up on Home.' : remindersOn ? 'Tap one to change it. Add a due date to get a reminder before it is charged.' : 'Tap one to change it. Bill reminders are off in Budget settings.'}>{title}</H>
      {items.length === 0 && <T muted size={14} style={{ marginBottom: 4 }}>Nothing here yet.</T>}
      {items.map((x, i) => {
        const due = nextDue(x, today);
        const isOpen = open === x.id;
        const facts = [x.frequency, x.category || null, due ? `due ${dueLabel(due, today).replace(/^(Today|Tomorrow|Yesterday)$/, (w) => w.toLowerCase())}` : null].filter(Boolean).join('  ·  ');
        return (
          <View key={x.id || i} style={{ borderTopWidth: 1, borderTopColor: c.line }}>
            <Pressable onPress={() => setOpen(isOpen ? null : x.id)} accessibilityRole="button" accessibilityState={{ expanded: isOpen }}
              accessibilityLabel={`${x.name || 'New item'}, ${money(x.cost)} ${x.frequency}`}
              style={{ paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Icon name={isOpen ? 'chevron-down' : 'chevron-forward'} size={16} color={c.muted} />
              <View style={{ flex: 1 }}>
                <T weight="600" numberOfLines={1} color={x.name ? c.text : c.muted}>{x.name || 'New item'}</T>
                <T size={12} muted numberOfLines={1}>{facts}</T>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <T weight="700">{money(x.cost)}</T>
                {x.frequency === 'Annually' ? <T size={11} muted>{money(perYear(x) / 12)}/mth</T> : null}
              </View>
            </Pressable>
            {isOpen && (
              <View style={{ paddingBottom: 12, gap: 10 }}>
                <Row style={{ gap: 8, alignItems: 'flex-end' }}>
                  <Field style={{ flex: 1 }} label="Name" value={x.name} placeholder="e.g. Netflix" onChangeText={(v) => set(i, { name: v })} />
                  <NumField label="Cost ($)" value={x.cost} onChange={(n) => set(i, { cost: n })} />
                </Row>
                <Row style={{ gap: 6 }}>
                  {['Monthly', 'Annually'].map((f) => <Chip key={f} label={f} active={x.frequency === f} onPress={() => set(i, { frequency: f })} />)}
                </Row>
                <View>
                  <Label>Budget category (used when you log a payment)</Label>
                  <ChipRow>
                    {categories.map((k) => <Chip key={k} label={k} active={x.category === k} onPress={() => set(i, { category: x.category === k ? '' : k })} />)}
                  </ChipRow>
                </View>
                <Row style={{ gap: 8, alignItems: 'flex-end' }}>
                  <DateField style={{ flex: 1 }} label="Due date (optional)" optional value={x.dueDate || ''}
                    onChange={(v) => set(i, { dueDate: v })} accessibilityLabel={`${x.name} due date`} />
                  {!isWeb && <Chip label="Remind" icon="notifications-outline" active={!!x.remind} onPress={() => set(i, { remind: !x.remind })} />}
                </Row>
                <Row style={{ gap: 8 }}>
                  <Btn style={{ flex: 1 }} title="Log a payment" icon="add-circle-outline" kind="soft" disabled={!(x.name || "").trim()} onPress={() => onLog(x)} />
                  <Btn title="Remove" kind="ghost" icon="trash-outline" onPress={() => remove(x, i)} />
                </Row>
              </View>
            )}
          </View>
        );
      })}
      <Btn title="Add" icon="add" kind="soft" style={{ marginTop: 8 }} onPress={add} />
    </Card>
  );
}

// ---------- Shared costs (gifts, trips) ----------

function ShareList({ title, items, onChange, groupLabel }) {
  const c = useTheme();
  const [g, setG] = useState(''), [it, setIt] = useState(''), [cost, setCost] = useState(''), [p, setP] = useState('1');
  const [open, setOpen] = useState(null);
  const groups = [...new Set(items.map((x) => x.group))];
  const add = () => {
    const n = parseFloat(cost), people = parseFloat(p);
    if (!g.trim() || Number.isNaN(n)) return;
    onChange([...items, { group: g.trim(), item: it.trim(), cost: n, people: people > 0 ? people : 1 }]);
    setIt(''); setCost('');
  };
  return (
    <Card>
      <H right={<T weight="800">{money(items.reduce((a, x) => a + share(x), 0))}</T>} sub="Your share after splitting. Tap a name to see its items and add more.">{title}</H>
      {groups.map((grp) => {
        const rows = items.map((x, i) => [x, i]).filter(([x]) => x.group === grp);
        const sum = rows.reduce((a, [x]) => a + share(x), 0);
        const isOpen = open === grp;
        return (
          <View key={grp} style={{ borderTopWidth: 1, borderTopColor: c.line }}>
            <Pressable onPress={() => { setOpen(isOpen ? null : grp); if (!isOpen) setG(grp); }} accessibilityRole="button" accessibilityState={{ expanded: isOpen }}
              style={{ paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Icon name={isOpen ? 'chevron-down' : 'chevron-forward'} size={16} color={c.muted} />
              <T weight="600" style={{ flex: 1 }}>{grp}</T>
              <T size={12} muted>{rows.length} item{rows.length > 1 ? 's' : ''}</T>
              <T weight="700" style={{ width: 80, textAlign: 'right' }}>{money(sum)}</T>
            </Pressable>
            {isOpen && rows.map(([x, i]) => (
              <Row key={i} style={{ paddingVertical: 4, paddingLeft: 24 }}>
                <T size={14} style={{ flex: 1 }} numberOfLines={1}>{x.item || '(no item)'}</T>
                <T size={12} muted style={{ marginRight: 8 }}>{money(x.cost)}{x.people > 1 ? ` ÷ ${x.people}` : ''}</T>
                <T size={14} weight="700" style={{ width: 72, textAlign: 'right' }}>{money(share(x))}</T>
                <Del onPress={() => onChange(items.filter((_, j) => j !== i))} />
              </Row>
            ))}
          </View>
        );
      })}
      <View style={{ gap: 8, marginTop: 8, paddingTop: 10, borderTopWidth: 1, borderTopColor: c.line }}>
        <Row style={{ gap: 8 }}>
          <Field style={{ flex: 1 }} label={groupLabel} value={g} onChangeText={setG} />
          <Field style={{ flex: 1 }} label="Item" value={it} onChangeText={setIt} />
        </Row>
        <Row style={{ gap: 8, alignItems: 'flex-end' }}>
          <Field style={{ flex: 1 }} label="Total cost" value={cost} onChangeText={setCost} keyboardType="decimal-pad" />
          <Field style={{ flex: 1 }} label="People sharing" value={p} onChangeText={setP} keyboardType="number-pad" />
          <Btn title="Add" onPress={add} />
        </Row>
      </View>
    </Card>
  );
}

// onLog(item): open the Add screen filled in with that subscription or bill.
export default function Plan({ data, update, onLog }) {
  const c = useTheme();
  const r = data.recurring;
  const set = (key, val) => update((d) => ({ ...d, recurring: { ...d.recurring, [key]: val } }));
  const sum = planSummary(r);
  const categories = data.budgets.map((b) => b.category);

  return (
    <Screen>
      <Goals goals={data.goals} onChange={(g) => update((d) => ({ ...d, goals: g }))} />

      <Card>
        <H sub="Planning only. Actual payments are logged as expenses.">Set aside each month</H>
        {sum.lines.map((l) => (
          <Row key={l.label} style={{ paddingVertical: 6, borderTopWidth: 1, borderTopColor: c.line }}>
            <T style={{ flex: 1 }}>{l.label}</T>
            <T muted style={{ width: 90, textAlign: 'right' }}>{money(l.perYear)}</T>
            <T weight="700" style={{ width: 80, textAlign: 'right' }}>{money(l.perMonth)}</T>
          </Row>
        ))}
        <Row style={{ paddingTop: 8, borderTopWidth: 1, borderTopColor: c.line }}>
          <T weight="800" style={{ flex: 1 }}>Total</T>
          <T weight="800" muted style={{ width: 90, textAlign: 'right' }}>{money(sum.totalYear)}</T>
          <T weight="800" color={c.accent} style={{ width: 80, textAlign: 'right' }}>{money(sum.totalMonth)}</T>
        </Row>
        <T size={11} muted style={{ marginTop: 4 }}>Per year, per month</T>
      </Card>

      <CostList title="Subscriptions" items={r.subscriptions} onChange={(v) => set('subscriptions', v)} remindersOn={data.settings.billReminders}
        categories={categories} onLog={onLog} />
      <CostList title="Annual bills" items={r.bills} onChange={(v) => set('bills', v)} remindersOn={data.settings.billReminders}
        categories={categories} onLog={onLog} />
      <ShareList title="Gifts and birthdays" groupLabel="Person" items={r.gifts} onChange={(v) => set('gifts', v)} />
      <ShareList title="Trips and outings" groupLabel="Trip" items={r.trips} onChange={(v) => set('trips', v)} />

      <Card>
        <H right={<T weight="800">{money(r.badminton.reduce((a, b) => a + b.cost, 0))}</T>}>Badminton by month</H>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {r.badminton.map((b, i) => (
            <View key={i} style={{ flexBasis: '30%', flexGrow: 1 }}>
              <NumField label={MONTHS[i]} value={b.cost} width="100%"
                onChange={(n) => set('badminton', r.badminton.map((x, j) => (j === i ? { ...x, cost: n } : x)))} />
            </View>
          ))}
        </View>
      </Card>
    </Screen>
  );
}
