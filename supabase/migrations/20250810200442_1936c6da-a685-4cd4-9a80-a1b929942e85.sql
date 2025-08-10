-- Delete the specific "Opravo: Instalatér" project
DELETE FROM "Projects" 
WHERE name = 'Opravo: Instalatér';

-- Create a trigger function to block automatic creation of "Opravo:*" projects
CREATE OR REPLACE FUNCTION prevent_opravo_auto_creation()
RETURNS TRIGGER AS $$
BEGIN
    -- Block any project name that starts with "Opravo:" (case insensitive)
    IF NEW.name ILIKE 'Opravo:%' THEN
        RAISE EXCEPTION 'Automatic creation of projects starting with "Opravo:" is blocked for security reasons';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- Create trigger to prevent "Opravo:*" project creation
DROP TRIGGER IF EXISTS block_opravo_auto_creation ON "Projects";
CREATE TRIGGER block_opravo_auto_creation
    BEFORE INSERT ON "Projects"
    FOR EACH ROW
    EXECUTE FUNCTION prevent_opravo_auto_creation();