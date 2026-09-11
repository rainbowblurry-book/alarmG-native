import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

const ALARM_CHANNEL_ID = 'clockguard-alarm';
const ALARM_NOTIFICATION_ID = 'clockguard-alarm-notification';
const ALARM_CATEGORY_ID = 'clockguard-alarm-category';

export async function ensureAlarmPermissions(): Promise<boolean> {
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  return finalStatus === 'granted';
}

export async function setupAlarmChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;

  await Notifications.setNotificationChannelAsync(ALARM_CHANNEL_ID, {
    name: 'Alarm',
    importance: Notifications.AndroidImportance.MAX,
    sound: true,
    vibrationPattern: [0, 500, 250, 500],
    lightColor: '#F5A623',
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    bypassDnd: true,
  });

  await Notifications.setNotificationCategoryAsync(ALARM_CATEGORY_ID, [
    {
      identifier: 'DISMISS_ACTION',
      buttonTitle: 'Dismiss',
      options: { opensAppToForeground: true },
    },
    {
      identifier: 'SNOOZE_ACTION',
      buttonTitle: 'Snooze',
      options: { opensAppToForeground: true },
    },
  ]);
}

export function computeNextTriggerDate(
  alarmHour: number,
  alarmMinute: number,
  repeatDays: number[]
): Date | null {
  if (!repeatDays || repeatDays.length === 0) return null;

  const now = new Date();

  for (let offset = 0; offset < 8; offset++) {
    const candidate = new Date(now);
    candidate.setDate(now.getDate() + offset);
    candidate.setHours(alarmHour, alarmMinute, 0, 0);

    const candidateDay = candidate.getDay();
    if (repeatDays.includes(candidateDay) && candidate.getTime() > now.getTime()) {
      return candidate;
    }
  }

  return null;
}

export async function scheduleAlarmNotification(
  alarmHour: number,
  alarmMinute: number,
  repeatDays: number[],
  wakeItemName: string
): Promise<void> {
  await cancelScheduledAlarm();

  const triggerDate = computeNextTriggerDate(alarmHour, alarmMinute, repeatDays);
  if (!triggerDate) return;

  await Notifications.scheduleNotificationAsync({
    identifier: ALARM_NOTIFICATION_ID,
    content: {
      title: 'ClockGuard — Wake up!',
      body: wakeItemName
        ? `Scan your ${wakeItemName} to disarm.`
        : 'Complete your wake-up mission to disarm.',
      priority: Notifications.AndroidNotificationPriority.MAX,
      categoryIdentifier: ALARM_CATEGORY_ID,
      sticky: true,
      data: { type: 'clockguard-alarm' },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: triggerDate,
      channelId: ALARM_CHANNEL_ID,
    },
  });
}

export async function cancelScheduledAlarm(): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(ALARM_NOTIFICATION_ID).catch(() => {});
}

export async function dismissAlarmNotification(): Promise<void> {
  await Notifications.dismissNotificationAsync(ALARM_NOTIFICATION_ID).catch(() => {});
}

export { ALARM_NOTIFICATION_ID, ALARM_CATEGORY_ID };
