-- Add event_forward to AIRequests type check constraint
ALTER TABLE "AIRequests" DROP CONSTRAINT IF EXISTS "AIRequests_type_check";

ALTER TABLE "AIRequests" ADD CONSTRAINT "AIRequests_type_check" 
CHECK (type = ANY (ARRAY[
  'campaign_generator'::text, 
  'email_assistant'::text, 
  'video_script'::text, 
  'autoresponder'::text, 
  'evaluator'::text, 
  'segment_campaign'::text,
  'event_forward'::text
]));