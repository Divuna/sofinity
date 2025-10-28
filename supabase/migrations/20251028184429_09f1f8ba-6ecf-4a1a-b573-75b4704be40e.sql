-- Oprava claim_anonymous_device RPC funkce
-- Zajistí správné matchování emailu z user_devices i z profiles
CREATE OR REPLACE FUNCTION public.claim_anonymous_device(
  p_email TEXT,
  p_new_user_id UUID
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  updated_count INTEGER;
  v_profile_email TEXT;
BEGIN
  -- Získat email z profilu pro lepší matchování
  SELECT email INTO v_profile_email
  FROM public.profiles
  WHERE user_id = p_new_user_id
  LIMIT 1;

  -- Transfer anonymous devices to authenticated user
  -- Matchuje email z user_devices.email NEBO profiles.email
  UPDATE public.user_devices 
  SET 
    user_id = p_new_user_id,
    updated_at = now()
  WHERE 
    (email = p_email OR email = v_profile_email)
    AND user_id IS NULL;
  
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  
  -- Console logging pro debugging
  RAISE INFO '✅ Anonymous device claimed for user %', p_new_user_id;
  RAISE NOTICE '✅ Anonymous device claimed for user % (devices: %)', p_new_user_id, updated_count;
  
  -- Audit log pro tracking device claims
  IF updated_count > 0 THEN
    INSERT INTO public.audit_logs (event_name, user_id, event_data, created_at)
    VALUES (
      'device_claimed',
      p_new_user_id,
      jsonb_build_object(
        'email', p_email,
        'profile_email', v_profile_email,
        'devices_claimed', updated_count,
        'timestamp', now()
      ),
      now()
    );
  END IF;
  
  RETURN updated_count;
END;
$$;

COMMENT ON FUNCTION public.claim_anonymous_device IS 
'Přiřadí anonymní zařízení (user_id = NULL) k ověřenému uživateli. Matchuje email z user_devices.email nebo profiles.email.';