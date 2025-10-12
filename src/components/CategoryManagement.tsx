import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Edit, Trash2, Plus } from "lucide-react";

interface Category {
  id: string;
  name: string;
  description: string | null;
  is_for_giving: boolean;
  is_for_lending: boolean;
  is_for_exchange: boolean;
  is_for_help: boolean;
}

export function CategoryManagement() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [deletingCategory, setDeletingCategory] = useState<Category | null>(null);
  
  // Form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isForGiving, setIsForGiving] = useState(false);
  const [isForLending, setIsForLending] = useState(false);
  const [isForExchange, setIsForExchange] = useState(false);
  const [isForHelp, setIsForHelp] = useState(false);
  
  const { toast } = useToast();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('neighbor_categories')
        .select('*')
        .order('name');
      
      if (error) throw error;
      setCategories(data || []);
    } catch (error) {
      console.error('Error loading categories:', error);
      toast({
        title: "Fehler",
        description: "Kategorien konnten nicht geladen werden.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setName("");
    setDescription("");
    setIsForGiving(false);
    setIsForLending(false);
    setIsForExchange(false);
    setIsForHelp(false);
    setEditingCategory(null);
  };

  const handleOpenDialog = (category?: Category) => {
    if (category) {
      setEditingCategory(category);
      setName(category.name);
      setDescription(category.description || "");
      setIsForGiving(category.is_for_giving);
      setIsForLending(category.is_for_lending);
      setIsForExchange(category.is_for_exchange);
      setIsForHelp(category.is_for_help);
    } else {
      resetForm();
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    resetForm();
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      toast({
        title: "Fehler",
        description: "Bitte geben Sie einen Namen ein.",
        variant: "destructive",
      });
      return;
    }

    try {
      const categoryData = {
        name: name.trim(),
        description: description.trim() || null,
        is_for_giving: isForGiving,
        is_for_lending: isForLending,
        is_for_exchange: isForExchange,
        is_for_help: isForHelp,
      };

      if (editingCategory) {
        // Update existing category
        const { error } = await supabase
          .from('neighbor_categories')
          .update(categoryData)
          .eq('id', editingCategory.id);

        if (error) throw error;

        toast({
          title: "Erfolg",
          description: "Kategorie wurde aktualisiert.",
        });
      } else {
        // Create new category
        const { error } = await supabase
          .from('neighbor_categories')
          .insert([categoryData]);

        if (error) throw error;

        toast({
          title: "Erfolg",
          description: "Kategorie wurde erstellt.",
        });
      }

      handleCloseDialog();
      loadData();
    } catch (error) {
      console.error('Error saving category:', error);
      toast({
        title: "Fehler",
        description: "Kategorie konnte nicht gespeichert werden.",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async () => {
    if (!deletingCategory) return;

    try {
      const { error } = await supabase
        .from('neighbor_categories')
        .delete()
        .eq('id', deletingCategory.id);

      if (error) throw error;

      toast({
        title: "Erfolg",
        description: "Kategorie wurde gelöscht.",
      });

      setDeleteDialogOpen(false);
      setDeletingCategory(null);
      loadData();
    } catch (error) {
      console.error('Error deleting category:', error);
      toast({
        title: "Fehler",
        description: "Kategorie konnte nicht gelöscht werden.",
        variant: "destructive",
      });
    }
  };

  const openDeleteDialog = (category: Category) => {
    setDeletingCategory(category);
    setDeleteDialogOpen(true);
  };

  if (loading) {
    return <div className="p-4">Laden...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>Kategorien-Verwaltung</CardTitle>
          <Button onClick={() => handleOpenDialog()}>
            <Plus className="mr-2 h-4 w-4" />
            Neue Kategorie
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Beschreibung</TableHead>
              <TableHead>Verschenken</TableHead>
              <TableHead>Verleihen</TableHead>
              <TableHead>Tauschen</TableHead>
              <TableHead>Hilfe</TableHead>
              <TableHead className="text-right">Aktionen</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {categories.map((category) => (
              <TableRow key={category.id}>
                <TableCell className="font-medium">{category.name}</TableCell>
                <TableCell className="max-w-xs truncate">
                  {category.description || '-'}
                </TableCell>
                <TableCell>{category.is_for_giving ? '✓' : '-'}</TableCell>
                <TableCell>{category.is_for_lending ? '✓' : '-'}</TableCell>
                <TableCell>{category.is_for_exchange ? '✓' : '-'}</TableCell>
                <TableCell>{category.is_for_help ? '✓' : '-'}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenDialog(category)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => openDeleteDialog(category)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {/* Edit/Create Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingCategory ? 'Kategorie bearbeiten' : 'Neue Kategorie'}
              </DialogTitle>
              <DialogDescription>
                Füllen Sie die Felder aus, um eine Kategorie zu {editingCategory ? 'bearbeiten' : 'erstellen'}.
              </DialogDescription>
            </DialogHeader>
            
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="z.B. Haushalt"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="description">Beschreibung</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Optionale Beschreibung"
                  rows={3}
                />
              </div>

              <div className="grid gap-3">
                <Label>Verfügbar für:</Label>
                <div className="flex flex-col gap-3">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="giving"
                      checked={isForGiving}
                      onCheckedChange={(checked) => setIsForGiving(checked as boolean)}
                    />
                    <label htmlFor="giving" className="text-sm font-medium cursor-pointer">
                      Verschenken
                    </label>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="lending"
                      checked={isForLending}
                      onCheckedChange={(checked) => setIsForLending(checked as boolean)}
                    />
                    <label htmlFor="lending" className="text-sm font-medium cursor-pointer">
                      Verleihen
                    </label>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="exchange"
                      checked={isForExchange}
                      onCheckedChange={(checked) => setIsForExchange(checked as boolean)}
                    />
                    <label htmlFor="exchange" className="text-sm font-medium cursor-pointer">
                      Tauschen
                    </label>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="help"
                      checked={isForHelp}
                      onCheckedChange={(checked) => setIsForHelp(checked as boolean)}
                    />
                    <label htmlFor="help" className="text-sm font-medium cursor-pointer">
                      Dienstleistung/Hilfe
                    </label>
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={handleCloseDialog}>
                Abbrechen
              </Button>
              <Button onClick={handleSubmit}>
                {editingCategory ? 'Aktualisieren' : 'Erstellen'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Kategorie löschen</DialogTitle>
              <DialogDescription>
                Möchten Sie die Kategorie "{deletingCategory?.name}" wirklich löschen? 
                Diese Aktion kann nicht rückgängig gemacht werden.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
                Abbrechen
              </Button>
              <Button variant="destructive" onClick={handleDelete}>
                Löschen
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
