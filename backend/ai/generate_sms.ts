import { api, APIError } from "encore.dev/api";
import { secret } from "encore.dev/config";
import { generateText } from "ai";
import { createOpenAI } from "@ai-sdk/openai";

const openAIKey = secret("OpenAIKey");

export interface GenerateSMSRequest {
  type: 'reminder_d2' | 'reminder_d1' | 'reminder_d0' | 'after_tattoo' | 'after_piercing' | 'deposit_before' | 'deposit_after';
  clientName: string;
  eventDate: string;
  eventTime: string;
  studioName: string;
  service?: string;
  depositAmount?: number;
  customMessage?: string;
}

export interface GenerateSMSResponse {
  message: string;
  variables: {
    [key: string]: string;
  };
}

const SMS_TEMPLATES = {
  reminder_d2: "Cześć {IMIE}! Wizyta {DATA} o {GODZ} w {STUDIO} – widzimy się pojutrze",
  reminder_d1: "Hej {IMIE}! Jutro {DATA} o {GODZ} w {STUDIO}",
  reminder_d0: "To dziś, {IMIE}! {GODZ} w {STUDIO}",
  after_tattoo: "Dzięki wizytę {IMIE}! Pamiętaj o pielęgnacji tatuażu. 3 razy dziennie smaruj poleconym kremem, regularnie przemywaj tatuaż, unikaj słońca i kąpieli w zbiornikach wodnych. Zrezygnuj przez następne kilka dni z intensywnego wysiłku fizycznego. W razie pytań jesteśmy do dyspozycji! ({STUDIO})",
  after_piercing: "Dzięki {IMIE}! Pielęgnacja piercingu: sól 2×/dzień, bez basenu/sauny. ({STUDIO})",
  deposit_before: "Prosimy o zadatek {KWOTA}zł za wizytę {DATA} {GODZ} w {STUDIO}",
  deposit_after: "{IMIE}, prosimy o zadatek {KWOTA}zł za wizytę {DATA} {GODZ} w {STUDIO}"
};

export const generateSMS = api(
  { method: "POST", path: "/ai/generate-sms", expose: true },
  async (req: GenerateSMSRequest): Promise<GenerateSMSResponse> => {
    try {
      let message: string;
      
      if (req.customMessage) {
        // Jeśli użytkownik podał własną wiadomość, użyj AI do jej ulepszenia
        if (!openAIKey()) {
          message = req.customMessage;
        } else {
          const openai = createOpenAI({ apiKey: openAIKey() });
          
          const { text } = await generateText({
            model: openai("gpt-4o-mini") as any,
            prompt: `
Jesteś asystentem studia tatuażu. Ulepsz tę wiadomość SMS, zachowując jej sens i dodając profesjonalny ton:

"${req.customMessage}"

Kontekst:
- Klient: ${req.clientName}
- Data wizyty: ${req.eventDate}
- Godzina: ${req.eventTime}
- Studio: ${req.studioName}
- Usługa: ${req.service || 'nieokreślona'}

Możesz używać zmiennych: {IMIE}, {DATA}, {GODZ}, {STUDIO}, {KWOTA}

Zwróć tylko tekst wiadomości, bez dodatkowych komentarzy.
            `,
          });
          
          message = text.trim();
        }
      } else {
        // Użyj standardowego szablonu
        message = SMS_TEMPLATES[req.type];
      }

      // Przygotuj zmienne do podstawienia
      const variables = {
        IMIE: req.clientName,
        DATA: req.eventDate,
        GODZ: req.eventTime,
        STUDIO: req.studioName,
        KWOTA: req.depositAmount?.toString() || "0"
      };

      return {
        message,
        variables
      };

    } catch (error) {
      console.error("Błąd generowania SMS:", error);
      throw APIError.internal("Błąd podczas generowania wiadomości SMS");
    }
  }
);