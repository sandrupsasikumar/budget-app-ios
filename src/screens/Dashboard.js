import React, { useMemo, useState } from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { Card, H, Bar, Pill, Screen, T, Row, Icon, Chip, Btn } from '../ui';
import { useTheme, statusColor } from '../theme';
import { isWeb, isIos, isInstalledWebApp } from '../platform';
import { exportBackup } from '../dataio';
import {
  dashboard, yearTable, heatmap, monthSummary, trend, categoryBreakdown, upcomingBills,
  money, percent, MONTHS, todayString, txTitle,
} from '../logic';

export function MonthNav({ period, setPeriod }) {
  const c = useTheme();
  const { year, month } = period;
  const go = (d) => {
    let m = month + d, y = year;
    if (m < 1) { m = 12; y -= 1; }
    if (m > 12) { m = 1; y += 1; }
    setPeriod({ year: y, month: m });
  };
  return (
    <Row style={{ justifyContent: 'space-between' }}>
      <Pressable accessibilityLabel="Previous month" onPress={() => go(-1)} hitSlop={12} style={{ padding: 6 }}>
        <Icon name="chevron-back" size={24} color={c.accent} />
      </Pressable>
      <Text style={{ fontSize: 20, fontWeight: '800', color: c.text }}>{MONTHS[month - 1]} {year}</Text>
      <Pressable accessibilityLabel="Next month" onPress={() => go(1)} hitSlop={12} style={{ padding: 6 }}>
        <Icon name="chevron-forward" size={24} color={c.accent} />
      </Pressable>
    </Row>
  );
}

function Tile({ label, value, color }) {
  const c = useTheme();
  return (
    <View style={{ flexBasis: '47%', flexGrow: 1, backgroundColor: c.card, borderRadius: 16, borderWidth: 1, borderColor: c.line, padding: 12 }}>
      <Text style={{ fontSize: 11, color: c.muted, fontWeight: '700', letterSpacing: 0.6 }}>{label}</Text>
      <Text style={{ fontSize: 21, fontWeight: '800', color: color || c.text, marginTop: 4 }}>{value}</Text>
    </View>
  );
}

function Summary({ data, period, d }) {
  const c = useTheme();
  const sm = useMemo(() => monthSummary(data, period.year, period.month), [data, period]);
  const change = sm.change;
  return (
    <Card style={{ backgroundColor: c.accentSoft, borderColor: c.accentSoft }}>
      <T size={13} color={c.accent} weight="700">{d.daysLeft > 0 ? `${d.daysLeft} days left this month` : 'Month summary'}</T>
      <Text style={{ fontSize: 30, fontWeight: '800', color: c.text, marginTop: 4 }}>
        {money(Math.max(0, d.totals.remaining))}
        <Text style={{ fontSize: 15, fontWeight: '600', color: c.muted }}> {d.totals.remaining < 0 ? 'over budget' : 'left to spend'}</Text>
      </Text>
      {d.totals.perDay > 0 && (
        <T size={14} muted>About {money(d.totals.perDay)} a day for the rest of the month</T>
      )}
      {d.totals.remaining < 0 && <T size={14} color={c.bad} weight="700">{money(-d.totals.remaining)} over your total budget</T>}
      <View style={{ marginTop: 10, gap: 4 }}>
        {sm.top && <T size={13} muted>Most spent on <T size={13} weight="700">{sm.top.category}</T> ({percent(sm.top.share)} of spending)</T>}
        {sm.biggest && <T size={13} muted>Biggest purchase <T size={13} weight="700">{txTitle(sm.biggest)}</T>, {money(sm.biggest.amount)}</T>}
        {change != null && d.daysLeft > 0 && (
          <T size={13} muted>
            So far you have spent <T size={13} weight="700" color={sm.total > sm.prev ? c.bad : c.text}>{percent(sm.total / sm.prev)}</T> of last month&apos;s total ({money(sm.prev)})
          </T>
        )}
        {change != null && d.daysLeft === 0 && (
          <T size={13} muted>
            Spending was <T size={13} weight="700" color={change > 0 ? c.bad : c.good}>{percent(Math.abs(change))} {change > 0 ? 'higher' : 'lower'}</T> than the month before
          </T>
        )}
      </View>
    </Card>
  );
}

function LeftToSpend({ d }) {
  const c = useTheme();
  const [showAll, setShowAll] = useState(false);
  const rows = showAll ? d.rows : d.rows.filter((r) => r.budget > 0 || r.actual > 0);
  return (
    <Card>
      <H sub={d.daysLeft > 0 ? 'What is left in each category, and what that means per day' : 'How each category finished'}
        right={<Pill text={d.totals.status} status={d.totals.status} />}>Left to spend</H>
      {rows.map((r) => {
        const over = r.remaining < 0;
        return (
          <View key={r.category} style={{ paddingVertical: 10, borderTopWidth: 1, borderTopColor: c.line }}>
            <Row style={{ justifyContent: 'space-between' }}>
              <Row style={{ flex: 1, gap: 6 }}>
                <T weight="700">{r.category}</T>
                {r.rollover && <Icon name="repeat" size={14} color={c.muted} accessibilityLabel="Rollover on" />}
              </Row>
              <T weight="800" color={over ? c.bad : c.text}>{over ? `${money(-r.remaining)} over` : `${money(r.remaining)} left`}</T>
            </Row>
            <View style={{ marginVertical: 6 }}><Bar value={r.actual} max={r.available} status={r.status} /></View>
            <Row style={{ justifyContent: 'space-between' }}>
              <T size={12} muted>
                {money(r.actual)} of {money(r.available)}
                {r.carry !== 0 ? ` (${r.carry > 0 ? '+' : ''}${money(r.carry)} carried)` : ''}
              </T>
              <T size={12} color={statusColor(c, r.status)} weight="700">
                {r.perDay > 0 ? `${money(r.perDay)}/day` : r.status === '-' ? '' : r.status}
              </T>
            </Row>
            <T size={11} muted style={{ marginTop: 2 }}>Year to date {money(r.ytdActual)} of {money(r.ytdBudget)}</T>
          </View>
        );
      })}
      <Pressable onPress={() => setShowAll((v) => !v)} style={{ paddingTop: 10 }}>
        <T size={13} color={c.accent} weight="700">{showAll ? 'Hide empty categories' : 'Show all categories'}</T>
      </Pressable>
    </Card>
  );
}

function Upcoming({ data }) {
  const c = useTheme();
  const list = upcomingBills(data.recurring, todayString(), 4);
  if (!list.length) return null;
  return (
    <Card>
      <H>Coming up</H>
      {list.map((b) => (
        <Row key={b.name + b.due} style={{ paddingVertical: 6, gap: 10 }}>
          <Icon name="calendar-outline" size={18} color={c.muted} />
          <T style={{ flex: 1 }}>{b.name}</T>
          <T size={13} muted>{b.due}</T>
          <T weight="700" style={{ width: 80, textAlign: 'right' }}>{money(b.cost)}</T>
        </Row>
      ))}
    </Card>
  );
}

function Trends({ data, period }) {
  const c = useTheme();
  const rows = useMemo(() => trend(data, period.year, period.month, 6), [data, period]);
  const max = Math.max(1, ...rows.flatMap((r) => [r.spending, r.income]));
  const avg = rows.reduce((a, r) => a + r.spending, 0) / rows.length;
  return (
    <Card>
      <H sub={`Last 6 months. Average spending ${money(avg)}`}>Trend</H>
      <Row style={{ alignItems: 'flex-end', height: 140, gap: 6 }}>
        {rows.map((r) => (
          <View key={r.label + r.year} style={{ flex: 1, alignItems: 'center', justifyContent: 'flex-end', height: '100%' }}>
            <Row style={{ alignItems: 'flex-end', gap: 3, height: 118 }}>
              <View style={{ width: 11, height: Math.max(2, (r.income / max) * 118), backgroundColor: c.income, borderRadius: 3 }} />
              <View style={{ width: 11, height: Math.max(2, (r.spending / max) * 118), backgroundColor: r.spending > r.income && r.income > 0 ? c.bad : c.accent, borderRadius: 3 }} />
            </Row>
            <T size={11} muted weight={r.month === period.month && r.year === period.year ? '800' : '400'} style={{ marginTop: 4 }}>{r.label}</T>
          </View>
        ))}
      </Row>
      <Row style={{ gap: 14, marginTop: 8 }}>
        <Row style={{ gap: 4 }}><View style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: c.income }} /><T size={12} muted>Income</T></Row>
        <Row style={{ gap: 4 }}><View style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: c.accent }} /><T size={12} muted>Spending</T></Row>
      </Row>
    </Card>
  );
}

function Breakdown({ data, period }) {
  const c = useTheme();
  const rows = useMemo(() => categoryBreakdown(data, period.year, period.month), [data, period]);
  if (!rows.length) return null;
  const max = rows[0].amount;
  return (
    <Card>
      <H>Where the money went</H>
      {rows.map((r) => (
        <View key={r.category} style={{ marginBottom: 8 }}>
          <Row style={{ justifyContent: 'space-between', marginBottom: 4 }}>
            <T size={14}>{r.category}</T>
            <T size={14} weight="700">{money(r.amount)} <T size={12} muted>{percent(r.share)}</T></T>
          </Row>
          <Bar value={r.amount} max={max} color={c.accent} height={6} />
        </View>
      ))}
    </Card>
  );
}

function YearTable({ data, period }) {
  const c = useTheme();
  const yr = useMemo(() => yearTable(data, period.year), [data, period.year]);
  const cell = (v, bold, color) => (
    <Text style={{ flex: 1, textAlign: 'right', fontSize: 13, fontWeight: bold ? '800' : '400', color: color || c.text }}>{v}</Text>
  );
  return (
    <Card>
      <H>Year at a glance, {period.year}</H>
      <Row style={{ paddingBottom: 6 }}>
        {['Month', 'Income', 'Spent', 'Net', 'Rate'].map((h, i) => (
          <Text key={h} style={{ flex: i === 0 ? 0.8 : 1, fontSize: 11, color: c.muted, fontWeight: '700', textAlign: i === 0 ? 'left' : 'right' }}>{h}</Text>
        ))}
      </Row>
      {yr.months.map((m) => (
        <Row key={m.month} style={{ paddingVertical: 5, borderTopWidth: 1, borderTopColor: c.line, backgroundColor: m.month === period.month ? c.accentSoft : 'transparent' }}>
          <Text style={{ flex: 0.8, color: c.text, fontWeight: '600' }}>{m.label}</Text>
          {cell(Math.round(m.income))}
          {cell(Math.round(m.spending))}
          {cell(Math.round(m.net), false, m.net < 0 ? c.bad : undefined)}
          {cell(m.rate == null ? '' : percent(m.rate), false, c.muted)}
        </Row>
      ))}
      <Row style={{ paddingTop: 8, borderTopWidth: 1, borderTopColor: c.line }}>
        <Text style={{ flex: 0.8, fontWeight: '800', color: c.text }}>Total</Text>
        {cell(Math.round(yr.total.income), true)}
        {cell(Math.round(yr.total.spending), true)}
        {cell(Math.round(yr.total.net), true)}
        {cell(yr.total.rate == null ? '' : percent(yr.total.rate), true, c.muted)}
      </Row>
    </Card>
  );
}

function Heatmap({ data, period }) {
  const c = useTheme();
  const heat = useMemo(() => heatmap(data, period.year), [data, period.year]);
  const rgb = c.mode === 'dark' ? '63,178,135' : '31,122,90';
  return (
    <Card>
      <H sub="Swipe sideways to see every month">Category by month</H>
      <ScrollView horizontal showsHorizontalScrollIndicator>
        <View>
          <Row>
            <Text style={{ width: 110, fontSize: 11, color: c.muted, fontWeight: '700' }}>Category</Text>
            {MONTHS.map((m) => <Text key={m} style={{ width: 50, textAlign: 'center', fontSize: 11, color: c.muted, fontWeight: '700' }}>{m.slice(0, 3)}</Text>)}
            <Text style={{ width: 62, textAlign: 'right', fontSize: 11, color: c.muted, fontWeight: '700' }}>Total</Text>
          </Row>
          {heat.grid.map((g) => (
            <Row key={g.category} style={{ marginTop: 3 }}>
              <Text numberOfLines={1} style={{ width: 110, fontSize: 12, color: c.text }}>{g.category}</Text>
              {g.cells.map((v, i) => {
                const a = heat.max === 0 ? 0 : Math.min(1, v / heat.max);
                return (
                  <View key={i} style={{ width: 50, height: 26, alignItems: 'center', justifyContent: 'center', backgroundColor: v === 0 ? 'transparent' : `rgba(${rgb},${0.15 + a * 0.75})` }}>
                    <Text style={{ fontSize: 11, color: a > 0.5 ? '#fff' : c.text }}>{v === 0 ? '' : Math.round(v)}</Text>
                  </View>
                );
              })}
              <Text style={{ width: 62, textAlign: 'right', fontSize: 12, fontWeight: '700', color: c.text }}>{Math.round(g.total)}</Text>
            </Row>
          ))}
        </View>
      </ScrollView>
    </Card>
  );
}

function readFlag(k) { try { return window.localStorage.getItem(k) === '1'; } catch { return false; } }
function writeFlag(k) { try { window.localStorage.setItem(k, '1'); } catch { /* ignore */ } }

// Fresh install: point to the two ways to get started.
function Welcome({ data }) {
  const c = useTheme();
  const empty = data.transactions.length === 0 && data.budgets.every((b) => !b.monthly);
  if (!empty) return null;
  return (
    <Card style={{ backgroundColor: c.accentSoft, borderColor: c.accentSoft }}>
      <T weight="800" size={17}>Welcome</T>
      <T size={14} style={{ marginTop: 4 }}>Moving from another phone? Export a full backup there, then on this one go to Budget, Import CSV or restore backup.</T>
      <T size={14} style={{ marginTop: 6 }}>Starting fresh? Set your income and monthly budgets on the Budget tab, then add expenses with the + button.</T>
    </Card>
  );
}

// iPhone only: how to install, shown in Safari until dismissed.
function InstallHint() {
  const c = useTheme();
  const [hidden, setHidden] = useState(() => !isWeb || !isIos() || isInstalledWebApp() || readFlag('hide-install-hint'));
  if (hidden) return null;
  return (
    <Card style={{ borderColor: c.accent }}>
      <Row style={{ gap: 10, alignItems: 'flex-start' }}>
        <Icon name="share-outline" size={22} color={c.accent} />
        <View style={{ flex: 1 }}>
          <T weight="700">Install on your iPhone</T>
          <T size={13} muted>Tap the Share button in Safari, then Add to Home Screen. It will open full screen like a normal app and work offline.</T>
        </View>
        <Pressable accessibilityLabel="Dismiss" hitSlop={10} onPress={() => { writeFlag('hide-install-hint'); setHidden(true); }}>
          <Icon name="close" size={20} color={c.muted} />
        </Pressable>
      </Row>
    </Card>
  );
}

// Web only: storage can be cleared by the browser, so nudge a backup every 7 days.
// Not needed when signed in, since the cloud copy is the backup.
function BackupNudge({ data, update, synced }) {
  const c = useTheme();
  if (!isWeb || synced) return null;
  const last = data.settings.lastBackup;
  const days = last ? Math.floor((new Date(todayString()) - new Date(last)) / 86400000) : null;
  if (days != null && days < 7) return null;
  const run = async () => {
    if (await exportBackup(data)) update((d) => ({ ...d, settings: { ...d.settings, lastBackup: todayString() } }));
  };
  return (
    <Card style={{ borderColor: c.warn }}>
      <Row style={{ gap: 10 }}>
        <Icon name="alert-circle" size={22} color={c.warn} />
        <View style={{ flex: 1 }}>
          <T weight="700">{last ? `Last backup ${days} days ago` : 'No backup yet'}</T>
          <T size={13} muted>Save a copy to Files or iCloud Drive so nothing is lost if the browser clears its storage.</T>
        </View>
      </Row>
      <Btn title="Back up now" icon="share-outline" style={{ marginTop: 10 }} onPress={run} />
    </Card>
  );
}

export default function Dashboard({ data, period, setPeriod, update, synced }) {
  const c = useTheme();
  const d = useMemo(() => dashboard(data, period.year, period.month, todayString()), [data, period]);
  const [view, setView] = useState('month');

  return (
    <Screen>
      <InstallHint />
      <Welcome data={data} />
      <BackupNudge data={data} update={update} synced={synced} />
      <MonthNav period={period} setPeriod={setPeriod} />
      <Summary data={data} period={period} d={d} />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
        <Tile label="INCOME" value={money(d.income)} color={c.income} />
        <Tile label="SPENT" value={money(d.spending)} />
        <Tile label="NET SAVED" value={money(d.net)} color={d.net < 0 ? c.bad : c.good} />
        <Tile label="SAVINGS RATE" value={percent(d.savingsRate, 1)} color={d.savingsRate < 0 ? c.bad : c.text} />
      </View>
      {d.unmatched !== 0 && (
        <Card style={{ borderColor: c.warn }}>
          <T>{money(d.unmatched)} this month is in a category that is not in your budget. Check Activity.</T>
        </Card>
      )}
      <Row style={{ gap: 8 }}>
        <Chip label="This month" icon="wallet-outline" active={view === 'month'} onPress={() => setView('month')} />
        <Chip label="Charts" icon="pie-chart-outline" active={view === 'charts'} onPress={() => setView('charts')} />
        <Chip label="Year" icon="calendar-outline" active={view === 'year'} onPress={() => setView('year')} />
      </Row>
      {view === 'month' && (<><LeftToSpend d={d} /><Upcoming data={data} /></>)}
      {view === 'charts' && (<><Trends data={data} period={period} /><Breakdown data={data} period={period} /></>)}
      {view === 'year' && (<><YearTable data={data} period={period} /><Heatmap data={data} period={period} /></>)}
    </Screen>
  );
}
