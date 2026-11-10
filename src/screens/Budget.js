import React, { useState } from 'react';
import { View, Pressable } from 'react-native';
import { Card, H, Btn, Chip, Field, Screen, T, Row, Toggle, Icon, useNumberText } from '../ui';
import { useTheme } from '../theme';
import {
  money, percent, todayString, dayLabel, FALLBACK_CATEGORY, categoryCount, categoryProblem, addCategory, renameCategory,
  removeCategoryProblem, removeCategory,
} from '../logic';
import { freshData } from '../storage';
import { exportCsv, exportBackup, importFile } from '../dataio';
import { confirmAction, isWeb, say } from '../platform';

// count: transactions in this category. onRename(name) returns a message when the name cannot be used.
function BudgetRow({ b, count, onChange, onRename, onRemove }) {
  const c = useTheme();
  const [text, setText] = useNumberText(b.monthly);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(b.category);
  const [problem, setProblem] = useState(null);
  const toggle = () => { setEditing((v) => !v); setName(b.category); setProblem(null); };
  const saveName = () => {
    const p = onRename(name);
    setProblem(p);
    if (!p) setEditing(false);
  };
  return (
    <View style={{ paddingVertical: 10, borderTopWidth: 1, borderTopColor: c.line, gap: 6 }}>
      <Row style={{ gap: 8 }}>
        <Pressable onPress={toggle} accessibilityRole="button" accessibilityLabel={`Rename or delete ${b.category}`} hitSlop={6}
          style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <T weight="700" style={{ flexShrink: 1 }}>{b.category}</T>
          <Icon name={editing ? 'chevron-up' : 'create-outline'} size={16} color={c.muted} />
        </Pressable>
        <Field style={{ width: 100 }} value={text} keyboardType="decimal-pad" accessibilityLabel={`${b.category} monthly budget`}
          onChangeText={(v) => { setText(v); const n = parseFloat(v); if (!Number.isNaN(n) && n >= 0) onChange({ ...b, monthly: n }); }} />
      </Row>
      <Row style={{ gap: 6 }}>
        {['Fixed', 'Flexible'].map((t) => <Chip key={t} label={t} active={b.type === t} onPress={() => onChange({ ...b, type: t })} />)}
        <Chip label="Rollover" icon="repeat" active={!!b.rollover} onPress={() => onChange({ ...b, rollover: !b.rollover })} />
      </Row>
      {editing && (
        <View style={{ gap: 8, padding: 10, borderRadius: 12, backgroundColor: c.raised }}>
          <Field label="Category name" value={name} onChangeText={(v) => { setName(v); setProblem(null); }} autoCapitalize="words" maxLength={30} />
          {problem ? <T size={13} color={c.bad}>{problem}</T> : null}
          <T size={12} muted>
            {count ? `Used by ${count} transaction${count === 1 ? '' : 's'}. Renaming updates all of them.` : 'No transactions use this category yet.'}
          </T>
          <Row style={{ gap: 8 }}>
            <Btn style={{ flex: 1 }} title="Save name" onPress={saveName} disabled={name.trim() === b.category} />
            <Btn title="Delete" kind="ghost" icon="trash-outline" onPress={onRemove} />
          </Row>
        </View>
      )}
    </View>
  );
}

function NewCategory({ data, onAdd }) {
  const c = useTheme();
  const [name, setName] = useState('');
  const [problem, setProblem] = useState(null);
  const add = () => {
    const p = categoryProblem(data, name);
    setProblem(p);
    if (p) return;
    onAdd(name);
    setName('');
  };
  return (
    <View style={{ paddingTop: 10, borderTopWidth: 1, borderTopColor: c.line, gap: 6 }}>
      <Row style={{ gap: 8, alignItems: 'flex-end' }}>
        <Field style={{ flex: 1 }} label="New category" value={name} onChangeText={(v) => { setName(v); setProblem(null); }}
          placeholder="e.g. Pets" autoCapitalize="words" maxLength={30} returnKeyType="done" onSubmitEditing={add} />
        <Btn title="Add" icon="add" kind="soft" onPress={add} disabled={!name.trim()} />
      </Row>
      {problem ? <T size={13} color={c.bad}>{problem}</T> : null}
    </View>
  );
}

// What the Account card says about syncing, and how it looks.
function syncInfo(account, c) {
  const { syncStatus, syncError, online } = account;
  if (!online) return { icon: 'cloud-offline-outline', color: c.muted, text: 'Offline. Changes are saved on this device and sync when you are back online.' };
  if (syncStatus === 'syncing') return { icon: 'cloud-upload-outline', color: c.muted, text: 'Syncing...' };
  if (syncStatus === 'error') {
    const text = syncError === 'permission-denied' ? 'The cloud refused the last sync (permission denied). Check the Firestore rules in the Firebase console. Your changes are safe on this device.'
      : syncError === 'resource-exhausted' ? 'The free Firebase allowance is used up for today. Your changes are safe on this device and will sync later.'
      : `The last sync failed${syncError && syncError !== 'unknown' ? ` (${syncError})` : ''}. Your changes are safe on this device.`;
    return { icon: 'cloud-offline-outline', color: c.bad, text, retry: true };
  }
  return { icon: 'cloud-done-outline', color: c.good, text: 'Synced with the cloud.' };
}

function Account({ account }) {
  const c = useTheme();
  if (!account.cloudAvailable) return null;
  const { user } = account;
  const info = syncInfo(account, c);
  const signOut = () => {
    if (account.hasUnsynced()) {
      confirmAction('Some changes are not in the cloud yet', 'Signing out now could lose them. Go online and wait until this card says "Synced with the cloud", or sign out anyway.', 'Sign out anyway', account.signOut);
    } else {
      confirmAction('Sign out?', 'Your data stays in your account and is removed from this device until you sign in again.', 'Sign out', account.signOut);
    }
  };

  return (
    <Card style={{ gap: 10 }}>
      <H>Account</H>
      {user ? (
        <>
          <Row style={{ gap: 8 }}>
            <Icon name={info.icon} size={20} color={info.color} />
            <View style={{ flex: 1 }}>
              <T weight="700">{user.email || 'Signed in'}</T>
              <T size={12} muted>{info.text}</T>
            </View>
          </Row>
          {info.retry ? <Btn title="Try again" icon="refresh" kind="soft" onPress={account.retrySync} /> : null}
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

  const rename = (from, to) => {
    const p = categoryProblem(data, to, from);
    if (!p) update((d) => renameCategory(d, from, to));
    return p;
  };
  const remove = (name) => {
    const p = removeCategoryProblem(data, name);
    if (p) { say('This category cannot be deleted yet', p); return; }
    const n = categoryCount(data, name);
    confirmAction(`Delete ${name}?`,
      n ? `Its ${n} transaction${n === 1 ? ' is' : 's are'} kept and moved to ${FALLBACK_CATEGORY}.` : 'No transactions use it.',
      'Delete', () => update((d) => removeCategory(d, name)));
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
          sub="Tap a name to rename or delete it. Rollover carries unspent money (or overspending) from earlier months this year into the current month.">Monthly budgets</H>
        {data.budgets.map((b, i) => (
          <BudgetRow key={b.category} b={b} count={categoryCount(data, b.category)}
            onChange={(nb) => update((d) => ({ ...d, budgets: d.budgets.map((x, j) => (j === i ? nb : x)) }))}
            onRename={(name) => rename(b.category, name)} onRemove={() => remove(b.category)} />
        ))}
        <NewCategory data={data} onAdd={(name) => update((d) => addCategory(d, name))} />
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
          {data.transactions.length} transactions stored. Last backup: {data.settings.lastBackup ? dayLabel(data.settings.lastBackup) : 'never'}
          {isWeb && !synced ? '. On iPhone, keep a backup in Files or iCloud Drive in case Safari clears the app\'s storage.' : ''}
        </T>
      </Card>
    </Screen>
  );
}
