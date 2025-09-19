-- Enable the pg_cron extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Enable the pg_net extension for HTTP requests if not already enabled  
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Create a cron job to run the Firebird sync daily at 2 AM
SELECT cron.schedule(
  'daily-firebird-sync',
  '0 2 * * *', -- Daily at 2:00 AM
  $$
  SELECT net.http_post(
    url := 'https://hkmfsfxpywdoziriftok.supabase.co/functions/v1/sync-firebird',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := '{"trigger": "cron", "timestamp": "'|| now() ||'"}'::jsonb
  ) as request_id;
  $$
);

-- Create a log table to track sync operations
CREATE TABLE IF NOT EXISTS public.sync_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sync_type TEXT NOT NULL DEFAULT 'firebird',
  status TEXT NOT NULL,
  message TEXT,
  details JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on sync_logs
ALTER TABLE public.sync_logs ENABLE ROW LEVEL SECURITY;

-- Create policy for admins to view sync logs
CREATE POLICY "Admins can view sync logs" 
ON public.sync_logs 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role));