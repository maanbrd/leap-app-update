import { api } from "encore.dev/api";
import db from "../db";

export interface SMSHistoryItem {
  id: string;
  phone: string;
  message: string;
  messageId?: string;
  status: string;
  clientName?: string;
  eventId?: number;
  templateType?: string;
  cost?: number;
  sentAt: Date;
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
      // Sprawdź czy tabela istnieje
      const tableCheck = await db.queryAll`
        SELECT name FROM sqlite_master 
        WHERE type='table' AND name='sms_history'
      `;

      if (tableCheck.length === 0) {
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
        phone: string;
        message: string;
        message_id: string;
        status: string;
        client_name: string;
        event_id: number;
        template_type: string;
        cost: number;
        sent_at: Date;
      }>`
        SELECT 
          id, phone, message, message_id, status, client_name,
          event_id, template_type, cost, sent_at
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
        total_cost: number;
      }>`
        SELECT 
          COUNT(*) as total_sent,
          SUM(CASE WHEN status = 'delivered' THEN 1 ELSE 0 END) as delivered,
          SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed,
          SUM(CASE WHEN status IN ('sent', 'pending') THEN 1 ELSE 0 END) as pending,
          COALESCE(SUM(cost), 0) as total_cost
        FROM sms_history
      `;

      return {
        history: history.map(item => ({
          id: item.id,
          phone: item.phone,
          message: item.message,
          messageId: item.message_id,
          status: item.status,
          clientName: item.client_name,
          eventId: item.event_id,
          templateType: item.template_type,
          cost: item.cost,
          sentAt: item.sent_at
        })),
        stats: {
          totalSent: stats?.total_sent || 0,
          delivered: stats?.delivered || 0,
          failed: stats?.failed || 0,
          pending: stats?.pending || 0,
          totalCost: stats?.total_cost || 0
        }
      };

    } catch (error) {
      console.error("Błąd pobierania historii SMS:", error);
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