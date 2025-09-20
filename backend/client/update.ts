import { api, APIError } from "encore.dev/api";
import db from "../db";
import logger from '../utils/logger';

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
    createdAt: Date;
    updatedAt: Date;
  };
}

// Updates an existing client
export const update = api<UpdateClientRequest, UpdateClientResponse>(
  { method: "PUT", path: "/clients/:id", expose: true },
  async (req): Promise<UpdateClientResponse> => {
    // Walidacja ID
    if (!req.id || req.id <= 0) {
      throw APIError.invalidArgument("Nieprawidłowe ID klienta");
    }

    // Walidacja danych wejściowych
    if (req.firstName !== undefined && (!req.firstName?.trim())) {
      throw APIError.invalidArgument("Imię nie może być puste");
    }
    
    if (req.lastName !== undefined && (!req.lastName?.trim())) {
      throw APIError.invalidArgument("Nazwisko nie może być puste");
    }

    // Walidacja numeru telefonu (jeśli podany)
    if (req.phone && !/^(\+48|48)?[0-9]{9}$/.test(req.phone.replace(/[\s-]/g, ''))) {
      throw APIError.invalidArgument("Nieprawidłowy format numeru telefonu");
    }

    // Walidacja email (jeśli podany)
    if (req.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(req.email)) {
      throw APIError.invalidArgument("Nieprawidłowy format email");
    }

    // Walidacja Instagram (jeśli podany)
    if (req.instagram && !/^[a-zA-Z0-9._]+$/.test(req.instagram)) {
      throw APIError.invalidArgument("Nieprawidłowy format Instagram (tylko litery, cyfry, kropki, podkreślenia)");
    }

    // Sprawdź czy klient istnieje
    const existingClient = await db.queryRow`
      SELECT id, first_name, last_name FROM clients WHERE id = ${req.id}
    `;

    if (!existingClient) {
      throw APIError.notFound("Klient o podanym ID nie istnieje");
    }

    // Przygotuj dane do aktualizacji
    const updateData: any = {};
    
    if (req.firstName !== undefined) {
      updateData.first_name = req.firstName.trim();
    }
    if (req.lastName !== undefined) {
      updateData.last_name = req.lastName.trim();
    }
    if (req.phone !== undefined) {
      updateData.phone = req.phone ? req.phone.replace(/[\s-]/g, '') : null;
    }
    if (req.email !== undefined) {
      updateData.email = req.email ? req.email.toLowerCase().trim() : null;
    }
    if (req.instagram !== undefined) {
      updateData.instagram = req.instagram ? req.instagram.toLowerCase().trim() : null;
    }
    if (req.messenger !== undefined) {
      updateData.messenger = req.messenger ? req.messenger.trim() : null;
    }

    // Sprawdź duplikaty telefonu
    if (req.phone && updateData.phone) {
      const duplicatePhone = await db.queryRow`
        SELECT id, first_name, last_name FROM clients 
        WHERE phone = ${updateData.phone} AND id != ${req.id}
      `;

      if (duplicatePhone) {
        throw APIError.alreadyExists(
          `Klient o takim telefonie już istnieje: ${duplicatePhone.first_name} ${duplicatePhone.last_name}`
        );
      }
    }
    
    // Sprawdź duplikaty email
    if (req.email && updateData.email) {
      const duplicateEmail = await db.queryRow`
        SELECT id, first_name, last_name FROM clients 
        WHERE email = ${updateData.email} AND id != ${req.id}
      `;

      if (duplicateEmail) {
        throw APIError.alreadyExists(
          `Klient o takim emailu już istnieje: ${duplicateEmail.first_name} ${duplicateEmail.last_name}`
        );
      }
    }

    try {
      // Wykonaj aktualizację
      let updatedClient;
      
      if (Object.keys(updateData).length > 0) {
        // Buduj zapytanie dynamicznie na podstawie pól do aktualizacji
        if (req.firstName !== undefined && req.lastName !== undefined && req.phone !== undefined && req.email !== undefined && req.instagram !== undefined && req.messenger !== undefined) {
          updatedClient = await db.queryRow`
            UPDATE clients 
            SET 
              first_name = ${updateData.first_name},
              last_name = ${updateData.last_name},
              phone = ${updateData.phone},
              email = ${updateData.email},
              instagram = ${updateData.instagram},
              messenger = ${updateData.messenger}
            WHERE id = ${req.id}
            RETURNING 
              id,
              first_name as "firstName",
              last_name as "lastName", 
              phone,
              email,
              instagram,
              messenger,
              created_at as "createdAt",
              NOW() as "updatedAt"
          `;
        } else {
          // Dla pojedynczych pól - sprawdź które pole aktualizować
          if (req.phone !== undefined) {
            updatedClient = await db.queryRow`
              UPDATE clients 
              SET phone = ${updateData.phone}
              WHERE id = ${req.id}
              RETURNING 
                id,
                first_name as "firstName",
                last_name as "lastName", 
                phone,
                email,
                instagram,
                messenger,
                created_at as "createdAt",
                NOW() as "updatedAt"
            `;
          } else if (req.email !== undefined) {
            updatedClient = await db.queryRow`
              UPDATE clients 
              SET email = ${updateData.email}
              WHERE id = ${req.id}
              RETURNING 
                id,
                first_name as "firstName",
                last_name as "lastName", 
                phone,
                email,
                instagram,
                messenger,
                created_at as "createdAt",
                NOW() as "updatedAt"
            `;
          } else if (req.instagram !== undefined) {
            updatedClient = await db.queryRow`
              UPDATE clients 
              SET instagram = ${updateData.instagram}
              WHERE id = ${req.id}
              RETURNING 
                id,
                first_name as "firstName",
                last_name as "lastName", 
                phone,
                email,
                instagram,
                messenger,
                created_at as "createdAt",
                NOW() as "updatedAt"
            `;
          } else if (req.messenger !== undefined) {
            updatedClient = await db.queryRow`
              UPDATE clients 
              SET messenger = ${updateData.messenger}
              WHERE id = ${req.id}
              RETURNING 
                id,
                first_name as "firstName",
                last_name as "lastName", 
                phone,
                email,
                instagram,
                messenger,
                created_at as "createdAt",
                NOW() as "updatedAt"
            `;
          }
        }
      }

      if (!updatedClient) {
        throw new Error("Failed to update client");
      }
      
      // Log successful update
      logger.info('Client updated successfully', {
        clientId: updatedClient.id,
        clientName: `${updatedClient.firstName} ${updatedClient.lastName}`,
        updatedFields: Object.keys(updateData)
      });
      
      return { client: updatedClient as UpdateClientResponse['client'] };
      
    } catch (error) {
      // Log error for debugging
      logger.error('Error updating client', { 
        error: error instanceof Error ? error.message : String(error), 
        clientId: req.id,
        updateData
      });
      
      // Return structured error response
      if (error instanceof APIError) {
        throw error;
      }
      
      throw APIError.internal(`Błąd podczas aktualizacji klienta: ${error instanceof Error ? error.message : 'Nieznany błąd'}`);
    }
  }
);