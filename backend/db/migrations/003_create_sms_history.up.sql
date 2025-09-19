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
  scheduled_for DATETIME,
  sent_at DATETIME,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create unique index for idempotency
CREATE UNIQUE INDEX IF NOT EXISTS idx_sms_unique
  ON sms_history(phone, template_code, COALESCE(scheduled_for, sent_at));

-- Migrate existing data if old sms_history exists
INSERT OR IGNORE INTO sms_history (
  id, phone, body, template_code, status, provider_id, sent_at, created_at
)
SELECT 
  id,
  phone,
  message as body,
  COALESCE(template_type, 'manual') as template_code,
  CASE 
    WHEN status = 'sent' THEN 'sent'
    WHEN status = 'failed' THEN 'failed'
    ELSE 'sent'
  END as status,
  message_id as provider_id,
  sent_at,
  sent_at as created_at
FROM sms_history_old
WHERE EXISTS (SELECT 1 FROM sqlite_master WHERE type='table' AND name='sms_history_old');

-- Drop old table if it was renamed
DROP TABLE IF EXISTS sms_history_old;