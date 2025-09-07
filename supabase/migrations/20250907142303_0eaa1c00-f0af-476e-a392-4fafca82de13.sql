-- Fix campaign_contacts data - remove incorrect record and add correct one
-- 1. Delete the incorrect record with wrong campaign_id
DELETE FROM campaign_contacts 
WHERE campaign_id = '19cbcb23-4ce9-44ae-845f-feda90204bb5';

-- 2. Insert the correct record with proper campaign_id
INSERT INTO campaign_contacts (campaign_id, contact_id, user_id)
VALUES (
  '19cbb237-4ce9-44ae-845f-feda90204bb5',  -- Correct campaign_id for "Test e-mailu pro Diviš"
  'd50abd62-dfa6-4219-a1cc-d0f80732475c',  -- Pavel Diviš contact_id  
  'bbc1d329-fe8d-449e-9960-6633a647b65a'   -- User_id
)
ON CONFLICT (campaign_id, contact_id) DO NOTHING;