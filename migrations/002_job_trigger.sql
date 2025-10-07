-- Migration: Add trigger to automatically process jobs
-- This trigger invokes the Supabase Edge Function when a new job is queued

-- Create function to invoke edge function via HTTP
CREATE OR REPLACE FUNCTION invoke_process_document()
RETURNS TRIGGER AS $$
DECLARE
  function_url TEXT;
  service_role_key TEXT;
BEGIN
  -- Only trigger for 'parse' jobs with 'queued' status
  IF NEW.kind = 'parse' AND NEW.status = 'queued' THEN
    -- Get the Supabase function URL and service role key from environment
    -- These should be set in your Supabase project settings
    function_url := current_setting('app.supabase_function_url', true);
    service_role_key := current_setting('app.supabase_service_role_key', true);
    
    -- Use pg_net to invoke the edge function asynchronously
    -- This requires the pg_net extension to be enabled
    PERFORM net.http_post(
      url := function_url || '/functions/v1/process-document',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || service_role_key
      ),
      body := jsonb_build_object('jobId', NEW.id::text)
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_process_document ON jobs;
CREATE TRIGGER trigger_process_document
  AFTER INSERT ON jobs
  FOR EACH ROW
  EXECUTE FUNCTION invoke_process_document();

-- Grant necessary permissions
GRANT USAGE ON SCHEMA net TO postgres, anon, authenticated, service_role;

-- Add helpful comment
COMMENT ON FUNCTION invoke_process_document() IS 'Automatically invokes the process-document edge function when a new parse job is created';

