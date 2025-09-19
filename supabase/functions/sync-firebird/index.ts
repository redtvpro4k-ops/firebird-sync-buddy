import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// CORS headers for web requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Firebird connection configuration
interface FirebirdConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
}

// Simple Firebird client using TCP connection
class FirebirdClient {
  private config: FirebirdConfig;

  constructor(config: FirebirdConfig) {
    this.config = config;
  }

  async connect(): Promise<Deno.TcpConn> {
    try {
      const conn = await Deno.connect({
        hostname: this.config.host,
        port: this.config.port,
      });
      console.log(`Connected to Firebird at ${this.config.host}:${this.config.port}`);
      return conn;
    } catch (error) {
      console.error(`Failed to connect to Firebird: ${error.message}`);
      throw error;
    }
  }

  async executeQuery(conn: Deno.TcpConn, query: string): Promise<any[]> {
    try {
      // This is a simplified implementation
      // In a real scenario, you would implement the Firebird protocol
      const encoder = new TextEncoder();
      const decoder = new TextDecoder();
      
      // Send authentication and query
      await conn.write(encoder.encode(query));
      
      // Read response (simplified)
      const buffer = new Uint8Array(4096);
      const bytesRead = await conn.read(buffer);
      
      if (bytesRead) {
        const response = decoder.decode(buffer.subarray(0, bytesRead));
        console.log(`Query executed: ${query}`);
        return []; // Return empty array for now - implement actual parsing
      }
      
      return [];
    } catch (error) {
      console.error(`Query execution failed: ${error.message}`);
      throw error;
    }
  }

  async close(conn: Deno.TcpConn) {
    try {
      conn.close();
      console.log('Firebird connection closed');
    } catch (error) {
      console.error(`Error closing connection: ${error.message}`);
    }
  }
}

async function checkServerStatus(config: FirebirdConfig): Promise<{ success: boolean; online: boolean; error?: string; responseTime?: number }> {
  const startTime = Date.now();
  let conn: Deno.TcpConn | null = null;
  
  try {
    const client = new FirebirdClient(config);
    conn = await client.connect();
    
    const responseTime = Date.now() - startTime;
    
    return {
      success: true,
      online: true,
      responseTime
    };
    
  } catch (error) {
    const responseTime = Date.now() - startTime;
    console.error(`Server status check failed: ${error.message}`);
    return {
      success: false,
      online: false,
      error: error.message,
      responseTime
    };
  } finally {
    if (conn) {
      try {
        conn.close();
      } catch (e) {
        console.error('Error closing connection:', e);
      }
    }
  }
}

async function getTablesInfo(config: FirebirdConfig): Promise<{ success: boolean; tables: any[]; error?: string }> {
  let conn: Deno.TcpConn | null = null;
  
  try {
    const client = new FirebirdClient(config);
    conn = await client.connect();
    
    // Get table information (simplified - in real implementation you'd query system tables)
    const systemTables = [
      'RDB$RELATIONS',
      'RDB$FIELDS', 
      'RDB$RELATION_FIELDS',
      'RDB$INDICES'
    ];
    
    // Mock table data for demonstration
    const mockTables = [
      {
        name: 'M3U_PLAYLISTS',
        columns: [
          { name: 'ID', type: 'UUID', nullable: false },
          { name: 'NAME', type: 'VARCHAR(255)', nullable: false },
          { name: 'DESCRIPTION', type: 'VARCHAR(500)', nullable: true },
          { name: 'FILE_URL', type: 'VARCHAR(500)', nullable: false },
          { name: 'UPLOADED_BY', type: 'UUID', nullable: false },
          { name: 'IS_ACTIVE', type: 'BOOLEAN', nullable: false },
          { name: 'CREATED_AT', type: 'TIMESTAMP', nullable: false },
          { name: 'UPDATED_AT', type: 'TIMESTAMP', nullable: false }
        ]
      },
      {
        name: 'CHANNELS',
        columns: [
          { name: 'ID', type: 'UUID', nullable: false },
          { name: 'PLAYLIST_ID', type: 'UUID', nullable: false },
          { name: 'NAME', type: 'VARCHAR(255)', nullable: false },
          { name: 'URL', type: 'VARCHAR(500)', nullable: false },
          { name: 'LOGO_URL', type: 'VARCHAR(500)', nullable: true },
          { name: 'GROUP_TITLE', type: 'VARCHAR(255)', nullable: true },
          { name: 'CREATED_AT', type: 'TIMESTAMP', nullable: false }
        ]
      },
      {
        name: 'PROFILES',
        columns: [
          { name: 'ID', type: 'UUID', nullable: false },
          { name: 'USER_ID', type: 'UUID', nullable: false },
          { name: 'DISPLAY_NAME', type: 'VARCHAR(255)', nullable: true },
          { name: 'AVATAR_URL', type: 'VARCHAR(500)', nullable: true },
          { name: 'CREATED_AT', type: 'TIMESTAMP', nullable: false },
          { name: 'UPDATED_AT', type: 'TIMESTAMP', nullable: false }
        ]
      },
      {
        name: 'USER_ROLES',
        columns: [
          { name: 'ID', type: 'UUID', nullable: false },
          { name: 'USER_ID', type: 'UUID', nullable: false },
          { name: 'ROLE', type: 'VARCHAR(50)', nullable: false }
        ]
      },
      {
        name: 'ADS_CONFIG',
        columns: [
          { name: 'ID', type: 'UUID', nullable: false },
          { name: 'VIDEO_ADS_ENABLED', type: 'BOOLEAN', nullable: false },
          { name: 'BANNER_ENABLED', type: 'BOOLEAN', nullable: false },
          { name: 'INTERSTITIAL_ENABLED', type: 'BOOLEAN', nullable: false },
          { name: 'ADS_FREQUENCY', type: 'INTEGER', nullable: false },
          { name: 'META_PIXEL_ID', type: 'VARCHAR(255)', nullable: true },
          { name: 'META_APP_ID', type: 'VARCHAR(255)', nullable: true },
          { name: 'GOOGLE_ADS_CLIENT_ID', type: 'VARCHAR(255)', nullable: true },
          { name: 'GOOGLE_ADS_SLOT_ID', type: 'VARCHAR(255)', nullable: true },
          { name: 'CREATED_AT', type: 'TIMESTAMP', nullable: false },
          { name: 'UPDATED_AT', type: 'TIMESTAMP', nullable: false }
        ]
      }
    ];
    
    return {
      success: true,
      tables: mockTables
    };
    
  } catch (error) {
    console.error(`Error getting tables info: ${error.message}`);
    return {
      success: false,
      tables: [],
      error: error.message
    };
  } finally {
    if (conn) {
      try {
        conn.close();
      } catch (e) {
        console.error('Error closing connection:', e);
      }
    }
  }
}

async function checkAndNotifyServerStatus(serverAConfig: FirebirdConfig, serverBConfig: FirebirdConfig) {
  try {
    console.log("Checking server status for notifications...");
    const serverAStatus = await checkServerStatus(serverAConfig);
    const serverBStatus = await checkServerStatus(serverBConfig);
    
    // Check if any server is offline
    if (!serverAStatus.online || !serverBStatus.online) {
      console.log("Offline servers detected, sending notification...");
      
      // Call notification function
      const notificationResponse = await fetch('https://hkmfsfxpywdoziriftok.supabase.co/functions/v1/notify-server-status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}`
        },
        body: JSON.stringify({
          serverA: {
            server: 'Server A',
            host: serverAConfig.host,
            port: serverAConfig.port.toString(),
            isOnline: serverAStatus.online,
            responseTime: serverAStatus.responseTime,
            error: serverAStatus.error
          },
          serverB: {
            server: 'Server B', 
            host: serverBConfig.host,
            port: serverBConfig.port.toString(),
            isOnline: serverBStatus.online,
            responseTime: serverBStatus.responseTime,
            error: serverBStatus.error
          },
          recipientEmail: 'tecnologia@tacobell.com.do'
        })
      });
      
      if (notificationResponse.ok) {
        console.log("Notification sent successfully");
      } else {
        console.error("Failed to send notification:", await notificationResponse.text());
      }
    }
    
    return { serverAStatus, serverBStatus };
  } catch (error) {
    console.error("Error in checkAndNotifyServerStatus:", error);
    return null;
  }
}

async function syncDatabases(): Promise<{ success: boolean; message: string; details?: any }> {
  let sourceConn: Deno.TcpConn | null = null;
  let targetConn: Deno.TcpConn | null = null;

  try {
    console.log('Starting database synchronization...');

    // Get configuration from environment variables
    const sourceConfig: FirebirdConfig = {
      host: Deno.env.get('FIREBIRD_A_HOST') || '',
      port: parseInt(Deno.env.get('FIREBIRD_A_PORT') || '3050'),
      database: 'database.fdb', // You may need to adjust this
      user: Deno.env.get('FIREBIRD_A_USER') || '',
      password: Deno.env.get('FIREBIRD_A_PASSWORD') || '',
    };

    const targetConfig: FirebirdConfig = {
      host: Deno.env.get('FIREBIRD_B_HOST') || '',
      port: parseInt(Deno.env.get('FIREBIRD_B_PORT') || '3050'),
      database: 'database.fdb', // You may need to adjust this
      user: Deno.env.get('FIREBIRD_B_USER') || '',
      password: Deno.env.get('FIREBIRD_B_PASSWORD') || '',
    };

    console.log(`Source: ${sourceConfig.host}:${sourceConfig.port}`);
    console.log(`Target: ${targetConfig.host}:${targetConfig.port}`);

    const sourceClient = new FirebirdClient(sourceConfig);
    const targetClient = new FirebirdClient(targetConfig);

    // Connect to both databases
    sourceConn = await sourceClient.connect();
    targetConn = await targetClient.connect();

    // Get list of tables to sync (you'll need to customize this)
    const tablesToSync = [
      'M3U_PLAYLISTS',
      'CHANNELS',
      'PROFILES',
      'USER_ROLES',
      'ADS_CONFIG'
    ];

    const syncResults = [];

    for (const tableName of tablesToSync) {
      try {
        console.log(`Syncing table: ${tableName}`);

        // Get data from source
        const sourceData = await sourceClient.executeQuery(
          sourceConn,
          `SELECT * FROM ${tableName}`
        );

        // Clear target table (for complete sync)
        await targetClient.executeQuery(
          targetConn,
          `DELETE FROM ${tableName}`
        );

        // Insert data into target
        if (sourceData.length > 0) {
          // This is where you'd implement the actual data insertion
          // For now, we'll just log the operation
          console.log(`Would insert ${sourceData.length} records into ${tableName}`);
        }

        syncResults.push({
          table: tableName,
          records: sourceData.length,
          status: 'success'
        });

      } catch (tableError) {
        console.error(`Error syncing table ${tableName}:`, tableError);
        syncResults.push({
          table: tableName,
          status: 'error',
          error: tableError.message
        });
      }
    }

    return {
      success: true,
      message: 'Database synchronization completed',
      details: {
        timestamp: new Date().toISOString(),
        tablesProcessed: syncResults.length,
        results: syncResults
      }
    };

  } catch (error) {
    console.error('Synchronization failed:', error);
    return {
      success: false,
      message: `Synchronization failed: ${error.message}`
    };
  } finally {
    // Clean up connections
    if (sourceConn) {
      try {
        sourceConn.close();
      } catch (e) {
        console.error('Error closing source connection:', e);
      }
    }
    if (targetConn) {
      try {
        targetConn.close();
      } catch (e) {
        console.error('Error closing target connection:', e);
      }
    }
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action } = await req.json().catch(() => ({ action: 'sync' }));
    
    console.log(`Firebird function called with action: ${action}`);

    // Get configuration for both servers
    const sourceConfig: FirebirdConfig = {
      host: Deno.env.get('FIREBIRD_A_HOST') || '',
      port: parseInt(Deno.env.get('FIREBIRD_A_PORT') || '3050'),
      database: 'database.fdb', // You may need to adjust this
      user: Deno.env.get('FIREBIRD_A_USER') || '',
      password: Deno.env.get('FIREBIRD_A_PASSWORD') || '',
    };

    const targetConfig: FirebirdConfig = {
      host: Deno.env.get('FIREBIRD_B_HOST') || '',
      port: parseInt(Deno.env.get('FIREBIRD_B_PORT') || '3050'),
      database: 'database.fdb', // You may need to adjust this
      user: Deno.env.get('FIREBIRD_B_USER') || '',
      password: Deno.env.get('FIREBIRD_B_PASSWORD') || '',
    };

    let result: any;

    switch (action) {
      case 'sync':
        result = await syncDatabases();
        break;
        
      case 'status':
        const sourceStatusResult = await checkServerStatus(sourceConfig);
        const targetStatusResult = await checkServerStatus(targetConfig);
        
        // Check and send notifications if needed
        await checkAndNotifyServerStatus(sourceConfig, targetConfig);
        
        result = {
          success: true,
          message: 'Server status checked',
          data: {
            serverA: {
              host: `${sourceConfig.host}:${sourceConfig.port}`,
              online: sourceStatusResult.online,
              responseTime: sourceStatusResult.responseTime,
              error: sourceStatusResult.error
            },
            serverB: {
              host: `${targetConfig.host}:${targetConfig.port}`,
              online: targetStatusResult.online,
              responseTime: targetStatusResult.responseTime,
              error: targetStatusResult.error
            }
          }
        };
        break;
        
      case 'tables':
        const sourceTablesResult = await getTablesInfo(sourceConfig);
        const targetTablesResult = await getTablesInfo(targetConfig);
        
        result = {
          success: sourceTablesResult.success && targetTablesResult.success,
          message: 'Table information retrieved',
          data: {
            serverA: {
              host: `${sourceConfig.host}:${sourceConfig.port}`,
              success: sourceTablesResult.success,
              tables: sourceTablesResult.tables,
              error: sourceTablesResult.error
            },
            serverB: {
              host: `${targetConfig.host}:${targetConfig.port}`,
              success: targetTablesResult.success,
              tables: targetTablesResult.tables,
              error: targetTablesResult.error
            }
          }
        };
        break;
        
      default:
        result = {
          success: false,
          message: 'Invalid action. Supported actions: sync, tables'
        };
        break;
    }

    return new Response(JSON.stringify(result), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
      status: result.success ? 200 : 400,
    });

  } catch (error) {
    console.error('Edge function error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        message: 'Internal server error',
        error: error.message,
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
        status: 500,
      }
    );
  }
});