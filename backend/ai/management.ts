import { api, APIError } from "encore.dev/api";
import db from "../db";

export interface DeleteEventRequest {
  id: number;
  userId: string;
}

export interface DeleteEventResponse {
  success: boolean;
  message: string;
}

export interface UpdateDepositStatusRequest {
  id: number;
  depositStatus: 'zapłacony' | 'niezapłacony' | 'nie dotyczy';
  userId: string;
}

export interface UpdateDepositStatusResponse {
  success: boolean;
  message: string;
}

export interface MoveEventRequest {
  id: number;
  newEventTime: string;
  userId: string;
}

export interface MoveEventResponse {
  success: boolean;
  message: string;
}

// Usuń wydarzenie
export const deleteEvent = api(
  { method: "DELETE", path: "/ai/delete-event", expose: true },
  async (req: DeleteEventRequest): Promise<DeleteEventResponse> => {
    try {
      // Sprawdź czy użytkownik ma uprawnienia do tego wydarzenia
      const events = await db.queryAll<{
        id: number;
        created_by: string;
        first_name: string;
        last_name: string;
      }>`
        SELECT id, created_by, first_name, last_name
        FROM events 
        WHERE id = ${req.id}
      `;

      if (events.length === 0) {
        return {
          success: false,
          message: "Wydarzenie nie zostało znalezione"
        };
      }

      const event = events[0];
      
      if (event.created_by !== req.userId && req.userId !== 'manager') {
        return {
          success: false,
          message: "Nie masz uprawnień do usunięcia tego wydarzenia"
        };
      }

      // Usuń wydarzenie
      await db.exec`
        DELETE FROM events WHERE id = ${req.id}
      `;

      return {
        success: true,
        message: `Wizyta ${event.first_name} ${event.last_name} została usunięta`
      };

    } catch (error) {
      console.error("Błąd usuwania wydarzenia:", error);
      throw APIError.internal("Błąd podczas usuwania wydarzenia");
    }
  }
);

// Aktualizuj status zadatku
export const updateDepositStatus = api(
  { method: "PUT", path: "/ai/update-deposit", expose: true },
  async (req: UpdateDepositStatusRequest): Promise<UpdateDepositStatusResponse> => {
    try {
      // Sprawdź czy użytkownik ma uprawnienia
      const events = await db.queryAll<{
        id: number;
        created_by: string;
        first_name: string;
        last_name: string;
      }>`
        SELECT id, created_by, first_name, last_name
        FROM events 
        WHERE id = ${req.id}
      `;

      if (events.length === 0) {
        return {
          success: false,
          message: "Wydarzenie nie zostało znalezione"
        };
      }

      const event = events[0];
      
      if (event.created_by !== req.userId && req.userId !== 'manager') {
        return {
          success: false,
          message: "Nie masz uprawnień do edycji tego wydarzenia"
        };
      }

      // Aktualizuj status zadatku
      await db.exec`
        UPDATE events 
        SET deposit_status = ${req.depositStatus}
        WHERE id = ${req.id}
      `;

      return {
        success: true,
        message: `Status zadatku dla ${event.first_name} ${event.last_name} został zaktualizowany na: ${req.depositStatus}`
      };

    } catch (error) {
      console.error("Błąd aktualizacji statusu zadatku:", error);
      throw APIError.internal("Błąd podczas aktualizacji statusu zadatku");
    }
  }
);

// Przenieś wydarzenie na inny termin
export const moveEvent = api(
  { method: "PUT", path: "/ai/move-event", expose: true },
  async (req: MoveEventRequest): Promise<MoveEventResponse> => {
    try {
      // Sprawdź czy użytkownik ma uprawnienia
      const events = await db.queryAll<{
        id: number;
        created_by: string;
        first_name: string;
        last_name: string;
        event_time: Date;
      }>`
        SELECT id, created_by, first_name, last_name, event_time
        FROM events 
        WHERE id = ${req.id}
      `;

      if (events.length === 0) {
        return {
          success: false,
          message: "Wydarzenie nie zostało znalezione"
        };
      }

      const event = events[0];
      
      if (event.created_by !== req.userId && req.userId !== 'manager') {
        return {
          success: false,
          message: "Nie masz uprawnień do przesunięcia tego wydarzenia"
        };
      }

      const newDate = new Date(req.newEventTime);
      if (isNaN(newDate.getTime())) {
        return {
          success: false,
          message: "Nieprawidłowy format daty"
        };
      }

      // Sprawdź konflikt terminów
      const conflicts = await db.queryAll<{
        id: number;
        first_name: string;
        last_name: string;
      }>`
        SELECT id, first_name, last_name
        FROM events 
        WHERE event_time = ${req.newEventTime}
        AND id != ${req.id}
        AND created_by = ${req.userId}
      `;

      if (conflicts.length > 0) {
        const conflict = conflicts[0];
        return {
          success: false,
          message: `Konflikt terminów! O tej godzinie masz już wizytę z ${conflict.first_name} ${conflict.last_name}`
        };
      }

      // Przenieś wydarzenie
      await db.exec`
        UPDATE events 
        SET event_time = ${req.newEventTime}
        WHERE id = ${req.id}
      `;

      const oldDate = new Date(event.event_time);
      return {
        success: true,
        message: `Wizyta ${event.first_name} ${event.last_name} została przeniesiona z ${oldDate.toLocaleString('pl-PL')} na ${newDate.toLocaleString('pl-PL')}`
      };

    } catch (error) {
      console.error("Błąd przenoszenia wydarzenia:", error);
      throw APIError.internal("Błąd podczas przenoszenia wydarzenia");
    }
  }
);