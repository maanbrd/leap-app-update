import { api } from "encore.dev/api";
import { APIError } from "encore.dev/api";
import db from "../db";
import logger from "../utils/logger";

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

export const update = api<UpdateEventRequest, UpdateEventResponse>(
  { method: "PUT", path: "/events/:id", expose: true },
  async (req): Promise<UpdateEventResponse> => {
    try {
      if (!req.id || req.id <= 0) {
        throw APIError.invalidArgument("Nieprawidłowe ID wizyty");
      }

      if (req.price !== undefined && (req.price < 0 || !Number.isInteger(req.price))) {
        throw APIError.invalidArgument("Cena musi być liczbą całkowitą ≥ 0");
      }

      if (req.depositAmount !== undefined && (req.depositAmount < 0 || !Number.isInteger(req.depositAmount))) {
        throw APIError.invalidArgument("Kwota zadatku musi być liczbą całkowitą ≥ 0");
      }

      if (req.depositStatus !== undefined && !['zapłacony', 'niezapłacony', 'nie dotyczy'].includes(req.depositStatus)) {
        throw APIError.invalidArgument("Nieprawidłowy status płatności");
      }

      // Check if event exists and get current data
      const existingEvent = await db.queryRow`
        SELECT e.*, c.first_name, c.last_name 
        FROM events e 
        JOIN clients c ON e.client_id = c.id 
        WHERE e.id = ${req.id}
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

      // Update fields individually
      if (req.price !== undefined) {
        await db.exec`UPDATE events SET price = ${req.price}, updated_at = ${new Date()} WHERE id = ${req.id}`;
      }

      if (req.depositAmount !== undefined) {
        await db.exec`UPDATE events SET deposit_amount = ${req.depositAmount}, updated_at = ${new Date()} WHERE id = ${req.id}`;
      }

      if (req.depositStatus !== undefined) {
        await db.exec`UPDATE events SET deposit_status = ${req.depositStatus}, updated_at = ${new Date()} WHERE id = ${req.id}`;
      }

      // Get the updated event
      const updatedEvent = await db.queryRow`
        SELECT 
          e.id,
          c.first_name as "firstName",
          c.last_name as "lastName",
          e.event_time as "eventTime",
          e.service,
          e.price,
          e.deposit_amount as "depositAmount",
          e.deposit_status as "depositStatus",
          e.duration_minutes as "durationMinutes",
          e.created_at as "createdAt",
          e.updated_at as "updatedAt"
        FROM events e
        JOIN clients c ON e.client_id = c.id
        WHERE e.id = ${req.id}
      `;

      if (!updatedEvent) {
        throw APIError.internal("Nie udało się pobrać zaktualizowanej wizyty");
      }

      logger.info("Event updated successfully", {
        eventId: req.id,
        timestamp: new Date().toISOString()
      });

      return {
        event: {
          id: updatedEvent.id,
          firstName: updatedEvent.firstName,
          lastName: updatedEvent.lastName,
          eventTime: updatedEvent.eventTime,
          service: updatedEvent.service,
          price: updatedEvent.price,
          depositAmount: updatedEvent.depositAmount,
          depositStatus: updatedEvent.depositStatus,
          durationMinutes: updatedEvent.durationMinutes,
          createdAt: updatedEvent.createdAt,
          updatedAt: updatedEvent.updatedAt
        }
      };

    } catch (error) {
      if (error instanceof APIError) {
        throw error;
      }

      logger.error("Error updating event", {
        eventId: req.id,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });

      throw APIError.internal("Wystąpił błąd podczas aktualizacji wizyty");
    }
  }
);