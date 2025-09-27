import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { User, Session } from "@supabase/supabase-js";
import { LogIn, LogOut, Calendar, FileText, Shield, Download, Eye, ExternalLink, ArrowUpDown, GripVertical } from "lucide-react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import {
  CSS,
} from '@dnd-kit/utilities';
import { SortableFlyerCard } from "@/components/SortableFlyerCard";

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

interface SortPreferences {
  field: 'upload_date' | 'title' | 'created_at' | 'custom';
  direction: 'asc' | 'desc';
  custom_order?: string[];
}

const Index = () => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [flyers, setFlyers] = useState<Flyer[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortPreferences, setSortPreferences] = useState<SortPreferences>({
    field: 'upload_date',
    direction: 'desc',
    custom_order: []
  });
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          checkAdminStatus(session.user.id);
          loadSortPreferences(session.user.id);
        } else {
          setIsAdmin(false);
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        checkAdminStatus(session.user.id);
        loadSortPreferences(session.user.id);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    loadFlyers();
  }, [sortPreferences]);

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

  const loadSortPreferences = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('sort_preferences')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) {
        console.error('Error loading sort preferences:', error);
      } else if (data?.sort_preferences) {
        const prefs = data.sort_preferences as any;
        if (prefs && typeof prefs === 'object' && 'field' in prefs && 'direction' in prefs) {
          setSortPreferences({
            field: prefs.field || 'upload_date',
            direction: prefs.direction || 'desc',
            custom_order: prefs.custom_order || []
          });
        }
      }
    } catch (error) {
      console.error('Error loading sort preferences:', error);
    }
  };

  const saveSortPreferences = async (preferences: SortPreferences) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ sort_preferences: preferences as any })
        .eq('user_id', user.id);

      if (error) {
        console.error('Error saving sort preferences:', error);
        toast({
          title: "Fehler",
          description: "Sortiereinstellungen konnten nicht gespeichert werden.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error saving sort preferences:', error);
    }
  };

  const loadFlyers = async () => {
    try {
      let { data, error } = await supabase
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
        .eq('is_active', true);

      if (error) {
        console.error('Error loading flyers:', error);
        toast({
          title: "Fehler beim Laden",
          description: "Die Werbeblätter konnten nicht geladen werden.",
          variant: "destructive",
        });
        return;
      }

      let sortedFlyers = data as Flyer[] || [];

      // Apply sorting based on preferences
      if (sortPreferences.field === 'custom' && sortPreferences.custom_order && sortPreferences.custom_order.length > 0) {
        // Sort by custom order
        const orderMap = new Map(sortPreferences.custom_order.map((id, index) => [id, index]));
        sortedFlyers.sort((a, b) => {
          const orderA = orderMap.get(a.id) ?? Number.MAX_SAFE_INTEGER;
          const orderB = orderMap.get(b.id) ?? Number.MAX_SAFE_INTEGER;
          return orderA - orderB;
        });
      } else {
        // Sort by field and direction
        const ascending = sortPreferences.direction === 'asc';
        sortedFlyers.sort((a, b) => {
          const aValue = a[sortPreferences.field as keyof Flyer];
          const bValue = b[sortPreferences.field as keyof Flyer];
          
          if (aValue < bValue) return ascending ? -1 : 1;
          if (aValue > bValue) return ascending ? 1 : -1;
          return 0;
        });
      }

      setFlyers(sortedFlyers);
    } catch (error) {
      console.error('Error loading flyers:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSortChange = async (field: string, direction: string) => {
    const newPreferences: SortPreferences = { 
      field: field as SortPreferences['field'], 
      direction: direction as SortPreferences['direction'],
      custom_order: field === 'custom' ? sortPreferences.custom_order : []
    };
    setSortPreferences(newPreferences);
    
    if (user) {
      await saveSortPreferences(newPreferences);
    }
    
    setLoading(true);
    await loadFlyers();
  };

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (active.id !== over?.id) {
      const oldIndex = flyers.findIndex((flyer) => flyer.id === active.id);
      const newIndex = flyers.findIndex((flyer) => flyer.id === over?.id);
      
      const newFlyers = arrayMove(flyers, oldIndex, newIndex);
      setFlyers(newFlyers);
      
      // Update sort preferences to custom order
      const newCustomOrder = newFlyers.map(flyer => flyer.id);
      const newPreferences: SortPreferences = {
        field: 'custom',
        direction: 'desc',
        custom_order: newCustomOrder
      };
      
      setSortPreferences(newPreferences);
      
      if (user) {
        await saveSortPreferences(newPreferences);
      }
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
            <h1 className="text-2xl font-bold">Schlossstadt.Info</h1>
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
          <h2 className="text-3xl font-bold mb-4">Aktuelle Infos aus Deiner Stadt</h2>
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

        {user && flyers.length > 0 && (
          <div className="flex flex-col sm:flex-row gap-4 mb-6 p-4 bg-muted/30 rounded-lg">
            <div className="flex items-center space-x-2">
              <ArrowUpDown className="w-4 h-4" />
              <span className="text-sm font-medium">Sortierung:</span>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <Select
                value={sortPreferences.field}
                onValueChange={(field) => handleSortChange(field, sortPreferences.direction)}
              >
                <SelectTrigger className="w-full sm:w-48">
                  <SelectValue placeholder="Sortieren nach" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="upload_date">Upload-Datum</SelectItem>
                  <SelectItem value="title">Titel</SelectItem>
                  <SelectItem value="created_at">Erstellungszeit</SelectItem>
                  <SelectItem value="custom">Benutzerdefiniert</SelectItem>
                </SelectContent>
              </Select>
              
              <Select
                value={sortPreferences.direction}
                onValueChange={(direction) => handleSortChange(sortPreferences.field, direction)}
              >
                <SelectTrigger className="w-full sm:w-32">
                  <SelectValue placeholder="Richtung" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="desc">Absteigend</SelectItem>
                  <SelectItem value="asc">Aufsteigend</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
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
          <DndContext 
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext 
              items={flyers.map(f => f.id)} 
              strategy={verticalListSortingStrategy}
            >
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {flyers.map((flyer) => (
                  <SortableFlyerCard
                    key={flyer.id}
                    flyer={flyer}
                    isCustomSort={sortPreferences.field === 'custom'}
                    user={user}
                    onViewFlyer={handleViewFlyer}
                    onDownloadFlyer={handleDownloadFlyer}
                    formatFileSize={formatFileSize}
                    formatUploadDate={formatUploadDate}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </main>

      <footer className="border-t bg-card mt-16">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center text-muted-foreground">
            <p>&copy; 2024 Schlossstadt.Info - Ihr Nachbarschafts-Portal</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
