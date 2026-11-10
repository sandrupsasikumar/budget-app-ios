import React, { useMemo, useState } from 'react';
import { View, Pressable } from 'react-native';
import { Card, Field, Screen, T, Row, Icon, Chip, ChipRow } from '../ui';
import { useTheme } from '../theme';
import { INCOME, money, monthStart, monthEnd, txTitle } from '../logic';
import { MonthNav } from './Dashboard';

export default function Activity({ data, period, setPeriod, onEdit }) {
  const c = useTheme();
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('All');
  const [method, setMethod] = useState('All');
  const cats = ['All', ...data.budgets.map((b) => b.category), INCOME];

  const list = useMemo(() => {
    const s = monthStart(period.year, period.month), e = monthEnd(period.year, period.month);
    const needle = q.trim().toLowerCase();
    return data.transactions
      .filter((t) => t.date >= s && t.date <= e)
      .filter((t) => cat === 'All' || t.category === cat)
      .filter((t) => method === 'All' || t.method === method)
      .filter((t) => !needle || `${t.store} ${t.description} ${t.category} ${t.notes}`.toLowerCase().includes(needle))
      .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
  }, [data, period, q, cat, method]);

  const spent = list.filter((t) => t.category !== INCOME).reduce((a, t) => a + t.amount, 0);
  const filtered = cat !== 'All' || method !== 'All' || q.trim();

  // group by date
  const groups = [];
  for (const t of list) {
    const g = groups[groups.length - 1];
    if (g && g.date === t.date) g.items.push(t); else groups.push({ date: t.date, items: [t] });
  }

  return (
    <Screen>
      <MonthNav period={period} setPeriod={setPeriod} />
      <Field value={q} onChangeText={setQ} placeholder="Search store, description, notes" />
      <ChipRow>{cats.map((x) => <Chip key={x} label={x} active={cat === x} onPress={() => setCat(x)} />)}</ChipRow>
      <ChipRow>{['All', ...data.methods].map((x) => <Chip key={x} label={x === 'All' ? 'Any method' : x} active={method === x} onPress={() => setMethod(x)} />)}</ChipRow>
      <Row style={{ justifyContent: 'space-between', paddingHorizontal: 4 }}>
        <T size={13} muted>{list.length} {list.length === 1 ? 'item' : 'items'}{filtered ? ' matching' : ''}</T>
        <T size={13} weight="700">{money(spent)} spent</T>
      </Row>
      {groups.length === 0 ? (
        <Card><T muted>Nothing here for this month.</T></Card>
      ) : groups.map((g) => (
        <View key={g.date}>
          <T size={12} muted weight="700" style={{ marginBottom: 6, marginLeft: 4 }}>{g.date}</T>
          <Card style={{ paddingVertical: 4 }}>
            {g.items.map((t, i) => (
              <Pressable key={t.id} onPress={() => onEdit(t)} accessibilityRole="button"
                style={{ paddingVertical: 10, borderTopWidth: i ? 1 : 0, borderTopColor: c.line, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Row style={{ gap: 6 }}>
                    <T weight="600" numberOfLines={1} style={{ flexShrink: 1 }}>{txTitle(t)}</T>
                    {t.receipt ? <Icon name="attach" size={15} color={c.muted} accessibilityLabel="Has receipt" /> : null}
                    {t.split ? <Icon name="people-outline" size={15} color={c.muted} accessibilityLabel="Split bill" /> : null}
                  </Row>
                  <T size={12} muted numberOfLines={1}>
                    {[t.category, t.method, t.store && t.description ? t.description : null, t.split ? `your share of ${money(t.split.total)}` : null].filter(Boolean).join('  ·  ')}
                  </T>
                </View>
                <T weight="700" color={t.category === INCOME ? c.good : t.amount === 0 ? c.warn : c.text}>
                  {t.category === INCOME ? '+' : ''}{money(t.amount)}
                </T>
              </Pressable>
            ))}
          </Card>
        </View>
      ))}
      <T size={12} muted style={{ textAlign: 'center' }}>Tap an item to edit or delete it. $0.00 items need an amount.</T>
    </Screen>
  );
}
