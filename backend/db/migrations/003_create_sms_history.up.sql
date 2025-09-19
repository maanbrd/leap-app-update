-- Create enhanced sms_history table for cron job tracking
CREATE TABLE IF NOT EXISTS sms_history (
  id TEXT PRIMARY KEY,
  client_id TEXT,
  phone TEXT NOT NULL,
  body TEXT NOT NULL,
  template_code TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('queued', 'sent', 'failed')),
  provider_id TEXT,
  error_message TEXT,
  scheduled_for DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  sent_at DATETIME,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create unique index for idempotency (SQLite compatible)
CREATE UNIQUE INDEX IF NOT EXISTS idx_sms_unique
  ON sms_history(phone, template_code, scheduled_for);