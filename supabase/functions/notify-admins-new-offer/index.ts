import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { itemId } = await req.json();
    
    console.log('Notifying admins about new offer:', itemId);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get the item details
    const { data: item, error: itemError } = await supabase
      .from('neighbor_items')
      .select(`
        *,
        owner:profiles!neighbor_items_owner_id_fkey(first_name, last_name, email),
        category:neighbor_categories(name),
        subcategory:neighbor_subcategories(name)
      `)
      .eq('id', itemId)
      .single();

    if (itemError || !item) {
      console.error('Error fetching item:', itemError);
      throw new Error('Item not found');
    }

    // Get all admin users
    const { data: adminRoles, error: rolesError } = await supabase
      .from('user_roles')
      .select('user_id')
      .eq('role', 'admin');

    if (rolesError || !adminRoles || adminRoles.length === 0) {
      console.log('No admins found');
      return new Response(
        JSON.stringify({ message: 'No admins to notify' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get admin profiles
    const adminUserIds = adminRoles.map(r => r.user_id);
    const { data: adminProfiles, error: profilesError } = await supabase
      .from('profiles')
      .select('email, first_name')
      .in('user_id', adminUserIds);

    if (profilesError || !adminProfiles || adminProfiles.length === 0) {
      console.log('No admin profiles found');
      return new Response(
        JSON.stringify({ message: 'No admin profiles found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const smtpHost = Deno.env.get('SMTP_HOST');
    const smtpUser = Deno.env.get('SMTP_USER');
    const smtpPass = Deno.env.get('SMTP_PASS');

    if (!smtpHost || !smtpUser || !smtpPass) {
      throw new Error('SMTP credentials not configured');
    }

    // Send email to each admin
    const emailPromises = adminProfiles
      .filter(profile => profile.email)
      .map(profile => 
        sendEmailSMTP(
          smtpHost,
          smtpUser,
          smtpPass,
          profile.email!,
          profile.first_name || 'Admin',
          item,
          item.owner
        )
      );

    await Promise.all(emailPromises);

    console.log(`Sent notifications to ${emailPromises.length} admin(s)`);

    return new Response(
      JSON.stringify({ message: 'Admin notifications sent successfully' }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error: any) {
    console.error('Error in notify-admins-new-offer:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});

async function sendEmailSMTP(
  smtpHost: string,
  smtpUser: string,
  smtpPass: string,
  adminEmail: string,
  adminName: string,
  item: any,
  owner: any
): Promise<void> {
  const [host, portStr] = smtpHost.split(':');
  const port = portStr ? parseInt(portStr, 10) : 465;

  console.log(`Sending email to admin: ${adminEmail} via ${host}:${port}`);

  const conn = await Deno.connectTls({
    hostname: host,
    port: port,
  });

  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  async function readResponse(): Promise<string> {
    const buffer = new Uint8Array(1024);
    const n = await conn.read(buffer);
    if (n === null) return '';
    const response = decoder.decode(buffer.subarray(0, n));
    console.log('SMTP <', response.trim());
    return response;
  }

  async function sendCommand(command: string): Promise<string> {
    console.log('SMTP >', command.trim());
    await conn.write(encoder.encode(command));
    return await readResponse();
  }

  try {
    await readResponse(); // Read greeting
    await sendCommand(`EHLO ${host}\r\n`);
    await sendCommand('AUTH LOGIN\r\n');
    await sendCommand(btoa(smtpUser) + '\r\n');
    await sendCommand(btoa(smtpPass) + '\r\n');
    await sendCommand(`MAIL FROM:<${smtpUser}>\r\n`);
    await sendCommand(`RCPT TO:<${adminEmail}>\r\n`);
    await sendCommand('DATA\r\n');

    const subject = `Neues Nachbarangebot zur Freigabe: ${item.title}`;
    const approvalUrl = `https://nachbar-blatt-hub.lovable.app/admin`;
    
    const emailBody = `From: ${smtpUser}\r\n` +
      `To: ${adminEmail}\r\n` +
      `Subject: ${subject}\r\n` +
      `MIME-Version: 1.0\r\n` +
      `Content-Type: text/html; charset=utf-8\r\n` +
      `\r\n` +
      `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #4F46E5; color: white; padding: 20px; text-align: center; }
    .content { background-color: #f9f9f9; padding: 20px; }
    .button { display: inline-block; background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
    .details { background-color: white; padding: 15px; margin: 15px 0; border-left: 4px solid #4F46E5; }
    .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Neues Nachbarangebot zur Freigabe</h1>
    </div>
    <div class="content">
      <p>Hallo ${adminName},</p>
      <p>Ein neues Nachbarangebot wurde erstellt und wartet auf Ihre Freigabe:</p>
      
      <div class="details">
        <h3>${item.title}</h3>
        <p><strong>Kategorie:</strong> ${item.category?.name || 'Nicht angegeben'}</p>
        <p><strong>Unterkategorie:</strong> ${item.subcategory?.name || 'Nicht angegeben'}</p>
        <p><strong>Angebotstyp:</strong> ${item.offer_type}</p>
        <p><strong>Beschreibung:</strong> ${item.description || 'Keine Beschreibung'}</p>
        <p><strong>Anbieter:</strong> ${owner?.first_name || ''} ${owner?.last_name || ''}</p>
      </div>

      <p style="text-align: center;">
        <a href="${approvalUrl}" class="button">Zur Freigabe</a>
      </p>
    </div>
    <div class="footer">
      <p>Diese E-Mail wurde automatisch generiert. Bitte nicht antworten.</p>
    </div>
  </div>
</body>
</html>\r\n.\r\n`;

    await conn.write(encoder.encode(emailBody));
    await readResponse();
    await sendCommand('QUIT\r\n');

    console.log(`Email sent successfully to ${adminEmail}`);
  } catch (error) {
    console.error(`SMTP error for ${adminEmail}:`, error);
    throw error;
  } finally {
    try {
      conn.close();
    } catch (e) {
      console.error('Error closing connection:', e);
    }
  }
}
