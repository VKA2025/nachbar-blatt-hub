import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const SMTP_HOST = Deno.env.get("SMTP_HOST");
const SMTP_USER = Deno.env.get("SMTP_USER");
const SMTP_PASS = Deno.env.get("SMTP_PASS");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface NewOfferNotificationRequest {
  itemId: string;
  itemTitle: string;
  offerType: string;
  category: string;
  ownerName: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const { itemId, itemTitle, offerType, category, ownerName }: NewOfferNotificationRequest = await req.json();

    console.log('Processing new offer notification for item:', itemId);

    // Get all admin users
    const { data: adminRoles, error: rolesError } = await supabaseClient
      .from('user_roles')
      .select('user_id')
      .eq('role', 'admin');

    if (rolesError || !adminRoles || adminRoles.length === 0) {
      console.error('Error fetching admin roles:', rolesError);
      throw new Error('No admin users found');
    }

    const adminUserIds = adminRoles.map(role => role.user_id);

    // Get admin profiles with emails
    const { data: adminProfiles, error: profilesError } = await supabaseClient
      .from('profiles')
      .select('email, first_name')
      .in('user_id', adminUserIds);

    if (profilesError || !adminProfiles || adminProfiles.length === 0) {
      console.error('Error fetching admin profiles:', profilesError);
      throw new Error('Admin profiles not found');
    }

    const emailSubject = `Neues Angebot: ${itemTitle}`;
    
    // Send email to each admin
    for (const admin of adminProfiles) {
      if (!admin.email) continue;

      const emailHtml = `
        <h1>Hallo ${admin.first_name || 'Admin'}!</h1>
        <p>Ein neues Angebot wurde auf Schlossstadt.Info erstellt:</p>
        
        <h2 style="color: #4f46e5;">${itemTitle}</h2>
        
        <h3>Details:</h3>
        <ul>
          <li><strong>Art:</strong> ${offerType}</li>
          <li><strong>Kategorie:</strong> ${category}</li>
          <li><strong>Anbieter:</strong> ${ownerName}</li>
        </ul>
        
        <p>Bitte überprüfen Sie das Angebot im Admin-Bereich.</p>
        
        <p style="margin-top: 20px;">Entdecke auch unsere neuesten Inhalte auf <a href="https://www.schlossstadt.info" style="color: #4f46e5;">www.schlossstadt.info</a>!</p>
        
        <p>Viele Grüße,<br>
        Dein Schlossstadt.Info System</p>
      `;

      try {
        await sendEmailSMTP(
          admin.email,
          emailSubject,
          emailHtml,
          SMTP_HOST!,
          SMTP_USER!,
          SMTP_PASS!
        );
        console.log(`Email sent to admin: ${admin.email}`);
      } catch (error) {
        console.error(`Failed to send email to ${admin.email}:`, error);
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in notify-admins-new-offer function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

async function sendEmailSMTP(
  to: string,
  subject: string,
  html: string,
  smtpHost: string,
  smtpUser: string,
  smtpPass: string
): Promise<void> {
  const [host, portStr] = smtpHost.split(':');
  const port = portStr ? parseInt(portStr, 10) : 465;

  console.log(`Connecting to SMTP server: ${host}:${port} (direct TLS)`);
  
  const conn = await Deno.connectTls({
    hostname: host,
    port: port,
  });

  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  async function readResponse(): Promise<string> {
    const buffer = new Uint8Array(1024);
    const n = await conn.read(buffer);
    if (!n) throw new Error("Connection closed");
    return decoder.decode(buffer.subarray(0, n));
  }

  async function sendCommand(command: string): Promise<string> {
    console.log(`SMTP > ${command.replace(smtpPass, '***')}`);
    await conn.write(encoder.encode(command + "\r\n"));
    const response = await readResponse();
    console.log(`SMTP < ${response.trim()}`);
    return response;
  }

  try {
    await readResponse(); // Welcome message
    await sendCommand(`EHLO ${host}`);
    await sendCommand(`AUTH LOGIN`);
    await sendCommand(btoa(smtpUser));
    await sendCommand(btoa(smtpPass));
    await sendCommand(`MAIL FROM:<${smtpUser}>`);
    await sendCommand(`RCPT TO:<${to}>`);
    await sendCommand(`DATA`);

    const emailContent = [
      `From: Schlossstadt.Info <${smtpUser}>`,
      `To: ${to}`,
      `Subject: ${subject}`,
      `MIME-Version: 1.0`,
      `Content-Type: text/html; charset=utf-8`,
      ``,
      html,
      `.`
    ].join("\r\n");

    await conn.write(encoder.encode(emailContent + "\r\n"));
    await readResponse();
    await sendCommand(`QUIT`);
  } catch (error) {
    console.error("SMTP Error:", error);
    throw error;
  } finally {
    conn.close();
  }
}

serve(handler);
