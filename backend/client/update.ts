import { api } from "encore.dev/api";
import db from "../db";
import type { Client } from "./list";

export interface UpdateClientRequest {
  id: number;
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
  async (req: UpdateClientRequest): Promise<UpdateClientResponse> => {
    if (!req.id) {
      throw new Error("Client ID is required");
    }

    const tx = await db.begin();
    
    try {
      // Update only the fields that are provided
      if (req.phone !== undefined) {
        await tx.exec`
          UPDATE clients 
          SET phone = ${req.phone || null}, updated_at = ${new Date()}
          WHERE id = ${req.id}
        `;
      }

      if (req.email !== undefined) {
        await tx.exec`
          UPDATE clients 
          SET email = ${req.email || null}, updated_at = ${new Date()}
          WHERE id = ${req.id}
        `;
      }

      if (req.instagram !== undefined) {
        await tx.exec`
          UPDATE clients 
          SET instagram = ${req.instagram || null}, updated_at = ${new Date()}
          WHERE id = ${req.id}
        `;
      }

      if (req.messenger !== undefined) {
        await tx.exec`
          UPDATE clients 
          SET messenger = ${req.messenger || null}, updated_at = ${new Date()}
          WHERE id = ${req.id}
        `;
      }

      // Get the updated client
      const client = await tx.queryRow<Client>`
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
          created_at as "createdAt",
          updated_at as "updatedAt"
        FROM clients
        WHERE id = ${req.id}
      `;

      if (!client) {
        throw new Error("Client not found");
      }

      await tx.commit();
      return { client };

    } catch (error) {
      await tx.rollback();
      throw error;
    }
  }
);