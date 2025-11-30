import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { User, Session } from "@supabase/supabase-js";
import { LogIn, LogOut, Calendar, FileText, Shield, Download, Eye, ExternalLink, ArrowUpDown, GripVertical, Edit, Trash2, User as UserIcon, ChevronDown, Filter, Layers } from "lucide-react";
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
import bannerImage from '@/assets/banner-lake.jpg';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

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
  info_type_id: string | null;
  background_image_url: string | null;
  neighbor_type: string | null;
  expires_at: string | null;
  info_types?: {
    id: string;
    name: string;
  };
}

interface InfoType {
  id: string;
  name: string;
}

interface SortPreferences {
  field: 'upload_date' | 'title' | 'created_at' | 'custom';
  direction: 'asc' | 'desc';
  custom_order?: string[];
}

interface UserProfile {
  id: string;
  user_id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  street: string | null;
  house_number: string | null;
}

interface ImprintData {
  id: string;
  site_name: string;
  first_name: string;
  last_name: string;
  street: string;
  house_number: string;
  postal_code: string;
  city: string;
  email: string;
  phone: string | null;
}

const Index = () => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [flyers, setFlyers] = useState<Flyer[]>([]);
  const [allFlyers, setAllFlyers] = useState<Flyer[]>([]);
  const [infoTypes, setInfoTypes] = useState<InfoType[]>([]);
  const [selectedInfoTypes, setSelectedInfoTypes] = useState<string[]>([]);
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [imprintData, setImprintData] = useState<ImprintData | null>(null);
  const [flyerToDelete, setFlyerToDelete] = useState<Flyer | null>(null);
  const [sortPreferences, setSortPreferences] = useState<SortPreferences>({
    field: 'custom',
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
          loadFilterPreferences(session.user.id);
          loadUserProfile(session.user.id);
        } else {
          setIsAdmin(false);
          setSelectedInfoTypes([]);
          setUserProfile(null);
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        checkAdminStatus(session.user.id);
        loadSortPreferences(session.user.id);
        loadFilterPreferences(session.user.id);
        loadUserProfile(session.user.id);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    loadFlyers();
  }, [sortPreferences]);

  useEffect(() => {
    loadInfoTypes();
    loadImprintData();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [allFlyers, selectedInfoTypes]);

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
            field: prefs.field || 'custom',
            direction: prefs.direction || 'desc',
            custom_order: prefs.custom_order || []
          });
        }
      }
    } catch (error) {
      console.error('Error loading sort preferences:', error);
    }
  };

  const loadFilterPreferences = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('filter_preferences')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) {
        console.error('Error loading filter preferences:', error);
      } else if (data?.filter_preferences) {
        const filters = data.filter_preferences as string[];
        if (Array.isArray(filters)) {
          setSelectedInfoTypes(filters);
        }
      }
    } catch (error) {
      console.error('Error loading filter preferences:', error);
    }
  };

  const loadUserProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, user_id, first_name, last_name, email, street, house_number')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) {
        console.error('Error loading user profile:', error);
      } else if (data) {
        setUserProfile(data);
      }
    } catch (error) {
      console.error('Error loading user profile:', error);
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

  const saveFilterPreferences = async (filters: string[]) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ filter_preferences: filters as any })
        .eq('user_id', user.id);

      if (error) {
        console.error('Error saving filter preferences:', error);
        toast({
          title: "Fehler",
          description: "Filtereinstellungen konnten nicht gespeichert werden.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error saving filter preferences:', error);
    }
  };

  const loadInfoTypes = async () => {
    try {
      const { data, error } = await supabase
        .from('info_types')
        .select('id, name')
        .order('name');

      if (error) {
        console.error('Error loading info types:', error);
        return;
      }

      setInfoTypes(data || []);
    } catch (error) {
      console.error('Error loading info types:', error);
    }
  };

  const loadImprintData = async () => {
    try {
      const { data, error } = await supabase
        .from('imprint_data')
        .select('*')
        .maybeSingle();

      if (error) {
        console.error('Error loading imprint data:', error);
        return;
      }

      if (data) {
        setImprintData(data);
      }
    } catch (error) {
      console.error('Error loading imprint data:', error);
    }
  };

  const loadFlyers = async () => {
    try {
      let query = supabase
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
          created_at,
          info_type_id,
          background_image_url,
          neighbor_type,
          expires_at,
          info_types (
            id,
            name
          )
        `)
        .eq('is_active', true);

      // Admins see all flyers (including expired ones)
      // Regular users only see non-expired flyers (handled by RLS)
      
      let { data, error } = await query;

      if (error) {
        console.error('Error loading flyers:', error);
        toast({
          title: "Fehler beim Laden",
          description: "Die Info-Kacheln konnten nicht geladen werden.",
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

      setAllFlyers(sortedFlyers);
    } catch (error) {
      console.error('Error loading flyers:', error);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filteredFlyers = allFlyers;

    if (selectedInfoTypes.length > 0) {
      filteredFlyers = allFlyers.filter(flyer => 
        flyer.info_type_id && selectedInfoTypes.includes(flyer.info_type_id)
      );
    }

    setFlyers(filteredFlyers);
  };

  const handleFilterChange = async (infoTypeId: string, checked: boolean) => {
    let newSelectedTypes: string[];
    
    if (checked) {
      newSelectedTypes = [...selectedInfoTypes, infoTypeId];
    } else {
      newSelectedTypes = selectedInfoTypes.filter(id => id !== infoTypeId);
    }
    
    setSelectedInfoTypes(newSelectedTypes);
    
    if (user) {
      await saveFilterPreferences(newSelectedTypes);
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
      description: "Du wurdest erfolgreich abgemeldet.",
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

  const handleEditFlyer = (flyer: Flyer) => {
    // Navigate to admin page with flyer data for editing
    navigate("/admin", { state: { editFlyer: flyer } });
  };

  const handleDeleteFlyer = (flyer: Flyer) => {
    setFlyerToDelete(flyer);
  };

  const confirmDeleteFlyer = async () => {
    if (!flyerToDelete) return;

    try {
      // Delete from database
      const { error: dbError } = await supabase
        .from('flyers')
        .delete()
        .eq('id', flyerToDelete.id);

      if (dbError) {
        throw dbError;
      }

      // Delete file from storage if it's not external
      if (!flyerToDelete.is_external && flyerToDelete.file_url) {
        const filePath = flyerToDelete.file_url.split('/').pop();
        if (filePath) {
          await supabase.storage
            .from('flyers')
            .remove([filePath]);
        }
      }

      toast({
        title: "Infokachel gelöscht",
        description: "Die Infokachel wurde erfolgreich gelöscht.",
      });

      // Reload flyers
      await loadFlyers();
    } catch (error) {
      console.error('Error deleting flyer:', error);
      toast({
        title: "Fehler beim Löschen",
        description: "Die Infokachel konnte nicht gelöscht werden.",
        variant: "destructive",
      });
    } finally {
      setFlyerToDelete(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <h2 className="text-xl font-semibold">Lade Infokacheln...</h2>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <h1 className="text-2xl font-bold text-primary-dark font-christmas">🎄 Schlossstadt.info 🎄</h1>
            <Badge variant="secondary">Nachbarschafts-Portal</Badge>
          </div>
          <div className="flex items-center space-x-4">
            {user ? (
              <>
                <span className="text-sm text-muted-foreground">
                  Willkommen zurück!
                </span>
                <Button variant="outline" onClick={() => navigate("/mein-bereich")}>
                  <Layers className="w-4 h-4 mr-2" />
                  Mein Bereich
                </Button>
                <Button variant="outline" onClick={() => navigate("/profile")}>
                  <UserIcon className="w-4 h-4 mr-2" />
                  Profil
                </Button>
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

      {/* Hero Banner */}
      <div 
        className="relative h-96 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${bannerImage})` }}
      >
        <div className="absolute inset-0 bg-background/60"></div>
        <div className="relative z-10 container mx-auto px-4 h-full flex flex-col justify-center items-center text-center">
          <h2 className="text-4xl md:text-5xl font-bold mb-4 text-primary-dark font-christmas">🎅 Aktuelles aus Brühl 🎁</h2>
          <p className="text-lg md:text-xl text-primary-dark max-w-2xl mx-auto">
            Entdecke die neuesten Angebote und Informationen aus Deiner Nachbarschaft.
            {!user && " Melde Dich an, um alle Funktionen zu nutzen."}
          </p>
        </div>
      </div>

      <main className="container mx-auto px-4 py-8">

        {!user && (
          <Card className="mb-8 bg-muted/50">
            <CardContent className="pt-6">
              <div className="text-center">
                <LogIn className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">Anmeldung erforderlich</h3>
                <p className="text-muted-foreground mb-4">
                  Melde Dich an, um alle Informationen anzusehen und herunterzuladen.
                </p>
                <Button onClick={() => navigate("/auth")}>
                  Jetzt anmelden
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {user && allFlyers.length > 0 && (
          <div className="mb-6">
            <Collapsible open={isFiltersOpen} onOpenChange={setIsFiltersOpen}>
              <CollapsibleTrigger asChild>
                <Button variant="outline" className="mb-4 w-full sm:w-auto">
                  <Filter className="w-4 h-4 mr-2" />
                  Sortieren & Filtern
                  <ChevronDown className={`w-4 h-4 ml-2 transition-transform ${isFiltersOpen ? 'rotate-180' : ''}`} />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="flex flex-col gap-4 p-4 bg-muted/30 rounded-lg">
                  {/* Filtering */}
                  <div className="flex flex-col gap-4">
                    <div className="flex items-center space-x-2">
                      <Filter className="w-4 h-4" />
                      <span className="text-sm font-medium">Filter:</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {infoTypes.map((type) => (
                        <div key={type.id} className="flex items-center space-x-2">
                          <Checkbox
                            id={`filter-${type.id}`}
                            checked={selectedInfoTypes.includes(type.id)}
                            onCheckedChange={(checked) => handleFilterChange(type.id, checked as boolean)}
                          />
                          <label
                            htmlFor={`filter-${type.id}`}
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                          >
                            {type.name}
                          </label>
                        </div>
                      ))}
                    </div>
                    {selectedInfoTypes.length > 0 && (
                      <div className="flex items-center justify-between text-sm text-muted-foreground">
                        <span>{selectedInfoTypes.length} Filter aktiv</span>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={async () => {
                            setSelectedInfoTypes([]);
                            if (user) {
                              await saveFilterPreferences([]);
                            }
                          }}
                        >
                          Alle Filter entfernen
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* Sorting */}
                  <div className="flex flex-col sm:flex-row gap-4">
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
                </div>
              </CollapsibleContent>
            </Collapsible>
            
            {sortPreferences.field === 'custom' && (
              <div className="mt-3 p-3 bg-primary/10 rounded-md border border-primary/20">
                <p className="text-sm text-primary font-medium">
                  💡 Sortiere deine Informationen durch Tippen und Ziehen der Infokacheln.
                </p>
              </div>
            )}
          </div>
        )}

        {flyers.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <FileText className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">Keine Info-Kacheln verfügbar</h3>
                <p className="text-muted-foreground">
                  Aktuell sind keine Informationen verfügbar. Pass bitte den Filter an!
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
                    userProfile={userProfile}
                    isAdmin={isAdmin}
                    onViewFlyer={handleViewFlyer}
                    onDownloadFlyer={handleDownloadFlyer}
                    onEditFlyer={handleEditFlyer}
                    onDeleteFlyer={handleDeleteFlyer}
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
          <div className="max-w-4xl mx-auto">
            <div className="grid md:grid-cols-2 gap-8">
              <div>
                <h3 className="font-semibold mb-4">Impressum</h3>
                <div className="text-sm text-muted-foreground space-y-2">
                  {imprintData ? (
                    <>
                      <p>
                        <strong>Verantwortlich für den Inhalt:</strong><br />
                        {imprintData.site_name}<br />
                        {imprintData.first_name} {imprintData.last_name}<br />
                        {imprintData.street} {imprintData.house_number}<br />
                        {imprintData.postal_code} {imprintData.city}
                      </p>
                      <p>
                        <strong>Kontakt:</strong><br />
                        E-Mail: {imprintData.email}<br />
                        {imprintData.phone && `Telefon: ${imprintData.phone}`}
                      </p>
                    </>
                  ) : (
                    <p>Impressum wird geladen...</p>
                  )}
                </div>
              </div>
              <div>
                <h3 className="font-semibold mb-4">Rechtliches</h3>
                <div className="text-sm text-muted-foreground space-y-2">
                  <p>
                    <strong>Haftungsausschluss:</strong><br />
                    Trotz sorgfältiger inhaltlicher Kontrolle übernehmen wir keine Haftung für die Inhalte externer Links. Für den Inhalt der verlinkten Seiten sind ausschließlich deren Betreiber verantwortlich.
                  </p>
                  <p>
                    <strong>Datenschutz:</strong><br />
                    Personenbezogene Daten dienen lediglich zur Anmeldung und zur Nutzung von auf dieser Webseite hinterlegten Funktionen. Die Daten werden nicht weitergegeben und nicht ausgewertet. Sie werden auf freiwilliger Basis erhoben.
                  </p>
                </div>
              </div>
            </div>
            <div className="text-center text-muted-foreground mt-8 pt-8 border-t">
              <p>&copy; 2025 Schlossstadt.info - Dein Nachbarschafts-Portal</p>
            </div>
          </div>
        </div>
      </footer>

      <AlertDialog open={!!flyerToDelete} onOpenChange={(open) => !open && setFlyerToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Infokachel löschen?</AlertDialogTitle>
            <AlertDialogDescription>
              Möchten Sie die Infokachel "{flyerToDelete?.title}" wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteFlyer} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Löschen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Index;
