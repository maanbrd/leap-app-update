import { api, APIError } from "encore.dev/api";
import db from "../db";

export interface DeleteClientRequest {
  id: number;
  userId: string;
}

export interface DeleteClientResponse {
  success: boolean;
  message: string;
}

export interface UserInteractionRequest {
  sessionId: string;
  userId: string;
  action: string;
  feedback?: 'positive' | 'negative';
  context?: any;
}

export interface UserInteractionResponse {
  success: boolean;
}

export interface GetUserPreferencesRequest {
  userId: string;
}

export interface GetUserPreferencesResponse {
  preferences: {
    commonServices: string[];
    averagePrices: Record<string, number>;
    preferredTimeSlots: string[];
    recentActions: Array<{
      action: string;
      timestamp: Date;
      success: boolean;
    }>;
  };
}

// Usuń klienta
export const deleteClient = api(
  { method: "DELETE", path: "/ai/delete-client", expose: true },
  async (req: DeleteClientRequest): Promise<DeleteClientResponse> => {
    try {
      // Sprawdź czy użytkownik ma uprawnienia
      const clients = await db.queryAll<{
        id: number;
        created_by: string;
        first_name: string;
        last_name: string;
      }>`
        SELECT id, created_by, first_name, last_name
        FROM clients 
        WHERE id = ${req.id}
      `;

      if (clients.length === 0) {
        return {
          success: false,
          message: "Klient nie został znaleziony"
        };
      }

      const client = clients[0];
      
      if (client.created_by !== req.userId && req.userId !== 'manager') {
        return {
          success: false,
          message: "Nie masz uprawnień do usunięcia tego klienta"
        };
      }

      // Sprawdź czy klient ma przyszłe wizyty
      const futureEvents = await db.queryAll<{count: number}>`
        SELECT COUNT(*) as count
        FROM events 
        WHERE LOWER(first_name) = LOWER(${client.first_name})
        AND LOWER(last_name) = LOWER(${client.last_name})
        AND event_time > datetime('now')
      `;

      if (futureEvents[0]?.count > 0) {
        return {
          success: false,
          message: `Nie można usunąć klienta ${client.first_name} ${client.last_name} - ma zaplanowane przyszłe wizyty`
        };
      }

      // Usuń klienta
      await db.exec`
        DELETE FROM clients WHERE id = ${req.id}
      `;

      return {
        success: true,
        message: `Klient ${client.first_name} ${client.last_name} został usunięty`
      };

    } catch (error) {
      console.error("Błąd usuwania klienta:", error);
      throw APIError.internal("Błąd podczas usuwania klienta");
    }
  }
);

// Zapisz interakcję użytkownika (uczenie się)
export const logUserInteraction = api(
  { method: "POST", path: "/ai/log-interaction", expose: true },
  async (req: UserInteractionRequest): Promise<UserInteractionResponse> => {
    try {
      // Utwórz tabelę jeśli nie istnieje
      await db.exec`
        CREATE TABLE IF NOT EXISTS user_interactions (
          id TEXT PRIMARY KEY,
          session_id TEXT NOT NULL,
          user_id TEXT NOT NULL,
          action TEXT NOT NULL,
          feedback TEXT,
          context TEXT,
          timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `;

      const interactionId = `int_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      await db.exec`
        INSERT INTO user_interactions (id, session_id, user_id, action, feedback, context, timestamp)
        VALUES (${interactionId}, ${req.sessionId}, ${req.userId}, ${req.action}, ${req.feedback || null}, ${JSON.stringify(req.context || {})}, CURRENT_TIMESTAMP)
      `;

      return { success: true };

    } catch (error) {
      console.error("Błąd zapisywania interakcji:", error);
      return { success: false };
    }
  }
);

// Pobierz preferencje użytkownika (do uczenia się)
export const getUserPreferences = api(
  { method: "GET", path: "/ai/user-preferences/:userId", expose: true },
  async ({ userId }: { userId: string }): Promise<GetUserPreferencesResponse> => {
    try {
      // Najczęstsze usługi
      const commonServices = await db.queryAll<{
        service: string;
        count: number;
      }>`
        SELECT service, COUNT(*) as count
        FROM events 
        WHERE created_by = ${userId}
        GROUP BY service
        ORDER BY count DESC
        LIMIT 5
      `;

      // Średnie ceny dla usług
      const avgPrices = await db.queryAll<{
        service: string;
        avg_price: number;
      }>`
        SELECT service, AVG(price) as avg_price
        FROM events 
        WHERE created_by = ${userId}
        GROUP BY service
      `;

      // Preferowane godziny
      const timeSlots = await db.queryAll<{
        hour: number;
        count: number;
      }>`
        SELECT strftime('%H', event_time) as hour, COUNT(*) as count
        FROM events 
        WHERE created_by = ${userId}
        GROUP BY hour
        ORDER BY count DESC
        LIMIT 3
      `;

      // Ostatnie akcje
      const recentActions = await db.queryAll<{
        action: string;
        timestamp: Date;
        feedback: string;
      }>`
        SELECT action, timestamp, feedback
        FROM user_interactions 
        WHERE user_id = ${userId}
        ORDER BY timestamp DESC
        LIMIT 10
      `;

      return {
        preferences: {
          commonServices: commonServices.map(s => s.service),
          averagePrices: avgPrices.reduce((acc, item) => {
            acc[item.service] = Math.round(item.avg_price);
            return acc;
          }, {} as Record<string, number>),
          preferredTimeSlots: timeSlots.map(t => `${t.hour}:00`),
          recentActions: recentActions.map(a => ({
            action: a.action,
            timestamp: a.timestamp,
            success: a.feedback !== 'negative'
          }))
        }
      };

    } catch (error) {
      console.error("Błąd pobierania preferencji:", error);
      return {
        preferences: {
          commonServices: [],
          averagePrices: {},
          preferredTimeSlots: [],
          recentActions: []
        }
      };
    }
  }
);