import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { User, Session } from "@supabase/supabase-js";
import { ArrowLeft, MessageSquare, Package, Calendar, MapPin } from "lucide-react";

interface NeighborItem {
  id: string;
  title: string;
  description: string | null;
  offer_type: string;
  availability_status: string;
  available_from: string | null;
  available_until: string | null;
  is_free: boolean | null;
  deposit_required: number | null;
  photo_url: string | null;
  created_at: string;
  updated_at: string | null;
  is_approved: boolean;
  deactivated: boolean;
  category_id: string;
  subcategory_id: string;
  neighbor_categories?: {
    name: string;
  };
  neighbor_subcategories?: {
    name: string;
  };
}

interface Transaction {
  id: string;
  item_id: string;
  status: string;
  created_at: string;
  neighbor_items?: {
    title: string;
    offer_type: string;
    photo_url: string | null;
    owner_id: string;
  };
  requester_profiles?: {
    first_name: string | null;
    last_name: string | null;
  };
}

const MyArea = () => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [myItems, setMyItems] = useState<NeighborItem[]>([]);
  const [myProfileId, setMyProfileId] = useState<string | null>(null);
  const [myInterests, setMyInterests] = useState<Transaction[]>([]);
  const [requestsForMyItems, setRequestsForMyItems] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (!session?.user) {
          navigate("/auth");
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (!session?.user) {
        navigate("/auth");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  useEffect(() => {
    if (user) {
      loadMyProfile();
    }
  }, [user]);

  useEffect(() => {
    if (myProfileId) {
      loadMyItems();
      loadMyInterests();
      loadRequestsForMyItems();
    }
  }, [myProfileId]);

  const loadMyProfile = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!error && data) {
      setMyProfileId(data.id);
    }
  };

  const loadMyInterests = async () => {
    if (!myProfileId) return;

    const { data, error } = await supabase
      .from('neighbor_transactions')
      .select(`
        *,
        neighbor_items (
          title,
          offer_type,
          photo_url,
          owner_id
        )
      `)
      .eq('requester_id', myProfileId)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setMyInterests(data);
    }
  };

  const loadRequestsForMyItems = async () => {
    if (!myProfileId) return;

    const { data: myItemIds, error: itemsError } = await supabase
      .from('neighbor_items')
      .select('id')
      .eq('owner_id', myProfileId);

    if (itemsError || !myItemIds || myItemIds.length === 0) return;

    const itemIdList = myItemIds.map(item => item.id);

    const { data, error } = await supabase
      .from('neighbor_transactions')
      .select(`
        *,
        neighbor_items (
          title,
          offer_type,
          photo_url,
          owner_id
        ),
        requester_profiles:profiles!neighbor_transactions_requester_id_fkey (
          first_name,
          last_name
        )
      `)
      .in('item_id', itemIdList)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setRequestsForMyItems(data);
    }
  };

  const loadMyItems = async () => {
    if (!user) return;

    try {
      setLoading(true);

      // First get the profile ID for the current user
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (profileError) {
        console.error('Error loading profile:', profileError);
        toast({
          title: "Fehler",
          description: "Profil konnte nicht geladen werden.",
          variant: "destructive",
        });
        return;
      }

      if (!profileData) {
        console.log('No profile found for user');
        setMyItems([]);
        return;
      }

      // Then load all items for this profile
      const { data: itemsData, error: itemsError } = await supabase
        .from('neighbor_items')
        .select(`
          *,
          neighbor_categories (
            name
          ),
          neighbor_subcategories (
            name
          )
        `)
        .eq('owner_id', profileData.id)
        .order('created_at', { ascending: false });

      if (itemsError) {
        console.error('Error loading items:', itemsError);
        toast({
          title: "Fehler",
          description: "Angebote konnten nicht geladen werden.",
          variant: "destructive",
        });
        return;
      }

      setMyItems(itemsData || []);
    } catch (error) {
      console.error('Error in loadMyItems:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('de-DE', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getOfferTypeLabel = (offerType: string) => {
    switch (offerType) {
      case 'verleihen':
        return 'Verleihen';
      case 'verschenken':
        return 'Verschenken';
      case 'helfen':
        return 'Helfen';
      case 'tauschen':
        return 'Tauschen';
      default:
        return offerType;
    }
  };

  const getOfferTypeColor = (offerType: string) => {
    switch (offerType) {
      case 'verleihen':
        return 'bg-blue-500/10 text-blue-700 dark:text-blue-400';
      case 'verschenken':
        return 'bg-green-500/10 text-green-700 dark:text-green-400';
      case 'helfen':
        return 'bg-purple-500/10 text-purple-700 dark:text-purple-400';
      case 'tauschen':
        return 'bg-orange-500/10 text-orange-700 dark:text-orange-400';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const getStatusBadge = (item: NeighborItem) => {
    if (item.deactivated) {
      return <Badge variant="secondary">Deaktiviert</Badge>;
    }
    if (!item.is_approved) {
      return <Badge variant="outline">Wartend</Badge>;
    }
    return <Badge className="bg-green-500/10 text-green-700 dark:text-green-400">Aktiv</Badge>;
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <Button variant="ghost" onClick={() => navigate("/")}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Zurück
            </Button>
            <h1 className="text-2xl font-bold text-primary-dark">Mein Bereich</h1>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <Tabs defaultValue="messages" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="messages">
              <MessageSquare className="w-4 h-4 mr-2" />
              Meine Nachrichten
            </TabsTrigger>
            <TabsTrigger value="offers">
              <Package className="w-4 h-4 mr-2" />
              Meine Angebote
            </TabsTrigger>
          </TabsList>

          <TabsContent value="messages" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Meine Nachrichten</CardTitle>
                <CardDescription>
                  Interessenbekundungen und Anfragen
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {/* Meine Interessen */}
                  <div>
                    <h3 className="text-lg font-semibold mb-3">Meine Interessen</h3>
                    {myInterests.length === 0 ? (
                      <div className="text-center py-8">
                        <MessageSquare className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
                        <p className="text-sm text-muted-foreground">
                          Du hast noch kein Interesse an Angeboten bekundet.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {myInterests.map((transaction) => (
                          <Card key={transaction.id} className="p-4">
                            <div className="flex items-start gap-3">
                              {transaction.neighbor_items?.photo_url && (
                                <div className="w-16 h-16 flex-shrink-0 bg-muted rounded overflow-hidden">
                                  <img 
                                    src={transaction.neighbor_items.photo_url} 
                                    alt={transaction.neighbor_items.title}
                                    className="w-full h-full object-cover"
                                  />
                                </div>
                              )}
                              <div className="flex-1 min-w-0">
                                <h4 className="font-semibold text-sm line-clamp-1">
                                  {transaction.neighbor_items?.title}
                                </h4>
                                <div className="flex items-center gap-2 mt-1">
                                  <Badge variant="secondary" className="text-xs">
                                    {transaction.status}
                                  </Badge>
                                  <span className="text-xs text-muted-foreground">
                                    {formatDate(transaction.created_at)}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </Card>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Anfragen für meine Angebote */}
                  <div>
                    <h3 className="text-lg font-semibold mb-3">Anfragen für meine Angebote</h3>
                    {requestsForMyItems.length === 0 ? (
                      <div className="text-center py-8">
                        <MessageSquare className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
                        <p className="text-sm text-muted-foreground">
                          Noch keine Anfragen für deine Angebote.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {requestsForMyItems.map((transaction) => (
                          <Card key={transaction.id} className="p-4">
                            <div className="flex items-start gap-3">
                              {transaction.neighbor_items?.photo_url && (
                                <div className="w-16 h-16 flex-shrink-0 bg-muted rounded overflow-hidden">
                                  <img 
                                    src={transaction.neighbor_items.photo_url} 
                                    alt={transaction.neighbor_items.title}
                                    className="w-full h-full object-cover"
                                  />
                                </div>
                              )}
                              <div className="flex-1 min-w-0">
                                <h4 className="font-semibold text-sm line-clamp-1">
                                  {transaction.neighbor_items?.title}
                                </h4>
                                <p className="text-sm text-muted-foreground mt-1">
                                  Interesse von: {transaction.requester_profiles?.first_name} {transaction.requester_profiles?.last_name}
                                </p>
                                <div className="flex items-center gap-2 mt-1">
                                  <Badge variant="secondary" className="text-xs">
                                    {transaction.status}
                                  </Badge>
                                  <span className="text-xs text-muted-foreground">
                                    {formatDate(transaction.created_at)}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </Card>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="offers" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Meine Angebote</CardTitle>
                <CardDescription>
                  Alle deine Angebote aus dem Nachbarnetz
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="text-center py-12">
                    <p className="text-muted-foreground">Lade Angebote...</p>
                  </div>
                ) : myItems.length === 0 ? (
                  <div className="text-center py-12">
                    <Package className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-muted-foreground mb-4">
                      Du hast noch keine Angebote erstellt.
                    </p>
                    <Button onClick={() => navigate("/")}>
                      Zum Nachbarnetz
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {myItems.map((item) => (
                      <Card key={item.id} className="overflow-hidden">
                        <div className="flex flex-col md:flex-row">
                          {item.photo_url && (
                            <div className="md:w-48 h-48 md:h-auto bg-muted flex-shrink-0">
                              <img 
                                src={item.photo_url} 
                                alt={item.title}
                                className="w-full h-full object-cover"
                              />
                            </div>
                          )}
                          <div className="flex-1 p-6">
                            <div className="flex items-start justify-between mb-2">
                              <div>
                                <h3 className="text-lg font-semibold mb-1">{item.title}</h3>
                                <div className="flex items-center gap-2 flex-wrap">
                                  <Badge className={getOfferTypeColor(item.offer_type)}>
                                    {getOfferTypeLabel(item.offer_type)}
                                  </Badge>
                                  {getStatusBadge(item)}
                                  {item.is_free && (
                                    <Badge variant="secondary">Kostenlos</Badge>
                                  )}
                                </div>
                              </div>
                            </div>
                            
                            {item.description && (
                              <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                                {item.description}
                              </p>
                            )}

                            <div className="space-y-2 text-sm">
                              <div className="flex items-center gap-2 text-muted-foreground">
                                <MapPin className="w-4 h-4" />
                                <span>
                                  {item.neighbor_categories?.name} › {item.neighbor_subcategories?.name}
                                </span>
                              </div>
                              
                              {(item.available_from || item.available_until) && (
                                <div className="flex items-center gap-2 text-muted-foreground">
                                  <Calendar className="w-4 h-4" />
                                  <span>
                                    {item.available_from && `Von ${formatDate(item.available_from)}`}
                                    {item.available_from && item.available_until && ' - '}
                                    {item.available_until && `Bis ${formatDate(item.available_until)}`}
                                  </span>
                                </div>
                              )}

                              {item.deposit_required && (
                                <div className="text-muted-foreground">
                                  Kaution: {item.deposit_required} €
                                </div>
                              )}

                              <div className="text-xs text-muted-foreground pt-2">
                                Erstellt am {formatDate(item.created_at)}
                              </div>
                            </div>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default MyArea;
