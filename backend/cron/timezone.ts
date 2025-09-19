// Timezone helper functions for Europe/Warsaw with DST handling

export interface TimeWindow {
  start: Date;
  end: Date;
  label: string;
}

/**
 * Convert a date to Europe/Warsaw timezone
 * This is a simplified implementation since JavaScript Date doesn't have built-in timezone support
 * Poland uses CET (UTC+1) in winter and CEST (UTC+2) in summer
 */
export function toWarsawTime(date: Date): Date {
  const utc = new Date(date.getTime() + (date.getTimezoneOffset() * 60000));
  const warsawOffset = getWarsawOffset(date);
  return new Date(utc.getTime() + (warsawOffset * 60000));
}

/**
 * Get the offset for Europe/Warsaw timezone for a given date
 * Returns offset in minutes (60 for CET, 120 for CEST)
 */
function getWarsawOffset(date: Date): number {
  const year = date.getFullYear();
  
  // DST rules for EU: last Sunday in March to last Sunday in October
  const dstStart = getLastSundayOfMonth(year, 2); // March (0-indexed)
  const dstEnd = getLastSundayOfMonth(year, 9);   // October (0-indexed)
  
  const utcDate = new Date(date.getTime() + (date.getTimezoneOffset() * 60000));
  
  // Check if date falls within DST period
  if (utcDate >= dstStart && utcDate < dstEnd) {
    return 120; // CEST (UTC+2)
  } else {
    return 60;  // CET (UTC+1)
  }
}

/**
 * Get the last Sunday of a given month and year
 */
function getLastSundayOfMonth(year: number, month: number): Date {
  const lastDay = new Date(year, month + 1, 0); // Last day of the month
  const lastSunday = new Date(lastDay);
  lastSunday.setDate(lastDay.getDate() - lastDay.getDay());
  lastSunday.setUTCHours(1, 0, 0, 0); // 1 AM UTC (2/3 AM local time)
  return lastSunday;
}

/**
 * Create a Date object for Warsaw time at specific hour and minute
 */
export function createWarsawDateTime(date: Date, hour: number, minute: number = 0): Date {
  const warsawDate = new Date(date);
  warsawDate.setHours(hour, minute, 0, 0);
  
  // Adjust for timezone offset
  const offset = getWarsawOffset(warsawDate);
  const utcDate = new Date(warsawDate.getTime() - (offset * 60000));
  
  return utcDate;
}

/**
 * Get the current time in Warsaw timezone
 */
export function nowInWarsaw(): Date {
  return toWarsawTime(new Date());
}

/**
 * Get time windows for appointment reminders (D-2, D-1, D-0)
 */
export function getAppointmentReminderWindows(now: Date): {
  d2: TimeWindow;
  d1: TimeWindow;
  d0: TimeWindow;
} {
  const warsawNow = toWarsawTime(now);
  
  // D-2: day after tomorrow
  const d2Start = new Date(warsawNow);
  d2Start.setDate(d2Start.getDate() + 2);
  d2Start.setHours(0, 0, 0, 0);
  
  const d2End = new Date(d2Start);
  d2End.setDate(d2End.getDate() + 1);
  
  // D-1: tomorrow
  const d1Start = new Date(warsawNow);
  d1Start.setDate(d1Start.getDate() + 1);
  d1Start.setHours(0, 0, 0, 0);
  
  const d1End = new Date(d1Start);
  d1End.setDate(d1End.getDate() + 1);
  
  // D-0: today
  const d0Start = new Date(warsawNow);
  d0Start.setHours(0, 0, 0, 0);
  
  const d0End = new Date(d0Start);
  d0End.setDate(d0End.getDate() + 1);
  
  return {
    d2: { start: d2Start, end: d2End, label: 'SMS_D2' },
    d1: { start: d1Start, end: d1End, label: 'SMS_D1' },
    d0: { start: d0Start, end: d0End, label: 'SMS_D0' }
  };
}

/**
 * Get time windows for deposit reminders
 */
export function getDepositReminderWindows(now: Date): {
  before: TimeWindow;
  after: TimeWindow;
} {
  const warsawNow = toWarsawTime(now);
  
  // BEFORE: 1 day before due date
  const beforeStart = new Date(warsawNow);
  beforeStart.setDate(beforeStart.getDate() + 1);
  beforeStart.setHours(0, 0, 0, 0);
  
  const beforeEnd = new Date(beforeStart);
  beforeEnd.setDate(beforeEnd.getDate() + 1);
  
  // AFTER: 3+ days after due date
  const afterEnd = new Date(warsawNow);
  afterEnd.setHours(23, 59, 59, 999);
  
  const afterStart = new Date(warsawNow);
  afterStart.setDate(afterStart.getDate() - 90); // Look back 90 days for overdue deposits
  afterStart.setHours(0, 0, 0, 0);
  
  return {
    before: { start: beforeStart, end: beforeEnd, label: 'SMS_DEPOSIT_BEFORE' },
    after: { start: afterStart, end: afterEnd, label: 'SMS_DEPOSIT_AFTER' }
  };
}

/**
 * Determine if post-service SMS should be sent today evening or tomorrow morning
 * If appointment ended after 18:00, send tomorrow morning, otherwise send today evening
 */
export function getPostServiceSendTime(appointmentEndTime: Date): Date {
  const warsawEndTime = toWarsawTime(appointmentEndTime);
  const cutoffHour = 18;
  
  if (warsawEndTime.getHours() >= cutoffHour) {
    // Send tomorrow at 9 AM
    const tomorrow = new Date(warsawEndTime);
    tomorrow.setDate(tomorrow.getDate() + 1);
    return createWarsawDateTime(tomorrow, 9, 0);
  } else {
    // Send today at 19:00 (7 PM)
    return createWarsawDateTime(warsawEndTime, 19, 0);
  }
}

/**
 * Format date for display in Polish format
 */
export function formatPolishDate(date: Date): string {
  const warsawDate = toWarsawTime(date);
  const day = warsawDate.getDate().toString().padStart(2, '0');
  const month = (warsawDate.getMonth() + 1).toString().padStart(2, '0');
  return `${day}.${month}`;
}

/**
 * Format time for display in Polish format
 */
export function formatPolishTime(date: Date): string {
  const warsawDate = toWarsawTime(date);
  const hours = warsawDate.getHours().toString().padStart(2, '0');
  const minutes = warsawDate.getMinutes().toString().padStart(2, '0');
  return `${hours}:${minutes}`;
}