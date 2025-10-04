import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface NotificationRequest {
  user_email: string;
  user_name: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { user_email, user_name }: NotificationRequest = await req.json();
    
    console.log('New user registration notification triggered for:', user_email);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get imprint email
    const { data: imprintData, error: imprintError } = await supabase
      .from('imprint_data')
      .select('email')
      .single();

    if (imprintError || !imprintData) {
      console.error('Error fetching imprint data:', imprintError);
      throw new Error('Could not fetch imprint email');
    }

    // Count total regular users (excluding admins)
    const { count: userCount, error: countError } = await supabase
      .from('user_roles')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'user');

    if (countError) {
      console.error('Error counting users:', countError);
      throw new Error('Could not count users');
    }

    const totalUsers = userCount || 0;

    // Get SMTP credentials
    const smtpHost = Deno.env.get('SMTP_HOST');
    const smtpUser = Deno.env.get('SMTP_USER');
    const smtpPass = Deno.env.get('SMTP_PASS');

    if (!smtpHost || !smtpUser || !smtpPass) {
      console.error('SMTP credentials not configured');
      throw new Error('SMTP credentials missing');
    }

    // Send email
    await sendEmailSMTP(
      smtpHost,
      smtpUser,
      smtpPass,
      imprintData.email,
      `Neue Registrierung - ${totalUsers} User`,
      `
        <h2>Neue Benutzerregistrierung</h2>
        <p><strong>Name:</strong> ${user_name}</p>
        <p><strong>E-Mail:</strong> ${user_email}</p>
        <p><strong>Gesamtanzahl User (ohne Admins):</strong> ${totalUsers}</p>
        <p>Ein neuer Benutzer hat sich erfolgreich auf Schlossstadt.Info registriert.</p>
      `
    );

    console.log('Admin notification sent successfully');

    return new Response(
      JSON.stringify({ success: true }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error: any) {
    console.error('Error in notify-admin-new-user:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
};

async function sendEmailSMTP(
  smtpHost: string,
  username: string,
  password: string,
  to: string,
  subject: string,
  htmlBody: string
): Promise<void> {
  const [host, portStr] = smtpHost.split(':');
  const port = parseInt(portStr || '465', 10);

  console.log(`Connecting to SMTP server: ${host}:${port}`);

  const conn = await Deno.connectTls({
    hostname: host,
    port: port,
  });

  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  async function readResponse(): Promise<string> {
    const buffer = new Uint8Array(1024);
    const n = await conn.read(buffer);
    if (!n) return '';
    return decoder.decode(buffer.subarray(0, n));
  }

  async function sendCommand(command: string): Promise<string> {
    await conn.write(encoder.encode(command + '\r\n'));
    return await readResponse();
  }

  try {
    // Read greeting
    await readResponse();

    // EHLO
    await sendCommand(`EHLO ${host}`);

    // AUTH LOGIN
    await sendCommand('AUTH LOGIN');
    await sendCommand(btoa(username));
    await sendCommand(btoa(password));

    // MAIL FROM
    await sendCommand(`MAIL FROM:<${username}>`);

    // RCPT TO
    await sendCommand(`RCPT TO:<${to}>`);

    // DATA
    await sendCommand('DATA');

    // Email content
    const emailContent = [
      `From: Schlossstadt.Info <${username}>`,
      `To: <${to}>`,
      `Subject: =?UTF-8?B?${btoa(subject)}?=`,
      'MIME-Version: 1.0',
      'Content-Type: text/html; charset=UTF-8',
      '',
      htmlBody,
      '.',
    ].join('\r\n');

    await sendCommand(emailContent);

    // QUIT
    await sendCommand('QUIT');

    console.log('Email sent successfully via SMTP');
  } catch (error) {
    console.error('SMTP Error:', error);
    throw error;
  } finally {
    conn.close();
  }
}

serve(handler);
