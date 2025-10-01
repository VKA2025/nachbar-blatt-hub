-- Delete the new cron job
SELECT cron.unschedule('daily-waste-notifications-7am');