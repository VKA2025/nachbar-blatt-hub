import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface EmailData {
  user: {
    email: string;
  };
  email_data: {
    token: string;
    token_hash: string;
    redirect_to: string;
    email_action_type: string;
    site_url: string;
  };
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const payload: EmailData = await req.json();
    const { user, email_data } = payload;
    
    console.log('Auth email triggered for:', user.email, 'Action:', email_data.email_action_type);

    const smtpHost = Deno.env.get('SMTP_HOST');
    const smtpUser = Deno.env.get('SMTP_USER');
    const smtpPass = Deno.env.get('SMTP_PASS');

    if (!smtpHost || !smtpUser || !smtpPass) {
      console.error('Missing SMTP credentials');
      return new Response(
        JSON.stringify({ error: 'SMTP configuration missing' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build confirmation URL - use production URL instead of localhost
    const baseUrl = email_data.site_url.includes('localhost') 
      ? 'https://kvrxgaxjdpxqlnfhhsrc.supabase.co'
      : email_data.site_url;
    
    const redirectUrl = email_data.redirect_to.includes('localhost')
      ? 'https://schlossstadt.info'
      : email_data.redirect_to;
    
    const confirmationUrl = `${baseUrl}/auth/v1/verify?token=${email_data.token_hash}&type=${email_data.email_action_type}&redirect_to=${encodeURIComponent(redirectUrl)}`;

    // German email content based on action type
    let subject: string;
    let htmlBody: string;

    if (email_data.email_action_type === 'signup') {
      subject = 'Bestätige Deine E-Mail-Adresse - Schlossstadt.Info';
      htmlBody = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #4CAF50; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
            .content { background-color: #f9f9f9; padding: 30px; border-radius: 0 0 5px 5px; }
            .button { display: inline-block; padding: 12px 30px; background-color: #4CAF50; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 30px; font-size: 12px; color: #666; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Willkommen bei Schlossstadt.Info</h1>
            </div>
            <div class="content">
              <h2>Hallo!</h2>
              <p>Vielen Dank für Deine Registrierung bei Schlossstadt.Info.</p>
              <p>Bitte bestätige Deine E-Mail-Adresse, indem Du auf den folgenden Button klickst:</p>
              <center>
                <a href="${confirmationUrl}" class="button">E-Mail bestätigen</a>
              </center>
              <p>Oder kopiere diesen Link in Deinen Browser:</p>
              <p style="word-break: break-all; color: #666; font-size: 12px;">${confirmationUrl}</p>
              <p>Falls Du Dich nicht bei Schlossstadt.Info registriert hast, kannst Du diese E-Mail ignorieren.</p>
            </div>
            <div class="footer">
              <p>© ${new Date().getFullYear()} Schlossstadt.Info</p>
            </div>
          </div>
        </body>
        </html>
      `;
    } else if (email_data.email_action_type === 'recovery') {
      subject = 'Passwort zurücksetzen - Schlossstadt.Info';
      htmlBody = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #4CAF50; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
            .content { background-color: #f9f9f9; padding: 30px; border-radius: 0 0 5px 5px; }
            .button { display: inline-block; padding: 12px 30px; background-color: #4CAF50; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 30px; font-size: 12px; color: #666; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Passwort zurücksetzen</h1>
            </div>
            <div class="content">
              <h2>Hallo!</h2>
              <p>Du hast eine Anfrage zum Zurücksetzen Deines Passworts gestellt.</p>
              <p>Klicke auf den folgenden Button, um ein neues Passwort festzulegen:</p>
              <center>
                <a href="${confirmationUrl}" class="button">Passwort zurücksetzen</a>
              </center>
              <p>Oder kopiere diesen Link in Deinen Browser:</p>
              <p style="word-break: break-all; color: #666; font-size: 12px;">${confirmationUrl}</p>
              <p>Falls Du diese Anfrage nicht gestellt hast, kannst Du diese E-Mail ignorieren.</p>
            </div>
            <div class="footer">
              <p>© ${new Date().getFullYear()} Schlossstadt.Info</p>
            </div>
          </div>
        </body>
        </html>
      `;
    } else {
      // Default for other email types
      subject = 'Bestätigung erforderlich - Schlossstadt.Info';
      htmlBody = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #4CAF50; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
            .content { background-color: #f9f9f9; padding: 30px; border-radius: 0 0 5px 5px; }
            .button { display: inline-block; padding: 12px 30px; background-color: #4CAF50; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 30px; font-size: 12px; color: #666; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Schlossstadt.Info</h1>
            </div>
            <div class="content">
              <h2>Hallo!</h2>
              <p>Bitte bestätige Deine Anfrage, indem Du auf den folgenden Button klickst:</p>
              <center>
                <a href="${confirmationUrl}" class="button">Bestätigen</a>
              </center>
              <p>Oder kopiere diesen Link in Deinen Browser:</p>
              <p style="word-break: break-all; color: #666; font-size: 12px;">${confirmationUrl}</p>
            </div>
            <div class="footer">
              <p>© ${new Date().getFullYear()} Schlossstadt.Info</p>
            </div>
          </div>
        </body>
        </html>
      `;
    }

    // Send email via SMTP
    await sendEmailSMTP(
      smtpHost,
      smtpUser,
      smtpPass,
      user.email,
      subject,
      htmlBody
    );

    console.log('Auth email sent successfully to:', user.email);

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error in send-auth-email function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
};

async function sendEmailSMTP(
  smtpHost: string,
  smtpUser: string,
  smtpPass: string,
  toEmail: string,
  subject: string,
  htmlBody: string
): Promise<void> {
  const [host, portStr] = smtpHost.includes(':') 
    ? smtpHost.split(':') 
    : [smtpHost, '587'];
  const port = parseInt(portStr, 10);

  console.log(`Connecting to SMTP server ${host}:${port}`);

  try {
    const conn = await Deno.connectTls({
      hostname: host,
      port: port,
    });

    const encoder = new TextEncoder();
    const decoder = new TextDecoder();

    // Helper to read SMTP response
    const readResponse = async (): Promise<string> => {
      const buffer = new Uint8Array(1024);
      const n = await conn.read(buffer);
      if (n === null) return '';
      return decoder.decode(buffer.subarray(0, n));
    };

    // Helper to send SMTP command
    const sendCommand = async (command: string): Promise<string> => {
      console.log('SMTP >>>', command.replace(smtpPass, '***'));
      await conn.write(encoder.encode(command + '\r\n'));
      const response = await readResponse();
      console.log('SMTP <<<', response.trim());
      return response;
    };

    // SMTP conversation
    await readResponse(); // Initial greeting
    await sendCommand(`EHLO ${host}`);
    await sendCommand(`AUTH LOGIN`);
    await sendCommand(btoa(smtpUser));
    await sendCommand(btoa(smtpPass));
    await sendCommand(`MAIL FROM:<${smtpUser}>`);
    await sendCommand(`RCPT TO:<${toEmail}>`);
    await sendCommand('DATA');

    // Email content
    const emailContent = [
      `From: Schlossstadt.Info <info@schlossstadt.info>`,
      `To: ${toEmail}`,
      `Subject: ${subject}`,
      'MIME-Version: 1.0',
      'Content-Type: text/html; charset=UTF-8',
      '',
      htmlBody,
      '.',
    ].join('\r\n');

    await conn.write(encoder.encode(emailContent + '\r\n'));
    await readResponse();
    
    await sendCommand('QUIT');
    conn.close();

    console.log(`Email sent successfully to ${toEmail}`);
  } catch (error) {
    console.error('SMTP Error:', error);
    throw error;
  }
}

serve(handler);
