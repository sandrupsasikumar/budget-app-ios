import React from 'react';
import { View } from 'react-native';
import { Card, H, Btn, Chip, Field, Screen, T, Row, Toggle, Icon, useNumberText } from '../ui';
import { useTheme } from '../theme';
import { money, percent, todayString } from '../logic';
import { freshData } from '../storage';
import { exportCsv, exportBackup, importFile } from '../dataio';
import { confirmAction, isWeb } from '../platform';

function BudgetRow({ b, onChange }) {
  const c = useTheme();
  const [text, setText] = useNumberText(b.monthly);
  return (
    <View style={{ paddingVertical: 10, borderTopWidth: 1, borderTopColor: c.line, gap: 6 }}>
      <Row style={{ gap: 8 }}>
        <T weight="700" style={{ flex: 1 }}>{b.category}</T>
        <Field style={{ width: 100 }} value={text} keyboardType="decimal-pad" accessibilityLabel={`${b.category} monthly budget`}
          onChangeText={(v) => { setText(v); const n = parseFloat(v); if (!Number.isNaN(n) && n >= 0) onChange({ ...b, monthly: n }); }} />
      </Row>
      <Row style={{ gap: 6 }}>
        {['Fixed', 'Flexible'].map((t) => <Chip key={t} label={t} active={b.type === t} onPress={() => onChange({ ...b, type: t })} />)}
        <Chip label="Rollover" icon="repeat" active={!!b.rollover} onPress={() => onChange({ ...b, rollover: !b.rollover })} />
      </Row>
    </View>
  );
}

function Account({ account }) {
  const c = useTheme();
  if (!account.cloudAvailable) return null;
  const { user, syncStatus } = account;
  const signOut = () => confirmAction('Sign out?', 'Your data stays in your account and is removed from this device until you sign in again.', 'Sign out', account.signOut);

  return (
    <Card style={{ gap: 10 }}>
      <H>Account</H>
      {user ? (
        <>
          <Row style={{ gap: 8 }}>
            <Icon name={syncStatus === 'error' ? 'cloud-offline-outline' : 'cloud-done-outline'} size={20} color={syncStatus === 'error' ? c.bad : c.good} />
            <View style={{ flex: 1 }}>
              <T weight="700">{user.email || 'Signed in'}</T>
              <T size={12} muted>
                {syncStatus === 'error' ? 'Last sync failed. Changes are kept on this device and will retry.' : syncStatus === 'syncing' ? 'Syncing...' : 'Synced with the cloud.'}
              </T>
            </View>
          </Row>
          <Btn title="Sign out" kind="ghost" onPress={signOut} />
        </>
      ) : (
        <>
          <T size={13} muted>Your data is only on this device{isWeb ? ', and Safari can clear it' : ''}. Sign in to back it up and sync it.</T>
          <Btn title="Sign in or create an account" icon="person-circle-outline" kind="soft" onPress={account.startSignIn} />
        </>
      )}
    </Card>
  );
}

export default function Budget({ data, update, replaceAll, reminderCount, account }) {
  const synced = !!account?.user;
  const total = data.budgets.reduce((a, b) => a + b.monthly, 0);
  const income = data.settings.expectedIncome;
  const [incText, setIncText] = useNumberText(income);
  const [thrText, setThrText] = useNumberText(data.settings.warnThreshold, (v) => String(Math.round(v * 100)), (t) => parseFloat(t) / 100);
  const setSetting = (k, v) => update((d) => ({ ...d, settings: { ...d.settings, [k]: v } }));

  const backup = async () => {
    if (await exportBackup(data)) setSetting('lastBackup', todayString());
  };
  const reset = () => confirmAction('Erase all data?',
    `This deletes every expense, budget, goal and plan ${synced ? 'on this device and in your cloud account' : 'on this device'}. Export a backup first if you need one.`,
    'Erase', () => replaceAll(freshData()));

  return (
    <Screen>
      {account ? <Account account={account} /> : null}
      <Card style={{ gap: 12 }}>
        <H>Targets</H>
        <Field label="Expected monthly income ($)" value={incText} keyboardType="decimal-pad"
          onChangeText={(v) => { setIncText(v); const n = parseFloat(v); if (!Number.isNaN(n) && n >= 0) setSetting('expectedIncome', n); }} />
        <Field label="Warn me when a budget reaches this %" value={thrText} keyboardType="number-pad"
          onChangeText={(v) => { setThrText(v); const n = parseFloat(v); if (!Number.isNaN(n) && n > 0 && n <= 100) setSetting('warnThreshold', n / 100); }} />
        <Row style={{ justifyContent: 'space-between' }}>
          <T muted>Planned savings</T>
          <T weight="700">{money(income - total)} ({income === 0 ? '0%' : percent((income - total) / income, 1)})</T>
        </Row>
      </Card>

      <Card>
        <H right={<T weight="800">{money(total)} / month</T>}
          sub="Rollover carries unspent money (or overspending) from earlier months this year into the current month.">Monthly budgets</H>
        {data.budgets.map((b, i) => (
          <BudgetRow key={b.category} b={b} onChange={(nb) => update((d) => ({ ...d, budgets: d.budgets.map((x, j) => (j === i ? nb : x)) }))} />
        ))}
        <T size={12} muted style={{ marginTop: 8 }}>Annual total {money(total * 12)}</T>
      </Card>

      <Card style={{ gap: 6 }}>
        <H>Settings</H>
        <T size={12} muted>Appearance</T>
        <Row style={{ gap: 8, marginBottom: 8 }}>
          {[['system', 'Match phone'], ['light', 'Light'], ['dark', 'Dark']].map(([k, l]) => (
            <Chip key={k} label={l} icon={k === 'dark' ? 'moon-outline' : k === 'light' ? 'sunny-outline' : undefined}
              active={data.settings.theme === k} onPress={() => setSetting('theme', k)} />
          ))}
        </Row>
        <Toggle label="Budget alerts" sub={isWeb ? 'Show a warning after you save an expense that takes a category near or over budget' : 'Notify me when a category nears or goes over its budget'}
          value={data.settings.budgetAlerts} onChange={(v) => setSetting('budgetAlerts', v)} />
        {isWeb ? (
          <T size={12} muted style={{ marginTop: 4 }}>Bill reminder notifications need the phone app. Bills with a due date still show under Coming up on Home.</T>
        ) : (
          <>
            <Toggle label="Bill reminders" sub={`For subscriptions and bills with a due date on the Plan tab${data.settings.billReminders ? ` (${reminderCount} scheduled)` : ''}`}
              value={data.settings.billReminders} onChange={(v) => setSetting('billReminders', v)} />
            {data.settings.billReminders && (
              <>
                <T size={12} muted>Remind me</T>
                <Row style={{ gap: 8, flexWrap: 'wrap' }}>
                  {[0, 1, 2, 3, 7].map((n) => (
                    <Chip key={n} label={n === 0 ? 'On the day' : `${n} day${n > 1 ? 's' : ''} before`}
                      active={data.settings.remindDaysBefore === n} onPress={() => setSetting('remindDaysBefore', n)} />
                  ))}
                </Row>
              </>
            )}
          </>
        )}
      </Card>

      <Card style={{ gap: 10 }}>
        <H sub={`${synced ? 'Stored on this device and synced to your cloud account.' : 'Everything is stored on this device.'} The CSV matches the columns of your Transactions sheet (with Store added at the end), so you can paste it into Google Sheets.`}>Data</H>
        <Btn title="Export transactions (CSV)" icon="share-outline" onPress={() => exportCsv(data)} />
        <Btn title="Export full backup" kind="soft" onPress={backup} />
        <Btn title="Import CSV or restore backup" kind="soft" onPress={() => importFile(data, { update, replaceAll })} />
        <Btn title="Erase all data" kind="ghost" onPress={reset} />
        <T size={12} muted>
          {data.transactions.length} transactions stored. Last backup: {data.settings.lastBackup || 'never'}
          {isWeb && !synced ? '. On iPhone, keep a backup in Files or iCloud Drive in case Safari clears the app\'s storage.' : ''}
        </T>
      </Card>
    </Screen>
  );
}
