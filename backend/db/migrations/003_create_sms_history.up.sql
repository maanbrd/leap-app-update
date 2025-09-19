-- Create enhanced sms_history table for cron job tracking
CREATE TABLE IF NOT EXISTS sms_history_new (
  id TEXT PRIMARY KEY,
  client_id TEXT,
  phone TEXT NOT NULL,
  body TEXT NOT NULL,
  template_code TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('queued', 'sent', 'failed')),
  provider_id TEXT,
  error_message TEXT,
  scheduled_for TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Migrate existing data if old sms_history exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'sms_history') THEN
    -- Copy existing data to new table
    INSERT INTO sms_history_new (
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
      COALESCE(sent_at, NOW()) as created_at
    FROM sms_history
    ON CONFLICT (id) DO NOTHING;
    
    -- Drop old table
    DROP TABLE sms_history;
  END IF;
  
  -- Rename new table to final name
  ALTER TABLE sms_history_new RENAME TO sms_history;
END $$;

-- Create unique index for idempotency (PostgreSQL compatible)
CREATE UNIQUE INDEX IF NOT EXISTS idx_sms_unique
  ON sms_history(phone, template_code, COALESCE(scheduled_for::text, sent_at::text));