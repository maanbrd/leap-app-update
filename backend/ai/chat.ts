import { api, APIError } from "encore.dev/api";
import { secret } from "encore.dev/config";
import { generateText } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import db from "../db";
import type { Client } from "../client/list";
import type { Event } from "../event/list";

const openAIKey = secret("OpenAIKey");

export interface ChatRequest {
  message: string;
  sessionId?: string;
  userId: string; // ID użytkownika do sprawdzania uprawnień
}

export interface ChatResponse {
  response: string;
  sessionId: string;
  actions?: Array<{
    type: 'create_event' | 'edit_client' | 'generate_sms' | 'schedule_reminder';
    data: any;
    description: string;
  }>;
}

// System prompt dla AI agenta studia tatuażu
const SYSTEM_PROMPT = `
Jesteś AI asystentem dla systemu zarządzania studiem tatuażu i piercingu.

KONTEKST APLIKACJI:
- Zarządzanie klientami, wydarzeniami (wizytami), kalendarzem
- Wysyłanie SMS-ów przypominających o wizytach i zadatkach
- System dla studiów tatuażu, piercingu, kosmetyczek, mechaników
- Główne zakładki: Wydarzenia, Klienci, Kalendarz, Ustawienia, SMS, Płatności, Historia

TWOJE FUNKCJE:
1. Pomoc przy wypełnianiu formularzy wydarzeń
2. Odpowiadanie na pytania o klientów i wizyty
3. Generowanie raportów i statystyk
4. Pomoc w zarządzaniu kalendarzem
5. Przygotowywanie treści SMS-ów do zatwierdzenia

ZASADY:
- Zawsze rozmawiaj po polsku
- Bądź pomocny i konkretny
- Nie wykonuj akcji bez zgody użytkownika
- Szanuj uprawnienia użytkownika (może edytować tylko swoich klientów)
- Przy tworzeniu SMS-ów używaj dostępnych zmiennych: {IMIE}, {DATA}, {GODZ}, {STUDIO}, {KWOTA}

DOSTĘPNE SZABLONY SMS:
- SMS_D2: "Cześć {IMIE}! Wizyta {DATA} o {GODZ} w {STUDIO} – widzimy się pojutrze"
- SMS_D1: "Hej {IMIE}! Jutro {DATA} o {GODZ} w {STUDIO}"
- SMS_D0: "To dziś, {IMIE}! {GODZ} w {STUDIO}"
- SMS_AFTER_TATTOO: "Dzięki wizytę {IMIE}! Pamiętaj o pielęgnacji tatuażu..."
- SMS_AFTER_PIERCING: "Dzięki {IMIE}! Pielęgnacja piercingu: sól 2×/dzień..."
- SMS_DEP_BEFORE: "Prosimy o zadatek {KWOTA}zł za wizytę {DATA} {GODZ} w {STUDIO}"
- SMS_DEP3: "{IMIE}, prosimy o zadatek {KWOTA}zł za wizytę {DATA} {GODZ} w {STUDIO}"

Odpowiadaj naturalnie i konkretnie na pytania użytkownika.
`;

export const chat = api(
  { method: "POST", path: "/ai/chat", expose: true },
  async (req: ChatRequest): Promise<ChatResponse> => {
    if (!openAIKey()) {
      throw APIError.internal("OpenAI API key nie jest skonfigurowany");
    }

    try {
      const openai = createOpenAI({ apiKey: openAIKey() });

      // Pobierz kontekst z bazy danych
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
        WHERE created_by = ${req.userId} OR ${req.userId} = 'manager'
        ORDER BY created_at DESC
        LIMIT 50
      `;

      const events = await db.queryAll<Event>`
        SELECT 
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
        FROM events
        WHERE created_by = ${req.userId} OR ${req.userId} = 'manager'
        ORDER BY event_time ASC
        LIMIT 50
      `;

      const contextData = {
        clients: clients.length > 0 ? clients : "Brak klientów",
        events: events.length > 0 ? events : "Brak wydarzeń",
        currentDate: new Date().toISOString(),
        userId: req.userId
      };

      const contextPrompt = `
AKTUALNE DANE UŻYTKOWNIKA:
Klienci: ${JSON.stringify(contextData.clients, null, 2)}
Wydarzenia: ${JSON.stringify(contextData.events, null, 2)}
Data: ${contextData.currentDate}
ID użytkownika: ${contextData.userId}
`;

      const { text } = await generateText({
        model: openai("gpt-4o-mini") as any,
        prompt: `${SYSTEM_PROMPT}\n\n${contextPrompt}\n\nPytanie użytkownika: ${req.message}`,
      });

      // Generuj unikalne ID sesji jeśli nie zostało podane
      const sessionId = req.sessionId || `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      return {
        response: text,
        sessionId,
      };

    } catch (error) {
      console.error("Błąd AI chat:", error);
      throw APIError.internal("Błąd podczas przetwarzania zapytania AI");
    }
  }
);