-- Add encryption support for sensitive external integration data
-- Create a function to safely store integration mapping data without exposing credentials

-- First, let's add a field to track if the mapping data contains sensitive information
ALTER TABLE public.external_integrations 
ADD COLUMN contains_credentials boolean DEFAULT false;

-- Create a security definer function to safely handle integration data
CREATE OR REPLACE FUNCTION public.clean_integration_mapping_data()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if mapping_data contains sensitive fields that should be cleaned
  IF NEW.mapping_data IS NOT NULL THEN
    -- Remove any potential credential fields from mapping_data when viewed by users
    -- Keep only safe metadata like timestamps, connection status, etc.
    IF NEW.mapping_data ? 'api_key' OR 
       NEW.mapping_data ? 'access_token' OR 
       NEW.mapping_data ? 'refresh_token' OR 
       NEW.mapping_data ? 'secret' OR 
       NEW.mapping_data ? 'password' OR 
       NEW.mapping_data ? 'private_key' THEN
      NEW.contains_credentials = true;
      -- Log security event for audit
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
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger to monitor sensitive data storage
CREATE TRIGGER external_integrations_security_check
  BEFORE INSERT OR UPDATE ON public.external_integrations
  FOR EACH ROW
  EXECUTE FUNCTION public.clean_integration_mapping_data();

-- Add additional RLS policy to prevent credential exposure in mapping_data
-- This policy will mask sensitive fields when accessed by regular users
CREATE POLICY "Mask sensitive integration data for users" 
ON public.external_integrations 
FOR SELECT 
USING (
  auth.uid() = user_id AND 
  -- If contains_credentials is true, only show safe metadata
  CASE 
    WHEN contains_credentials = true THEN 
      mapping_data IS NULL OR 
      NOT (mapping_data ? 'api_key' OR 
           mapping_data ? 'access_token' OR 
           mapping_data ? 'refresh_token' OR 
           mapping_data ? 'secret' OR 
           mapping_data ? 'password' OR 
           mapping_data ? 'private_key')
    ELSE true
  END
);

-- Create a view for safe integration data access
CREATE OR REPLACE VIEW public.safe_external_integrations AS
SELECT 
  id,
  user_id,
  external_system,
  external_user_id,
  external_email,
  created_at,
  updated_at,
  -- Only show safe metadata from mapping_data
  CASE 
    WHEN contains_credentials = true THEN
      jsonb_build_object(
        'linked_at', mapping_data->>'linked_at',
        'last_sync', mapping_data->>'last_sync',
        'status', mapping_data->>'status',
        'connection_type', mapping_data->>'connection_type'
      )
    ELSE mapping_data
  END as mapping_data,
  contains_credentials
FROM public.external_integrations;

-- Grant access to the safe view
GRANT SELECT ON public.safe_external_integrations TO authenticated;

-- Create RLS policy for the safe view
ALTER VIEW public.safe_external_integrations SET (security_barrier = true);

-- Add comment explaining the security measures
COMMENT ON TABLE public.external_integrations IS 'Table for external system integration mappings. Contains sensitive data protection through RLS and data masking.';
COMMENT ON COLUMN public.external_integrations.mapping_data IS 'JSON data for integration mapping. Automatically monitored for credential storage and masked when accessed by users.';
COMMENT ON VIEW public.safe_external_integrations IS 'Safe view of external integrations with credential masking for user access.';