import React, { useMemo, useState } from 'react';
import { View, Pressable } from 'react-native';
import { Btn, Card, Field, Screen, T, Row, Icon, Chip, ChipRow } from '../ui';
import { useTheme } from '../theme';
import { INCOME, money, txTitle, findTransactions, groupByDay, dayLabel } from '../logic';
import { MonthNav } from './Dashboard';

const PAGE = 100; // rows drawn at a time, so a search over years of data stays quick

// category and setCategory live in the app state, so Home can open this list on one category.
export default function Activity({ data, period, setPeriod, onEdit, category = 'All', setCategory }) {
  const c = useTheme();
  const [q, setQ] = useState('');
  const [method, setMethod] = useState('All');
  const [limit, setLimit] = useState(PAGE);
  const cats = ['All', ...data.budgets.map((b) => b.category), INCOME];
  // A category can be renamed or removed while it is the chosen filter.
  const cat = cats.includes(category) ? category : 'All';
  const searching = q.trim().length > 0;
  const filtered = cat !== 'All' || method !== 'All' || searching;

  const list = useMemo(
    () => findTransactions(data.transactions, { year: period.year, month: period.month, q, category: cat, method }),
    [data.transactions, period.year, period.month, q, cat, method],
  );
  const groups = useMemo(() => groupByDay(list.slice(0, limit)), [list, limit]);
  const spent = list.reduce((a, t) => a + (t.category === INCOME ? 0 : t.amount), 0);
  const income = list.reduce((a, t) => a + (t.category === INCOME ? t.amount : 0), 0);

  const search = (v) => { setQ(v); setLimit(PAGE); };
  const clear = () => { search(''); setCategory('All'); setMethod('All'); };

  return (
    <Screen>
      <MonthNav period={period} setPeriod={setPeriod} />
      <Field value={q} onChangeText={search} placeholder="Search all months: store, notes, amount" autoCapitalize="none" autoCorrect={false}
        clearButtonMode="while-editing" returnKeyType="search" accessibilityLabel="Search transactions" />
      <ChipRow>{cats.map((x) => <Chip key={x} label={x} active={cat === x} onPress={() => setCategory(x)} />)}</ChipRow>
      <ChipRow>{['All', ...data.methods].map((x) => <Chip key={x} label={x === 'All' ? 'Any method' : x} active={method === x} onPress={() => setMethod(x)} />)}</ChipRow>
      <Row style={{ justifyContent: 'space-between', paddingHorizontal: 4, gap: 8 }}>
        <T size={13} muted style={{ flexShrink: 1 }}>
          {list.length} {list.length === 1 ? 'item' : 'items'}{searching ? ' in all months' : filtered ? ' matching' : ''}
        </T>
        <T size={13} weight="700">
          {money(spent)} spent{income > 0 ? <T size={13} weight="700" color={c.good}>{`  +${money(income)} in`}</T> : null}
        </T>
      </Row>
      {filtered ? (
        <Pressable onPress={clear} accessibilityRole="button" hitSlop={6} style={{ alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 4 }}>
          <Icon name="close-circle" size={16} color={c.accent} />
          <T size={13} weight="600" color={c.accent}>Clear search and filters</T>
        </Pressable>
      ) : null}
      {groups.length === 0 ? (
        <Card><T muted>{searching ? `Nothing matches "${q.trim()}".` : filtered ? 'Nothing matches these filters this month.' : 'Nothing here for this month.'}</T></Card>
      ) : groups.map((g) => (
        <View key={g.date}>
          <Row style={{ justifyContent: 'space-between', marginBottom: 6, marginHorizontal: 4 }}>
            <T size={12} muted weight="700">{dayLabel(g.date)}</T>
            {g.items.length > 1 || (g.spent > 0 && g.income > 0) ? (
              <T size={12} muted>{[g.spent > 0 ? money(g.spent) : null, g.income > 0 ? `+${money(g.income)}` : null].filter(Boolean).join('  ·  ')}</T>
            ) : null}
          </Row>
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
      {list.length > limit ? (
        <Btn title={`Show more (${list.length - limit} left)`} kind="soft" onPress={() => setLimit(limit + PAGE)} />
      ) : null}
      <T size={12} muted style={{ textAlign: 'center' }}>Tap an item to edit or delete it. $0.00 items need an amount.</T>
    </Screen>
  );
}
