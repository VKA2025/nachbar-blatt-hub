import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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

interface Subcategory {
  id: string;
  category_id: string;
  name: string;
  description: string | null;
  is_for_giving: boolean;
  is_for_lending: boolean;
  is_for_exchange: boolean;
  is_for_help: boolean;
  category?: { name: string };
}

export function SubcategoryManagement() {
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingSubcategory, setEditingSubcategory] = useState<Subcategory | null>(null);
  const [deletingSubcategory, setDeletingSubcategory] = useState<Subcategory | null>(null);
  
  // Form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState("");
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
      // Load categories
      const { data: categoriesData, error: categoriesError } = await supabase
        .from('neighbor_categories')
        .select('*')
        .order('name');
      
      if (categoriesError) throw categoriesError;
      setCategories(categoriesData || []);

      // Load subcategories with category names
      const { data: subcategoriesData, error: subcategoriesError } = await supabase
        .from('neighbor_subcategories')
        .select(`
          *,
          category:neighbor_categories(name)
        `);
      
      if (subcategoriesError) throw subcategoriesError;
      
      // Sort by category name first, then by subcategory name
      const sortedData = (subcategoriesData || []).sort((a, b) => {
        const categoryA = a.category?.name || '';
        const categoryB = b.category?.name || '';
        
        if (categoryA !== categoryB) {
          return categoryA.localeCompare(categoryB, 'de');
        }
        
        return a.name.localeCompare(b.name, 'de');
      });
      
      setSubcategories(sortedData);
    } catch (error) {
      console.error('Error loading data:', error);
      toast({
        title: "Fehler",
        description: "Daten konnten nicht geladen werden.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setName("");
    setDescription("");
    setCategoryId("");
    setIsForGiving(false);
    setIsForLending(false);
    setIsForExchange(false);
    setIsForHelp(false);
    setEditingSubcategory(null);
  };

  const handleOpenDialog = (subcategory?: Subcategory) => {
    if (subcategory) {
      setEditingSubcategory(subcategory);
      setName(subcategory.name);
      setDescription(subcategory.description || "");
      setCategoryId(subcategory.category_id);
      setIsForGiving(subcategory.is_for_giving);
      setIsForLending(subcategory.is_for_lending);
      setIsForExchange(subcategory.is_for_exchange);
      setIsForHelp(subcategory.is_for_help);
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
    if (!name.trim() || !categoryId) {
      toast({
        title: "Fehler",
        description: "Bitte füllen Sie alle Pflichtfelder aus.",
        variant: "destructive",
      });
      return;
    }

    try {
      const subcategoryData = {
        name: name.trim(),
        description: description.trim() || null,
        category_id: categoryId,
        is_for_giving: isForGiving,
        is_for_lending: isForLending,
        is_for_exchange: isForExchange,
        is_for_help: isForHelp,
      };

      if (editingSubcategory) {
        // Update existing subcategory
        const { error } = await supabase
          .from('neighbor_subcategories')
          .update(subcategoryData)
          .eq('id', editingSubcategory.id);

        if (error) throw error;

        toast({
          title: "Erfolg",
          description: "Unterkategorie wurde aktualisiert.",
        });
      } else {
        // Create new subcategory
        const { error } = await supabase
          .from('neighbor_subcategories')
          .insert([subcategoryData]);

        if (error) throw error;

        toast({
          title: "Erfolg",
          description: "Unterkategorie wurde erstellt.",
        });
      }

      handleCloseDialog();
      loadData();
    } catch (error) {
      console.error('Error saving subcategory:', error);
      toast({
        title: "Fehler",
        description: "Unterkategorie konnte nicht gespeichert werden.",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async () => {
    if (!deletingSubcategory) return;

    try {
      const { error } = await supabase
        .from('neighbor_subcategories')
        .delete()
        .eq('id', deletingSubcategory.id);

      if (error) throw error;

      toast({
        title: "Erfolg",
        description: "Unterkategorie wurde gelöscht.",
      });

      setDeleteDialogOpen(false);
      setDeletingSubcategory(null);
      loadData();
    } catch (error) {
      console.error('Error deleting subcategory:', error);
      toast({
        title: "Fehler",
        description: "Unterkategorie konnte nicht gelöscht werden.",
        variant: "destructive",
      });
    }
  };

  const openDeleteDialog = (subcategory: Subcategory) => {
    setDeletingSubcategory(subcategory);
    setDeleteDialogOpen(true);
  };

  if (loading) {
    return <div className="p-4">Laden...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>Unterkategorien-Verwaltung</CardTitle>
          <Button onClick={() => handleOpenDialog()}>
            <Plus className="mr-2 h-4 w-4" />
            Neue Unterkategorie
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Kategorie</TableHead>
              <TableHead>Beschreibung</TableHead>
              <TableHead>Verschenken</TableHead>
              <TableHead>Verleihen</TableHead>
              <TableHead>Tauschen</TableHead>
              <TableHead>Hilfe</TableHead>
              <TableHead className="text-right">Aktionen</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {subcategories.map((subcategory) => (
              <TableRow key={subcategory.id}>
                <TableCell className="font-medium">{subcategory.name}</TableCell>
                <TableCell>{subcategory.category?.name || '-'}</TableCell>
                <TableCell className="max-w-xs truncate">
                  {subcategory.description || '-'}
                </TableCell>
                <TableCell>{subcategory.is_for_giving ? '✓' : '-'}</TableCell>
                <TableCell>{subcategory.is_for_lending ? '✓' : '-'}</TableCell>
                <TableCell>{subcategory.is_for_exchange ? '✓' : '-'}</TableCell>
                <TableCell>{subcategory.is_for_help ? '✓' : '-'}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenDialog(subcategory)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => openDeleteDialog(subcategory)}
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
                {editingSubcategory ? 'Unterkategorie bearbeiten' : 'Neue Unterkategorie'}
              </DialogTitle>
              <DialogDescription>
                Füllen Sie die Felder aus, um eine Unterkategorie zu {editingSubcategory ? 'bearbeiten' : 'erstellen'}.
              </DialogDescription>
            </DialogHeader>
            
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="z.B. Werkzeuge"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="category">Kategorie *</Label>
                <Select value={categoryId} onValueChange={setCategoryId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Kategorie auswählen" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
                {editingSubcategory ? 'Aktualisieren' : 'Erstellen'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Unterkategorie löschen</DialogTitle>
              <DialogDescription>
                Möchten Sie die Unterkategorie "{deletingSubcategory?.name}" wirklich löschen? 
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
