import { api } from "encore.dev/api";
import db from "../db";

export interface AIMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export interface Session {
  id: string;
  userId: string;
  messages: AIMessage[];
  createdAt: Date;
}

export interface GetSessionResponse {
  session: Session | null;
}

// Pobierz sesję czatu wraz z historią wiadomości
export const getSession = api(
  { method: "GET", path: "/ai/session/:sessionId", expose: true },
  async ({ sessionId }: { sessionId: string }): Promise<GetSessionResponse> => {
    try {
      console.log('🤖 AI: Getting session', sessionId);
      
      // For now, return empty session since we don't have AI tables yet
      // This prevents errors until AI tables are properly implemented
      console.log('⚠️ AI: No AI tables implemented yet, returning empty session');
      
      return { session: null };

    } catch (error) {
      console.error('❌ AI: Error getting session:', error);
      return { session: null };
    }
  }
);