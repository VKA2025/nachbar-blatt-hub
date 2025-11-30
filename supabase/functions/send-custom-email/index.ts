import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

interface UserProfile {
  user_id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Starting custom email sending...');
    
    // Parse request body for subject, content, and optional testEmail parameter
    const body = await req.json();
    const customSubject = body?.subject || 'Nachricht von Schlossstadt.Info';
    const customContent = body?.content || '';
    const testEmail: string | null = body?.testEmail || null;
    
    if (!customContent.trim()) {
      return new Response(
        JSON.stringify({ error: 'E-Mail-Inhalt ist erforderlich' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }
    
    if (testEmail) {
      console.log(`Test mode: sending only to ${testEmail}`);
    }
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const smtpHost = Deno.env.get('SMTP_HOST')!;
    const smtpUser = Deno.env.get('SMTP_USER')!;
    const smtpPass = Deno.env.get('SMTP_PASS')!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get users with email notifications enabled
    let profileQuery = supabase
      .from('profiles')
      .select('user_id, email, first_name, last_name')
      .eq('email_notifications', true)
      .not('email', 'is', null);
    
    // If testEmail is provided, filter for that specific email
    if (testEmail) {
      profileQuery = profileQuery.eq('email', testEmail);
    }
    
    const { data: profiles, error: profilesError } = await profileQuery;

    if (profilesError) {
      console.error('Error fetching profiles:', profilesError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch profiles' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }, 
          status: 500 
        }
      );
    }

    console.log(`Found ${profiles?.length || 0} users with notifications enabled`);

    if (!profiles || profiles.length === 0) {
      return new Response(JSON.stringify({ 
        message: 'No users with notifications enabled',
        sentEmails: 0
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let emailsSent = 0;
    const errors: string[] = [];

    // Process each user
    for (const profile of profiles) {
      try {
        // Send email notification
        await sendEmailNotification(profile, customSubject, customContent, smtpHost, smtpUser, smtpPass);
        emailsSent++;
        console.log(`Email sent to ${profile.email}`);

      } catch (error: any) {
        console.error(`Error processing ${profile.email}:`, error);
        errors.push(`${profile.email}: ${error.message}`);
      }
    }

    return new Response(JSON.stringify({ 
      message: 'Custom email sending completed',
      sentEmails: emailsSent,
      totalUsers: profiles.length,
      errors: errors.length > 0 ? errors : undefined
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
    
  } catch (error: any) {
    console.error('Error in send-custom-email function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
};

// HTML escape function to prevent XSS
function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
}

// Validate email format
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= 255;
}

async function sendEmailNotification(
  profile: UserProfile,
  subject: string,
  content: string,
  smtpHost: string,
  smtpUser: string,
  smtpPass: string
): Promise<void> {
  // Validate email before sending
  if (!isValidEmail(profile.email)) {
    console.error(`Invalid email format: ${profile.email}`);
    throw new Error('Invalid email format');
  }

  // Sanitize user-provided data to prevent XSS
  const sanitizedFirstName = profile.first_name ? escapeHtml(profile.first_name) : '';
  const sanitizedLastName = profile.last_name ? escapeHtml(profile.last_name) : '';
  const sanitizedSubject = escapeHtml(subject);
  const sanitizedContent = escapeHtml(content);

  const displayName = sanitizedFirstName && sanitizedLastName 
    ? `${sanitizedFirstName} ${sanitizedLastName}`
    : sanitizedFirstName || 'Lieber Nutzer';

  // Convert line breaks to HTML breaks
  const htmlContent = sanitizedContent.replace(/\n/g, '<br>');

  const emailHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${sanitizedSubject}</title>
    </head>
    <body style="margin: 0; padding: 20px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f8f9fa; color: #333;">
      <div style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
        <div style="padding: 30px; text-align: center; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border-radius: 8px 8px 0 0;">
          <h1 style="margin: 0; font-size: 24px; font-weight: bold;">📧 ${sanitizedSubject}</h1>
          <p style="margin: 10px 0 0 0; opacity: 0.9;">Nachricht von Schlossstadt.Info</p>
        </div>
        
        <div style="padding: 30px;">
          <p style="margin: 0 0 20px 0; font-size: 16px;">Hallo ${displayName},</p>
          
          <div style="margin: 0 0 25px 0; line-height: 1.6; font-size: 15px;">
            ${htmlContent}
          </div>
        </div>
        
        <div style="padding: 20px 30px; background-color: #f8f9fa; border-radius: 0 0 8px 8px; border-top: 1px solid #e5e5e5;">
          <p style="margin: 0; font-size: 12px; color: #6c757d; text-align: center;">
            Du erhältst diese E-Mail, weil Du Benachrichtigungen aktiviert hast.<br>
            Du kannst diese Einstellung jederzeit in Deinem Profil ändern.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;

  // Send email via SMTP
  const encoder = new TextEncoder();
  
  // Helper function for UTF-8 safe base64 encoding
  function utf8ToBase64(str: string): string {
    const bytes = encoder.encode(str);
    const binString = Array.from(bytes, (byte) => String.fromCodePoint(byte)).join("");
    return btoa(binString);
  }
  
  try {
    // Connect to SMTP server
    const conn = await Deno.connect({
      hostname: smtpHost,
      port: 587,
    });

    const reader = conn.readable.getReader();
    const writer = conn.writable.getWriter();

    // Read server greeting
    await reader.read();

    // EHLO
    await writer.write(encoder.encode(`EHLO ${smtpHost}\r\n`));
    await reader.read();

    // STARTTLS
    await writer.write(encoder.encode('STARTTLS\r\n'));
    await reader.read();

    // Upgrade to TLS
    const tlsConn = await Deno.startTls(conn, { hostname: smtpHost });
    const tlsReader = tlsConn.readable.getReader();
    const tlsWriter = tlsConn.writable.getWriter();

    // EHLO again
    await tlsWriter.write(encoder.encode(`EHLO ${smtpHost}\r\n`));
    await tlsReader.read();

    // AUTH LOGIN
    await tlsWriter.write(encoder.encode('AUTH LOGIN\r\n'));
    await tlsReader.read();

    // Send username (base64 encoded)
    await tlsWriter.write(encoder.encode(`${utf8ToBase64(smtpUser)}\r\n`));
    await tlsReader.read();

    // Send password (base64 encoded)
    await tlsWriter.write(encoder.encode(`${utf8ToBase64(smtpPass)}\r\n`));
    await tlsReader.read();

    // MAIL FROM
    await tlsWriter.write(encoder.encode(`MAIL FROM:<${smtpUser}>\r\n`));
    await tlsReader.read();

    // RCPT TO
    await tlsWriter.write(encoder.encode(`RCPT TO:<${profile.email}>\r\n`));
    await tlsReader.read();

    // DATA
    await tlsWriter.write(encoder.encode('DATA\r\n'));
    await tlsReader.read();

    // Send email headers and body
    const emailMessage = 
      `From: Schlossstadt.Info <${smtpUser}>\r\n` +
      `To: ${profile.email}\r\n` +
      `Subject: =?UTF-8?B?${utf8ToBase64(sanitizedSubject)}?=\r\n` +
      `MIME-Version: 1.0\r\n` +
      `Content-Type: text/html; charset=UTF-8\r\n` +
      `\r\n` +
      emailHtml +
      `\r\n.\r\n`;

    await tlsWriter.write(encoder.encode(emailMessage));
    await tlsReader.read();

    // QUIT
    await tlsWriter.write(encoder.encode('QUIT\r\n'));
    await tlsReader.read();

    tlsConn.close();

    console.log(`Email successfully sent to ${profile.email}`);
  } catch (error: any) {
    console.error(`Failed to send email to ${profile.email}:`, error);
    throw error;
  }
}

serve(handler);
