import { api } from "encore.dev/api";
import db from "../db";

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

export interface ListEventsResponse {
  events: Event[];
}

// Retrieves all events
export const list = api<void, ListEventsResponse>(
  { method: "GET", path: "/events", expose: true },
  async (): Promise<ListEventsResponse> => {
    console.log('📋 Backend: Loading events from database...');
    
    const events = await db.queryAll<Event>`
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
      ORDER BY event_time ASC
    `;

    console.log(`✅ Backend: Loaded ${events.length} events`);
    return { events };
  }
);