import { api } from "encore.dev/api";
import db from "../db";

export interface ChatSession {
  id: string;
  userId: string;
  messages: ChatMessage[];
  createdAt: Date;
  updatedAt: Date;
}

export interface ChatMessage {
  id: string;
  sessionId: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export interface GetSessionRequest {
  sessionId: string;
  userId: string;
}

export interface GetSessionResponse {
  session: ChatSession | null;
}

export interface SaveMessageRequest {
  sessionId: string;
  userId: string;
  role: 'user' | 'assistant';
  content: string;
}

export interface SaveMessageResponse {
  success: boolean;
  messageId: string;
}

// Pobierz sesję czatu wraz z historią wiadomości
export const getSession = api(
  { method: "GET", path: "/ai/session/:sessionId", expose: true },
  async ({ sessionId }: { sessionId: string }): Promise<GetSessionResponse> => {
    try {
      // Sprawdź czy tabela chat_sessions istnieje, jeśli nie - zwróć null
      const sessionCheck = await db.queryAll`
        SELECT name FROM sqlite_master 
        WHERE type='table' AND name='chat_sessions'
      `;

      if (sessionCheck.length === 0) {
        return { session: null };
      }

      const sessions = await db.queryAll<{
        id: string;
        user_id: string;
        created_at: Date;
        updated_at: Date;
      }>`
        SELECT id, user_id, created_at, updated_at
        FROM chat_sessions 
        WHERE id = ${sessionId}
      `;

      if (sessions.length === 0) {
        return { session: null };
      }

      const session = sessions[0];

      // Pobierz wiadomości dla tej sesji
      const messages = await db.queryAll<{
        id: string;
        session_id: string;
        role: string;
        content: string;
        timestamp: Date;
      }>`
        SELECT id, session_id, role, content, timestamp
        FROM chat_messages 
        WHERE session_id = ${sessionId}
        ORDER BY timestamp ASC
      `;

      return {
        session: {
          id: session.id,
          userId: session.user_id,
          messages: messages.map(msg => ({
            id: msg.id,
            sessionId: msg.session_id,
            role: msg.role as 'user' | 'assistant',
            content: msg.content,
            timestamp: msg.timestamp
          })),
          createdAt: session.created_at,
          updatedAt: session.updated_at
        }
      };

    } catch (error) {
      console.error("Błąd pobierania sesji:", error);
      return { session: null };
    }
  }
);

// Zapisz wiadomość do sesji
export const saveMessage = api(
  { method: "POST", path: "/ai/save-message", expose: true },
  async (req: SaveMessageRequest): Promise<SaveMessageResponse> => {
    try {
      // Utwórz tabele jeśli nie istnieją
      await db.exec`
        CREATE TABLE IF NOT EXISTS chat_sessions (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `;

      await db.exec`
        CREATE TABLE IF NOT EXISTS chat_messages (
          id TEXT PRIMARY KEY,
          session_id TEXT NOT NULL,
          role TEXT NOT NULL,
          content TEXT NOT NULL,
          timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (session_id) REFERENCES chat_sessions(id)
        )
      `;

      // Sprawdź czy sesja istnieje, jeśli nie - utwórz ją
      const existingSessions = await db.queryAll`
        SELECT id FROM chat_sessions WHERE id = ${req.sessionId}
      `;

      if (existingSessions.length === 0) {
        await db.exec`
          INSERT INTO chat_sessions (id, user_id, created_at, updated_at)
          VALUES (${req.sessionId}, ${req.userId}, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        `;
      }

      // Zapisz wiadomość
      const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      await db.exec`
        INSERT INTO chat_messages (id, session_id, role, content, timestamp)
        VALUES (${messageId}, ${req.sessionId}, ${req.role}, ${req.content}, CURRENT_TIMESTAMP)
      `;

      // Zaktualizuj czas ostatniej aktualizacji sesji
      await db.exec`
        UPDATE chat_sessions 
        SET updated_at = CURRENT_TIMESTAMP 
        WHERE id = ${req.sessionId}
      `;

      return {
        success: true,
        messageId
      };

    } catch (error) {
      console.error("Błąd zapisywania wiadomości:", error);
      return {
        success: false,
        messageId: ""
      };
    }
  }
);