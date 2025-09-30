-- Enable pg_net extension properly in the extensions schema
CREATE EXTENSION IF NOT EXISTS pg_net SCHEMA extensions;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA extensions TO postgres;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA extensions TO postgres;