-- Create hourly cron job for Opravo email metrics sync
SELECT cron.schedule(
  'opravo-email-metrics-sync',
  '0 * * * *', -- Every hour at minute 0
  $$
  SELECT
    net.http_post(
      url := 'https://rrmvxsldrjgbdxluklka.supabase.co/functions/v1/opravo-email-metrics-sync',
      headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJybXZ4c2xkcmpnYmR4bHVrbGthIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM2MDk5NzMsImV4cCI6MjA2OTE4NTk3M30.fYPxCqMsyWfePJuBEiC8e8_vaHwJIJVmD3S3PrMF7fU"}'::jsonb,
      body := '{"scheduled": true}'::jsonb
    ) AS request_id;
  $$
);