import { api } from "encore.dev/api";
import db from "../db";
import { sendIdempotentSMS, logCronRun } from "./sms_sender";
import { 
  nowInWarsaw, 
  getAppointmentReminderWindows, 
  getDepositReminderWindows,
  getPostServiceSendTime,
  formatPolishDate,
  formatPolishTime
} from "./timezone";

export interface CronJobResponse {
  success: boolean;
  jobName: string;
  executedAt: string;
  messagesSent: number;
  errors: string[];
}

// Daily 09:00: appointment reminders → SMS_D2, SMS_D1, SMS_D0
export const appointmentReminders = api(
  { method: "POST", path: "/cron/appointment-reminders", expose: true },
  async (): Promise<CronJobResponse> => {
    const jobName = "appointment-reminders";
    const now = nowInWarsaw();
    const errors: string[] = [];
    let messagesSent = 0;

    await logCronRun(jobName, now, true, "Started appointment reminders job");

    try {
      const windows = getAppointmentReminderWindows(now);

      // Process D-2 reminders (day after tomorrow)
      const d2Events = await db.queryAll<{
        id: number;
        first_name: string;
        last_name: string;
        phone: string;
        event_time: Date;
        service: string;
      }>`
        SELECT id, first_name, last_name, phone, event_time, service
        FROM events 
        WHERE phone IS NOT NULL 
          AND phone != ''
          AND event_time >= ${windows.d2.start.toISOString()}
          AND event_time < ${windows.d2.end.toISOString()}
      `;

      for (const event of d2Events) {
        if (!event.phone) continue;

        const result = await sendIdempotentSMS({
          phone: event.phone,
          templateCode: 'SMS_D2',
          clientId: event.id.toString(),
          scheduledFor: windows.d2.start,
          variables: {
            IMIE: event.first_name,
            DATA: formatPolishDate(event.event_time),
            GODZ: formatPolishTime(event.event_time),
            STUDIO: "Studio Tatuażu"
          }
        });

        if (result.success && !result.alreadySent) {
          messagesSent++;
        } else if (!result.success && !result.alreadySent) {
          errors.push(`D2 SMS failed for ${event.first_name}: ${result.error}`);
        }
      }

      // Process D-1 reminders (tomorrow)
      const d1Events = await db.queryAll<{
        id: number;
        first_name: string;
        last_name: string;
        phone: string;
        event_time: Date;
        service: string;
      }>`
        SELECT id, first_name, last_name, phone, event_time, service
        FROM events 
        WHERE phone IS NOT NULL 
          AND phone != ''
          AND event_time >= ${windows.d1.start.toISOString()}
          AND event_time < ${windows.d1.end.toISOString()}
      `;

      for (const event of d1Events) {
        if (!event.phone) continue;

        const result = await sendIdempotentSMS({
          phone: event.phone,
          templateCode: 'SMS_D1',
          clientId: event.id.toString(),
          scheduledFor: windows.d1.start,
          variables: {
            IMIE: event.first_name,
            DATA: formatPolishDate(event.event_time),
            GODZ: formatPolishTime(event.event_time),
            STUDIO: "Studio Tatuażu"
          }
        });

        if (result.success && !result.alreadySent) {
          messagesSent++;
        } else if (!result.success && !result.alreadySent) {
          errors.push(`D1 SMS failed for ${event.first_name}: ${result.error}`);
        }
      }

      // Process D-0 reminders (today)
      const d0Events = await db.queryAll<{
        id: number;
        first_name: string;
        last_name: string;
        phone: string;
        event_time: Date;
        service: string;
      }>`
        SELECT id, first_name, last_name, phone, event_time, service
        FROM events 
        WHERE phone IS NOT NULL 
          AND phone != ''
          AND event_time >= ${windows.d0.start.toISOString()}
          AND event_time < ${windows.d0.end.toISOString()}
      `;

      for (const event of d0Events) {
        if (!event.phone) continue;

        const result = await sendIdempotentSMS({
          phone: event.phone,
          templateCode: 'SMS_D0',
          clientId: event.id.toString(),
          scheduledFor: windows.d0.start,
          variables: {
            IMIE: event.first_name,
            DATA: formatPolishDate(event.event_time),
            GODZ: formatPolishTime(event.event_time),
            STUDIO: "Studio Tatuażu"
          }
        });

        if (result.success && !result.alreadySent) {
          messagesSent++;
        } else if (!result.success && !result.alreadySent) {
          errors.push(`D0 SMS failed for ${event.first_name}: ${result.error}`);
        }
      }

      await logCronRun(jobName, now, errors.length === 0, 
        `Sent ${messagesSent} messages, ${errors.length} errors`);

      return {
        success: errors.length === 0,
        jobName,
        executedAt: now.toISOString(),
        messagesSent,
        errors
      };

    } catch (error) {
      const errorMsg = `Appointment reminders job failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
      await logCronRun(jobName, now, false, errorMsg);
      
      return {
        success: false,
        jobName,
        executedAt: now.toISOString(),
        messagesSent,
        errors: [errorMsg]
      };
    }
  }
);

// Daily 10:00: deposits → SMS_DEPOSIT_BEFORE, SMS_DEPOSIT_AFTER
export const depositReminders = api(
  { method: "POST", path: "/cron/deposit-reminders", expose: true },
  async (): Promise<CronJobResponse> => {
    const jobName = "deposit-reminders";
    const now = nowInWarsaw();
    const errors: string[] = [];
    let messagesSent = 0;

    await logCronRun(jobName, now, true, "Started deposit reminders job");

    try {
      const windows = getDepositReminderWindows(now);

      // Process BEFORE reminders (1 day before due date)
      const beforeEvents = await db.queryAll<{
        id: number;
        first_name: string;
        last_name: string;
        phone: string;
        event_time: Date;
        deposit_amount: number;
        deposit_due_date: Date;
        deposit_status: string;
      }>`
        SELECT id, first_name, last_name, phone, event_time, deposit_amount, deposit_due_date, deposit_status
        FROM events 
        WHERE phone IS NOT NULL 
          AND phone != ''
          AND deposit_status = 'niezapłacony'
          AND deposit_due_date >= ${windows.before.start.toISOString()}
          AND deposit_due_date < ${windows.before.end.toISOString()}
      `;

      for (const event of beforeEvents) {
        if (!event.phone || !event.deposit_amount) continue;

        const result = await sendIdempotentSMS({
          phone: event.phone,
          templateCode: 'SMS_DEPOSIT_BEFORE',
          clientId: event.id.toString(),
          scheduledFor: windows.before.start,
          variables: {
            IMIE: event.first_name,
            DATA: formatPolishDate(event.event_time),
            GODZ: formatPolishTime(event.event_time),
            STUDIO: "Studio Tatuażu",
            KWOTA: event.deposit_amount.toString()
          }
        });

        if (result.success && !result.alreadySent) {
          messagesSent++;
        } else if (!result.success && !result.alreadySent) {
          errors.push(`Deposit BEFORE SMS failed for ${event.first_name}: ${result.error}`);
        }
      }

      // Process AFTER reminders (3+ days after due date)
      const threeDaysAgo = new Date(now);
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
      threeDaysAgo.setHours(23, 59, 59, 999);

      const afterEvents = await db.queryAll<{
        id: number;
        first_name: string;
        last_name: string;
        phone: string;
        event_time: Date;
        deposit_amount: number;
        deposit_due_date: Date;
        deposit_status: string;
      }>`
        SELECT id, first_name, last_name, phone, event_time, deposit_amount, deposit_due_date, deposit_status
        FROM events 
        WHERE phone IS NOT NULL 
          AND phone != ''
          AND deposit_status = 'niezapłacony'
          AND deposit_due_date <= ${threeDaysAgo.toISOString()}
      `;

      for (const event of afterEvents) {
        if (!event.phone || !event.deposit_amount) continue;

        const result = await sendIdempotentSMS({
          phone: event.phone,
          templateCode: 'SMS_DEPOSIT_AFTER',
          clientId: event.id.toString(),
          scheduledFor: now,
          variables: {
            IMIE: event.first_name,
            DATA: formatPolishDate(event.event_time),
            GODZ: formatPolishTime(event.event_time),
            STUDIO: "Studio Tatuażu",
            KWOTA: event.deposit_amount.toString()
          }
        });

        if (result.success && !result.alreadySent) {
          messagesSent++;
        } else if (!result.success && !result.alreadySent) {
          errors.push(`Deposit AFTER SMS failed for ${event.first_name}: ${result.error}`);
        }
      }

      await logCronRun(jobName, now, errors.length === 0, 
        `Sent ${messagesSent} messages, ${errors.length} errors`);

      return {
        success: errors.length === 0,
        jobName,
        executedAt: now.toISOString(),
        messagesSent,
        errors
      };

    } catch (error) {
      const errorMsg = `Deposit reminders job failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
      await logCronRun(jobName, now, false, errorMsg);
      
      return {
        success: false,
        jobName,
        executedAt: now.toISOString(),
        messagesSent,
        errors: [errorMsg]
      };
    }
  }
);

// Daily 11:00: post-service → SMS_AFTER_TATTOO / SMS_AFTER_PIERCING
export const postServiceReminders = api(
  { method: "POST", path: "/cron/post-service-reminders", expose: true },
  async (): Promise<CronJobResponse> => {
    const jobName = "post-service-reminders";
    const now = nowInWarsaw();
    const errors: string[] = [];
    let messagesSent = 0;

    await logCronRun(jobName, now, true, "Started post-service reminders job");

    try {
      // Find events that happened yesterday or today and need post-service SMS
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setHours(0, 0, 0, 0);

      const todayEnd = new Date(now);
      todayEnd.setHours(23, 59, 59, 999);

      const recentEvents = await db.queryAll<{
        id: number;
        first_name: string;
        last_name: string;
        phone: string;
        event_time: Date;
        service: string;
        duration_minutes: number;
      }>`
        SELECT id, first_name, last_name, phone, event_time, service, duration_minutes
        FROM events 
        WHERE phone IS NOT NULL 
          AND phone != ''
          AND event_time >= ${yesterday.toISOString()}
          AND event_time <= ${todayEnd.toISOString()}
      `;

      for (const event of recentEvents) {
        if (!event.phone) continue;

        // Calculate when the appointment ended
        const appointmentEnd = new Date(event.event_time);
        appointmentEnd.setMinutes(appointmentEnd.getMinutes() + (event.duration_minutes || 60));

        // Determine optimal send time based on appointment end time
        const optimalSendTime = getPostServiceSendTime(appointmentEnd);

        // Only send if we're at or past the optimal send time
        if (now < optimalSendTime) continue;

        // Determine template based on service type
        const isTagService = event.service.toLowerCase().includes('tatuaż') || 
                            event.service.toLowerCase().includes('tattoo');
        const templateCode = isTagService ? 'SMS_AFTER_TATTOO' : 'SMS_AFTER_PIERCING';

        const result = await sendIdempotentSMS({
          phone: event.phone,
          templateCode,
          clientId: event.id.toString(),
          scheduledFor: optimalSendTime,
          variables: {
            IMIE: event.first_name,
            STUDIO: "Studio Tatuażu"
          }
        });

        if (result.success && !result.alreadySent) {
          messagesSent++;
        } else if (!result.success && !result.alreadySent) {
          errors.push(`Post-service SMS failed for ${event.first_name}: ${result.error}`);
        }
      }

      await logCronRun(jobName, now, errors.length === 0, 
        `Sent ${messagesSent} messages, ${errors.length} errors`);

      return {
        success: errors.length === 0,
        jobName,
        executedAt: now.toISOString(),
        messagesSent,
        errors
      };

    } catch (error) {
      const errorMsg = `Post-service reminders job failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
      await logCronRun(jobName, now, false, errorMsg);
      
      return {
        success: false,
        jobName,
        executedAt: now.toISOString(),
        messagesSent,
        errors: [errorMsg]
      };
    }
  }
);

// Weekly Mon 07:00: trigger lightweight client-status refresh
export const clientStatusRefresh = api(
  { method: "POST", path: "/cron/client-status-refresh", expose: true },
  async (): Promise<CronJobResponse> => {
    const jobName = "client-status-refresh";
    const now = nowInWarsaw();
    const errors: string[] = [];

    await logCronRun(jobName, now, true, "Started client status refresh job");

    try {
      // For now, this is just a placeholder that logs the execution
      // Full client status logic will be implemented later
      
      const clientCount = await db.queryRow<{ count: number }>`
        SELECT COUNT(*) as count FROM clients
      `;

      const message = `Client status refresh completed for ${clientCount?.count || 0} clients`;
      
      await logCronRun(jobName, now, true, message);

      return {
        success: true,
        jobName,
        executedAt: now.toISOString(),
        messagesSent: 0,
        errors: []
      };

    } catch (error) {
      const errorMsg = `Client status refresh job failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
      await logCronRun(jobName, now, false, errorMsg);
      
      return {
        success: false,
        jobName,
        executedAt: now.toISOString(),
        messagesSent: 0,
        errors: [errorMsg]
      };
    }
  }
);