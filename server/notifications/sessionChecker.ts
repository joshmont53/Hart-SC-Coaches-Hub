import { storage } from "../storage";
import type { SwimmingSession, Squad } from "@shared/schema";

export interface SessionReminder {
  session: SwimmingSession;
  squad: Squad;
  coachId: string;
  coachName: string;
  missingItems: ('attendance' | 'feedback')[];
  reminderNumber: 1 | 2;
  message: string;
}

interface SessionWithDetails {
  session: SwimmingSession;
  squad: Squad;
  coachId: string;
  coachName: string;
}

function formatTime(time: string): string {
  const [hours, minutes] = time.split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12;
  return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[date.getMonth()]} ${date.getDate()}`;
}

function buildNotificationMessage(
  squadName: string,
  date: string,
  startTime: string,
  missingItems: ('attendance' | 'feedback')[]
): string {
  const formattedTime = formatTime(startTime);
  const formattedDate = formatDate(date);
  
  let missingText: string;
  if (missingItems.length === 2) {
    missingText = 'attendance & feedback';
  } else if (missingItems[0] === 'attendance') {
    missingText = 'attendance';
  } else {
    missingText = 'feedback';
  }
  
  return `${squadName} (${formattedDate}, ${formattedTime}): Please complete ${missingText}`;
}

function getSessionEndDateTime(session: SwimmingSession): Date {
  const dateStr = session.sessionDate;
  
  const [hours, minutes] = session.endTime.split(':').map(Number);
  const endDate = new Date(dateStr + 'T00:00:00');
  endDate.setHours(hours, minutes, 0, 0);
  return endDate;
}

async function getSessionDetails(session: SwimmingSession): Promise<SessionWithDetails | null> {
  const squad = await storage.getSquad(session.squadId);
  if (!squad || !squad.primaryCoachId) return null;
  
  const coach = await storage.getCoach(squad.primaryCoachId);
  if (!coach) return null;
  
  return {
    session,
    squad,
    coachId: coach.id,
    coachName: `${coach.firstName} ${coach.lastName}`,
  };
}

async function checkAttendanceComplete(sessionId: string): Promise<boolean> {
  const attendanceRecords = await storage.getAttendanceBySession(sessionId);
  return attendanceRecords.length > 0;
}

async function checkFeedbackComplete(sessionId: string): Promise<boolean> {
  const feedback = await storage.getFeedbackBySession(sessionId);
  return feedback !== undefined;
}

async function getMissingItems(sessionId: string): Promise<('attendance' | 'feedback')[]> {
  const missing: ('attendance' | 'feedback')[] = [];
  
  const [hasAttendance, hasFeedback] = await Promise.all([
    checkAttendanceComplete(sessionId),
    checkFeedbackComplete(sessionId),
  ]);
  
  if (!hasAttendance) missing.push('attendance');
  if (!hasFeedback) missing.push('feedback');
  
  return missing;
}

async function wasReminderAlreadySent(
  sessionId: string,
  coachId: string,
  reminderNumber: 1 | 2
): Promise<boolean> {
  const log = await storage.getNotificationLog(sessionId, coachId, reminderNumber);
  return log !== undefined;
}

export async function findSessionsNeedingReminder1(): Promise<SessionReminder[]> {
  const reminders: SessionReminder[] = [];
  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);
  
  const todayStr = now.toISOString().split('T')[0];
  const sessions = await storage.getSessionsByDate(todayStr);
  
  for (const session of sessions) {
    if (session.recordStatus === 'inactive') continue;
    
    const endTime = getSessionEndDateTime(session);
    
    if (endTime > oneHourAgo || endTime < twoHoursAgo) continue;
    
    const details = await getSessionDetails(session);
    if (!details) continue;
    
    const missingItems = await getMissingItems(session.id);
    if (missingItems.length === 0) continue;
    
    const alreadySent = await wasReminderAlreadySent(session.id, details.coachId, 1);
    if (alreadySent) continue;
    
    const dateStr = session.sessionDate;
    
    reminders.push({
      session,
      squad: details.squad,
      coachId: details.coachId,
      coachName: details.coachName,
      missingItems,
      reminderNumber: 1,
      message: buildNotificationMessage(
        details.squad.squadName,
        dateStr,
        session.startTime,
        missingItems
      ),
    });
  }
  
  return reminders;
}

export async function findSessionsNeedingReminder2(): Promise<SessionReminder[]> {
  const reminders: SessionReminder[] = [];
  const now = new Date();
  
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  if (currentHour !== 8 || currentMinute < 25 || currentMinute > 35) {
    return reminders;
  }
  
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];
  
  const sessions = await storage.getSessionsByDate(yesterdayStr);
  
  for (const session of sessions) {
    if (session.recordStatus === 'inactive') continue;
    
    const details = await getSessionDetails(session);
    if (!details) continue;
    
    const missingItems = await getMissingItems(session.id);
    if (missingItems.length === 0) continue;
    
    const alreadySent = await wasReminderAlreadySent(session.id, details.coachId, 2);
    if (alreadySent) continue;
    
    const dateStr = session.sessionDate;
    
    reminders.push({
      session,
      squad: details.squad,
      coachId: details.coachId,
      coachName: details.coachName,
      missingItems,
      reminderNumber: 2,
      message: buildNotificationMessage(
        details.squad.squadName,
        dateStr,
        session.startTime,
        missingItems
      ),
    });
  }
  
  return reminders;
}

export async function findAllPendingReminders(): Promise<SessionReminder[]> {
  const [reminder1List, reminder2List] = await Promise.all([
    findSessionsNeedingReminder1(),
    findSessionsNeedingReminder2(),
  ]);
  
  return [...reminder1List, ...reminder2List];
}

export function logReminderSummary(reminders: SessionReminder[]): void {
  if (reminders.length === 0) {
    console.log('[SessionChecker] No pending reminders found');
    return;
  }
  
  console.log(`[SessionChecker] Found ${reminders.length} pending reminder(s):`);
  for (const reminder of reminders) {
    console.log(`  - R${reminder.reminderNumber}: ${reminder.coachName} | ${reminder.message}`);
  }
}
