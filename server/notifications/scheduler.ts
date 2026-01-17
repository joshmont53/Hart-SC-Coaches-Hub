import { findAllPendingReminders, logReminderSummary } from './sessionChecker';
import { sendAllReminders, isConfigured } from './apnsService';

const CHECK_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

let schedulerInterval: NodeJS.Timeout | null = null;

async function runNotificationCheck(): Promise<void> {
  try {
    if (!isConfigured()) {
      return;
    }
    
    console.log('[Scheduler] Running notification check...');
    
    const reminders = await findAllPendingReminders();
    logReminderSummary(reminders);
    
    if (reminders.length > 0) {
      const { sent, failed } = await sendAllReminders(reminders);
      console.log(`[Scheduler] Notifications sent: ${sent}, failed: ${failed}`);
    }
  } catch (error) {
    console.error('[Scheduler] Error during notification check:', error);
  }
}

export function startNotificationScheduler(): void {
  if (schedulerInterval) {
    console.log('[Scheduler] Already running');
    return;
  }
  
  if (!isConfigured()) {
    console.log('[Scheduler] APNs not configured - scheduler will start but skip checks until configured');
  } else {
    console.log('[Scheduler] APNs configured - notifications enabled');
  }
  
  console.log(`[Scheduler] Starting notification scheduler (every ${CHECK_INTERVAL_MS / 1000 / 60} minutes)`);
  
  schedulerInterval = setInterval(runNotificationCheck, CHECK_INTERVAL_MS);
  
  setTimeout(runNotificationCheck, 10000);
}

export function stopNotificationScheduler(): void {
  if (schedulerInterval) {
    clearInterval(schedulerInterval);
    schedulerInterval = null;
    console.log('[Scheduler] Stopped notification scheduler');
  }
}

export async function triggerManualCheck(): Promise<{ reminders: number; sent: number; failed: number }> {
  const reminders = await findAllPendingReminders();
  logReminderSummary(reminders);
  
  if (reminders.length === 0) {
    return { reminders: 0, sent: 0, failed: 0 };
  }
  
  const { sent, failed } = await sendAllReminders(reminders);
  return { reminders: reminders.length, sent, failed };
}
