-- Create weekly cron job for DB snapshot export (Sunday 02:00)
SELECT cron.schedule(
  'weekly-db-snapshot-export',
  '0 2 * * 0',
  $$
  SELECT
    net.http_post(
      url := 'https://rrmvxsldrjgbdxluklka.supabase.co/functions/v1/export-db-snapshot',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
      ),
      body := jsonb_build_object(
        'triggered_by', 'cron',
        'timestamp', now()
      )
    ) as request_id;
  $$
);