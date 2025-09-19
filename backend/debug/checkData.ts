import { api } from "encore.dev/api";
import db from "../db";

export const checkData = api(
  { method: "GET", path: "/debug/check-data", expose: true },
  async () => {
    try {
      const [events, clients, smsHistory] = await Promise.all([
        db.queryAll`SELECT COUNT(*) as count FROM events`,
        db.queryAll`SELECT COUNT(*) as count FROM clients`, 
        db.queryAll`SELECT COUNT(*) as count FROM sms_history`
      ]);
      
      return {
        events: events[0]?.count || 0,
        clients: clients[0]?.count || 0,
        smsHistory: smsHistory[0]?.count || 0,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString()
      };
    }
  }
);