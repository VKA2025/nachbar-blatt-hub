export default async function handler(req: Request) {
  try {
    let userProfile;
    
    if (req.method === 'POST') {
      const contentType = req.headers.get('content-type');
      
      if (contentType && contentType.includes('application/x-www-form-urlencoded')) {
        // Handle form data from HTML form
        const formData = await req.formData();
        const userProfileStr = formData.get('userProfile');
        if (userProfileStr) {
          userProfile = JSON.parse(userProfileStr.toString());
        }
      } else {
        // Handle JSON data from API call
        const body = await req.json();
        userProfile = body.userProfile;
      }
    }

    console.log('Received user profile:', userProfile);

    // Basis-URL der RAG-Seite
    const baseUrl = "https://www.rag-koeln.de/WebAdRAG/de-de/14/Reklamation";

    // Query-Parameter zusammenbauen
    const url = new URL(baseUrl);
    url.searchParams.set("GewaehlterGrund", "5");   // <- hier vorbelegt
    
    if (userProfile) {
      if (userProfile.email) {
        url.searchParams.set("Email", userProfile.email);
      }
      if (userProfile.first_name) {
        url.searchParams.set("Vorname", userProfile.first_name);
      }
      if (userProfile.last_name) {
        url.searchParams.set("Nachname", userProfile.last_name);
      }
      if (userProfile.street) {
        url.searchParams.set("Strasse", userProfile.street);
      }
      if (userProfile.house_number) {
        url.searchParams.set("HsNr", userProfile.house_number);
      }
    }

    console.log('Redirecting to:', url.toString());

    // Redirect zurückgeben
    return new Response(null, {
      status: 302,
      headers: {
        Location: url.toString(),
      },
    });

  } catch (error) {
    console.error('Error in prefill-complaint-form function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ 
      error: 'Failed to redirect to form', 
      details: errorMessage 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}