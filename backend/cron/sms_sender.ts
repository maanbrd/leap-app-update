import db from "../db";
import { smsApiToken, smsApiSender } from "../sms/config";

export interface SMSRequest {
  phone: string;
  templateCode: string;
  clientId?: string;
  scheduledFor?: Date;
  variables: Record<string, string>;
}

export interface SMSResult {
  success: boolean;
  messageId?: string;
  error?: string;
  alreadySent?: boolean;
}

/**
 * Idempotent SMS sending function
 * Will only send if no SMS with same (phone, template_code, scheduled_for) exists
 */
export async function sendIdempotentSMS(request: SMSRequest): Promise<SMSResult> {
  const { phone, templateCode, clientId, scheduledFor, variables } = request;
  
  try {
    // Clean and format phone number
    const cleanPhone = formatPhoneNumber(phone);
    if (!cleanPhone) {
      return { success: false, error: "Invalid phone number format" };
    }

    // Generate SMS body using template and variables
    const body = generateSMSBody(templateCode, variables);

    // Set scheduled_for to a specific datetime (required for unique constraint)
    const scheduledForKey = scheduledFor || new Date();
    
    // Check for existing SMS (idempotency) - check for sent messages first
    const existing = await db.queryRow<{ id: string; status: string }>`
      SELECT id, status FROM sms_history 
      WHERE phone = ${cleanPhone} 
        AND template_code = ${templateCode}
        AND scheduled_for = ${scheduledForKey.toISOString()}
    `;

    if (existing) {
      return { 
        success: existing.status === 'sent', 
        alreadySent: true,
        error: existing.status === 'failed' ? 'Previously failed' : undefined
      };
    }

    // Create SMS history record with queued status
    const smsId = `sms_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    try {
      await db.exec`
        INSERT INTO sms_history (
          id, client_id, phone, body, template_code, status, 
          scheduled_for, created_at
        ) VALUES (
          ${smsId}, ${clientId}, ${cleanPhone}, ${body}, ${templateCode}, 
          'queued', ${scheduledForKey.toISOString()}, CURRENT_TIMESTAMP
        )
      `;
    } catch (dbError) {
      // If unique constraint violation, another process already queued this SMS
      if (dbError instanceof Error && dbError.message.includes('UNIQUE constraint failed')) {
        return { success: false, alreadySent: true, error: 'SMS already queued by another process' };
      }
      throw dbError;
    }

    // Send SMS via SMSAPI
    const sendResult = await sendViaSMSAPI(cleanPhone, body);

    if (sendResult.success) {
      // Update record as sent
      await db.exec`
        UPDATE sms_history 
        SET status = 'sent', provider_id = ${sendResult.messageId}, sent_at = CURRENT_TIMESTAMP
        WHERE id = ${smsId}
      `;

      return { 
        success: true, 
        messageId: sendResult.messageId 
      };
    } else {
      // Update record as failed
      await db.exec`
        UPDATE sms_history 
        SET status = 'failed', error_message = ${sendResult.error}
        WHERE id = ${smsId}
      `;

      return { 
        success: false, 
        error: sendResult.error 
      };
    }

  } catch (error) {
    console.error("Error in sendIdempotentSMS:", error);
    return { 
      success: false, 
      error: `SMS sending failed: ${error instanceof Error ? error.message : 'Unknown error'}` 
    };
  }
}

/**
 * Format phone number to international format
 */
function formatPhoneNumber(phone: string): string | null {
  const cleanPhone = phone.replace(/[^\d+]/g, '');
  
  if (!cleanPhone) return null;
  
  // Handle Polish numbers
  if (cleanPhone.startsWith('+48') && cleanPhone.length === 12) {
    return cleanPhone;
  } else if (cleanPhone.startsWith('48') && cleanPhone.length === 11) {
    return '+' + cleanPhone;
  } else if (cleanPhone.length === 9) {
    return '+48' + cleanPhone;
  }
  
  // For other international numbers, assume they're already formatted
  if (cleanPhone.startsWith('+') && cleanPhone.length >= 10) {
    return cleanPhone;
  }
  
  return null;
}

/**
 * Generate SMS body from template code and variables
 */
function generateSMSBody(templateCode: string, variables: Record<string, string>): string {
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
  
  // Replace variables in template
  for (const [key, value] of Object.entries(variables)) {
    const placeholder = `{${key.toUpperCase()}}`;
    template = template.replace(new RegExp(placeholder, 'g'), value);
  }
  
  return template;
}

/**
 * Send SMS via SMSAPI service
 */
async function sendViaSMSAPI(phone: string, message: string): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    if (!smsApiToken() || !smsApiSender()) {
      return { success: false, error: "SMSAPI credentials not configured" };
    }

    const smsApiUrl = 'https://api.smsapi.pl/sms.do';
    const params = new URLSearchParams({
      'username': smsApiToken(),
      'password': '',
      'to': phone,
      'message': message,
      'from': smsApiSender(),
      'format': 'json',
      'encoding': 'utf-8'
    });

    const response = await fetch(smsApiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Bearer ${smsApiToken()}`
      },
      body: params.toString()
    });

    const responseData = await response.json() as any;

    if (response.ok && responseData.count > 0) {
      return {
        success: true,
        messageId: responseData.list[0].id
      };
    } else {
      return {
        success: false,
        error: responseData.message || 'Unknown SMSAPI error'
      };
    }

  } catch (error) {
    return {
      success: false,
      error: `SMSAPI communication error: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

/**
 * Log cron job execution
 */
export async function logCronRun(
  jobName: string, 
  plannedAt: Date, 
  success: boolean, 
  details?: string
): Promise<void> {
  try {
    const runId = `cron_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    await db.exec`
      INSERT INTO cron_runs (
        id, job_name, planned_at, started_at, finished_at, ok, details
      ) VALUES (
        ${runId}, ${jobName}, ${plannedAt.toISOString()}, 
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, ${success ? 1 : 0}, ${details}
      )
    `;
  } catch (error) {
    console.error("Error logging cron run:", error);
  }
}