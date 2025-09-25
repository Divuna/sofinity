-- Add scheduled_at column to Emails table for scheduled publishing
ALTER TABLE public."Emails" ADD COLUMN scheduled_at timestamp with time zone;