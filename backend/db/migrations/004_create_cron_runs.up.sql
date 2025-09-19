-- Create cron_runs table for tracking cron job executions
CREATE TABLE IF NOT EXISTS cron_runs (
  id TEXT PRIMARY KEY,
  job_name TEXT NOT NULL,
  planned_at TIMESTAMP NOT NULL,
  started_at TIMESTAMP,
  finished_at TIMESTAMP,
  ok INTEGER NOT NULL DEFAULT 0 CHECK (ok IN (0, 1)),
  details TEXT
);

-- Index for querying recent cron runs by job
CREATE INDEX IF NOT EXISTS idx_cron_runs_job_time 
  ON cron_runs(job_name, planned_at DESC);