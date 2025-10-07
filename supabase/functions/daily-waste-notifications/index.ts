import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

interface WasteCollection {
  collection_date: string;
  waste_type: string;
  district: string;
  notes?: string;
}

interface UserProfile {
  user_id: string;
  email: string;
  street: string;
  first_name: string | null;
  last_name: string | null;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Helper function to format date as YYYY-MM-DD
function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Helper function to add days to a date
function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

// Helper function to format date for display
function formatDisplayDate(dateStr: string): string {
  const date = new Date(dateStr);
  const days = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
  const dayName = days[date.getDay()];
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${dayName}, ${day}.${month}.${year}`;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Starting daily waste notifications check...');
    
    // Parse request body for optional testEmail parameter
    let testEmail: string | null = null;
    try {
      const body = await req.json();
      testEmail = body?.testEmail || null;
      if (testEmail) {
        console.log(`Test mode: sending only to ${testEmail}`);
      }
    } catch {
      // No body or invalid JSON, continue with all users
    }
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const smtpHost = Deno.env.get('SMTP_HOST')!;
    const smtpUser = Deno.env.get('SMTP_USER')!;
    const smtpPass = Deno.env.get('SMTP_PASS')!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Get date range
    const today = new Date();
    const tomorrow = addDays(today, 1);
    const endDate = addDays(today, 7);
    const todayStr = formatDate(today);
    const tomorrowStr = formatDate(tomorrow);
    const endDateStr = formatDate(endDate);
    
    console.log(`Checking for waste collections from ${todayStr} to ${endDateStr}`);

    // Get users with email notifications enabled
    let profileQuery = supabase
      .from('profiles')
      .select('user_id, email, street, house_number, first_name, last_name')
      .eq('email_notifications', true)
      .not('street', 'is', null);
    
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
        // Get all districts for this street (a street can have multiple districts)
        const { data: streetDistricts, error: districtError } = await supabase
          .from('street_districts')
          .select('district')
          .eq('street_name', profile.street);

        if (districtError || !streetDistricts || streetDistricts.length === 0) {
          console.log(`No districts found for street: ${profile.street}`);
          continue;
        }

        // Get the unique districts
        const districts = [...new Set(streetDistricts.map(sd => sd.district))];
        console.log(`Found ${districts.length} district(s) for ${profile.street}: ${districts.join(', ')}`);

        // First check if there's a collection tomorrow
        const { data: tomorrowCollections, error: tomorrowError } = await supabase
          .from('waste_collection_schedule')
          .select('collection_date, waste_type, district')
          .in('district', districts)
          .eq('collection_date', tomorrowStr);

        if (tomorrowError) {
          console.error(`Error fetching tomorrow's collections for ${profile.email}:`, tomorrowError);
          errors.push(`${profile.email}: ${tomorrowError.message}`);
          continue;
        }

        if (!tomorrowCollections || tomorrowCollections.length === 0) {
          console.log(`No collection tomorrow for ${profile.email} (districts: ${districts.join(', ')})`);
          continue;
        }

        console.log(`Found ${tomorrowCollections.length} collection(s) tomorrow for ${profile.email}`);

        // Get all collections for the next 7 days (for display in email)
        const { data: collections, error: collectionsError } = await supabase
          .from('waste_collection_schedule')
          .select('collection_date, waste_type, district')
          .in('district', districts)
          .gte('collection_date', todayStr)
          .lte('collection_date', endDateStr)
          .order('collection_date', { ascending: true });

        if (collectionsError) {
          console.error(`Error fetching collections for ${profile.email}:`, collectionsError);
          errors.push(`${profile.email}: ${collectionsError.message}`);
          continue;
        }

        if (!collections || collections.length === 0) {
          console.log(`No collections in next 7 days for ${profile.email} (districts: ${districts.join(', ')})`);
          continue;
        }

        console.log(`Found ${collections.length} total collection(s) in next 7 days for ${profile.email}`);

        // Build subject with tomorrow's waste types
        const tomorrowWasteTypes = tomorrowCollections.map(c => c.waste_type).join(', ');
        const emailSubject = `Abholtermin ${tomorrowWasteTypes} - Morgen ist Abholtag!`;

        // Send email notification
        await sendEmailNotification(profile, collections, emailSubject, smtpHost, smtpUser, smtpPass);
        emailsSent++;
        console.log(`Email sent to ${profile.email}`);

      } catch (error: any) {
        console.error(`Error processing ${profile.email}:`, error);
        errors.push(`${profile.email}: ${error.message}`);
      }
    }

    return new Response(JSON.stringify({ 
      message: 'Daily notifications completed',
      sentEmails: emailsSent,
      totalUsers: profiles.length,
      errors: errors.length > 0 ? errors : undefined
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
    
  } catch (error: any) {
    console.error('Error in daily-waste-notifications function:', error);
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

// Validate district name format (alphanumeric and common separators only)
function isValidDistrict(district: string): boolean {
  const districtRegex = /^[a-zA-Z0-9äöüÄÖÜß\s\-_]+$/;
  return districtRegex.test(district) && district.length <= 100;
}

async function sendEmailNotification(
  profile: UserProfile,
  collections: WasteCollection[],
  subject: string,
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
  const sanitizedStreet = escapeHtml(profile.street);

  const displayName = sanitizedFirstName && sanitizedLastName 
    ? `${sanitizedFirstName} ${sanitizedLastName}`
    : sanitizedFirstName || 'Lieber Nutzer';

  // Generate HTML table with sanitized data
  const tableRows = collections.map(collection => {
    // Validate and sanitize all collection data
    const formattedDate = formatDisplayDate(collection.collection_date);
    const sanitizedWasteType = escapeHtml(collection.waste_type);
    const sanitizedNotes = collection.notes ? escapeHtml(collection.notes) : "-";
    const sanitizedDistrict = isValidDistrict(collection.district) 
      ? escapeHtml(collection.district) 
      : 'Unbekannt';
    
    return `
      <tr style="border-bottom: 1px solid #e5e5e5;">
        <td style="padding: 12px; text-align: left; font-weight: 500;">${formattedDate}</td>
        <td style="padding: 12px; text-align: left;">${sanitizedWasteType}</td>
        <td style="padding: 12px; text-align: left;">${sanitizedNotes}</td>
        <td style="padding: 12px; text-align: left;">${sanitizedDistrict}</td>
      </tr>
    `;
  }).join('');

  const emailHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Deine Abholtermine</title>
    </head>
    <body style="margin: 0; padding: 20px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f8f9fa; color: #333;">
      <div style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
        <div style="padding: 30px; text-align: center; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border-radius: 8px 8px 0 0;">
          <h1 style="margin: 0; font-size: 24px; font-weight: bold;">📅 Deine Abholtermine</h1>
          <p style="margin: 10px 0 0 0; opacity: 0.9;">Müllabholung für ${sanitizedStreet}</p>
        </div>
        
        <div style="padding: 30px;">
          <p style="margin: 0 0 20px 0; font-size: 16px;">Hallo ${displayName},</p>
          
          <p style="margin: 0 0 25px 0; line-height: 1.6;">
            morgen ist Abholtag! Hier sind die Abholtermine für die nächsten 7 Tage:
          </p>
          
          <div style="overflow-x: auto; margin: 25px 0;">
            <table style="width: 100%; border-collapse: collapse; background-color: white; border-radius: 6px; overflow: hidden; border: 1px solid #e5e5e5;">
              <thead>
                <tr style="background-color: #f8f9fa;">
                  <th style="padding: 15px 12px; text-align: left; font-weight: 600; color: #495057; border-bottom: 2px solid #dee2e6;">Abholdatum</th>
                  <th style="padding: 15px 12px; text-align: left; font-weight: 600; color: #495057; border-bottom: 2px solid #dee2e6;">Abfallart</th>
                  <th style="padding: 15px 12px; text-align: left; font-weight: 600; color: #495057; border-bottom: 2px solid #dee2e6;">Bemerkung</th>
                  <th style="padding: 15px 12px; text-align: left; font-weight: 600; color: #495057; border-bottom: 2px solid #dee2e6;">Bezirk</th>
                </tr>
              </thead>
              <tbody>
                ${tableRows}
              </tbody>
            </table>
          </div>
          
          <div style="margin: 25px 0; padding: 15px; background-color: #e7f3ff; border-left: 4px solid #007bff; border-radius: 4px;">
            <p style="margin: 0; color: #004085; font-size: 14px;">
              💡 <strong>Tipp:</strong> Stelle die Tonnen am Vorabend bereit, damit Du nichts verpasst!
            </p>
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
  const finalSubject = `🗑️ ${subject}`;
  
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
      `Subject: =?UTF-8?B?${utf8ToBase64(finalSubject)}?=\r\n` +
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
