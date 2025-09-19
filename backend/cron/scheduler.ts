import { api } from "encore.dev/api";
import { nowInWarsaw, createWarsawDateTime } from "./timezone";

export interface ScheduleStatus {
  nextRuns: {
    appointmentReminders: string; // 09:00 daily
    depositReminders: string;     // 10:00 daily  
    postServiceReminders: string; // 11:00 daily
    clientStatusRefresh: string;  // 07:00 Monday
  };
  timezone: string;
  currentTime: string;
}

// Get the schedule status and next run times
export const getSchedule = api(
  { method: "GET", path: "/cron/schedule", expose: true },
  async (): Promise<ScheduleStatus> => {
    const now = nowInWarsaw();
    
    // Calculate next run times
    const getNextRunTime = (hour: number, minute: number = 0): Date => {
      const next = createWarsawDateTime(now, hour, minute);
      
      // If the time has already passed today, schedule for tomorrow
      if (next <= now) {
        next.setDate(next.getDate() + 1);
      }
      
      return next;
    };
    
    // Calculate next Monday at 07:00 for client status refresh
    const getNextMonday = (hour: number, minute: number = 0): Date => {
      const next = createWarsawDateTime(now, hour, minute);
      const daysUntilMonday = (8 - next.getDay()) % 7;
      
      if (daysUntilMonday === 0 && next <= now) {
        // If it's Monday but time has passed, next Monday
        next.setDate(next.getDate() + 7);
      } else if (daysUntilMonday > 0) {
        // Days until next Monday
        next.setDate(next.getDate() + daysUntilMonday);
      }
      
      return next;
    };

    return {
      nextRuns: {
        appointmentReminders: getNextRunTime(9, 0).toISOString(),
        depositReminders: getNextRunTime(10, 0).toISOString(),
        postServiceReminders: getNextRunTime(11, 0).toISOString(),
        clientStatusRefresh: getNextMonday(7, 0).toISOString()
      },
      timezone: "Europe/Warsaw",
      currentTime: now.toISOString()
    };
  }
);

export interface ManualTriggerRequest {
  job: 'appointment-reminders' | 'deposit-reminders' | 'post-service-reminders' | 'client-status-refresh';
}

export interface ManualTriggerResponse {
  success: boolean;
  message: string;
  jobResult?: any;
}

// Manually trigger a specific cron job (for testing)
export const triggerJob = api(
  { method: "POST", path: "/cron/trigger", expose: true },
  async (req: ManualTriggerRequest): Promise<ManualTriggerResponse> => {
    try {
      // Import the job functions dynamically to avoid circular dependencies
      const { appointmentReminders, depositReminders, postServiceReminders, clientStatusRefresh } = await import('./jobs');
      
      let result;
      
      switch (req.job) {
        case 'appointment-reminders':
          result = await appointmentReminders();
          break;
        case 'deposit-reminders':
          result = await depositReminders();
          break;
        case 'post-service-reminders':
          result = await postServiceReminders();
          break;
        case 'client-status-refresh':
          result = await clientStatusRefresh();
          break;
        default:
          return {
            success: false,
            message: `Unknown job: ${req.job}`
          };
      }

      return {
        success: true,
        message: `Job ${req.job} executed successfully`,
        jobResult: result
      };

    } catch (error) {
      return {
        success: false,
        message: `Failed to execute job ${req.job}: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }
);