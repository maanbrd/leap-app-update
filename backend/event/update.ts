import { api } from "encore.dev/api";
import db from "../db";
import type { Event } from "./list";

export interface UpdateEventRequest {
  id: number;
  price?: number;
  depositAmount?: number;
  depositStatus?: string;
  depositDueDate?: string;
  notes?: string;
}

export interface UpdateEventResponse {
  event: Event;
}

export const update = api<UpdateEventRequest, UpdateEventResponse>(
  { method: "PUT", path: "/events/:id", expose: true },
  async (req: UpdateEventRequest): Promise<UpdateEventResponse> => {
    if (!req.id) {
      throw new Error("Event ID is required");
    }

    const tx = await db.begin();
    
    try {
      // Update only the fields that are provided
      if (req.price !== undefined) {
        await tx.exec`
          UPDATE events 
          SET price = ${req.price}
          WHERE id = ${req.id}
        `;
      }

      if (req.depositAmount !== undefined) {
        await tx.exec`
          UPDATE events 
          SET deposit_amount = ${req.depositAmount || null}
          WHERE id = ${req.id}
        `;
      }

      if (req.depositStatus !== undefined) {
        await tx.exec`
          UPDATE events 
          SET deposit_status = ${req.depositStatus}
          WHERE id = ${req.id}
        `;
      }

      if (req.depositDueDate !== undefined) {
        await tx.exec`
          UPDATE events 
          SET deposit_due_date = ${req.depositDueDate || null}
          WHERE id = ${req.id}
        `;
      }

      if (req.notes !== undefined) {
        await tx.exec`
          UPDATE events 
          SET notes = ${req.notes || null}
          WHERE id = ${req.id}
        `;
      }

      // Get the updated event with client data
      const event = await tx.queryRow<Event>`
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
        WHERE e.id = ${req.id}
      `;

      if (!event) {
        throw new Error("Event not found");
      }

      await tx.commit();
      return { event };

    } catch (error) {
      await tx.rollback();
      throw error;
    }
  }
);