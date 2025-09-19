import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const serverA = {
      host: Deno.env.get('FIREBIRD_A_HOST') || '',
      port: Deno.env.get('FIREBIRD_A_PORT') || '',
      user: Deno.env.get('FIREBIRD_A_USER') || '',
    };

    const serverB = {
      host: Deno.env.get('FIREBIRD_B_HOST') || '',
      port: Deno.env.get('FIREBIRD_B_PORT') || '',
      user: Deno.env.get('FIREBIRD_B_USER') || '',
    };

    return new Response(
      JSON.stringify({ success: true, data: { serverA, serverB } }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in get-server-configs function:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});