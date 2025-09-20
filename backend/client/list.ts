import { api } from "encore.dev/api";
import db from "../db";

export interface Client {
  id: number;
  firstName: string;
  lastName: string;
  birthDate?: string;
  phone?: string;
  instagram?: string;
  messenger?: string;
  email?: string;
  createdBy: string;
  createdAt: Date;
}

export interface ListClientsResponse {
  clients: Client[];
}

// Retrieves all clients
export const list = api<void, ListClientsResponse>(
  { method: "GET", path: "/clients", expose: true },
  async (): Promise<ListClientsResponse> => {
    console.log('📋 Backend: Loading clients from database...');
    
    const clients = await db.queryAll<Client>`
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
      ORDER BY created_at DESC
    `;

    console.log(`✅ Backend: Loaded ${clients.length} clients`);
    return { clients };
  }
);