-- Create auth.users table if it doesn't exist (Supabase manages this, but adding for completeness)
CREATE TABLE IF NOT EXISTS auth.users (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    email text UNIQUE,
    aud text,
    role text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Insert test user into auth.users
INSERT INTO auth.users (id, email, aud, role, created_at)
VALUES (
    '00000000-0000-0000-0000-000000000001'::uuid,
    'test@onemil.cz',
    'authenticated',
    'user',
    now()
)
ON CONFLICT (id) DO NOTHING;

-- Remove any existing foreign key constraint on profiles
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_user_id_fkey;

-- Add proper foreign key constraint to auth.users
ALTER TABLE public.profiles 
ADD CONSTRAINT profiles_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Insert test profile for the test user
INSERT INTO public.profiles (user_id, email, name, role, onboarding_complete, created_at, updated_at)
VALUES (
    '00000000-0000-0000-0000-000000000001'::uuid,
    'test@onemil.cz',
    'Test User OneMil',
    'team_lead',
    true,
    now(),
    now()
)
ON CONFLICT (user_id) DO NOTHING;

-- Create test contest
INSERT INTO public.contests (id, title, description, status)
VALUES (
    '00000000-0000-0000-0000-000000000002'::uuid,
    'Test Contest OneMil',
    'Testovací soutěž pro OneMil integraci',
    'active'
)
ON CONFLICT (id) DO NOTHING;

-- Insert 6 test event types into EventLogs
INSERT INTO public."EventLogs" (user_id, project_id, contest_id, event_name, metadata, timestamp)
VALUES 
    (
        '00000000-0000-0000-0000-000000000001'::uuid,
        'defababe-004b-4c63-9ff1-311540b0a3c9'::uuid,
        '00000000-0000-0000-0000-000000000002'::uuid,
        'user_registered',
        '{"note": "Test user registration event", "type": "registration"}'::jsonb,
        now()
    ),
    (
        '00000000-0000-0000-0000-000000000001'::uuid,
        'defababe-004b-4c63-9ff1-311540b0a3c9'::uuid,
        '00000000-0000-0000-0000-000000000002'::uuid,
        'voucher_purchased',
        '{"note": "Test voucher purchase event", "type": "purchase", "amount": 100}'::jsonb,
        now()
    ),
    (
        '00000000-0000-0000-0000-000000000001'::uuid,
        'defababe-004b-4c63-9ff1-311540b0a3c9'::uuid,
        '00000000-0000-0000-0000-000000000002'::uuid,
        'coin_redeemed',
        '{"note": "Test coin redemption event", "type": "redemption", "coins": 50}'::jsonb,
        now()
    ),
    (
        '00000000-0000-0000-0000-000000000001'::uuid,
        'defababe-004b-4c63-9ff1-311540b0a3c9'::uuid,
        '00000000-0000-0000-0000-000000000002'::uuid,
        'contest_closed',
        '{"note": "Test contest closure event", "type": "contest_management"}'::jsonb,
        now()
    ),
    (
        '00000000-0000-0000-0000-000000000001'::uuid,
        'defababe-004b-4c63-9ff1-311540b0a3c9'::uuid,
        '00000000-0000-0000-0000-000000000002'::uuid,
        'prize_won',
        '{"note": "Test prize winning event", "type": "reward", "prize": "Test Prize"}'::jsonb,
        now()
    ),
    (
        '00000000-0000-0000-0000-000000000001'::uuid,
        'defababe-004b-4c63-9ff1-311540b0a3c9'::uuid,
        '00000000-0000-0000-0000-000000000002'::uuid,
        'notification_sent',
        '{"note": "Test notification event", "type": "communication", "channel": "email"}'::jsonb,
        now()
    )
ON CONFLICT DO NOTHING;

-- Enable RLS on auth.users table
ALTER TABLE auth.users ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for auth.users
DROP POLICY IF EXISTS "Users can view their own data" ON auth.users;
CREATE POLICY "Users can view their own data" 
ON auth.users 
FOR SELECT 
USING (auth.uid() = id);

DROP POLICY IF EXISTS "Authenticated users can insert" ON auth.users;
CREATE POLICY "Authenticated users can insert" 
ON auth.users 
FOR INSERT 
WITH CHECK (auth.uid() = id);