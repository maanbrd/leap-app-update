import { api } from "encore.dev/api";
import db from "../db";

export interface CreateEventRequest {
  firstName: string;
  lastName: string;
  birthDate?: string;
  phone?: string;
  instagram?: string;
  messenger?: string;
  email?: string;
  eventTime: string; // ISO date string
  service: string;
  price: number;
  depositAmount?: number;
  depositDueDate?: string;
  depositStatus: "zapłacony" | "niezapłacony" | "nie dotyczy";
  durationMinutes: number;
  notes?: string;
  createdBy: string;
}

export interface Event {
  id: number;
  firstName: string;
  lastName: string;
  birthDate?: string;
  phone?: string;
  instagram?: string;
  messenger?: string;
  email?: string;
  eventTime: Date;
  service: string;
  price: number;
  depositAmount?: number;
  depositDueDate?: string;
  depositStatus: string;
  durationMinutes: number;
  notes?: string;
  createdBy: string;
  createdAt: Date;
}

export interface CreateEventResponse {
  event: Event;
}

// Creates a new event
export const create = api<CreateEventRequest, CreateEventResponse>(
  { method: "POST", path: "/events", expose: true },
  async (req): Promise<CreateEventResponse> => {
    // Start a transaction to ensure both event and client are created together
    const tx = await db.begin();
    
    try {
      // Check if client already exists
      const existingClient = await tx.queryRow`
        SELECT id FROM clients 
        WHERE first_name = ${req.firstName} 
        AND last_name = ${req.lastName}
        AND phone = ${req.phone || null}
      `;

      // If client doesn't exist, create new client
      if (!existingClient) {
        await tx.exec`
          INSERT INTO clients (first_name, last_name, birth_date, phone, instagram, messenger, email, created_by)
          VALUES (${req.firstName}, ${req.lastName}, ${req.birthDate}, ${req.phone}, ${req.instagram}, ${req.messenger}, ${req.email}, ${req.createdBy})
        `;
      }

      // Create the event
      const event = await tx.queryRow<Event>`
        INSERT INTO events (
          first_name, last_name, birth_date, phone, instagram, messenger, email,
          event_time, service, price, deposit_amount, deposit_due_date, deposit_status,
          duration_minutes, notes, created_by
        )
        VALUES (
          ${req.firstName}, ${req.lastName}, ${req.birthDate}, ${req.phone}, 
          ${req.instagram}, ${req.messenger}, ${req.email}, ${req.eventTime},
          ${req.service}, ${req.price}, ${req.depositAmount}, ${req.depositDueDate},
          ${req.depositStatus}, ${req.durationMinutes}, ${req.notes}, ${req.createdBy}
        )
        RETURNING 
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
      `;

      if (!event) {
        throw new Error("Failed to create event");
      }

      // Commit the transaction
      await tx.commit();
      
      return { event };
    } catch (error) {
      // Rollback the transaction on error
      await tx.rollback();
      throw error;
    }
  }
);