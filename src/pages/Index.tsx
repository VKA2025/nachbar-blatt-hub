import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { User, Session } from "@supabase/supabase-js";
import { LogIn, LogOut, Calendar, FileText, Shield, Download, Eye, ExternalLink } from "lucide-react";

interface Flyer {
  id: string;
  title: string;
  description: string | null;
  file_url: string | null;
  file_name: string | null;
  file_size: number | null;
  external_url: string | null;
  is_external: boolean;
  upload_date: string;
  created_at: string;
}

const Index = () => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [flyers, setFlyers] = useState<Flyer[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          checkAdminStatus(session.user.id);
        } else {
          setIsAdmin(false);
        }
        loadFlyers();
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        checkAdminStatus(session.user.id);
      }
      loadFlyers();
    });

    return () => subscription.unsubscribe();
  }, []);

  const checkAdminStatus = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .eq('role', 'admin')
        .maybeSingle();

      if (error) {
        console.error('Error checking admin status:', error);
        setIsAdmin(false);
      } else {
        setIsAdmin(!!data);
      }
    } catch (error) {
      console.error('Error checking admin status:', error);
      setIsAdmin(false);
    }
  };

  const loadFlyers = async () => {
    try {
      const { data, error } = await supabase
        .from('flyers')
        .select(`
          id,
          title,
          description,
          file_url,
          file_name,
          file_size,
          external_url,
          is_external,
          upload_date,
          created_at
        `)
        .eq('is_active', true)
        .order('upload_date', { ascending: false });

      if (error) {
        console.error('Error loading flyers:', error);
        toast({
          title: "Fehler beim Laden",
          description: "Die Werbeblätter konnten nicht geladen werden.",
          variant: "destructive",
        });
      } else {
        setFlyers(data as any[] || []);
      }
    } catch (error) {
      console.error('Error loading flyers:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    toast({
      title: "Abgemeldet",
      description: "Sie wurden erfolgreich abgemeldet.",
    });
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return "Unbekannt";
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return Math.round(bytes / 1024) + " KB";
    return Math.round(bytes / (1024 * 1024)) + " MB";
  };

  const formatUploadDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('de-DE', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const handleViewFlyer = (flyer: Flyer) => {
    const url = flyer.is_external ? flyer.external_url : flyer.file_url;
    if (url) {
      window.open(url, '_blank');
    }
  };

  const handleDownloadFlyer = (flyer: Flyer) => {
    if (flyer.is_external) {
      // For external URLs, just open in new tab since we can't force download
      handleViewFlyer(flyer);
      return;
    }
    
    if (flyer.file_url && flyer.file_name) {
      const link = document.createElement('a');
      link.href = flyer.file_url;
      link.download = flyer.file_name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <h2 className="text-xl font-semibold">Lade Werbeblätter...</h2>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <h1 className="text-2xl font-bold">Schlossbote</h1>
            <Badge variant="secondary">Nachbarschafts-Portal</Badge>
          </div>
          <div className="flex items-center space-x-4">
            {user ? (
              <>
                <span className="text-sm text-muted-foreground">
                  Willkommen zurück!
                </span>
                {isAdmin && (
                  <Button variant="outline" onClick={() => navigate("/admin")}>
                    <Shield className="w-4 h-4 mr-2" />
                    Admin
                  </Button>
                )}
                <Button variant="outline" onClick={handleSignOut}>
                  <LogOut className="w-4 h-4 mr-2" />
                  Abmelden
                </Button>
              </>
            ) : (
              <Button onClick={() => navigate("/auth")}>
                <LogIn className="w-4 h-4 mr-2" />
                Anmelden
              </Button>
            )}
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold mb-4">Aktuelle Werbeblätter</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Entdecken Sie die neuesten Angebote und Informationen aus Ihrer Nachbarschaft.
            {!user && " Melden Sie sich an, um alle Funktionen zu nutzen."}
          </p>
        </div>

        {!user && (
          <Card className="mb-8 bg-muted/50">
            <CardContent className="pt-6">
              <div className="text-center">
                <LogIn className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">Anmeldung erforderlich</h3>
                <p className="text-muted-foreground mb-4">
                  Melden Sie sich an, um alle Werbeblätter anzusehen und herunterzuladen.
                </p>
                <Button onClick={() => navigate("/auth")}>
                  Jetzt anmelden
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {flyers.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <FileText className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">Keine Werbeblätter verfügbar</h3>
                <p className="text-muted-foreground">
                  Aktuell sind keine Werbeblätter verfügbar. Schauen Sie später wieder vorbei!
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {flyers.map((flyer) => (
              <Card key={flyer.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <CardTitle className="flex items-start space-x-2">
                    {flyer.is_external ? (
                      <ExternalLink className="w-5 h-5 mt-0.5 flex-shrink-0" />
                    ) : (
                      <FileText className="w-5 h-5 mt-0.5 flex-shrink-0" />
                    )}
                    <span className="line-clamp-2">{flyer.title}</span>
                  </CardTitle>
                  <CardDescription className="flex items-center space-x-2">
                    <Calendar className="w-4 h-4" />
                    <span>{formatUploadDate(flyer.upload_date)}</span>
                    {flyer.is_external && (
                      <Badge variant="secondary" className="text-xs">
                        Externer Link
                      </Badge>
                    )}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {flyer.description && (
                    <p className="text-sm text-muted-foreground line-clamp-3">
                      {flyer.description}
                    </p>
                  )}
                  
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    {flyer.is_external ? (
                      <span className="break-all">{flyer.external_url}</span>
                    ) : (
                      <>
                        <span>{flyer.file_name}</span>
                        <span>{formatFileSize(flyer.file_size)}</span>
                      </>
                    )}
                  </div>

                  {user && (
                    <div className="flex space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewFlyer(flyer)}
                        className="flex-1"
                      >
                        {flyer.is_external ? (
                          <>
                            <ExternalLink className="w-4 h-4 mr-2" />
                            Link öffnen
                          </>
                        ) : (
                          <>
                            <Eye className="w-4 h-4 mr-2" />
                            Anzeigen
                          </>
                        )}
                      </Button>
                      {!flyer.is_external && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDownloadFlyer(flyer)}
                          className="flex-1"
                        >
                          <Download className="w-4 h-4 mr-2" />
                          Download
                        </Button>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>

      <footer className="border-t bg-card mt-16">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center text-muted-foreground">
            <p>&copy; 2024 Schlossbote - Ihr Nachbarschafts-Portal</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
