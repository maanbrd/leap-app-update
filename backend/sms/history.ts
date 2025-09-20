import { api } from "encore.dev/api";
import db from "../db";

export interface SMSHistoryItem {
  id: string;
  clientId?: string;
  phone: string;
  message: string;
  messageId?: string;
  status: string;
  clientName?: string;
  eventId?: number;
  templateType?: string;
  cost?: number;
  sentAt: Date;
  content?: string;
}

export interface GetSMSHistoryResponse {
  history: SMSHistoryItem[];
  stats: {
    totalSent: number;
    delivered: number;
    failed: number;
    pending: number;
    totalCost: number;
  };
}

// Pobierz historię SMS
export const getSMSHistory = api(
  { method: "GET", path: "/sms/history", expose: true },
  async (): Promise<GetSMSHistoryResponse> => {
    try {
      console.log('📱 SMS: Getting SMS history...');
      
      // Sprawdź czy tabela istnieje (PostgreSQL syntax)
      const tableCheck = await db.queryAll`
        SELECT tablename FROM pg_tables 
        WHERE tablename = 'sms_history'
      `;

      if (tableCheck.length === 0) {
        console.log('⚠️ SMS: Table sms_history does not exist, returning empty data');
        return {
          history: [],
          stats: {
            totalSent: 0,
            delivered: 0,
            failed: 0,
            pending: 0,
            totalCost: 0
          }
        };
      }

      // Pobierz historię SMS (ostatnie 100)
      const history = await db.queryAll<{
        id: string;
        client_id: string;
        phone: string;
        body: string;
        template_code: string;
        status: string;
        sent_at: Date;
      }>`
        SELECT 
          id, client_id, phone, body, template_code, status, sent_at
        FROM sms_history 
        ORDER BY sent_at DESC 
        LIMIT 100
      `;

      // Oblicz statystyki
      const stats = await db.queryRow<{
        total_sent: number;
        delivered: number;
        failed: number;
        pending: number;
      }>`
        SELECT 
          COUNT(*) as total_sent,
          SUM(CASE WHEN status = 'sent' THEN 1 ELSE 0 END) as delivered,
          SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed,
          SUM(CASE WHEN status = 'queued' THEN 1 ELSE 0 END) as pending
        FROM sms_history
      `;

      console.log(`✅ SMS: Loaded ${history.length} SMS records`);

      return {
        history: history.map(item => ({
          id: item.id,
          clientId: item.client_id,
          phone: item.phone,
          message: item.body,
          status: item.status,
          templateType: item.template_code,
          sentAt: item.sent_at
        })),
        stats: {
          totalSent: stats?.total_sent || 0,
          delivered: stats?.delivered || 0,
          failed: stats?.failed || 0,
          pending: stats?.pending || 0,
          totalCost: 0 // SMS table doesn't track cost
        }
      };

    } catch (error) {
      console.error("❌ SMS: Error getting SMS history:", error);
      return {
        history: [],
        stats: {
          totalSent: 0,
          delivered: 0,
          failed: 0,
          pending: 0,
          totalCost: 0
        }
      };
    }
  }
);