-- Enable pg_net extension for HTTP requests in database triggers
-- This is required for the handle_project_connection_change trigger
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;