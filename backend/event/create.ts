import { api, APIError } from "encore.dev/api";
import db from "../db";
import logger from '../utils/logger';

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
    // Walidacja danych wejściowych
    if (!req.firstName?.trim()) {
      throw APIError.invalidArgument("Imię jest wymagane");
    }
    if (!req.lastName?.trim()) {
      throw APIError.invalidArgument("Nazwisko jest wymagane");
    }
    if (!req.eventTime) {
      throw APIError.invalidArgument("Data wizyty jest wymagana");
    }
    if (!req.service?.trim()) {
      throw APIError.invalidArgument("Usługa jest wymagana");
    }
    if (req.price <= 0) {
      throw APIError.invalidArgument("Cena musi być większa od 0");
    }
    if (req.durationMinutes <= 0) {
      throw APIError.invalidArgument("Czas trwania musi być większy od 0");
    }

    // Walidacja daty
    const eventDate = new Date(req.eventTime);
    if (isNaN(eventDate.getTime())) {
      throw APIError.invalidArgument("Nieprawidłowy format daty");
    }
    if (eventDate < new Date()) {
      throw APIError.invalidArgument("Data wizyty nie może być w przeszłości");
    }

    // Walidacja numeru telefonu (jeśli podany)
    if (req.phone && !/^(\+48|48)?[0-9]{9}$/.test(req.phone.replace(/[\s-]/g, ''))) {
      throw APIError.invalidArgument("Nieprawidłowy format numeru telefonu");
    }

    // Walidacja email (jeśli podany)
    if (req.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(req.email)) {
      throw APIError.invalidArgument("Nieprawidłowy format email");
    }

    // Walidacja i formatowanie dat
    const eventTime = new Date(req.eventTime);
    if (isNaN(eventTime.getTime())) {
      throw APIError.invalidArgument("Nieprawidłowy format daty wizyty");
    }
    
    const birthDate = req.birthDate ? new Date(req.birthDate) : null;
    if (req.birthDate && birthDate && isNaN(birthDate.getTime())) {
      throw APIError.invalidArgument("Nieprawidłowy format daty urodzenia");
    }
    
    const depositDueDate = req.depositDueDate ? new Date(req.depositDueDate) : null;
    if (req.depositDueDate && depositDueDate && isNaN(depositDueDate.getTime())) {
      throw APIError.invalidArgument("Nieprawidłowy format daty zadatku");
    }
    
    // Walidacja depositAmount
    const depositAmount = req.depositAmount ? parseFloat(req.depositAmount.toString()) : null;
    if (req.depositAmount && depositAmount !== null && (isNaN(depositAmount) || depositAmount < 0)) {
      throw APIError.invalidArgument("Nieprawidłowa kwota zadatku");
    }

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

      // Create the event with proper date formatting
      const event = await tx.queryRow<Event>`
        INSERT INTO events (
          first_name, last_name, birth_date, phone, instagram, messenger, email,
          event_time, service, price, deposit_amount, deposit_due_date, deposit_status,
          duration_minutes, notes, created_by
        )
        VALUES (
          ${req.firstName}, ${req.lastName}, 
          ${req.birthDate ? new Date(req.birthDate) : null}, 
          ${req.phone || null}, 
          ${req.instagram || null}, 
          ${req.messenger || null}, 
          ${req.email || null}, 
          ${new Date(req.eventTime)},
          ${req.service}, 
          ${req.price}, 
          ${req.depositAmount ? parseFloat(req.depositAmount.toString()) : null}, 
          ${req.depositDueDate ? new Date(req.depositDueDate) : null},
          ${req.depositStatus}, 
          ${req.durationMinutes}, 
          ${req.notes || null}, 
          ${req.createdBy}
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
      
      // Log successful creation
      logger.info('Event created successfully', {
        eventId: event.id,
        clientName: `${req.firstName} ${req.lastName}`,
        eventTime: req.eventTime,
        service: req.service
      });
      
      // Verify data was saved
      const verifyEvent = await db.queryRow<Event>`
        SELECT id, first_name, last_name, event_time, service, created_at
        FROM events 
        WHERE id = ${event.id}
      `;
      
      if (!verifyEvent) {
        logger.error('Event not found after creation', { eventId: event.id });
        throw APIError.internal('Błąd weryfikacji - wydarzenie nie zostało zapisane');
      }
      
      logger.info('Event verification successful', { 
        eventId: verifyEvent.id,
        createdAt: verifyEvent.createdAt 
      });
      
      return { event };
    } catch (error) {
      // Rollback the transaction on error
      await tx.rollback();
      
      // Log error for debugging
      logger.error('Error creating event', { 
        error: error instanceof Error ? error.message : String(error), 
        stack: error instanceof Error ? error.stack : undefined,
        requestData: { firstName: req.firstName, lastName: req.lastName }
      });
      
      // Return structured error response
      if (error instanceof APIError) {
        throw error;
      }
      
      throw APIError.internal(`Błąd podczas tworzenia wizyty: ${error instanceof Error ? error.message : 'Nieznany błąd'}`);
    }
  }
);