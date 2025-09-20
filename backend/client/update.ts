import { api } from "encore.dev/api";
import { APIError } from "encore.dev/api";
import db from "../db";
import logger from "../utils/logger";

export interface UpdateClientRequest {
  id: number;
  firstName?: string;
  lastName?: string;
  phone?: string;
  email?: string;
  instagram?: string;
  messenger?: string;
}

export interface UpdateClientResponse {
  client: {
    id: number;
    firstName: string;
    lastName: string;
    phone?: string;
    email?: string;
    instagram?: string;
    messenger?: string;
    birthDate?: string;
    createdAt: Date;
    updatedAt: Date;
    createdBy: string;
  };
}

export const update = api<UpdateClientRequest, UpdateClientResponse>(
  { method: "PUT", path: "/clients/:id", expose: true },
  async (req): Promise<UpdateClientResponse> => {
    try {
      if (!req.id || req.id <= 0) {
        throw APIError.invalidArgument("Nieprawidłowe ID klienta");
      }

      if (req.firstName !== undefined && (!req.firstName || req.firstName.trim() === '')) {
        throw APIError.invalidArgument("Imię nie może być puste");
      }

      if (req.lastName !== undefined && (!req.lastName || req.lastName.trim() === '')) {
        throw APIError.invalidArgument("Nazwisko nie może być puste");
      }

      if (req.phone !== undefined && req.phone) {
        const phoneRegex = /^(\+48|48)?[0-9]{9}$/;
        const cleanPhone = req.phone.replace(/[\s-]/g, '');
        if (!phoneRegex.test(cleanPhone)) {
          throw APIError.invalidArgument("Nieprawidłowy format numeru telefonu");
        }
      }

      if (req.email !== undefined && req.email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(req.email)) {
          throw APIError.invalidArgument("Nieprawidłowy format adresu email");
        }
      }

      if (req.instagram !== undefined && req.instagram) {
        const instagramRegex = /^[a-zA-Z0-9._]+$/;
        if (!instagramRegex.test(req.instagram)) {
          throw APIError.invalidArgument("Instagram może zawierać tylko litery, cyfry, kropki i podkreślenia");
        }
      }

      // Check if client exists
      const existingClient = await db.queryRow`
        SELECT id FROM clients WHERE id = ${req.id}
      `;

      if (!existingClient) {
        throw APIError.notFound("Klient nie został znaleziony");
      }

      // Check for duplicates (phone and email)
      if (req.phone !== undefined && req.phone) {
        const cleanPhone = req.phone.replace(/[\s-]/g, '');
        const phoneDuplicate = await db.queryRow`
          SELECT id FROM clients WHERE phone = ${cleanPhone} AND id != ${req.id}
        `;
        if (phoneDuplicate) {
          throw APIError.alreadyExists("Klient z tym numerem telefonu już istnieje");
        }
      }

      if (req.email !== undefined && req.email) {
        const cleanEmail = req.email.toLowerCase().trim();
        const emailDuplicate = await db.queryRow`
          SELECT id FROM clients WHERE email = ${cleanEmail} AND id != ${req.id}
        `;
        if (emailDuplicate) {
          throw APIError.alreadyExists("Klient z tym adresem email już istnieje");
        }
      }

      // Update fields individually
      let hasUpdates = false;

      if (req.firstName !== undefined) {
        await db.exec`UPDATE clients SET first_name = ${req.firstName.trim()}, updated_at = NOW() WHERE id = ${req.id}`;
        hasUpdates = true;
      }
      if (req.lastName !== undefined) {
        await db.exec`UPDATE clients SET last_name = ${req.lastName.trim()}, updated_at = NOW() WHERE id = ${req.id}`;
        hasUpdates = true;
      }
      if (req.phone !== undefined) {
        const cleanPhone = req.phone.replace(/[\s-]/g, '');
        await db.exec`UPDATE clients SET phone = ${cleanPhone}, updated_at = NOW() WHERE id = ${req.id}`;
        hasUpdates = true;
      }
      if (req.email !== undefined) {
        const cleanEmail = req.email.toLowerCase().trim();
        await db.exec`UPDATE clients SET email = ${cleanEmail}, updated_at = NOW() WHERE id = ${req.id}`;
        hasUpdates = true;
      }
      if (req.instagram !== undefined) {
        const cleanInstagram = req.instagram.toLowerCase().trim();
        await db.exec`UPDATE clients SET instagram = ${cleanInstagram}, updated_at = NOW() WHERE id = ${req.id}`;
        hasUpdates = true;
      }
      if (req.messenger !== undefined) {
        await db.exec`UPDATE clients SET messenger = ${req.messenger.trim()}, updated_at = NOW() WHERE id = ${req.id}`;
        hasUpdates = true;
      }

      if (!hasUpdates) {
        throw APIError.invalidArgument("Brak danych do aktualizacji");
      }

      // Get updated client
      const updatedClient = await db.queryRow`
        SELECT 
          id, 
          first_name as "firstName", 
          last_name as "lastName", 
          phone, 
          email, 
          instagram, 
          messenger, 
          birth_date as "birthDate", 
          created_at as "createdAt", 
          updated_at as "updatedAt", 
          created_by as "createdBy"
        FROM clients 
        WHERE id = ${req.id}
      `;

      if (!updatedClient) {
        throw APIError.internal("Nie udało się pobrać zaktualizowanych danych klienta");
      }

      logger.info("Client updated successfully", {
        clientId: req.id,
        updatedFields: Object.keys(req).filter(key => key !== 'id' && req[key as keyof UpdateClientRequest] !== undefined),
        timestamp: new Date().toISOString()
      });

      return {
        client: {
          id: updatedClient.id,
          firstName: updatedClient.firstName,
          lastName: updatedClient.lastName,
          phone: updatedClient.phone,
          email: updatedClient.email,
          instagram: updatedClient.instagram,
          messenger: updatedClient.messenger,
          birthDate: updatedClient.birthDate,
          createdAt: updatedClient.createdAt,
          updatedAt: updatedClient.updatedAt,
          createdBy: updatedClient.createdBy
        }
      };

    } catch (error) {
      if (error instanceof APIError) {
        throw error;
      }

      logger.error("Error updating client", {
        clientId: req.id,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });

      throw APIError.internal("Wystąpił błąd podczas aktualizacji klienta");
    }
  }
);