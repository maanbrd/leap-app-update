import { api, APIError } from "encore.dev/api";
import { secret } from "encore.dev/config";
import { generateObject, generateText } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { z } from "zod";
import db from "../db";

const openAIKey = secret("OpenAIKey");

export interface AnalyzeClientDataRequest {
  clientName: string;
  phone?: string;
  service: string;
  price: number;
  userId: string;
}

export interface AnalyzeClientDataResponse {
  suggestions: {
    priceRecommendation?: {
      suggested: number;
      reason: string;
    };
    serviceNotes?: string;
    riskAssessment?: {
      level: 'low' | 'medium' | 'high';
      factors: string[];
    };
  };
  existingClient?: {
    id: number;
    firstName: string;
    lastName: string;
    lastVisit?: Date;
    totalVisits: number;
  };
}

export interface GenerateEventSummaryRequest {
  period: 'today' | 'week' | 'month';
  userId: string;
}

export interface GenerateEventSummaryResponse {
  summary: string;
  statistics: {
    totalEvents: number;
    totalRevenue: number;
    avgPrice: number;
    topServices: Array<{
      service: string;
      count: number;
    }>;
  };
}

// Analizuj dane klienta i daj sugestie
export const analyzeClientData = api(
  { method: "POST", path: "/ai/analyze-client", expose: true },
  async (req: AnalyzeClientDataRequest): Promise<AnalyzeClientDataResponse> => {
    if (!openAIKey()) {
      throw APIError.internal("OpenAI API key nie jest skonfigurowany");
    }

    try {
      // Sprawdź czy klient już istnieje
      const [firstName, ...lastNameParts] = req.clientName.split(' ');
      const lastName = lastNameParts.join(' ');

      const existingClients = await db.queryAll<{
        id: number;
        first_name: string;
        last_name: string;
        phone: string;
        created_at: Date;
      }>`
        SELECT id, first_name, last_name, phone, created_at
        FROM clients 
        WHERE LOWER(first_name) = LOWER(${firstName})
        AND LOWER(last_name) = LOWER(${lastName})
        OR phone = ${req.phone || ''}
      `;

      let existingClient;
      if (existingClients.length > 0) {
        const client = existingClients[0];
        
        // Policz wizyty tego klienta
        const visitCount = await db.queryAll<{count: number}>`
          SELECT COUNT(*) as count
          FROM events
          WHERE LOWER(first_name) = LOWER(${client.first_name})
          AND LOWER(last_name) = LOWER(${client.last_name})
        `;

        // Znajdź ostatnią wizytę
        const lastVisit = await db.queryAll<{event_time: Date}>`
          SELECT event_time
          FROM events
          WHERE LOWER(first_name) = LOWER(${client.first_name})
          AND LOWER(last_name) = LOWER(${client.last_name})
          ORDER BY event_time DESC
          LIMIT 1
        `;

        existingClient = {
          id: client.id,
          firstName: client.first_name,
          lastName: client.last_name,
          lastVisit: lastVisit[0]?.event_time,
          totalVisits: visitCount[0]?.count || 0
        };
      }

      // Pobierz dane o podobnych usługach dla analizy cen
      const similarServices = await db.queryAll<{
        service: string;
        price: number;
        duration_minutes: number;
      }>`
        SELECT service, price, duration_minutes
        FROM events
        WHERE LOWER(service) LIKE '%' || LOWER(${req.service}) || '%'
        OR service = ${req.service}
        ORDER BY created_at DESC
        LIMIT 20
      `;

      const openai = createOpenAI({ apiKey: openAIKey() });

      const analysisSchema = z.object({
        priceRecommendation: z.object({
          suggested: z.number(),
          reason: z.string()
        }).optional(),
        serviceNotes: z.string().optional(),
        riskAssessment: z.object({
          level: z.enum(['low', 'medium', 'high']),
          factors: z.array(z.string())
        }).optional()
      });

      const { object: suggestions } = await generateObject({
        model: openai("gpt-4o-mini") as any,
        schema: analysisSchema,
        prompt: `
Analizujesz dane klienta studia tatuażu/piercingu:

KLIENT:
- Imię: ${req.clientName}
- Telefon: ${req.phone || 'nie podano'}
- Usługa: ${req.service}
- Proponowana cena: ${req.price} zł

ISTNIEJĄCY KLIENT: ${existingClient ? `Tak - ${existingClient.totalVisits} wizyt, ostatnia: ${existingClient.lastVisit?.toLocaleDateString('pl-PL')}` : 'Nie'}

PODOBNE USŁUGI (ostatnie ceny):
${similarServices.map(s => `- ${s.service}: ${s.price} zł (${s.duration_minutes} min)`).join('\n')}

Przeanalizuj i podaj:
1. Rekomendację cenową na podstawie podobnych usług
2. Notatki o usłudze (jeśli potrzebne)
3. Ocenę ryzyka (czy są jakieś red flags)

Odpowiadaj po polsku, bądź konkretny i praktyczny.
        `,
      });

      return {
        suggestions,
        existingClient
      };

    } catch (error) {
      console.error("Błąd analizy danych klienta:", error);
      throw APIError.internal("Błąd podczas analizy danych klienta");
    }
  }
);

// Generuj podsumowanie wydarzeń
export const generateEventSummary = api(
  { method: "POST", path: "/ai/event-summary", expose: true },
  async (req: GenerateEventSummaryRequest): Promise<GenerateEventSummaryResponse> => {
    if (!openAIKey()) {
      throw APIError.internal("OpenAI API key nie jest skonfigurowany");
    }

    try {
      let dateFilter = '';
      const now = new Date();
      
      switch (req.period) {
        case 'today':
          const today = now.toISOString().split('T')[0];
          dateFilter = `AND DATE(event_time) = '${today}'`;
          break;
        case 'week':
          const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          dateFilter = `AND event_time >= '${weekAgo.toISOString()}'`;
          break;
        case 'month':
          const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          dateFilter = `AND event_time >= '${monthAgo.toISOString()}'`;
          break;
      }

      const events = await db.queryAll<{
        service: string;
        price: number;
        event_time: Date;
        deposit_status: string;
        duration_minutes: number;
      }>`
        SELECT service, price, event_time, deposit_status, duration_minutes
        FROM events
        WHERE (created_by = ${req.userId} OR ${req.userId} = 'manager')
        ${dateFilter}
        ORDER BY event_time DESC
      `;

      // Oblicz statystyki
      const totalEvents = events.length;
      const totalRevenue = events.reduce((sum, e) => sum + e.price, 0);
      const avgPrice = totalEvents > 0 ? totalRevenue / totalEvents : 0;

      // Top usługi
      const serviceCount = events.reduce((acc, event) => {
        acc[event.service] = (acc[event.service] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const topServices = Object.entries(serviceCount)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5)
        .map(([service, count]) => ({ service, count }));

      const openai = createOpenAI({ apiKey: openAIKey() });

      const { text: summary } = await generateText({
        model: openai("gpt-4o-mini") as any,
        prompt: `
Jesteś asystentem studia tatuażu. Przygotuj podsumowanie działalności za okres: ${req.period}.

DANE:
- Liczba wizyt: ${totalEvents}
- Łączny przychód: ${totalRevenue} zł
- Średnia cena: ${avgPrice.toFixed(2)} zł
- Top usługi: ${topServices.map(s => `${s.service} (${s.count}x)`).join(', ')}

SZCZEGÓŁY WIZYT:
${events.slice(0, 10).map(e => 
  `- ${e.service}: ${e.price} zł, ${new Date(e.event_time).toLocaleDateString('pl-PL')}, zadatek: ${e.deposit_status}`
).join('\n')}

Napisz krótkie, praktyczne podsumowanie po polsku (2-3 zdania). Podkreśl najważniejsze insights i trendy.
        `,
      });

      return {
        summary,
        statistics: {
          totalEvents,
          totalRevenue,
          avgPrice,
          topServices
        }
      };

    } catch (error) {
      console.error("Błąd generowania podsumowania:", error);
      throw APIError.internal("Błąd podczas generowania podsumowania");
    }
  }
);