-- Clean up OneMil Email Generator data only (CORRECTED)
-- Project ID for OneMil: defababe-004b-4c63-9ff1-311540b0a3c9

-- First delete EmailMedia records for OneMil emails
DELETE FROM public."EmailMedia" 
WHERE email_id IN (
  SELECT id FROM public."Emails" 
  WHERE project_id = 'defababe-004b-4c63-9ff1-311540b0a3c9'
);

-- Delete EmailLogs for OneMil campaigns  
DELETE FROM public."EmailLogs"
WHERE campaign_id IN (
  SELECT id FROM public."Campaigns" 
  WHERE project_id = 'defababe-004b-4c63-9ff1-311540b0a3c9'
);

-- Delete EmailEvents for OneMil emails
DELETE FROM public."EmailEvents"
WHERE email_id IN (
  SELECT id FROM public."Emails" 
  WHERE project_id = 'defababe-004b-4c63-9ff1-311540b0a3c9'
) OR campaign_id IN (
  SELECT id FROM public."Campaigns" 
  WHERE project_id = 'defababe-004b-4c63-9ff1-311540b0a3c9'
);

-- Delete CampaignStats for OneMil campaigns
DELETE FROM public."CampaignStats"
WHERE campaign_id IN (
  SELECT id FROM public."Campaigns" 
  WHERE project_id = 'defababe-004b-4c63-9ff1-311540b0a3c9'
);

-- Delete CampaignSchedule for OneMil campaigns
DELETE FROM public."CampaignSchedule"
WHERE campaign_id IN (
  SELECT id FROM public."Campaigns" 
  WHERE project_id = 'defababe-004b-4c63-9ff1-311540b0a3c9'
);

-- Delete CampaignReports for OneMil campaigns
DELETE FROM public."CampaignReports"
WHERE campaign_id IN (
  SELECT id FROM public."Campaigns" 
  WHERE project_id = 'defababe-004b-4c63-9ff1-311540b0a3c9'
);

-- Delete CampaignTags for OneMil campaigns
DELETE FROM public."CampaignTags"
WHERE campaign_id IN (
  SELECT id FROM public."Campaigns" 
  WHERE project_id = 'defababe-004b-4c63-9ff1-311540b0a3c9'
);

-- Delete campaign_contacts for OneMil campaigns
DELETE FROM public.campaign_contacts
WHERE campaign_id IN (
  SELECT id FROM public."Campaigns" 
  WHERE project_id = 'defababe-004b-4c63-9ff1-311540b0a3c9'
);

-- Delete Feedback for OneMil campaigns/emails
DELETE FROM public."Feedback"
WHERE campaign_id IN (
  SELECT id FROM public."Campaigns" 
  WHERE project_id = 'defababe-004b-4c63-9ff1-311540b0a3c9'
) OR email_id IN (
  SELECT id FROM public."Emails" 
  WHERE project_id = 'defababe-004b-4c63-9ff1-311540b0a3c9'
);

-- Delete AIRequests for OneMil project (CORRECTED - use project_id, not project)
DELETE FROM public."AIRequests"
WHERE project_id = 'defababe-004b-4c63-9ff1-311540b0a3c9'
   OR event_id IN (
     SELECT id FROM public."EventLogs" 
     WHERE project_id = 'defababe-004b-4c63-9ff1-311540b0a3c9'
   );

-- Delete OneMil Emails
DELETE FROM public."Emails"
WHERE project_id = 'defababe-004b-4c63-9ff1-311540b0a3c9';

-- Delete OneMil Campaigns
DELETE FROM public."Campaigns"
WHERE project_id = 'defababe-004b-4c63-9ff1-311540b0a3c9';

-- Delete OneMil EventLogs
DELETE FROM public."EventLogs"
WHERE project_id = 'defababe-004b-4c63-9ff1-311540b0a3c9';

-- Clean audit logs for OneMil actions
DELETE FROM public.audit_logs
WHERE project_id = 'defababe-004b-4c63-9ff1-311540b0a3c9'
   OR (event_data->>'project_id')::text = 'defababe-004b-4c63-9ff1-311540b0a3c9'
   OR event_name IN ('onemil_email_generated', 'onemil_media_generated', 'multimedia_generated');