import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// CORS headers for web requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Configuration interface for Firebird servers
interface FirebirdConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
}

// Get the Firebird API service URL from environment
const FIREBIRD_API_URL = Deno.env.get('FIREBIRD_API_URL') || 'http://localhost:5000';

// Get server configurations from environment variables
function getServerConfigs(): { serverA: FirebirdConfig; serverB: FirebirdConfig } {
  return {
    serverA: {
      host: Deno.env.get('FIREBIRD_A_HOST') || '',
      port: parseInt(Deno.env.get('FIREBIRD_A_PORT') || '3050'),
      database: Deno.env.get('FIREBIRD_A_DATABASE') || '/dbs/fdb/bell.fdb',
      user: Deno.env.get('FIREBIRD_A_USER') || '',
      password: Deno.env.get('FIREBIRD_A_PASSWORD') || '',
    },
    serverB: {
      host: Deno.env.get('FIREBIRD_B_HOST') || '',
      port: parseInt(Deno.env.get('FIREBIRD_B_PORT') || '3050'),
      database: Deno.env.get('FIREBIRD_B_DATABASE') || '/dbs/fdb/bell.fdb',
      user: Deno.env.get('FIREBIRD_B_USER') || '',
      password: Deno.env.get('FIREBIRD_B_PASSWORD') || '',
    }
  };
}

// Check server status via HTTP API
async function checkServerStatus(): Promise<any> {
  try {
    console.log('Checking server status via Firebird API...');
    console.log('Using Firebird API URL:', FIREBIRD_API_URL);
    const configs = getServerConfigs();
    
    console.log('Server A config:', { host: configs.serverA.host, port: configs.serverA.port, database: configs.serverA.database, user: configs.serverA.user });
    console.log('Server B config:', { host: configs.serverB.host, port: configs.serverB.port, database: configs.serverB.database, user: configs.serverB.user });
    
    const response = await fetch(`${FIREBIRD_API_URL}/api/firebird/status`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        serverA: configs.serverA,
        serverB: configs.serverB
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('HTTP error response:', errorText);
      throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
    }

    const data = await response.json();
    console.log('Server status response:', data);
    
    return {
      success: true,
      data: {
        serverA: {
          host: data.serverA.host,
          online: data.serverA.online,
          responseTime: data.serverA.responseTime,
          error: data.serverA.error
        },
        serverB: {
          host: data.serverB.host,
          online: data.serverB.online,
          responseTime: data.serverB.responseTime,
          error: data.serverB.error
        }
      }
    };
  } catch (error) {
    console.error('Error checking server status:', error);
    return {
      success: false,
      error: error.message,
      message: `Failed to connect to Firebird API at ${FIREBIRD_API_URL}: ${error.message}`
    };
  }
}

// Get tables info via HTTP API
async function getTablesInfo(serverType: 'A' | 'B'): Promise<any> {
  try {
    console.log(`Getting tables info for Server ${serverType} via Firebird API...`);
    console.log('Using Firebird API URL:', FIREBIRD_API_URL);
    const configs = getServerConfigs();
    const config = serverType === 'A' ? configs.serverA : configs.serverB;
    
    console.log(`Server ${serverType} config:`, { host: config.host, port: config.port, database: config.database, user: config.user });
    
    const response = await fetch(`${FIREBIRD_API_URL}/api/firebird/tables`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        config: config
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('HTTP error response:', errorText);
      throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
    }

    const data = await response.json();
    console.log(`Tables response for Server ${serverType}:`, data);
    
    return {
      success: data.success,
      tables: data.tables || [],
      error: data.error
    };
  } catch (error) {
    console.error(`Error getting tables info for Server ${serverType}:`, error);
    return {
      success: false,
      tables: [],
      error: `Failed to connect to Firebird API: ${error.message}`
    };
  }
}

// Sync data via HTTP API
async function syncData(): Promise<any> {
  try {
    console.log('Starting data sync via Firebird API...');
    console.log('Using Firebird API URL:', FIREBIRD_API_URL);
    const configs = getServerConfigs();
    
    const response = await fetch(`${FIREBIRD_API_URL}/api/firebird/sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sourceConfig: configs.serverA,
        targetConfig: configs.serverB,
        tableNames: null // Sync all tables
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('HTTP error response:', errorText);
      throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
    }

    const data = await response.json();
    console.log('Sync response:', data);
    
    return {
      success: data.success,
      message: data.message,
      results: data.results || []
    };
  } catch (error) {
    console.error('Error during sync:', error);
    return {
      success: false,
      message: `Failed to sync via Firebird API: ${error.message}`,
      results: []
    };
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action } = await req.json();
    console.log(`Firebird function called with action: ${action}`);

    switch (action) {
      case 'status':
        console.log('Checking server status for notifications...');
        const statusResult = await checkServerStatus();
        
        // Check if we need to send notifications for offline servers
        if (statusResult.success && statusResult.data) {
          const { serverA, serverB } = statusResult.data;
          const offlineServers = [];
          if (!serverA.online) offlineServers.push('Server A');
          if (!serverB.online) offlineServers.push('Server B');
          
          if (offlineServers.length > 0) {
            console.log('Offline servers detected, sending notification...');
            try {
              // Call the notification function
              const notifyResponse = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/notify-server-status`, {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                  serverA: statusResult.data.serverA,
                  serverB: statusResult.data.serverB
                })
              });
              
              if (notifyResponse.ok) {
                console.log('Notification sent successfully');
              } else {
                console.error('Failed to send notification:', await notifyResponse.text());
              }
            } catch (notifyError) {
              console.error('Error sending notification:', notifyError);
            }
          }
        }
        
        return new Response(JSON.stringify(statusResult), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

      case 'tables':
        // Get tables from both servers
        const serverAResult = await getTablesInfo('A');
        const serverBResult = await getTablesInfo('B');
        
        return new Response(JSON.stringify({
          success: true,
          data: {
            serverA: {
              host: getServerConfigs().serverA.host,
              success: serverAResult.success,
              tables: serverAResult.tables,
              error: serverAResult.error
            },
            serverB: {
              host: getServerConfigs().serverB.host,
              success: serverBResult.success,
              tables: serverBResult.tables,
              error: serverBResult.error
            }
          }
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

      case 'sync':
        const syncResult = await syncData();
        return new Response(JSON.stringify(syncResult), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

      default:
        return new Response(JSON.stringify({ 
          success: false, 
          error: 'Invalid action. Use: status, tables, or sync' 
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }
  } catch (error) {
    console.error('Error in sync-firebird function:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});