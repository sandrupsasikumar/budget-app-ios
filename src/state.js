import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { loadData, saveData, freshData } from './storage';
import { budgetAlert, migrate } from './logic';
import { sendBudgetAlert, rescheduleBillReminders } from './notify';
import { requestPersistentStorage } from './platform';
import { cloudAvailable, watchAuth, watchUserData, writeChanges, signInEmail, createAccount, signOutCloud } from './cloud';
import { splitData, joinData, diff, merge, firstSync, deepEqual } from './sync';

// App wide data store. The phone copy (AsyncStorage) is always kept so the app opens
// instantly and works offline. When signed in, changes also sync to Firestore.

const DataContext = createContext(null);
DataContext.displayName = 'DataContext';
export const useData = () => useContext(DataContext);

const MODE_KEY = 'budget-account-mode'; // 'local' once the person chooses phone-only
const BASE_KEY = 'budget-sync-base'; // { uid, base }: last state known to be in the cloud
const SAVE_DELAY = 600;
const SYNC_DELAY = 1200;

export function DataProvider({ children }) {
  const [data, setDataState] = useState(null);
  const [user, setUser] = useState(undefined); // undefined until Firebase reports
  const [mode, setMode] = useState(null);
  const [modeLoaded, setModeLoaded] = useState(false);
  const [syncStatus, setSyncStatus] = useState('idle'); // idle | syncing | error
  const [reminderCount, setReminderCount] = useState(0);
  const now = new Date();
  const [period, setPeriod] = useState({ year: now.getFullYear(), month: now.getMonth() + 1 });

  const dataRef = useRef(null);
  const baseRef = useRef(null); // { uid, base } or null
  const remoteRef = useRef({ meta: undefined, tx: undefined });
  const userRef = useRef(null);
  const saveTimer = useRef(null);
  const syncTimer = useRef(null);

  // Updates the ref straight away so sync code never reads a stale copy.
  const setData = useCallback((next) => {
    const v = typeof next === 'function' ? next(dataRef.current) : next;
    dataRef.current = v;
    setDataState(v);
  }, []);

  // ---- Local storage ----

  const persistNow = useCallback(() => {
    clearTimeout(saveTimer.current);
    if (dataRef.current) saveData(dataRef.current);
    AsyncStorage.setItem(BASE_KEY, JSON.stringify(baseRef.current)).catch(() => {});
  }, []);

  useEffect(() => {
    (async () => {
      const [d, m, b] = await Promise.all([
        loadData(),
        AsyncStorage.getItem(MODE_KEY).catch(() => null),
        AsyncStorage.getItem(BASE_KEY).catch(() => null),
      ]);
      try { baseRef.current = b ? JSON.parse(b) : null; } catch { baseRef.current = null; }
      dataRef.current = d;
      setDataState(d);
      setMode(m);
      setModeLoaded(true);
    })();
    requestPersistentStorage();
  }, []);

  // ---- Cloud sync ----

  const flush = useCallback(() => {
    clearTimeout(syncTimer.current);
    const u = userRef.current;
    const b = baseRef.current;
    if (!u || !dataRef.current || !b || b.uid !== u.uid) return;
    const local = splitData(dataRef.current);
    const changes = diff(b.base, local);
    if (changes.empty) return;
    baseRef.current = { uid: u.uid, base: local };
    persistNow();
    setSyncStatus('syncing');
    writeChanges(u.uid, changes)
      .then(() => setSyncStatus('idle'))
      .catch(() => setSyncStatus('error'));
  }, [persistNow]);

  // which: 'meta' or 'tx', the side that just changed in the cloud.
  const applyRemote = useCallback((which) => {
    const u = userRef.current;
    const { meta, tx, fromCache } = remoteRef.current;
    if (!u || meta === undefined || tx === undefined || !dataRef.current) return;
    const remote = { meta: meta || {}, tx };
    const local = splitData(dataRef.current);
    const b = baseRef.current;
    let next;
    if (!b || b.uid !== u.uid) {
      // First sync for this account on this phone: wait for the server's answer. An empty
      // offline cache would otherwise look like an empty account and get this phone's data.
      if (fromCache.meta || fromCache.tx) return;
      const first = firstSync(local, remote);
      next = first.next;
      baseRef.current = { uid: u.uid, base: first.base };
    } else {
      // The two listeners report separately, so only merge the side that changed.
      // Otherwise a fresh settings update next to a not yet updated transaction list
      // would briefly undo a transaction that was just added.
      const updated = which === 'meta' ? { meta: remote.meta, tx: b.base.tx } : { meta: b.base.meta, tx: remote.tx };
      next = merge(local, b.base, updated);
      baseRef.current = { uid: u.uid, base: updated };
    }
    if (!deepEqual(next, local)) {
      const joined = joinData(next);
      // Only replace when the cloud copy looks like app data.
      if (Array.isArray(joined.budgets)) setData(migrate(joined));
    }
    persistNow();
    clearTimeout(syncTimer.current);
    syncTimer.current = setTimeout(flush, 0);
  }, [flush, persistNow, setData]);

  useEffect(() => watchAuth((u) => { userRef.current = u; setUser(u); }), []);

  useEffect(() => {
    if (!user || !modeLoaded || !data) return undefined;
    remoteRef.current = { meta: undefined, tx: undefined, fromCache: { meta: true, tx: true } };
    const stop = watchUserData(user.uid, {
      onMeta: (m, cached) => {
        const r = remoteRef.current;
        remoteRef.current = { ...r, meta: m, fromCache: { ...r.fromCache, meta: cached } };
        applyRemote('meta');
      },
      onTx: (t, cached) => {
        const r = remoteRef.current;
        remoteRef.current = { ...r, tx: t, fromCache: { ...r.fromCache, tx: cached } };
        applyRemote('tx');
      },
      onError: () => setSyncStatus('error'),
    });
    return stop;
    // Subscribe once per signed in account, after local data has loaded.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid, modeLoaded, data === null]);

  // Save to the phone and queue an upload a moment after edits stop, rather than on every keystroke.
  useEffect(() => {
    if (!data) return;
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(persistNow, SAVE_DELAY);
    clearTimeout(syncTimer.current);
    syncTimer.current = setTimeout(flush, SYNC_DELAY);
  }, [data, persistNow, flush]);

  // iOS may suspend the app soon after it leaves the screen, so write everything out then.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => {
      if (s !== 'active') { persistNow(); flush(); }
    });
    return () => sub.remove();
  }, [persistNow, flush]);

  // ---- Bill reminders ----

  const recurring = data?.recurring;
  const billReminders = data?.settings.billReminders;
  const remindDaysBefore = data?.settings.remindDaysBefore;
  useEffect(() => {
    if (!recurring) return undefined;
    const t = setTimeout(() => {
      rescheduleBillReminders(recurring, billReminders, remindDaysBefore).then(setReminderCount);
    }, 800);
    return () => clearTimeout(t);
  }, [recurring, billReminders, remindDaysBefore]);

  // ---- Edits ----

  const update = useCallback((fn) => setData((d) => fn(d)), [setData]);

  const saveTx = useCallback((tx) => {
    const before = dataRef.current;
    const exists = before.transactions.some((t) => t.id === tx.id);
    const after = { ...before, transactions: exists ? before.transactions.map((t) => (t.id === tx.id ? tx : t)) : [...before.transactions, tx] };
    setData(after);
    if (exists || !before.settings.budgetAlerts) return null;
    const alert = budgetAlert(before, after, tx, before.settings.warnThreshold);
    if (alert) sendBudgetAlert(alert);
    return alert;
  }, [setData]);

  const delTx = useCallback((id) => update((d) => ({ ...d, transactions: d.transactions.filter((t) => t.id !== id) })), [update]);

  // ---- Account ----

  const chooseLocal = useCallback(async () => {
    await AsyncStorage.setItem(MODE_KEY, 'local').catch(() => {});
    setMode('local');
  }, []);

  // create: true makes a new account, false signs in to an existing one. Throws on failure.
  const signIn = useCallback(async (email, password, create) => {
    if (create) await createAccount(email, password);
    else await signInEmail(email, password);
    await AsyncStorage.removeItem(MODE_KEY).catch(() => {});
    setMode(null);
  }, []);

  // From "this device only" mode: show the sign in screen again.
  const startSignIn = useCallback(async () => {
    await AsyncStorage.removeItem(MODE_KEY).catch(() => {});
    setMode(null);
  }, []);

  // Signing out clears this device's copy; the data stays in the cloud account.
  const signOut = useCallback(async () => {
    flush();
    await signOutCloud();
    baseRef.current = null;
    setData(freshData());
    persistNow();
    setSyncStatus('idle');
  }, [flush, persistNow, setData]);

  const authReady = !cloudAvailable || user !== undefined;
  const ready = !!data && modeLoaded && authReady;
  const needsSignIn = ready && cloudAvailable && !user && mode !== 'local';

  const value = useMemo(() => ({
    data, setData, update, saveTx, delTx, period, setPeriod, reminderCount,
    ready, needsSignIn,
    account: { cloudAvailable, user: user || null, mode, syncStatus, signIn, signOut, chooseLocal, startSignIn },
  }), [data, setData, update, saveTx, delTx, period, reminderCount, ready, needsSignIn, user, mode, syncStatus, signIn, signOut, chooseLocal, startSignIn]);

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}
