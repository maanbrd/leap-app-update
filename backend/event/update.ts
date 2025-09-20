import { api, APIError } from "encore.dev/api";
import db from "../db";
import logger from '../utils/logger';

export interface UpdateEventRequest {
  id: number;
  price?: number;
  depositAmount?: number;
  depositStatus?: "zapłacony" | "niezapłacony" | "nie dotyczy";
}

export interface UpdateEventResponse {
  event: {
    id: number;
    firstName: string;
    lastName: string;
    eventTime: Date;
    service: string;
    price: number;
    depositAmount?: number;
    depositStatus: string;
    durationMinutes: number;
    createdAt: Date;
    updatedAt: Date;
  };
}

// Updates an existing event
export const update = api<UpdateEventRequest, UpdateEventResponse>(
  { method: "PUT", path: "/events/:id", expose: true },
  async (req): Promise<UpdateEventResponse> => {
    // Walidacja ID
    if (!req.id || req.id <= 0) {
      throw APIError.invalidArgument("Nieprawidłowe ID wizyty");
    }

    // Walidacja ceny
    if (req.price !== undefined && (req.price <= 0 || !Number.isInteger(req.price))) {
      throw APIError.invalidArgument("Cena musi być dodatnią liczbą całkowitą");
    }

    // Walidacja kwoty zadatku
    if (req.depositAmount !== undefined && (req.depositAmount < 0 || !Number.isInteger(req.depositAmount))) {
      throw APIError.invalidArgument("Kwota zadatku musi być nieujemną liczbą całkowitą");
    }

    // Walidacja statusu zadatku
    if (req.depositStatus && !["zapłacony", "niezapłacony", "nie dotyczy"].includes(req.depositStatus)) {
      throw APIError.invalidArgument("Nieprawidłowy status zadatku");
    }

    // Sprawdź czy wizyta istnieje
    const existingEvent = await db.queryRow`
      SELECT id, first_name, last_name, price, deposit_amount FROM events WHERE id = ${req.id}
    `;

    if (!existingEvent) {
      throw APIError.notFound("Wizyta o podanym ID nie istnieje");
    }

    // Walidacja: zadatek nie może być większy od ceny
    const finalPrice = req.price !== undefined ? req.price : existingEvent.price;
    const finalDepositAmount = req.depositAmount !== undefined ? req.depositAmount : existingEvent.deposit_amount;
    
    if (finalDepositAmount > finalPrice) {
      throw APIError.invalidArgument("Kwota zadatku nie może być większa od ceny wizyty");
    }

    try {
      // Wykonaj aktualizację
      let updatedEvent;
      
      if (req.price !== undefined && req.depositAmount !== undefined && req.depositStatus !== undefined) {
        // Wszystkie 3 pola
        updatedEvent = await db.queryRow`
          UPDATE events 
          SET price = ${req.price}, deposit_amount = ${req.depositAmount}, deposit_status = ${req.depositStatus}
          WHERE id = ${req.id}
          RETURNING 
            id,
            first_name as "firstName",
            last_name as "lastName",
            event_time as "eventTime",
            service,
            price,
            deposit_amount as "depositAmount",
            deposit_status as "depositStatus",
            duration_minutes as "durationMinutes",
            created_at as "createdAt",
            created_at as "updatedAt"
        `;
      } else if (req.price !== undefined) {
        // Tylko cena
        updatedEvent = await db.queryRow`
          UPDATE events 
          SET price = ${req.price}
          WHERE id = ${req.id}
          RETURNING 
            id,
            first_name as "firstName",
            last_name as "lastName",
            event_time as "eventTime",
            service,
            price,
            deposit_amount as "depositAmount",
            deposit_status as "depositStatus",
            duration_minutes as "durationMinutes",
            created_at as "createdAt",
            created_at as "updatedAt"
        `;
      } else if (req.depositAmount !== undefined) {
        // Tylko kwota zadatku
        updatedEvent = await db.queryRow`
          UPDATE events 
          SET deposit_amount = ${req.depositAmount}
          WHERE id = ${req.id}
          RETURNING 
            id,
            first_name as "firstName",
            last_name as "lastName",
            event_time as "eventTime",
            service,
            price,
            deposit_amount as "depositAmount",
            deposit_status as "depositStatus",
            duration_minutes as "durationMinutes",
            created_at as "createdAt",
            created_at as "updatedAt"
        `;
      } else if (req.depositStatus !== undefined) {
        // Tylko status zadatku
        updatedEvent = await db.queryRow`
          UPDATE events 
          SET deposit_status = ${req.depositStatus}
          WHERE id = ${req.id}
          RETURNING 
            id,
            first_name as "firstName",
            last_name as "lastName",
            event_time as "eventTime",
            service,
            price,
            deposit_amount as "depositAmount",
            deposit_status as "depositStatus",
            duration_minutes as "durationMinutes",
            created_at as "createdAt",
            created_at as "updatedAt"
        `;
      } else {
        throw APIError.invalidArgument("Brak danych do aktualizacji");
      }

      if (!updatedEvent) {
        throw new Error("Failed to update event");
      }
      
      // Log successful update
      logger.info('Event updated successfully', {
        eventId: updatedEvent.id,
        clientName: `${updatedEvent.firstName} ${updatedEvent.lastName}`,
        updatedBy: 'user'
      });
      
      return { event: updatedEvent as UpdateEventResponse['event'] };
      
    } catch (error) {
      // Log error for debugging
      logger.error('Error updating event', { 
        error: error instanceof Error ? error.message : String(error), 
        stack: error instanceof Error ? error.stack : undefined,
        eventId: req.id
      });
      
      // Return structured error response
      if (error instanceof APIError) {
        throw error;
      }
      
      throw APIError.internal(`Błąd podczas aktualizacji wizyty: ${error instanceof Error ? error.message : 'Nieznany błąd'}`);
    }
  }
);