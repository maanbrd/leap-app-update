# Cron SMS System

This is an idempotent cron job system that automatically sends scheduled SMS messages for the tattoo/piercing studio CRM.

## Features

- **Idempotent SMS sending**: Same message to same phone with same template won't be sent twice
- **Europe/Warsaw timezone**: Handles DST automatically
- **Template-based messages**: Predefined SMS templates for different scenarios
- **Database logging**: All executions and SMS history tracked
- **Preview mode**: Dry-run testing without sending actual SMS

## Job Schedule

| Job | Time | Frequency | Purpose |
|-----|------|-----------|---------|
| Appointment Reminders | 09:00 | Daily | SMS_D2, SMS_D1, SMS_D0 |
| Deposit Reminders | 10:00 | Daily | SMS_DEPOSIT_BEFORE, SMS_DEPOSIT_AFTER |
| Post-Service | 11:00 | Daily | SMS_AFTER_TATTOO, SMS_AFTER_PIERCING |
| Client Status Refresh | 07:00 | Monday | Lightweight client status update |

## API Endpoints

### Job Execution
- `POST /cron/appointment-reminders` - Execute appointment reminder job
- `POST /cron/deposit-reminders` - Execute deposit reminder job  
- `POST /cron/post-service-reminders` - Execute post-service reminder job
- `POST /cron/client-status-refresh` - Execute client status refresh job

### Management
- `GET /cron/preview?date=YYYY-MM-DD` - Preview what messages would be sent
- `GET /cron/schedule` - Get next run times for all jobs
- `POST /cron/trigger` - Manually trigger a specific job

## SMS Templates

### Appointment Reminders
- **SMS_D2**: "Cześć {IMIE}! Wizyta {DATA} o {GODZ} w {STUDIO} – widzimy się pojutrze"
- **SMS_D1**: "Hej {IMIE}! Jutro {DATA} o {GODZ} w {STUDIO}"  
- **SMS_D0**: "To dziś, {IMIE}! {GODZ} w {STUDIO}"

### Deposit Reminders
- **SMS_DEPOSIT_BEFORE**: "Prosimy o zadatek {KWOTA}zł za wizytę {DATA} {GODZ} w {STUDIO}"
- **SMS_DEPOSIT_AFTER**: "{IMIE}, prosimy o zadatek {KWOTA}zł za wizytę {DATA} {GODZ} w {STUDIO}"

### Post-Service
- **SMS_AFTER_TATTOO**: Detailed aftercare instructions for tattoos
- **SMS_AFTER_PIERCING**: Aftercare instructions for piercings

## Database Tables

### sms_history
- Tracks all SMS messages with idempotency constraints
- Unique index on (phone, template_code, scheduled_for)

### cron_runs  
- Logs all cron job executions for monitoring
- Tracks success/failure and execution details

## Configuration

Required secrets:
- `SMSAPI_TOKEN` - SMSAPI authentication token
- `SMSAPI_SENDER` - SMS sender name/number
- `OpenAIKey` - OpenAI API key (optional, for AI-generated messages)

## External Scheduling

Since Encore.ts doesn't have built-in cron scheduling, you can use external tools:

### Using curl/wget
```bash
# Daily at 09:00
curl -X POST https://your-app.com/cron/appointment-reminders

# Daily at 10:00  
curl -X POST https://your-app.com/cron/deposit-reminders

# Daily at 11:00
curl -X POST https://your-app.com/cron/post-service-reminders

# Weekly Monday at 07:00
curl -X POST https://your-app.com/cron/client-status-refresh
```

### Using GitHub Actions
```yaml
name: Cron Jobs
on:
  schedule:
    - cron: '0 7 * * MON'  # 09:00 Warsaw time on Monday
    - cron: '0 8 * * *'    # 10:00 Warsaw time daily  
    - cron: '0 9 * * *'    # 11:00 Warsaw time daily
    - cron: '0 10 * * *'   # 12:00 Warsaw time daily
```

### Using cloud providers
- **AWS EventBridge**: Schedule Lambda functions to call endpoints
- **Google Cloud Scheduler**: HTTP targets for cron jobs
- **Azure Logic Apps**: Scheduled workflows

## Testing

Use the preview endpoint to test without sending SMS:
```bash
# Preview today's messages
curl https://your-app.com/cron/preview

# Preview specific date
curl https://your-app.com/cron/preview?date=2024-01-15
```

Manually trigger jobs for testing:
```bash
curl -X POST https://your-app.com/cron/trigger \
  -H "Content-Type: application/json" \
  -d '{"job": "appointment-reminders"}'
```