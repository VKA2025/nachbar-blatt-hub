import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { ArrowLeft, Calendar, MapPin, Heart, HeartOff, Package } from "lucide-react";

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
  is_approved: boolean;
  owner_id: string;
  neighbor_categories?: {
    name: string;
  };
  neighbor_subcategories?: {
    name: string;
  };
  profiles?: {
    first_name: string | null;
    last_name: string | null;
  };
}

interface Transaction {
  id: string;
  item_id: string;
  status: string;
}

const NeighborOffers = () => {
  const [searchParams] = useSearchParams();
  const offerType = searchParams.get("type") || "Dienstleistung";
  const [user, setUser] = useState<User | null>(null);
  const [items, setItems] = useState<NeighborItem[]>([]);
  const [myProfileId, setMyProfileId] = useState<string | null>(null);
  const [myTransactions, setMyTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<NeighborItem | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user ?? null);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (user) {
      loadMyProfile();
    }
  }, [user]);

  useEffect(() => {
    loadItems();
  }, [offerType]);

  useEffect(() => {
    if (myProfileId) {
      loadMyTransactions();
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

  const loadMyTransactions = async () => {
    if (!myProfileId) return;

    const { data, error } = await supabase
      .from('neighbor_transactions')
      .select('id, item_id, status')
      .eq('requester_id', myProfileId);

    if (!error && data) {
      setMyTransactions(data);
    }
  };

  const loadItems = async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('neighbor_items')
        .select(`
          *,
          neighbor_categories (
            name
          ),
          neighbor_subcategories (
            name
          ),
          profiles (
            first_name,
            last_name
          )
        `)
        .eq('offer_type', offerType)
        .eq('is_approved', true)
        .eq('deactivated', false)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading items:', error);
        toast({
          title: "Fehler",
          description: "Angebote konnten nicht geladen werden.",
          variant: "destructive",
        });
        return;
      }

      setItems(data || []);
    } catch (error) {
      console.error('Error in loadItems:', error);
    } finally {
      setLoading(false);
    }
  };

  const hasInterest = (itemId: string) => {
    return myTransactions.some(t => t.item_id === itemId);
  };

  const handleInterest = async (item: NeighborItem) => {
    if (!user || !myProfileId) {
      toast({
        title: "Anmeldung erforderlich",
        description: "Bitte melde dich an, um Interesse zu bekunden.",
        variant: "destructive",
      });
      navigate("/auth");
      return;
    }

    if (item.owner_id === myProfileId) {
      toast({
        title: "Eigenes Angebot",
        description: "Du kannst kein Interesse an deinem eigenen Angebot bekunden.",
        variant: "destructive",
      });
      return;
    }

    setActionLoading(true);

    try {
      const existingTransaction = myTransactions.find(t => t.item_id === item.id);

      if (existingTransaction) {
        // Interesse zurückziehen
        const { error: deleteError } = await supabase
          .from('neighbor_transactions')
          .delete()
          .eq('id', existingTransaction.id);

        if (deleteError) throw deleteError;

        toast({
          title: "Interesse zurückgezogen",
          description: "Dein Interesse wurde erfolgreich zurückgezogen.",
        });

        await loadMyTransactions();
      } else {
        // Interesse bekunden
        const { error: insertError } = await supabase
          .from('neighbor_transactions')
          .insert({
            item_id: item.id,
            requester_id: myProfileId,
            status: 'offen',
            notes: 'Interesse bekundet'
          });

        if (insertError) throw insertError;

        // Email senden
        const { error: emailError } = await supabase.functions.invoke('send-interest-notification', {
          body: {
            itemId: item.id,
            itemTitle: item.title,
            ownerId: item.owner_id,
            requesterId: myProfileId
          }
        });

        if (emailError) {
          console.error('Error sending email:', emailError);
        }

        toast({
          title: "Interesse bekundet",
          description: "Der Eigentümer wurde per E-Mail benachrichtigt.",
        });

        await loadMyTransactions();
      }
    } catch (error) {
      console.error('Error handling interest:', error);
      toast({
        title: "Fehler",
        description: "Aktion konnte nicht ausgeführt werden.",
        variant: "destructive",
      });
    } finally {
      setActionLoading(false);
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

  const getOfferTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      "Dienstleistung": "Dienstleistung",
      "Verleih": "Verleih",
      "Tausch/Verschenken": "Tausch/Verschenken"
    };
    return labels[type] || type;
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
            <h1 className="text-2xl font-bold text-primary-dark">
              {getOfferTypeLabel(offerType)} - Angebote
            </h1>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {loading ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Lade Angebote...</p>
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-12">
            <Package className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground mb-4">
              Aktuell gibt es keine Angebote in dieser Kategorie.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {items.map((item) => (
              <Card key={item.id} className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer">
                <div onClick={() => { setSelectedItem(item); setShowDetail(true); }}>
                  {item.photo_url && (
                    <div className="h-48 bg-muted">
                      <img 
                        src={item.photo_url} 
                        alt={item.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  <CardHeader>
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-lg font-semibold line-clamp-2">{item.title}</h3>
                      {hasInterest(item.id) && (
                        <Heart className="w-5 h-5 text-red-500 fill-red-500 flex-shrink-0" />
                      )}
                    </div>
                    {item.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {item.description}
                      </p>
                    )}
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <MapPin className="w-4 h-4" />
                        <span className="line-clamp-1">
                          {item.neighbor_categories?.name} › {item.neighbor_subcategories?.name}
                        </span>
                      </div>
                      {item.is_free && (
                        <Badge variant="secondary">Kostenlos</Badge>
                      )}
                    </div>
                  </CardContent>
                </div>
              </Card>
            ))}
          </div>
        )}
      </main>

      {/* Detail Dialog */}
      <Dialog open={showDetail} onOpenChange={setShowDetail}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {selectedItem && (
            <>
              <DialogHeader>
                <DialogTitle className="text-2xl">{selectedItem.title}</DialogTitle>
                <DialogDescription>
                  {getOfferTypeLabel(selectedItem.offer_type)}
                </DialogDescription>
              </DialogHeader>
              
              {selectedItem.photo_url && (
                <div className="w-full h-64 bg-muted rounded-lg overflow-hidden">
                  <img 
                    src={selectedItem.photo_url} 
                    alt={selectedItem.title}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}

              <div className="space-y-4">
                {selectedItem.description && (
                  <div>
                    <h4 className="font-semibold mb-2">Beschreibung</h4>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                      {selectedItem.description}
                    </p>
                  </div>
                )}

                <div>
                  <h4 className="font-semibold mb-2">Details</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <MapPin className="w-4 h-4" />
                      <span>
                        {selectedItem.neighbor_categories?.name} › {selectedItem.neighbor_subcategories?.name}
                      </span>
                    </div>

                    {(selectedItem.available_from || selectedItem.available_until) && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Calendar className="w-4 h-4" />
                        <span>
                          {selectedItem.available_from && `Von ${formatDate(selectedItem.available_from)}`}
                          {selectedItem.available_from && selectedItem.available_until && ' - '}
                          {selectedItem.available_until && `Bis ${formatDate(selectedItem.available_until)}`}
                        </span>
                      </div>
                    )}

                    {selectedItem.is_free !== null && (
                      <div className="text-muted-foreground">
                        {selectedItem.is_free ? '✓ Kostenlos' : '€ Kostenpflichtig'}
                      </div>
                    )}

                    {selectedItem.deposit_required && (
                      <div className="text-muted-foreground">
                        Kaution: {selectedItem.deposit_required} €
                      </div>
                    )}

                    {selectedItem.profiles && (
                      <div className="text-muted-foreground pt-2 border-t">
                        Anbieter: {selectedItem.profiles.first_name} {selectedItem.profiles.last_name}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <DialogFooter className="flex gap-2">
                <Button variant="outline" onClick={() => setShowDetail(false)}>
                  Schließen
                </Button>
                {user && myProfileId !== selectedItem.owner_id && (
                  <Button
                    onClick={() => handleInterest(selectedItem)}
                    disabled={actionLoading}
                    variant={hasInterest(selectedItem.id) ? "destructive" : "default"}
                  >
                    {hasInterest(selectedItem.id) ? (
                      <>
                        <HeartOff className="w-4 h-4 mr-2" />
                        Interesse zurückziehen
                      </>
                    ) : (
                      <>
                        <Heart className="w-4 h-4 mr-2" />
                        Interesse bekunden
                      </>
                    )}
                  </Button>
                )}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default NeighborOffers;
