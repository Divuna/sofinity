-- Step 1: Add new RLS policy for AIRequests to allow viewing project-related and OneMil events
CREATE POLICY "Users can view AIRequests for their projects or OneMil events"
ON "AIRequests"
FOR SELECT
USING (
  -- Own AIRequests
  auth.uid() = user_id
  OR
  -- AIRequests without project (global OneMil)
  project_id IS NULL
  OR
  -- AIRequests for user's projects
  EXISTS (
    SELECT 1 FROM "Projects" p
    WHERE p.id = "AIRequests".project_id
    AND p.user_id = auth.uid()
  )
);

-- Step 2: Update EventLogs to set correct source_system for OneMil events
UPDATE "EventLogs"
SET source_system = 'onemil'
WHERE event_name IN (
  'voucher_purchased',
  'voucher_redeemed', 
  'contest_closed',
  'prize_won',
  'email_sent',
  'user_registered',
  'notification_sent',
  'coin_redeemed'
)
AND (source_system = 'unknown' OR source_system IS NULL);

-- Step 3: Add index for better query performance on EventLogs
CREATE INDEX IF NOT EXISTS idx_eventlogs_source_system 
ON "EventLogs"(source_system);

CREATE INDEX IF NOT EXISTS idx_airequests_type_project 
ON "AIRequests"(type, project_id);