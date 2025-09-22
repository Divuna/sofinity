-- Create users table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on users table
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Create policy for users to view their own data
CREATE POLICY "Users can view their own data" ON public.users
    FOR SELECT USING (auth.uid() = id);

-- Create policy for authenticated users to insert
CREATE POLICY "Authenticated users can insert" ON public.users
    FOR INSERT WITH CHECK (auth.uid() = id);

-- Insert test user if not exists
INSERT INTO public.users (id, email, created_at)
VALUES (
    '00000000-0000-0000-0000-000000000001'::uuid,
    'test@onemil.cz',
    now()
)
ON CONFLICT (email) DO NOTHING;

-- Insert corresponding profile for test user if not exists
INSERT INTO public.profiles (user_id, email, name, role, onboarding_complete)
VALUES (
    '00000000-0000-0000-0000-000000000001'::uuid,
    'test@onemil.cz',
    'Test User OneMil',
    'team_lead',
    true
)
ON CONFLICT (user_id) DO NOTHING;

-- Create a test contest for integration testing
INSERT INTO public.contests (id, title, description, status)
VALUES (
    '00000000-0000-0000-0000-000000000002'::uuid,
    'Test Contest OneMil',
    'Testovací soutěž pro OneMil integraci',
    'active'
)
ON CONFLICT (id) DO NOTHING;