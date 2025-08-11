-- Fix the security definer view issue by removing it and using proper RLS instead
-- Remove the problematic view and replace with safer approach

-- Drop the security definer view
DROP VIEW IF EXISTS public.safe_external_integrations;

-- Remove the problematic RLS policy that was too complex
DROP POLICY IF EXISTS "Mask sensitive integration data for users" ON public.external_integrations;

-- Create a simple, secure function that applications can use to get safe integration data
CREATE OR REPLACE FUNCTION public.get_safe_integration_data(integration_id uuid)
RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    CASE 
      WHEN ei.contains_credentials = true THEN
        jsonb_build_object(
          'id', ei.id,
          'external_system', ei.external_system,
          'external_user_id', ei.external_user_id,
          'external_email', ei.external_email,
          'created_at', ei.created_at,
          'updated_at', ei.updated_at,
          'safe_metadata', jsonb_build_object(
            'linked_at', ei.mapping_data->>'linked_at',
            'last_sync', ei.mapping_data->>'last_sync',
            'status', ei.mapping_data->>'status',
            'connection_type', ei.mapping_data->>'connection_type'
          ),
          'contains_credentials', true
        )
      ELSE
        jsonb_build_object(
          'id', ei.id,
          'external_system', ei.external_system,
          'external_user_id', ei.external_user_id,
          'external_email', ei.external_email,
          'created_at', ei.created_at,
          'updated_at', ei.updated_at,
          'mapping_data', ei.mapping_data,
          'contains_credentials', false
        )
    END
  FROM public.external_integrations ei
  WHERE ei.id = integration_id 
    AND ei.user_id = auth.uid();
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_safe_integration_data TO authenticated;

-- Update the integration monitoring function to use proper search_path
CREATE OR REPLACE FUNCTION public.clean_integration_mapping_data()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if mapping_data contains sensitive fields
  IF NEW.mapping_data IS NOT NULL THEN
    -- Check for common credential field names
    IF NEW.mapping_data ? 'api_key' OR 
       NEW.mapping_data ? 'access_token' OR 
       NEW.mapping_data ? 'refresh_token' OR 
       NEW.mapping_data ? 'secret' OR 
       NEW.mapping_data ? 'password' OR 
       NEW.mapping_data ? 'private_key' OR
       NEW.mapping_data ? 'client_secret' OR
       NEW.mapping_data ? 'auth_token' THEN
      NEW.contains_credentials = true;
      
      -- Log security event for audit (only if audit_logs table exists)
      IF EXISTS (SELECT 1 FROM information_schema.tables 
                WHERE table_schema = 'public' AND table_name = 'audit_logs') THEN
        INSERT INTO public.audit_logs (
          table_name,
          operation,
          user_id,
          details
        ) VALUES (
          'external_integrations',
          'credential_storage_detected',
          auth.uid(),
          jsonb_build_object(
            'external_system', NEW.external_system,
            'integration_id', NEW.id,
            'timestamp', now()
          )
        );
      END IF;
    ELSE
      NEW.contains_credentials = false;
    END IF;
  ELSE
    NEW.contains_credentials = false;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Add helpful documentation
COMMENT ON FUNCTION public.get_safe_integration_data IS 'Safely retrieves external integration data with credential masking for user access. Use this function instead of direct table access for sensitive integration data.';
COMMENT ON FUNCTION public.clean_integration_mapping_data IS 'Trigger function that monitors and flags external integration data containing credentials.';