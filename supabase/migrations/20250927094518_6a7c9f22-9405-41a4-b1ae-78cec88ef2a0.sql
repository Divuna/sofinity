-- Fix users table structure and data integrity (final corrected version)
-- Add missing columns to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS full_name TEXT,
ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user';

-- Update existing test user data
UPDATE users 
SET full_name = 'Pavel Diviš', role = 'admin'
WHERE email = 'divispavel2@gmail.com';

-- Fix invalid user_id references in AIRequests
UPDATE "AIRequests" 
SET user_id = 'bbc1d329-fe8d-449e-9960-6633a647b65a'
WHERE user_id IS NULL 
   OR user_id NOT IN (SELECT user_id FROM profiles);

-- Fix invalid user_id references in Emails for OneMil project
UPDATE "Emails" 
SET user_id = 'bbc1d329-fe8d-449e-9960-6633a647b65a'
WHERE project_id = 'defababe-004b-4c63-9ff1-311540b0a3c9' 
  AND (user_id = '00000000-0000-0000-0000-000000000000' OR user_id IS NULL);

-- Create placeholder EmailMedia entries for existing drafts without media
INSERT INTO "EmailMedia" (email_id, media_type, media_url, file_name, generation_prompt, generated_by_ai)
SELECT 
  e.id as email_id,
  'image' as media_type,
  'https://via.placeholder.com/800x400/blue/white?text=OneMil+Placeholder' as media_url,
  'placeholder-' || e.id || '.png' as file_name,
  'Placeholder image for OneMil email testing' as generation_prompt,
  false as generated_by_ai
FROM "Emails" e
LEFT JOIN "EmailMedia" em ON e.id = em.email_id
WHERE e.project_id = 'defababe-004b-4c63-9ff1-311540b0a3c9'
  AND e.status = 'draft'
  AND em.email_id IS NULL;

-- Create test AIRequests for OneMil project using valid type
INSERT INTO "AIRequests" (user_id, type, prompt, status, project_id)
SELECT 
  'bbc1d329-fe8d-449e-9960-6633a647b65a' as user_id,
  'campaign_generator' as type,
  'Generated test request for email: ' || e.subject as prompt,
  'completed' as status,
  e.project_id
FROM "Emails" e
LEFT JOIN "AIRequests" ar ON ar.project_id = e.project_id AND ar.type = 'campaign_generator'
WHERE e.project_id = 'defababe-004b-4c63-9ff1-311540b0a3c9'
  AND e.status = 'draft'
  AND ar.id IS NULL;