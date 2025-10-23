
-- Fix AIRequests_Campaigns_View to use correct AI request type
CREATE OR REPLACE VIEW public."AIRequests_Campaigns_View" AS
SELECT 
  ar.id AS airequest_id,
  ar.type AS ai_type,
  ar.status AS ai_status,
  ar.prompt AS ai_prompt,
  ar.response AS ai_response,
  ar.project_id,
  c.id AS campaign_id,
  c.name AS campaign_name,
  c.status AS campaign_status,
  el.id AS eventlog_id,
  el.event_name,
  el.timestamp AS event_timestamp,
  el.metadata->>'campaign_name' AS logged_campaign_name
FROM public."AIRequests" ar
LEFT JOIN public."Campaigns" c ON c.ai_request_id = ar.id
LEFT JOIN public."EventLogs" el ON (el.metadata->>'ai_request_id')::uuid = ar.id
WHERE ar.type = 'campaign_generator'
ORDER BY el.timestamp DESC NULLS LAST, ar.created_at DESC;

-- Grant access to authenticated users
GRANT SELECT ON public."AIRequests_Campaigns_View" TO authenticated;
