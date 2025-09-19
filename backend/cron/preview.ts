import { api } from "encore.dev/api";
import { Query } from "encore.dev/api";
import db from "../db";
import { 
  nowInWarsaw, 
  getAppointmentReminderWindows, 
  getDepositReminderWindows,
  getPostServiceSendTime,
  formatPolishDate,
  formatPolishTime,
  toWarsawTime
} from "./timezone";

export interface PreviewRequest {
  date?: Query<string>; // ISO date string, defaults to current date
}

export interface PreviewSMS {
  phone: string;
  templateCode: string;
  clientName: string;
  eventDate?: string;
  eventTime?: string;
  service?: string;
  depositAmount?: number;
  body: string;
  wouldSend: boolean;
  reason?: string;
}

export interface PreviewResponse {
  previewDate: string;
  jobs: {
    appointmentReminders: {
      d2: PreviewSMS[];
      d1: PreviewSMS[];
      d0: PreviewSMS[];
    };
    depositReminders: {
      before: PreviewSMS[];
      after: PreviewSMS[];
    };
    postServiceReminders: PreviewSMS[];
    clientStatusRefresh: {
      clientCount: number;
      wouldExecute: boolean;
    };
  };
}

// Preview what SMS messages would be sent for cron jobs
export const preview = api(
  { method: "GET", path: "/cron/preview", expose: true },
  async (req: PreviewRequest): Promise<PreviewResponse> => {
    const previewDate = req.date ? new Date(req.date) : nowInWarsaw();
    
    // Generate SMS body using the same logic as the sender
    const generatePreviewBody = (templateCode: string, variables: Record<string, string>): string => {
      const templates: Record<string, string> = {
        'SMS_D2': "Cześć {IMIE}! Wizyta {DATA} o {GODZ} w {STUDIO} – widzimy się pojutrze",
        'SMS_D1': "Hej {IMIE}! Jutro {DATA} o {GODZ} w {STUDIO}",
        'SMS_D0': "To dziś, {IMIE}! {GODZ} w {STUDIO}",
        'SMS_AFTER_TATTOO': "Dzięki za wizytę {IMIE}! Pamiętaj o pielęgnacji tatuażu. 3 razy dziennie smaruj poleconym kremem, regularnie przemywaj tatuaż, unikaj słońca i kąpieli w zbiornikach wodnych. Zrezygnuj przez następne kilka dni z intensywnego wysiłku fizycznego. W razie pytań jesteśmy do dyspozycji! ({STUDIO})",
        'SMS_AFTER_PIERCING': "Dzięki za wizytę {IMIE}! Pielęgnacja piercingu: sól morska 2×/dzień, bez basenu/sauny przez 6 tygodni. W razie pytań jesteśmy do dyspozycji! ({STUDIO})",
        'SMS_DEPOSIT_BEFORE': "Prosimy o zadatek {KWOTA}zł za wizytę {DATA} {GODZ} w {STUDIO}",
        'SMS_DEPOSIT_AFTER': "{IMIE}, prosimy o zadatek {KWOTA}zł za wizytę {DATA} {GODZ} w {STUDIO}"
      };

      let template = templates[templateCode] || templateCode;
      
      for (const [key, value] of Object.entries(variables)) {
        const placeholder = `{${key.toUpperCase()}}`;
        template = template.replace(new RegExp(placeholder, 'g'), value);
      }
      
      return template;
    };

    // Check if SMS would be sent (not already sent)
    const checkWouldSend = async (phone: string, templateCode: string, scheduledFor: Date): Promise<{ wouldSend: boolean; reason?: string }> => {
      try {
        const existing = await db.queryRow<{ id: string; status: string }>`
          SELECT id, status FROM sms_history 
          WHERE phone = ${phone} 
            AND template_code = ${templateCode}
            AND scheduled_for = ${scheduledFor.toISOString()}
        `;

        if (existing) {
          return { 
            wouldSend: false, 
            reason: existing.status === 'sent' ? 'Already sent' : 'Previously failed' 
          };
        }
        
        return { wouldSend: true };
      } catch (error) {
        return { wouldSend: false, reason: 'Database error' };
      }
    };

    try {
      const windows = getAppointmentReminderWindows(previewDate);

      // Preview appointment reminders
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

      const d2Previews: PreviewSMS[] = [];
      for (const event of d2Events) {
        if (!event.phone) continue;

        const variables = {
          IMIE: event.first_name,
          DATA: formatPolishDate(event.event_time),
          GODZ: formatPolishTime(event.event_time),
          STUDIO: "Studio Tatuażu"
        };

        const sendCheck = await checkWouldSend(event.phone, 'SMS_D2', windows.d2.start);

        d2Previews.push({
          phone: event.phone,
          templateCode: 'SMS_D2',
          clientName: `${event.first_name} ${event.last_name}`,
          eventDate: formatPolishDate(event.event_time),
          eventTime: formatPolishTime(event.event_time),
          service: event.service,
          body: generatePreviewBody('SMS_D2', variables),
          wouldSend: sendCheck.wouldSend,
          reason: sendCheck.reason
        });
      }

      // Similar logic for D1 and D0
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

      const d1Previews: PreviewSMS[] = [];
      for (const event of d1Events) {
        if (!event.phone) continue;

        const variables = {
          IMIE: event.first_name,
          DATA: formatPolishDate(event.event_time),
          GODZ: formatPolishTime(event.event_time),
          STUDIO: "Studio Tatuażu"
        };

        const sendCheck = await checkWouldSend(event.phone, 'SMS_D1', windows.d1.start);

        d1Previews.push({
          phone: event.phone,
          templateCode: 'SMS_D1',
          clientName: `${event.first_name} ${event.last_name}`,
          eventDate: formatPolishDate(event.event_time),
          eventTime: formatPolishTime(event.event_time),
          service: event.service,
          body: generatePreviewBody('SMS_D1', variables),
          wouldSend: sendCheck.wouldSend,
          reason: sendCheck.reason
        });
      }

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

      const d0Previews: PreviewSMS[] = [];
      for (const event of d0Events) {
        if (!event.phone) continue;

        const variables = {
          IMIE: event.first_name,
          DATA: formatPolishDate(event.event_time),
          GODZ: formatPolishTime(event.event_time),
          STUDIO: "Studio Tatuażu"
        };

        const sendCheck = await checkWouldSend(event.phone, 'SMS_D0', windows.d0.start);

        d0Previews.push({
          phone: event.phone,
          templateCode: 'SMS_D0',
          clientName: `${event.first_name} ${event.last_name}`,
          eventDate: formatPolishDate(event.event_time),
          eventTime: formatPolishTime(event.event_time),
          service: event.service,
          body: generatePreviewBody('SMS_D0', variables),
          wouldSend: sendCheck.wouldSend,
          reason: sendCheck.reason
        });
      }

      // Preview deposit reminders
      const depositWindows = getDepositReminderWindows(previewDate);

      const beforeDepositEvents = await db.queryAll<{
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
          AND deposit_due_date >= ${depositWindows.before.start.toISOString()}
          AND deposit_due_date < ${depositWindows.before.end.toISOString()}
      `;

      const beforeDepositPreviews: PreviewSMS[] = [];
      for (const event of beforeDepositEvents) {
        if (!event.phone || !event.deposit_amount) continue;

        const variables = {
          IMIE: event.first_name,
          DATA: formatPolishDate(event.event_time),
          GODZ: formatPolishTime(event.event_time),
          STUDIO: "Studio Tatuażu",
          KWOTA: event.deposit_amount.toString()
        };

        const sendCheck = await checkWouldSend(event.phone, 'SMS_DEPOSIT_BEFORE', depositWindows.before.start);

        beforeDepositPreviews.push({
          phone: event.phone,
          templateCode: 'SMS_DEPOSIT_BEFORE',
          clientName: `${event.first_name} ${event.last_name}`,
          eventDate: formatPolishDate(event.event_time),
          eventTime: formatPolishTime(event.event_time),
          depositAmount: event.deposit_amount,
          body: generatePreviewBody('SMS_DEPOSIT_BEFORE', variables),
          wouldSend: sendCheck.wouldSend,
          reason: sendCheck.reason
        });
      }

      // After deposit reminders (3+ days overdue)
      const threeDaysAgo = new Date(previewDate);
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
      threeDaysAgo.setHours(23, 59, 59, 999);

      const afterDepositEvents = await db.queryAll<{
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

      const afterDepositPreviews: PreviewSMS[] = [];
      for (const event of afterDepositEvents) {
        if (!event.phone || !event.deposit_amount) continue;

        const variables = {
          IMIE: event.first_name,
          DATA: formatPolishDate(event.event_time),
          GODZ: formatPolishTime(event.event_time),
          STUDIO: "Studio Tatuażu",
          KWOTA: event.deposit_amount.toString()
        };

        const sendCheck = await checkWouldSend(event.phone, 'SMS_DEPOSIT_AFTER', previewDate);

        afterDepositPreviews.push({
          phone: event.phone,
          templateCode: 'SMS_DEPOSIT_AFTER',
          clientName: `${event.first_name} ${event.last_name}`,
          eventDate: formatPolishDate(event.event_time),
          eventTime: formatPolishTime(event.event_time),
          depositAmount: event.deposit_amount,
          body: generatePreviewBody('SMS_DEPOSIT_AFTER', variables),
          wouldSend: sendCheck.wouldSend,
          reason: sendCheck.reason
        });
      }

      // Preview post-service reminders
      const yesterday = new Date(previewDate);
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setHours(0, 0, 0, 0);

      const todayEnd = new Date(previewDate);
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

      const postServicePreviews: PreviewSMS[] = [];
      for (const event of recentEvents) {
        if (!event.phone) continue;

        const appointmentEnd = new Date(event.event_time);
        appointmentEnd.setMinutes(appointmentEnd.getMinutes() + (event.duration_minutes || 60));

        const optimalSendTime = getPostServiceSendTime(appointmentEnd);

        // Only include if we're at or past the optimal send time
        if (previewDate < optimalSendTime) continue;

        const isTagService = event.service.toLowerCase().includes('tatuaż') || 
                            event.service.toLowerCase().includes('tattoo');
        const templateCode = isTagService ? 'SMS_AFTER_TATTOO' : 'SMS_AFTER_PIERCING';

        const variables = {
          IMIE: event.first_name,
          STUDIO: "Studio Tatuażu"
        };

        const sendCheck = await checkWouldSend(event.phone, templateCode, optimalSendTime);

        postServicePreviews.push({
          phone: event.phone,
          templateCode,
          clientName: `${event.first_name} ${event.last_name}`,
          eventDate: formatPolishDate(event.event_time),
          eventTime: formatPolishTime(event.event_time),
          service: event.service,
          body: generatePreviewBody(templateCode, variables),
          wouldSend: sendCheck.wouldSend,
          reason: sendCheck.reason
        });
      }

      // Preview client status refresh
      const clientCount = await db.queryRow<{ count: number }>`
        SELECT COUNT(*) as count FROM clients
      `;

      return {
        previewDate: previewDate.toISOString(),
        jobs: {
          appointmentReminders: {
            d2: d2Previews,
            d1: d1Previews,
            d0: d0Previews
          },
          depositReminders: {
            before: beforeDepositPreviews,
            after: afterDepositPreviews
          },
          postServiceReminders: postServicePreviews,
          clientStatusRefresh: {
            clientCount: clientCount?.count || 0,
            wouldExecute: true
          }
        }
      };

    } catch (error) {
      console.error("Error in cron preview:", error);
      throw new Error(`Preview failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
);