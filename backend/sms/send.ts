import { api, APIError } from "encore.dev/api";
import { smsApiToken, smsApiSender } from "./config";

export interface SendSMSRequest {
  phone: string;
  message: string;
  clientName?: string;
  eventId?: number;
  templateType?: string;
}

export interface SendSMSResponse {
  success: boolean;
  messageId?: string;
  message: string;
  cost?: number;
}

export interface SMSStatus {
  messageId: string;
  status: 'sent' | 'delivered' | 'failed' | 'pending';
  timestamp: Date;
}

// Wyślij SMS przez SMSAPI
export const sendSMS = api(
  { method: "POST", path: "/sms/send", expose: true },
  async (req: SendSMSRequest): Promise<SendSMSResponse> => {
    if (!smsApiToken() || !smsApiSender()) {
      throw APIError.internal("SMSAPI credentials nie są skonfigurowane");
    }

    try {
      // Sprawdź format numeru telefonu
      const cleanPhone = req.phone.replace(/[^\d+]/g, '');
      if (!cleanPhone.startsWith('+48') && !cleanPhone.startsWith('48') && cleanPhone.length < 9) {
        return {
          success: false,
          message: "Nieprawidłowy format numeru telefonu"
        };
      }

      // Przygotuj numer w formacie międzynarodowym
      let formattedPhone = cleanPhone;
      if (formattedPhone.startsWith('48') && !formattedPhone.startsWith('+48')) {
        formattedPhone = '+' + formattedPhone;
      } else if (formattedPhone.length === 9) {
        formattedPhone = '+48' + formattedPhone;
      }

      // Wywołanie SMSAPI
      const smsApiUrl = 'https://api.smsapi.pl/sms.do';
      const params = new URLSearchParams({
        'username': smsApiToken(),
        'password': '', // SMSAPI używa token jako username
        'to': formattedPhone,
        'message': req.message,
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
        // Zapisz wysłany SMS do historii
        await logSMSHistory({
          phone: formattedPhone,
          message: req.message,
          messageId: responseData.list[0].id,
          status: 'sent',
          clientName: req.clientName,
          eventId: req.eventId,
          templateType: req.templateType,
          cost: responseData.list[0].points
        });

        return {
          success: true,
          messageId: responseData.list[0].id,
          message: `SMS wysłany pomyślnie na numer ${formattedPhone}`,
          cost: responseData.list[0].points
        };
      } else {
        console.error('SMSAPI error:', responseData);
        return {
          success: false,
          message: `Błąd wysyłania SMS: ${responseData.message || 'Nieznany błąd'}`
        };
      }

    } catch (error) {
      console.error("Błąd wysyłania SMS:", error);
      return {
        success: false,
        message: "Błąd komunikacji z SMSAPI"
      };
    }
  }
);

// Pomocnicza funkcja do zapisu historii SMS
async function logSMSHistory(data: {
  phone: string;
  message: string;
  messageId: string;
  status: string;
  clientName?: string;
  eventId?: number;
  templateType?: string;
  cost?: number;
}) {
  try {
    // Import db tutaj żeby uniknąć circular dependency
    const { default: db } = await import("../db");
    
    // Utwórz tabelę jeśli nie istnieje
    await db.exec`
      CREATE TABLE IF NOT EXISTS sms_history (
        id TEXT PRIMARY KEY,
        phone TEXT NOT NULL,
        message TEXT NOT NULL,
        message_id TEXT,
        status TEXT NOT NULL,
        client_name TEXT,
        event_id INTEGER,
        template_type TEXT,
        cost REAL,
        sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    const historyId = `sms_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    await db.exec`
      INSERT INTO sms_history (
        id, phone, message, message_id, status, client_name, 
        event_id, template_type, cost, sent_at
      )
      VALUES (
        ${historyId}, ${data.phone}, ${data.message}, ${data.messageId}, 
        ${data.status}, ${data.clientName || null}, ${data.eventId || null}, 
        ${data.templateType || null}, ${data.cost || null}, CURRENT_TIMESTAMP
      )
    `;
  } catch (error) {
    console.error("Błąd zapisywania historii SMS:", error);
  }
}