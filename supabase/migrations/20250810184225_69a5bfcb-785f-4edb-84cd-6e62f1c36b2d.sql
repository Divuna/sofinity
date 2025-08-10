-- Add missing columns to CampaignReports table
ALTER TABLE public.CampaignReports 
ADD COLUMN IF NOT EXISTS impressions INTEGER,
ADD COLUMN IF NOT EXISTS conversions INTEGER;