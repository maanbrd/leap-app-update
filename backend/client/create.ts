import { api } from "encore.dev/api";
import db from "../db";

export interface CreateClientRequest {
  firstName: string;
  lastName: string;
  birthDate?: string;
  phone?: string;
  instagram?: string;
  messenger?: string;
  email?: string;
  createdBy: string;
}

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

export interface CreateClientResponse {
  client: Client;
}

// Creates a new client
export const create = api<CreateClientRequest, CreateClientResponse>(
  { method: "POST", path: "/clients", expose: true },
  async (req): Promise<CreateClientResponse> => {
    const client = await db.queryRow<Client>`
      INSERT INTO clients (first_name, last_name, birth_date, phone, instagram, messenger, email, created_by)
      VALUES (${req.firstName}, ${req.lastName}, ${req.birthDate}, ${req.phone}, ${req.instagram}, ${req.messenger}, ${req.email}, ${req.createdBy})
      RETURNING id, first_name as "firstName", last_name as "lastName", birth_date as "birthDate", phone, instagram, messenger, email, created_by as "createdBy", created_at as "createdAt"
    `;

    if (!client) {
      throw new Error("Failed to create client");
    }

    return { client };
  }
);