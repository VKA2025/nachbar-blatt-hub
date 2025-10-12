import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { CheckCircle, XCircle, Eye, Calendar, User } from "lucide-react";
import { format } from "date-fns";
import { de } from "date-fns/locale";

interface NeighborItem {
  id: string;
  title: string;
  description: string;
  offer_type: string;
  created_at: string;
  photo_url: string | null;
  availability_status: string;
  available_from: string | null;
  available_until: string | null;
  duration: string | null;
  deposit_required: number | null;
  is_free: boolean | null;
  usage_tips: string | null;
  exchange_preference: string | null;
  tags: string[] | null;
  owner: {
    first_name: string;
    last_name: string;
    email: string;
  };
  category: {
    name: string;
  };
  subcategory: {
    name: string;
  };
}

export function NeighborItemApproval() {
  const [items, setItems] = useState<NeighborItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<NeighborItem | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [processing, setProcessing] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadPendingItems();
  }, []);

  const loadPendingItems = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('neighbor_items')
        .select(`
          *,
          owner:profiles!neighbor_items_owner_id_fkey (
            first_name,
            last_name,
            email
          ),
          category:neighbor_categories!neighbor_items_category_id_fkey (
            name
          ),
          subcategory:neighbor_subcategories!neighbor_items_subcategory_id_fkey (
            name
          )
        `)
        .eq('is_approved', false)
        .eq('deactivated', false)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setItems(data || []);
    } catch (error) {
      console.error('Error loading pending items:', error);
      toast({
        title: "Fehler",
        description: "Artikel konnten nicht geladen werden.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = (item: NeighborItem) => {
    setSelectedItem(item);
    setDetailDialogOpen(true);
  };

  const handleApprove = async () => {
    if (!selectedItem) return;
    
    setProcessing(true);
    try {
      const { error } = await supabase
        .from('neighbor_items')
        .update({ is_approved: true })
        .eq('id', selectedItem.id);

      if (error) throw error;

      toast({
        title: "Freigegeben",
        description: "Der Artikel wurde erfolgreich freigegeben.",
      });

      setDetailDialogOpen(false);
      setSelectedItem(null);
      loadPendingItems();
    } catch (error) {
      console.error('Error approving item:', error);
      toast({
        title: "Fehler",
        description: "Artikel konnte nicht freigegeben werden.",
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!selectedItem) return;
    
    setProcessing(true);
    try {
      // Delete the photo from storage if it exists
      if (selectedItem.photo_url) {
        const photoPath = selectedItem.photo_url.split('/').pop();
        if (photoPath) {
          await supabase.storage.from('neighbor-photos').remove([photoPath]);
        }
      }

      // Delete the item
      const { error } = await supabase
        .from('neighbor_items')
        .delete()
        .eq('id', selectedItem.id);

      if (error) throw error;

      toast({
        title: "Abgelehnt",
        description: "Der Artikel wurde abgelehnt und gelöscht.",
      });

      setDetailDialogOpen(false);
      setSelectedItem(null);
      loadPendingItems();
    } catch (error) {
      console.error('Error rejecting item:', error);
      toast({
        title: "Fehler",
        description: "Artikel konnte nicht gelöscht werden.",
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return <div className="p-4">Laden...</div>;
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Artikel zur Freigabe</CardTitle>
          <p className="text-sm text-muted-foreground">
            {items.length} {items.length === 1 ? 'Artikel wartet' : 'Artikel warten'} auf Freigabe
          </p>
        </CardHeader>
        <CardContent>
          {items.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Keine Artikel zur Freigabe vorhanden
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Titel</TableHead>
                  <TableHead>Typ</TableHead>
                  <TableHead>Kategorie</TableHead>
                  <TableHead>Ersteller</TableHead>
                  <TableHead>Erstellt am</TableHead>
                  <TableHead className="text-right">Aktionen</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.title}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{item.offer_type}</Badge>
                    </TableCell>
                    <TableCell>
                      {item.category?.name} - {item.subcategory?.name}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span>
                          {item.owner?.first_name} {item.owner?.last_name}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        {format(new Date(item.created_at), 'dd.MM.yyyy HH:mm', { locale: de })}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewDetails(item)}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        Details
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent className="max-w-3xl h-[85vh] p-0 gap-0 flex flex-col">
          <div className="px-6 pt-6 flex-shrink-0">
            <DialogHeader>
              <DialogTitle>Artikel-Details</DialogTitle>
              <DialogDescription>
                Prüfen Sie die Details und geben Sie den Artikel frei oder lehnen Sie ihn ab.
              </DialogDescription>
            </DialogHeader>
          </div>

          {selectedItem && (
            <ScrollArea className="flex-1 px-6">
              <div className="space-y-6 py-4">
                {/* Photo */}
                {selectedItem.photo_url && (
                  <div className="rounded-lg overflow-hidden border">
                    <img
                      src={selectedItem.photo_url}
                      alt={selectedItem.title}
                      className="w-full h-64 object-cover"
                    />
                  </div>
                )}

                {/* Basic Info */}
                <div className="grid gap-4">
                  <div>
                    <h3 className="font-semibold text-lg mb-1">{selectedItem.title}</h3>
                    <Badge variant="outline">{selectedItem.offer_type}</Badge>
                  </div>

                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">Beschreibung</p>
                    <p className="text-sm">{selectedItem.description}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground mb-1">Kategorie</p>
                      <p className="text-sm">{selectedItem.category?.name}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground mb-1">Unterkategorie</p>
                      <p className="text-sm">{selectedItem.subcategory?.name}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground mb-1">Ersteller</p>
                      <p className="text-sm">
                        {selectedItem.owner?.first_name} {selectedItem.owner?.last_name}
                      </p>
                      <p className="text-xs text-muted-foreground">{selectedItem.owner?.email}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground mb-1">Erstellt am</p>
                      <p className="text-sm">
                        {format(new Date(selectedItem.created_at), 'dd.MM.yyyy HH:mm', { locale: de })}
                      </p>
                    </div>
                  </div>

                  {/* Availability */}
                  {(selectedItem.available_from || selectedItem.available_until) && (
                    <div className="grid grid-cols-2 gap-4">
                      {selectedItem.available_from && (
                        <div>
                          <p className="text-sm font-medium text-muted-foreground mb-1">Verfügbar ab</p>
                          <p className="text-sm">
                            {format(new Date(selectedItem.available_from), 'dd.MM.yyyy', { locale: de })}
                          </p>
                        </div>
                      )}
                      {selectedItem.available_until && (
                        <div>
                          <p className="text-sm font-medium text-muted-foreground mb-1">Verfügbar bis</p>
                          <p className="text-sm">
                            {format(new Date(selectedItem.available_until), 'dd.MM.yyyy', { locale: de })}
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Duration and Deposit */}
                  {(selectedItem.duration || selectedItem.deposit_required) && (
                    <div className="grid grid-cols-2 gap-4">
                      {selectedItem.duration && (
                        <div>
                          <p className="text-sm font-medium text-muted-foreground mb-1">Dauer</p>
                          <p className="text-sm">{selectedItem.duration}</p>
                        </div>
                      )}
                      {selectedItem.deposit_required && (
                        <div>
                          <p className="text-sm font-medium text-muted-foreground mb-1">Kaution</p>
                          <p className="text-sm">{selectedItem.deposit_required} €</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Usage Tips */}
                  {selectedItem.usage_tips && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground mb-1">Nutzungstipps</p>
                      <p className="text-sm">{selectedItem.usage_tips}</p>
                    </div>
                  )}

                  {/* Exchange Preference */}
                  {selectedItem.exchange_preference && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground mb-1">Tauschwunsch</p>
                      <p className="text-sm">{selectedItem.exchange_preference}</p>
                    </div>
                  )}

                  {/* Tags */}
                  {selectedItem.tags && selectedItem.tags.length > 0 && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground mb-2">Tags</p>
                      <div className="flex flex-wrap gap-2">
                        {selectedItem.tags.map((tag, index) => (
                          <Badge key={index} variant="secondary">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Status */}
                  <div className="pb-4">
                    <p className="text-sm font-medium text-muted-foreground mb-1">Status</p>
                    <Badge>{selectedItem.availability_status}</Badge>
                    {selectedItem.is_free && (
                      <Badge variant="secondary" className="ml-2">Kostenlos</Badge>
                    )}
                  </div>
                </div>
              </div>
            </ScrollArea>
          )}

          <div className="px-6 py-4 border-t flex-shrink-0">
            <DialogFooter className="gap-2">
              <Button
                variant="outline"
                onClick={() => setDetailDialogOpen(false)}
                disabled={processing}
              >
                Abbrechen
              </Button>
              <Button
                variant="destructive"
                onClick={handleReject}
                disabled={processing}
              >
                <XCircle className="h-4 w-4 mr-2" />
                Ablehnen
              </Button>
              <Button
                onClick={handleApprove}
                disabled={processing}
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Freigeben
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
