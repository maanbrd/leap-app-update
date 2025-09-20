import { api } from "encore.dev/api";
import db from "../db";

export const checkData = api(
  { method: "GET", path: "/debug/check-data", expose: true },
  async () => {
    try {
      console.log('🔍 Debug: Checking database data...');
      
      const [eventCount, clientCount, smsCount] = await Promise.all([
        db.queryAll`SELECT COUNT(*) as count FROM events`,
        db.queryAll`SELECT COUNT(*) as count FROM clients`, 
        db.queryAll`SELECT COUNT(*) as count FROM sms_history`
      ]);
      
      // Get recent events
      const recentEvents = await db.queryAll`
        SELECT id, first_name, last_name, service, event_time, created_at 
        FROM events 
        ORDER BY created_at DESC 
        LIMIT 5
      `;
      
      // Get recent clients
      const recentClients = await db.queryAll`
        SELECT id, first_name, last_name, phone, created_at 
        FROM clients 
        ORDER BY created_at DESC 
        LIMIT 5
      `;
      
      const result = {
        summary: {
          events: eventCount[0]?.count || 0,
          clients: clientCount[0]?.count || 0,
          smsHistory: smsCount[0]?.count || 0,
        },
        recentEvents,
        recentClients,
        timestamp: new Date().toISOString()
      };
      
      console.log('✅ Debug: Data check completed:', result.summary);
      return result;
      
    } catch (error) {
      console.error('❌ Debug: Error checking data:', error);
      return {
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString()
      };
    }
  }
);