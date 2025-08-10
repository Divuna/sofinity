-- Check if selected_project_id column exists in UserPreferences table
-- If not, add it to enable project persistence

ALTER TABLE public."UserPreferences" 
ADD COLUMN IF NOT EXISTS selected_project_id uuid,
ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone DEFAULT now();

-- Add foreign key constraint to Projects table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'UserPreferences_selected_project_id_fkey'
    ) THEN
        ALTER TABLE public."UserPreferences" 
        ADD CONSTRAINT "UserPreferences_selected_project_id_fkey" 
        FOREIGN KEY (selected_project_id) REFERENCES public."Projects"(id);
    END IF;
END $$;

-- Create trigger to auto-update updated_at column
CREATE OR REPLACE FUNCTION public.update_user_preferences_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS update_user_preferences_updated_at_trigger ON public."UserPreferences";
CREATE TRIGGER update_user_preferences_updated_at_trigger
    BEFORE UPDATE ON public."UserPreferences"
    FOR EACH ROW
    EXECUTE FUNCTION public.update_user_preferences_updated_at();