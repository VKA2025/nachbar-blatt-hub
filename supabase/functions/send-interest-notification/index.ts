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

interface InterestNotificationRequest {
  itemId: string;
  itemTitle: string;
  ownerId: string;
  requesterId: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const { itemId, itemTitle, ownerId, requesterId }: InterestNotificationRequest = await req.json();

    console.log('Processing interest notification for item:', itemId);

    // Get owner profile
    const { data: ownerProfile, error: ownerError } = await supabaseClient
      .from('profiles')
      .select('email, first_name, last_name')
      .eq('id', ownerId)
      .single();

    if (ownerError || !ownerProfile) {
      console.error('Error fetching owner profile:', ownerError);
      throw new Error('Owner profile not found');
    }

    // Get requester profile
    const { data: requesterProfile, error: requesterError } = await supabaseClient
      .from('profiles')
      .select('email, first_name, last_name, street, house_number')
      .eq('id', requesterId)
      .single();

    if (requesterError || !requesterProfile) {
      console.error('Error fetching requester profile:', requesterError);
      throw new Error('Requester profile not found');
    }

    const requesterName = `${requesterProfile.first_name || ''} ${requesterProfile.last_name || ''}`.trim() || 'Ein Nachbar';
    const requesterAddress = requesterProfile.street && requesterProfile.house_number 
      ? `${requesterProfile.street} ${requesterProfile.house_number}`
      : 'Nicht angegeben';

    // Send email to owner using SMTP
    const emailSubject = `Interesse an deinem Angebot: ${itemTitle}`;
    const emailHtml = `
      <h1>Hallo ${ownerProfile.first_name || ''}!</h1>
      <p><strong>${requesterName}</strong> hat Interesse an deinem Angebot bekundet:</p>
      
      <h2 style="color: #4f46e5;">${itemTitle}</h2>
      
      <h3>Kontaktdaten des Interessenten:</h3>
      <ul>
        <li><strong>Name:</strong> ${requesterName}</li>
        <li><strong>E-Mail:</strong> ${requesterProfile.email || 'Nicht angegeben'}</li>
        <li><strong>Adresse:</strong> ${requesterAddress}</li>
      </ul>
      
      <p>Du kannst den Interessenten direkt per E-Mail kontaktieren, um weitere Details zu besprechen.</p>
      
      <p style="margin-top: 20px;">Entdecke auch unsere neuesten Inhalte auf <a href="https://www.schlossstadt.info" style="color: #4f46e5;">www.schlossstadt.info</a>!</p>
      
      <p>Viele Grüße,<br>
      Dein Schlossstadt.Info Team</p>
    `;

    // Send via SMTP using direct TLS connection on port 465
    await sendEmailSMTP(
      ownerProfile.email,
      emailSubject,
      emailHtml,
      SMTP_HOST!,
      SMTP_USER!,
      SMTP_PASS!
    );

    console.log("Email sent successfully");

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-interest-notification function:", error);
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
  
  // For port 465, use direct TLS connection
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
