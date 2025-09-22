-- Remove any existing foreign key constraint on profiles
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_user_id_fkey;

-- Add proper foreign key constraint to auth.users (Supabase's user table)
ALTER TABLE public.profiles 
ADD CONSTRAINT profiles_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Create a test contest for integration testing
INSERT INTO public.contests (id, title, description, status)
VALUES (
    '00000000-0000-0000-0000-000000000002'::uuid,
    'Test Contest OneMil',
    'Testovací soutěž pro OneMil integraci',
    'active'
)
ON CONFLICT (id) DO NOTHING;