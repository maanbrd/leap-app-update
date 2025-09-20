import { api } from "encore.dev/api";
import { APIError } from "encore.dev/api";
import db from "../db";
import logger from "../utils/logger";
import type { Event } from "./list";

export interface UpdateEventRequest {
  id: number;
  price?: number;
  depositAmount?: number;
  depositStatus?: "zapłacony" | "niezapłacony" | "nie dotyczy";
}

export interface UpdateEventResponse {
  event: Event;
}

export const update = api<UpdateEventRequest, UpdateEventResponse>(
  { method: "PUT", path: "/events/:id", expose: true },
  async (req): Promise<UpdateEventResponse> => {
    try {
      console.log('🔄 Backend: Updating event', req.id, 'with data:', req);
      
      // Validate ID
      if (!req.id || req.id <= 0) {
        throw APIError.invalidArgument("Nieprawidłowe ID wizyty");
      }

      // Validate price if provided
      if (req.price !== undefined && (req.price < 0 || !Number.isInteger(req.price))) {
        throw APIError.invalidArgument("Cena musi być liczbą całkowitą ≥ 0");
      }

      // Validate deposit amount if provided
      if (req.depositAmount !== undefined && (req.depositAmount < 0 || !Number.isInteger(req.depositAmount))) {
        throw APIError.invalidArgument("Kwota zadatku musi być liczbą całkowitą ≥ 0");
      }

      // Validate deposit status if provided
      if (req.depositStatus !== undefined && !['zapłacony', 'niezapłacony', 'nie dotyczy'].includes(req.depositStatus)) {
        throw APIError.invalidArgument("Nieprawidłowy status płatności");
      }

      // Check if event exists and get current data
      const existingEvent = await db.queryRow`
        SELECT * FROM events WHERE id = ${req.id}
      `;

      if (!existingEvent) {
        throw APIError.notFound("Wizyta nie została znaleziona");
      }

      // Validate deposit amount vs price
      const finalPrice = req.price !== undefined ? req.price : existingEvent.price;
      const finalDepositAmount = req.depositAmount !== undefined ? req.depositAmount : existingEvent.deposit_amount;

      if (finalDepositAmount > finalPrice) {
        throw APIError.invalidArgument("Kwota zadatku nie może być większa od ceny wizyty");
      }

      // Check if there are any fields to update
      if (req.price === undefined && req.depositAmount === undefined && req.depositStatus === undefined) {
        throw APIError.invalidArgument("Brak danych do aktualizacji");
      }

      const tx = await db.begin();
      
      try {
        // Update fields individually
        if (req.price !== undefined) {
          await tx.exec`UPDATE events SET price = ${req.price} WHERE id = ${req.id}`;
        }

        if (req.depositAmount !== undefined) {
          await tx.exec`UPDATE events SET deposit_amount = ${req.depositAmount} WHERE id = ${req.id}`;
        }

        if (req.depositStatus !== undefined) {
          await tx.exec`UPDATE events SET deposit_status = ${req.depositStatus} WHERE id = ${req.id}`;
        }

        // Get the updated event
        const updatedEvent = await tx.queryRow<Event>`
          SELECT 
            id,
            first_name as "firstName",
            last_name as "lastName", 
            birth_date as "birthDate",
            phone,
            instagram,
            messenger,
            email,
            event_time as "eventTime",
            service,
            price,
            deposit_amount as "depositAmount",
            deposit_due_date as "depositDueDate",
            deposit_status as "depositStatus",
            duration_minutes as "durationMinutes",
            notes,
            created_by as "createdBy",
            created_at as "createdAt"
          FROM events
          WHERE id = ${req.id}
        `;

        if (!updatedEvent) {
          throw new Error("Failed to retrieve updated event");
        }

        await tx.commit();

        console.log('✅ Backend: Event updated successfully:', updatedEvent.id);
        
        logger.info("Event updated successfully", {
          eventId: req.id,
          timestamp: new Date().toISOString()
        });

        return { event: updatedEvent };

      } catch (error) {
        await tx.rollback();
        throw error;
      }

    } catch (error) {
      if (error instanceof APIError) {
        throw error;
      }

      console.error('❌ Backend: Error updating event:', error);
      
      logger.error("Error updating event", {
        eventId: req.id,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });

      throw APIError.internal("Wystąpił błąd podczas aktualizacji wizyty");
    }
  }
);