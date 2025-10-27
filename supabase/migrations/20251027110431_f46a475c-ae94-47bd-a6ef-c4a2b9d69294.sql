-- Enable pg_cron extension for future use
-- Note: No cron jobs are configured here
-- Edge Function process-notification-queue will be triggered by external cron system
CREATE EXTENSION IF NOT EXISTS pg_cron;