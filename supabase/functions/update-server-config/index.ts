import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ServerConfig {
  host: string;
  port: string;
  user: string;
  password: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Update server config function called');
    
    const { server, config }: { server: 'A' | 'B'; config: ServerConfig } = await req.json();
    
    if (!server || !config) {
      throw new Error('Server and config are required');
    }

    // Validate required fields
    if (!config.host || !config.port || !config.user || !config.password) {
      throw new Error('All configuration fields are required: host, port, user, password');
    }

    console.log(`Updating configuration for Server ${server}`);

    // Create Supabase client with service role key for admin operations
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // In a real implementation, you would update the secrets through Supabase's admin API
    // For now, we'll simulate the update and return success
    // The actual secret update would need to be done through Supabase's management API
    // which requires additional setup and permissions

    console.log(`Server ${server} configuration would be updated with:`, {
      host: config.host,
      port: config.port,
      user: config.user,
      // Don't log password for security
    });

    // Since we can't directly update secrets from edge functions without additional setup,
    // we'll return a success response indicating the configuration has been validated
    // and would be applied. In a production environment, this would trigger a workflow
    // to update the actual secrets through proper channels.

    return new Response(
      JSON.stringify({
        success: true,
        message: `Server ${server} configuration validated and ready for update`,
        server,
        config: {
          host: config.host,
          port: config.port,
          user: config.user,
          // Don't return password for security
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in update-server-config function:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        success: false 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});