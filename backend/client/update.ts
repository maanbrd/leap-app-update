import { api } from "encore.dev/api";
import { APIError } from "encore.dev/api";
import db from "../db";
import logger from "../utils/logger";
import type { Client } from "./list";

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
  client: Client;
}

export const update = api<UpdateClientRequest, UpdateClientResponse>(
  { method: "PUT", path: "/clients/:id", expose: true },
  async (req): Promise<UpdateClientResponse> => {
    try {
      console.log('🔄 Backend: Updating client', req.id, 'with data:', req);
      
      // Validate ID
      if (!req.id || req.id <= 0) {
        throw APIError.invalidArgument("Nieprawidłowe ID klienta");
      }

      // Validate required fields if provided
      if (req.firstName !== undefined && (!req.firstName || req.firstName.trim() === '')) {
        throw APIError.invalidArgument("Imię nie może być puste");
      }

      if (req.lastName !== undefined && (!req.lastName || req.lastName.trim() === '')) {
        throw APIError.invalidArgument("Nazwisko nie może być puste");
      }

      // Validate phone format if provided
      if (req.phone !== undefined && req.phone) {
        const phoneRegex = /^(\+48|48)?[0-9]{9}$/;
        const cleanPhone = req.phone.replace(/[\s-]/g, '');
        if (!phoneRegex.test(cleanPhone)) {
          throw APIError.invalidArgument("Nieprawidłowy format numeru telefonu");
        }
      }

      // Validate email format if provided
      if (req.email !== undefined && req.email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(req.email)) {
          throw APIError.invalidArgument("Nieprawidłowy format adresu email");
        }
      }

      // Validate Instagram format if provided
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
      if (req.phone !== undefined && req.phone.trim() !== '') {
        const cleanPhone = req.phone.replace(/[\s-]/g, '');
        const phoneDuplicate = await db.queryRow`
          SELECT id FROM clients WHERE phone = ${cleanPhone} AND id != ${req.id}
        `;
        if (phoneDuplicate) {
          throw APIError.alreadyExists("Klient z tym numerem telefonu już istnieje");
        }
      }

      if (req.email !== undefined && req.email.trim() !== '') {
        const cleanEmail = req.email.toLowerCase().trim();
        const emailDuplicate = await db.queryRow`
          SELECT id FROM clients WHERE email = ${cleanEmail} AND id != ${req.id}
        `;
        if (emailDuplicate) {
          throw APIError.alreadyExists("Klient z tym adresem email już istnieje");
        }
      }

      // Check if there are any fields to update
      if (req.firstName === undefined && req.lastName === undefined && 
          req.phone === undefined && req.email === undefined && 
          req.instagram === undefined && req.messenger === undefined) {
        throw APIError.invalidArgument("Brak danych do aktualizacji");
      }

      const tx = await db.begin();
      
      try {
        // Update fields individually
        if (req.firstName !== undefined) {
          const firstName = req.firstName.trim();
          await tx.exec`UPDATE clients SET first_name = ${firstName} WHERE id = ${req.id}`;
        }

        if (req.lastName !== undefined) {
          const lastName = req.lastName.trim();
          await tx.exec`UPDATE clients SET last_name = ${lastName} WHERE id = ${req.id}`;
        }

        if (req.phone !== undefined) {
          const phone = req.phone.trim() === '' ? null : req.phone.replace(/[\s-]/g, '');
          await tx.exec`UPDATE clients SET phone = ${phone} WHERE id = ${req.id}`;
        }

        if (req.email !== undefined) {
          const email = req.email.trim() === '' ? null : req.email.toLowerCase().trim();
          await tx.exec`UPDATE clients SET email = ${email} WHERE id = ${req.id}`;
        }

        if (req.instagram !== undefined) {
          const instagram = req.instagram.trim() === '' ? null : req.instagram.toLowerCase().trim();
          await tx.exec`UPDATE clients SET instagram = ${instagram} WHERE id = ${req.id}`;
        }

        if (req.messenger !== undefined) {
          const messenger = req.messenger.trim() === '' ? null : req.messenger.trim();
          await tx.exec`UPDATE clients SET messenger = ${messenger} WHERE id = ${req.id}`;
        }

        // Get the updated client
        const updatedClient = await tx.queryRow<Client>`
          SELECT 
            id, 
            first_name as "firstName", 
            last_name as "lastName", 
            birth_date as "birthDate", 
            phone, 
            instagram, 
            messenger, 
            email, 
            created_by as "createdBy", 
            created_at as "createdAt"
          FROM clients
          WHERE id = ${req.id}
        `;

        if (!updatedClient) {
          throw new Error("Failed to retrieve updated client");
        }

        await tx.commit();

        console.log('✅ Backend: Client updated successfully:', updatedClient.id);

        logger.info("Client updated successfully", {
          clientId: req.id,
          timestamp: new Date().toISOString()
        });

        return { client: updatedClient };

      } catch (error) {
        await tx.rollback();
        throw error;
      }

    } catch (error) {
      if (error instanceof APIError) {
        throw error;
      }

      console.error('❌ Backend: Error updating client:', error);

      logger.error("Error updating client", {
        clientId: req.id,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });

      throw APIError.internal("Wystąpił błąd podczas aktualizacji klienta");
    }
  }
);