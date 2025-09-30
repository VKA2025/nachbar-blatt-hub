-- Enable pg_cron extension
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Enable pg_net extension for HTTP requests
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Schedule daily waste notifications to run every day at 7 AM
SELECT cron.schedule(
  'daily-waste-notifications-7am',
  '0 7 * * *',
  $$
  SELECT
    net.http_post(
        url:='https://kvrxgaxjdpxqlnfhhsrc.supabase.co/functions/v1/daily-waste-notifications',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt2cnhnYXhqZHB4cWxuZmhoc3JjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg4MzE1MTMsImV4cCI6MjA3NDQwNzUxM30.MmbnGDJMdoYHfupos8blS_pqAukS5r9A3-nzuKdsLkY"}'::jsonb,
        body:=concat('{"time": "', now(), '"}')::jsonb
    ) as request_id;
  $$
);