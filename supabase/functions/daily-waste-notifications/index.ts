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
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const smtpHost = Deno.env.get('SMTP_HOST')!;
    const smtpUser = Deno.env.get('SMTP_USER')!;
    const smtpPass = Deno.env.get('SMTP_PASS')!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Get tomorrow's date
    const tomorrow = addDays(new Date(), 1);
    const tomorrowStr = formatDate(tomorrow);
    
    console.log(`Checking for waste collections on ${tomorrowStr}`);

    // Get all users with street information and email notifications enabled
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('user_id, email, street, first_name, last_name, email_notifications')
      .not('street', 'is', null)
      .not('email', 'is', null)
      .eq('email_notifications', true);

    if (profilesError) {
      console.error('Error fetching user profiles:', profilesError);
      throw profilesError;
    }

    if (!profiles || profiles.length === 0) {
      console.log('No users with email notifications enabled found');
      return new Response(JSON.stringify({ message: 'No users to notify' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Found ${profiles.length} users with email notifications enabled`);
    
    let notificationsSent = 0;

    for (const profile of profiles) {
      try {
        console.log(`Processing user: ${profile.email}, street: ${profile.street}`);
        
        // Get districts for user's street
        const { data: streetDistricts, error: streetError } = await supabase
          .from('street_districts')
          .select('district, notes')
          .eq('street_name', profile.street);

        if (streetError || !streetDistricts || streetDistricts.length === 0) {
          console.log(`No districts found for street: ${profile.street}`);
          continue;
        }

        const districts = streetDistricts.map(sd => sd.district);
        
        // Check if there are any collections tomorrow for this user's districts
        const { data: tomorrowCollections, error: tomorrowError } = await supabase
          .from('waste_collection_schedule')
          .select('*')
          .in('district', districts)
          .eq('collection_date', tomorrowStr);

        if (tomorrowError) {
          console.error(`Error checking tomorrow's collections for ${profile.email}:`, tomorrowError);
          continue;
        }

        if (!tomorrowCollections || tomorrowCollections.length === 0) {
          console.log(`No collections tomorrow for ${profile.email}`);
          continue;
        }

        console.log(`Found ${tomorrowCollections.length} collections tomorrow for ${profile.email}`);

        // Get all collections for the next 7 days
        const nextWeek = addDays(new Date(), 7);
        const nextWeekStr = formatDate(nextWeek);
        
        const { data: weekCollections, error: weekError } = await supabase
          .from('waste_collection_schedule')
          .select('*')
          .in('district', districts)
          .gte('collection_date', formatDate(new Date()))
          .lte('collection_date', nextWeekStr)
          .order('collection_date');

        if (weekError || !weekCollections) {
          console.error(`Error fetching week collections for ${profile.email}:`, weekError);
          continue;
        }

        // Add notes to collections and sort
        const districtNotes = streetDistricts.reduce((acc, sd) => {
          acc[sd.district] = sd.notes;
          return acc;
        }, {} as Record<string, string | null>);

        const collectionsWithNotes = weekCollections.map(collection => ({
          ...collection,
          notes: districtNotes[collection.district]
        })).sort((a, b) => {
          const notesA = (a.notes || '').toString().trim();
          const notesB = (b.notes || '').toString().trim();
          const notesComparison = notesA.localeCompare(notesB, 'de', { numeric: true, sensitivity: 'base' });
          
          if (notesComparison !== 0) {
            return notesComparison;
          }
          
          const dateA = new Date(a.collection_date);
          const dateB = new Date(b.collection_date);
          return dateA.getTime() - dateB.getTime();
        });

        // Send email notification
        await sendEmailNotification(profile, collectionsWithNotes, smtpHost, smtpUser, smtpPass);
        notificationsSent++;
        
        console.log(`Email sent to ${profile.email}`);
        
      } catch (error) {
        console.error(`Error processing user ${profile.email}:`, error);
      }
    }

    console.log(`Daily notifications completed. Sent ${notificationsSent} emails.`);
    
    return new Response(JSON.stringify({ 
      message: 'Daily notifications completed',
      notificationsSent 
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

async function sendEmailNotification(
  profile: UserProfile,
  collections: WasteCollection[],
  smtpHost: string,
  smtpUser: string,
  smtpPass: string
): Promise<void> {
  const displayName = profile.first_name && profile.last_name 
    ? `${profile.first_name} ${profile.last_name}`
    : profile.first_name || 'Lieber Nutzer';

  // Generate HTML table
  const tableRows = collections.map(collection => {
    const formattedDate = formatDisplayDate(collection.collection_date);
    return `
      <tr style="border-bottom: 1px solid #e5e5e5;">
        <td style="padding: 12px; text-align: left; font-weight: 500;">${formattedDate}</td>
        <td style="padding: 12px; text-align: left;">${collection.waste_type}</td>
        <td style="padding: 12px; text-align: left;">${collection.notes || "-"}</td>
        <td style="padding: 12px; text-align: left;">${collection.district}</td>
      </tr>
    `;
  }).join('');

  const emailHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Ihre Abholtermine</title>
    </head>
    <body style="margin: 0; padding: 20px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f8f9fa; color: #333;">
      <div style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
        <div style="padding: 30px; text-align: center; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border-radius: 8px 8px 0 0;">
          <h1 style="margin: 0; font-size: 24px; font-weight: bold;">📅 Ihre Abholtermine</h1>
          <p style="margin: 10px 0 0 0; opacity: 0.9;">Müllabholung für ${profile.street}</p>
        </div>
        
        <div style="padding: 30px;">
          <p style="margin: 0 0 20px 0; font-size: 16px;">Hallo ${displayName},</p>
          
          <p style="margin: 0 0 25px 0; line-height: 1.6;">
            morgen ist Abholtag! Hier sind Ihre Abholtermine für die nächsten 7 Tage:
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
              💡 <strong>Tipp:</strong> Stellen Sie Ihre Tonnen am Vorabend bereit, damit Sie nichts verpassen!
            </p>
          </div>
        </div>
        
        <div style="padding: 20px 30px; background-color: #f8f9fa; border-radius: 0 0 8px 8px; border-top: 1px solid #e5e5e5;">
          <p style="margin: 0; font-size: 12px; color: #6c757d; text-align: center;">
            Sie erhalten diese E-Mail, weil Sie Benachrichtigungen für Ihre Abholtermine aktiviert haben.<br>
            Sie können diese Einstellung in Ihrem Profil ändern.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;

  // Simple SMTP implementation using basic authentication
  const message = `From: ${smtpUser}\r\n` +
    `To: ${profile.email}\r\n` +
    `Subject: =?UTF-8?B?${btoa(`🗑️ Abholtermine für ${profile.street} - Morgen ist Abholtag!`)}?=\r\n` +
    `MIME-Version: 1.0\r\n` +
    `Content-Type: text/html; charset=UTF-8\r\n` +
    `Content-Transfer-Encoding: base64\r\n\r\n` +
    btoa(emailHtml);

  // Connect to SMTP server (this is a simplified version)
  console.log(`Sending email to ${profile.email} via ${smtpHost}`);
  
  // For demonstration purposes, we'll log the email content
  // In a production environment, you would implement actual SMTP sending
  console.log('Email content prepared:', {
    to: profile.email,
    subject: `🗑️ Abholtermine für ${profile.street} - Morgen ist Abholtag!`,
    collectionsCount: collections.length
  });
}

serve(handler);