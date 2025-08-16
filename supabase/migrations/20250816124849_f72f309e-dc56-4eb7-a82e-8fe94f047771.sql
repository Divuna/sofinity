-- Fix critical security vulnerability in Contacts table
-- Issue: user_id column is nullable, which can bypass RLS policies

-- First, update any existing contacts with NULL user_id to prevent data loss
-- This should be rare, but we'll handle it safely
UPDATE public."Contacts" 
SET user_id = auth.uid() 
WHERE user_id IS NULL AND auth.uid() IS NOT NULL;

-- Make user_id NOT NULL and add default value for security
ALTER TABLE public."Contacts" 
ALTER COLUMN user_id SET NOT NULL,
ALTER COLUMN user_id SET DEFAULT auth.uid();

-- Create a security trigger to ensure user_id is always set correctly
CREATE OR REPLACE FUNCTION public.ensure_contact_user_id()
RETURNS TRIGGER AS $$
BEGIN
    -- Ensure user_id is set on INSERT
    IF NEW.user_id IS NULL THEN
        NEW.user_id = auth.uid();
    END IF;
    
    -- Prevent changing user_id on UPDATE (security measure)
    IF TG_OP = 'UPDATE' AND OLD.user_id != NEW.user_id THEN
        RAISE EXCEPTION 'Cannot change contact ownership (user_id)';
    END IF;
    
    -- Ensure user_id is never NULL
    IF NEW.user_id IS NULL THEN
        RAISE EXCEPTION 'Contacts must have a valid user_id. Please ensure you are authenticated.';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply the trigger to prevent security bypasses
CREATE TRIGGER ensure_contact_security
    BEFORE INSERT OR UPDATE ON public."Contacts"
    FOR EACH ROW
    EXECUTE FUNCTION public.ensure_contact_user_id();

-- Strengthen RLS policies to be more explicit about NULL handling
DROP POLICY IF EXISTS "Users can view their own contacts" ON public."Contacts";
DROP POLICY IF EXISTS "Users can insert their own contacts" ON public."Contacts";
DROP POLICY IF EXISTS "Users can update their own contacts" ON public."Contacts";

-- Create stronger RLS policies with explicit NULL checks
CREATE POLICY "Users can view their own contacts" 
ON public."Contacts" 
FOR SELECT 
USING (
    auth.uid() IS NOT NULL 
    AND user_id IS NOT NULL 
    AND auth.uid() = user_id
);

CREATE POLICY "Users can insert their own contacts" 
ON public."Contacts" 
FOR INSERT 
WITH CHECK (
    auth.uid() IS NOT NULL 
    AND user_id IS NOT NULL 
    AND auth.uid() = user_id
);

CREATE POLICY "Users can update their own contacts" 
ON public."Contacts" 
FOR UPDATE 
USING (
    auth.uid() IS NOT NULL 
    AND user_id IS NOT NULL 
    AND auth.uid() = user_id
) 
WITH CHECK (
    auth.uid() IS NOT NULL 
    AND user_id IS NOT NULL 
    AND auth.uid() = user_id
);

-- Add DELETE policy for completeness (was missing)
CREATE POLICY "Users can delete their own contacts" 
ON public."Contacts" 
FOR DELETE 
USING (
    auth.uid() IS NOT NULL 
    AND user_id IS NOT NULL 
    AND auth.uid() = user_id
);