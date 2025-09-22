-- Remove the problematic foreign key constraint
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_user_id_fkey;

-- Since Supabase uses auth.users, we should reference that instead
-- Add proper foreign key constraint to auth.users
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

-- Add RLS policies for users table if it exists
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'users' AND table_schema = 'public') THEN
        -- Create policies for users to view their own data
        CREATE POLICY IF NOT EXISTS "Users can view their own data" ON public.users
            FOR SELECT USING (auth.uid() = id);
        
        CREATE POLICY IF NOT EXISTS "Authenticated users can insert" ON public.users
            FOR INSERT WITH CHECK (auth.uid() = id);
    END IF;
END $$;