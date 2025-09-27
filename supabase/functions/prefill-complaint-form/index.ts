import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userProfile } = await req.json();
    console.log('Received user profile:', userProfile);

    // Fetch the original form
    const formResponse = await fetch('https://www.rag-koeln.de/WebAdRAG/de-de/14/Reklamation');
    
    if (!formResponse.ok) {
      throw new Error(`Failed to fetch form: ${formResponse.status}`);
    }

    let html = await formResponse.text();
    console.log('Fetched HTML length:', html.length);

    // Pre-fill form fields with user data
    if (userProfile.first_name) {
      html = html.replace(/<input([^>]*name=["']?Vorname["']?[^>]*)>/gi, 
        `<input$1 value="${userProfile.first_name}">`);
    }

    if (userProfile.last_name) {
      html = html.replace(/<input([^>]*name=["']?Nachname["']?[^>]*)>/gi, 
        `<input$1 value="${userProfile.last_name}">`);
    }

    if (userProfile.email) {
      html = html.replace(/<input([^>]*name=["']?Email["']?[^>]*)>/gi, 
        `<input$1 value="${userProfile.email}">`);
    }

    if (userProfile.street) {
      html = html.replace(/<input([^>]*name=["']?Strasse["']?[^>]*)>/gi, 
        `<input$1 value="${userProfile.street}">`);
    }

    if (userProfile.house_number) {
      html = html.replace(/<input([^>]*name=["']?HsNr["']?[^>]*)>/gi, 
        `<input$1 value="${userProfile.house_number}">`);
    }

    // Pre-select the complaint reason
    html = html.replace(/<option value="5">([^<]+)<\/option>/gi, 
      '<option value="5" selected>$1</option>');

    // Remove any existing selected option for the dropdown
    html = html.replace(/<option value="" selected>/gi, '<option value="">');

    console.log('HTML processing completed');

    return new Response(html, {
      headers: { 
        ...corsHeaders, 
        'Content-Type': 'text/html; charset=utf-8'
      },
    });

  } catch (error) {
    console.error('Error in prefill-complaint-form function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ 
      error: 'Failed to prefill form', 
      details: errorMessage 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});