import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ServerStatus {
  server: string;
  host: string;
  port: string;
  isOnline: boolean;
  responseTime?: number;
  error?: string;
}

interface NotificationRequest {
  serverA: ServerStatus;
  serverB: ServerStatus;
  recipientEmail: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { serverA, serverB, recipientEmail }: NotificationRequest = await req.json();
    
    console.log("Checking server status for notifications...");
    console.log("Server A:", serverA);
    console.log("Server B:", serverB);
    
    const offlineServers = [];
    if (!serverA.isOnline) offlineServers.push(serverA);
    if (!serverB.isOnline) offlineServers.push(serverB);
    
    if (offlineServers.length === 0) {
      console.log("All servers are online, no notification needed");
      return new Response(JSON.stringify({ message: "All servers are online" }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }
    
    // Generate email content
    const serverList = offlineServers.map(server => 
      `- ${server.server}: ${server.host}:${server.port} (Error: ${server.error || 'Connection failed'})`
    ).join('\n');
    
    const subject = `🚨 Firebird Server Alert - ${offlineServers.length} Server${offlineServers.length > 1 ? 's' : ''} Offline`;
    
    const htmlContent = `
      <h1>🚨 Firebird Server Alert</h1>
      <p>The following Firebird server${offlineServers.length > 1 ? 's are' : ' is'} currently offline:</p>
      <ul>
        ${offlineServers.map(server => `
          <li><strong>${server.server}</strong>: ${server.host}:${server.port}
            <br><span style="color: red;">Error: ${server.error || 'Connection failed'}</span>
          </li>
        `).join('')}
      </ul>
      <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>
      <p>Please check the server connections and ensure they are running properly.</p>
      <hr>
      <p style="color: #666; font-size: 12px;">This is an automated notification from your Firebird Sync Dashboard.</p>
    `;

    const emailResponse = await resend.emails.send({
      from: "Firebird Monitor <onboarding@resend.dev>",
      to: [recipientEmail],
      subject: subject,
      html: htmlContent,
    });

    console.log("Email notification sent successfully:", emailResponse);

    return new Response(JSON.stringify({ 
      message: "Notification sent successfully",
      emailResponse,
      offlineServers: offlineServers.length
    }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });

  } catch (error: any) {
    console.error("Error in notify-server-status function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);