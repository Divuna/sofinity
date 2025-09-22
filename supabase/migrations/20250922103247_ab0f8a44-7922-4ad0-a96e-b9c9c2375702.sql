-- Remove any existing foreign key constraint on profiles
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_user_id_fkey;

-- Add proper foreign key constraint to auth.users (Supabase's existing table)
ALTER TABLE public.profiles 
ADD CONSTRAINT profiles_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Insert test profile for test user (assuming the test user exists in auth.users)
-- Note: The test user needs to be created through Supabase Auth, not direct SQL
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

-- Create user preferences for the test user if not exists
INSERT INTO public.user_preferences (user_id, email_mode, dark_mode, onboarding_complete, created_at, updated_at)
VALUES (
    '00000000-0000-0000-0000-000000000001'::uuid,
    'test',
    false,
    true,
    now(),
    now()
)
ON CONFLICT (user_id) DO NOTHING;