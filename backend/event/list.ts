import { api } from "encore.dev/api";
import db from "../db";

export interface Event {
  id: number;
  clientId: number;
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

export interface ListEventsResponse {
  events: Event[];
}

// Retrieves all events
export const list = api<void, ListEventsResponse>(
  { method: "GET", path: "/events", expose: true },
  async (): Promise<ListEventsResponse> => {
    const events = await db.queryAll<Event>`
      SELECT 
        e.id,
        e.client_id as "clientId",
        c.first_name as "firstName",
        c.last_name as "lastName", 
        c.birth_date as "birthDate",
        c.phone,
        c.instagram,
        c.messenger,
        c.email,
        e.event_time as "eventTime",
        e.service,
        e.price,
        e.deposit_amount as "depositAmount",
        e.deposit_due_date as "depositDueDate",
        e.deposit_status as "depositStatus",
        e.duration_minutes as "durationMinutes",
        e.notes,
        e.created_by as "createdBy",
        e.created_at as "createdAt"
      FROM events e
      JOIN clients c ON e.client_id = c.id
      ORDER BY e.event_time ASC
    `;

    return { events };
  }
);