import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { upcomingReminders, money } from './logic';

const native = Platform.OS !== 'web';
const CHANNEL_ALERTS = 'budget-alerts';
const CHANNEL_BILLS = 'bill-reminders';

if (native) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: false, shouldSetBadge: false }),
  });
}

let ready = null;
export function setupNotifications() {
  if (!native) return Promise.resolve(false);
  if (!ready) {
    ready = (async () => {
      try {
        if (Platform.OS === 'android') {
          await Notifications.setNotificationChannelAsync(CHANNEL_ALERTS, { name: 'Budget alerts', importance: Notifications.AndroidImportance.HIGH });
          await Notifications.setNotificationChannelAsync(CHANNEL_BILLS, { name: 'Bill reminders', importance: Notifications.AndroidImportance.DEFAULT });
        }
        const cur = await Notifications.getPermissionsAsync();
        if (cur.status === 'granted') return true;
        const req = await Notifications.requestPermissionsAsync();
        return req.status === 'granted';
      } catch {
        return false;
      }
    })();
  }
  return ready;
}

export async function sendBudgetAlert(alert) {
  if (!native || !(await setupNotifications())) return;
  try {
    await Notifications.scheduleNotificationAsync({ content: { title: alert.title, body: alert.body }, trigger: null });
  } catch {
    // ignore
  }
}

// iOS keeps at most 64 scheduled notifications per app and silently drops the rest.
// Stay under that, soonest first; the list is refreshed every time the app opens.
const MAX_SCHEDULED = 60;

export async function rescheduleBillReminders(recurring, enabled, daysBefore) {
  if (!native) return 0;
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
    if (!enabled) return 0;
    const list = upcomingReminders(recurring, daysBefore).slice(0, MAX_SCHEDULED);
    // Only ask for permission once there is something to remind about.
    if (list.length === 0) return 0;
    if (!(await setupNotifications())) return 0;
    const now = Date.now();
    let n = 0;
    for (const r of list) {
      const [y, m, d] = r.remindOn.split('-').map(Number);
      const when = new Date(y, m - 1, d, 9, 0, 0);
      if (when.getTime() <= now) continue;
      const days = daysBefore === 0 ? 'today' : daysBefore === 1 ? 'tomorrow' : `in ${daysBefore} days`;
      await Notifications.scheduleNotificationAsync({
        content: { title: `${r.name} is due ${days}`, body: `${money(r.cost)} on ${r.due}` },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: when, channelId: CHANNEL_BILLS },
      });
      n += 1;
    }
    return n;
  } catch {
    return 0;
  }
}
