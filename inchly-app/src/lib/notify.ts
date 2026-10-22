import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import type { Reminder } from './reminders';

// Local notifications on this phone: the "next time" reminder, deadlines and
// the daily goal. They need no server, and work in Expo Go. Not on the web.

export const canNotify = Platform.OS !== 'web';

let configured = false;
export function configureNotifications() {
  if (!canNotify || configured) return;
  configured = true;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: false, shouldSetBadge: false }),
  });
  if (Platform.OS === 'android') {
    Notifications.setNotificationChannelAsync('default', { name: 'お知らせ', importance: Notifications.AndroidImportance.DEFAULT }).catch(() => {});
  }
}

/** Whether we may notify. Asks once when `ask` is set and the system still lets us. */
export async function notificationsAllowed(ask: boolean): Promise<boolean> {
  if (!canNotify) return false;
  try {
    const cur = await Notifications.getPermissionsAsync();
    if (cur.granted) return true;
    if (!ask || !cur.canAskAgain) return false;
    return (await Notifications.requestPermissionsAsync()).granted;
  } catch {
    return false;
  }
}

export async function cancelReminder(id: string) {
  if (!canNotify) return;
  await Notifications.cancelScheduledNotificationAsync(id).catch(() => {});
}

/** Schedules (or replaces) one reminder by its id. Resolves false if it couldn't be scheduled. */
export async function scheduleReminder(r: Reminder): Promise<boolean> {
  if (!canNotify || r.at.getTime() <= Date.now()) return false;
  try {
    await cancelReminder(r.id);
    await Notifications.scheduleNotificationAsync({
      identifier: r.id,
      content: { title: r.title, body: r.body },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: r.at, channelId: 'default' },
    });
    return true;
  } catch {
    return false;
  }
}

/** Makes the scheduled reminders whose ids start with `prefix` exactly `list`. */
export async function replaceReminders(prefix: string, list: Reminder[]) {
  if (!canNotify) return;
  try {
    const keep = new Set(list.map((r) => r.id));
    const all = await Notifications.getAllScheduledNotificationsAsync();
    await Promise.all(all.filter((n) => n.identifier.startsWith(prefix) && !keep.has(n.identifier)).map((n) => cancelReminder(n.identifier)));
    for (const r of list) await scheduleReminder(r);
  } catch {
    // reminders are a convenience; the app works without them
  }
}
