-- Add project_id to CampaignSchedule table
ALTER TABLE "CampaignSchedule" ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES "Projects"(id);

-- Backfill project_id from related Campaigns
UPDATE "CampaignSchedule" cs
SET project_id = c.project_id
FROM "Campaigns" c
WHERE cs.campaign_id = c.id
  AND cs.project_id IS NULL
  AND c.project_id IS NOT NULL;

-- Backfill project_id for records without campaign but with user_id
-- Use the first active project for that user
UPDATE "CampaignSchedule" cs
SET project_id = (
  SELECT p.id
  FROM "Projects" p
  WHERE p.user_id = cs.user_id
    AND p.is_active = true
  ORDER BY p.created_at ASC
  LIMIT 1
)
WHERE cs.project_id IS NULL
  AND cs.user_id IS NOT NULL;

-- Update RLS policies for CampaignSchedule to enforce project scoping
DROP POLICY IF EXISTS "Users can view their own campaign schedules" ON "CampaignSchedule";
DROP POLICY IF EXISTS "Users can insert their own campaign schedules" ON "CampaignSchedule";
DROP POLICY IF EXISTS "Users can update their own campaign schedules" ON "CampaignSchedule";

-- New policies with project scoping
CREATE POLICY "Users can view schedules for their projects"
  ON "CampaignSchedule"
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM "Projects" p
      WHERE p.id = "CampaignSchedule".project_id
        AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert schedules for their projects"
  ON "CampaignSchedule"
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM "Projects" p
      WHERE p.id = "CampaignSchedule".project_id
        AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update schedules for their projects"
  ON "CampaignSchedule"
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM "Projects" p
      WHERE p.id = "CampaignSchedule".project_id
        AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete schedules for their projects"
  ON "CampaignSchedule"
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM "Projects" p
      WHERE p.id = "CampaignSchedule".project_id
        AND p.user_id = auth.uid()
    )
  );

-- Service role policy for backend operations
CREATE POLICY "Service role can manage all schedules"
  ON "CampaignSchedule"
  FOR ALL
  USING (true)
  WITH CHECK (true);