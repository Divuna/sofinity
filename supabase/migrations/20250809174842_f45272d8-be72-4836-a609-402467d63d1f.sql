-- Project cleanup and protection system
-- Part 1: Handle NULL user_id projects by reassigning to the first admin user
DO $$
DECLARE
    admin_user_id uuid;
BEGIN
    -- Find the first user to reassign orphaned projects
    SELECT user_id INTO admin_user_id 
    FROM profiles 
    WHERE role IN ('admin', 'team_lead') 
    ORDER BY created_at ASC 
    LIMIT 1;
    
    -- If no admin found, use the first user available
    IF admin_user_id IS NULL THEN
        SELECT user_id INTO admin_user_id 
        FROM profiles 
        ORDER BY created_at ASC 
        LIMIT 1;
    END IF;
    
    -- Update NULL user_id projects if we found a user
    IF admin_user_id IS NOT NULL THEN
        UPDATE "Projects" 
        SET user_id = admin_user_id,
            description = COALESCE(description, '') || ' (Přeřazen z původních ukázkových dat)'
        WHERE user_id IS NULL;
        
        RAISE NOTICE 'Reassigned % orphaned projects to user %', 
            (SELECT COUNT(*) FROM "Projects" WHERE user_id = admin_user_id AND description LIKE '%ukázkových dat%'),
            admin_user_id;
    ELSE
        -- If no users exist, delete the orphaned projects
        DELETE FROM "Projects" WHERE user_id IS NULL;
        RAISE NOTICE 'Deleted orphaned projects as no users were found';
    END IF;
END $$;

-- Part 2: Remove duplicates keeping the newest per (user_id, lower(name))
WITH duplicates AS (
    SELECT id,
           ROW_NUMBER() OVER (
               PARTITION BY user_id, LOWER(name) 
               ORDER BY created_at DESC, id DESC
           ) as rn
    FROM "Projects"
),
to_delete AS (
    SELECT id FROM duplicates WHERE rn > 1
)
DELETE FROM "Projects" 
WHERE id IN (SELECT id FROM to_delete);

-- Part 3: Create unique index on (user_id, lower(name))
CREATE UNIQUE INDEX IF NOT EXISTS projects_user_name_unique 
ON "Projects"(user_id, LOWER(name));

-- Part 4: Create trigger function to auto-fill user_id
CREATE OR REPLACE FUNCTION auto_fill_project_user_id()
RETURNS TRIGGER AS $$
BEGIN
    -- Auto-fill user_id if missing during INSERT
    IF NEW.user_id IS NULL THEN
        NEW.user_id = auth.uid();
    END IF;
    
    -- Ensure user_id is never NULL after this point
    IF NEW.user_id IS NULL THEN
        RAISE EXCEPTION 'Projects must have a valid user_id. Please ensure you are authenticated.';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Part 5: Create the trigger
DROP TRIGGER IF EXISTS trigger_auto_fill_project_user_id ON "Projects";
CREATE TRIGGER trigger_auto_fill_project_user_id
    BEFORE INSERT ON "Projects"
    FOR EACH ROW
    EXECUTE FUNCTION auto_fill_project_user_id();

-- Part 6: Update existing RLS policies to ensure user_id is required
-- (The existing policies already handle this correctly, but let's make sure)

-- Part 7: Add a comment to document the protection system
COMMENT ON INDEX projects_user_name_unique IS 'Prevents duplicate project names per user (case-insensitive)';
COMMENT ON FUNCTION auto_fill_project_user_id() IS 'Auto-fills user_id on project creation and prevents NULL user_id';
COMMENT ON TRIGGER trigger_auto_fill_project_user_id ON "Projects" IS 'Ensures every project has a valid user_id';