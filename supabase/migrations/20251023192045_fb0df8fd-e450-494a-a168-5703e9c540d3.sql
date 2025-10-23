-- Add project_id column to Notifications table
ALTER TABLE "Notifications" 
ADD COLUMN project_id uuid REFERENCES "Projects"(id);

-- Create index for better query performance
CREATE INDEX idx_notifications_project_id ON "Notifications"(project_id);

-- Update RLS policy to allow filtering by project
DROP POLICY IF EXISTS "Users can view their own notifications" ON "Notifications";

CREATE POLICY "Users can view notifications for their projects"
ON "Notifications"
FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id 
  AND (
    project_id IS NULL 
    OR EXISTS (
      SELECT 1 FROM "Projects" p 
      WHERE p.id = "Notifications".project_id 
      AND p.user_id = auth.uid()
    )
  )
);

-- Update insert policy to handle project_id
DROP POLICY IF EXISTS "Users can insert their own notifications" ON "Notifications";

CREATE POLICY "Users can insert notifications for their projects"
ON "Notifications"
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id 
  AND (
    project_id IS NULL 
    OR EXISTS (
      SELECT 1 FROM "Projects" p 
      WHERE p.id = "Notifications".project_id 
      AND p.user_id = auth.uid()
    )
  )
);

-- Update update policy
DROP POLICY IF EXISTS "Users can update their own notifications" ON "Notifications";

CREATE POLICY "Users can update notifications for their projects"
ON "Notifications"
FOR UPDATE
TO authenticated
USING (
  auth.uid() = user_id 
  AND (
    project_id IS NULL 
    OR EXISTS (
      SELECT 1 FROM "Projects" p 
      WHERE p.id = "Notifications".project_id 
      AND p.user_id = auth.uid()
    )
  )
);