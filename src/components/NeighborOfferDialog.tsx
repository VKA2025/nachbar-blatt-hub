import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Upload, X } from "lucide-react";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

interface NeighborOfferDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  neighborType: "Dienstleistung" | "Verleih" | "Tausch/Verschenken";
  userProfileId: string;
}

interface Category {
  id: string;
  name: string;
}

interface Subcategory {
  id: string;
  name: string;
  category_id: string;
}

// Helper function to compress image
const compressImage = async (file: File): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        // Calculate new dimensions (max 800px)
        let width = img.width;
        let height = img.height;
        const maxSize = 800;
        
        if (width > height && width > maxSize) {
          height = (height / width) * maxSize;
          width = maxSize;
        } else if (height > maxSize) {
          width = (width / height) * maxSize;
          height = maxSize;
        }
        
        canvas.width = width;
        canvas.height = height;
        ctx?.drawImage(img, 0, 0, width, height);
        
        // Convert to blob with high compression
        canvas.toBlob(
          (blob) => {
            if (blob) resolve(blob);
            else reject(new Error('Komprimierung fehlgeschlagen'));
          },
          'image/jpeg',
          0.6 // 60% quality for strong compression
        );
      };
      img.onerror = reject;
    };
    reader.onerror = reject;
  });
};

// Common base schema
const baseSchema = z.object({
  title: z.string().min(3, "Titel muss mindestens 3 Zeichen lang sein").max(100),
  description: z.string().min(10, "Beschreibung muss mindestens 10 Zeichen lang sein").max(1000),
  category_id: z.string().min(1, "Bitte wähle eine Kategorie"),
  subcategory_id: z.string().min(1, "Bitte wähle eine Unterkategorie"),
  duration: z.string().optional(),
  available_from: z.date().optional(),
  available_until: z.date().optional(),
  deposit_required: z.string().optional(),
  usage_tips: z.string().max(500).optional(),
  exchange_preference: z.string().max(500).optional(),
  offer_type: z.enum(["Tauschen", "Verschenken"]).optional(),
  photo_url: z.string().optional(),
  tags: z.string().optional(),
});

export const NeighborOfferDialog = ({
  open,
  onOpenChange,
  neighborType,
  userProfileId,
}: NeighborOfferDialogProps) => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [filteredSubcategories, setFilteredSubcategories] = useState<Subcategory[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadedPhotoUrl, setUploadedPhotoUrl] = useState<string>("");
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof baseSchema>>({
    resolver: zodResolver(baseSchema),
    defaultValues: {
      title: "",
      description: "",
      category_id: "",
      subcategory_id: "",
      duration: "",
      deposit_required: "",
      usage_tips: "",
      exchange_preference: "",
      photo_url: "",
      tags: "",
    },
  });

  useEffect(() => {
    loadCategories();
    loadSubcategories();
  }, [neighborType]);

  useEffect(() => {
    const categoryId = form.watch("category_id");
    if (categoryId) {
      const filtered = subcategories.filter((sub) => sub.category_id === categoryId);
      setFilteredSubcategories(filtered);
      // Reset subcategory when category changes
      form.setValue("subcategory_id", "");
    } else {
      setFilteredSubcategories([]);
    }
  }, [form.watch("category_id"), subcategories]);

  const loadCategories = async () => {
    try {
      let query = supabase
        .from("neighbor_categories")
        .select("id, name, is_for_help, is_for_lending, is_for_exchange, is_for_giving")
        .order("name");

      const { data, error } = await query;

      if (error) throw error;

      // Filter categories based on neighborType
      const filtered = (data || []).filter((cat) => {
        if (neighborType === "Dienstleistung") {
          return cat.is_for_help;
        } else if (neighborType === "Verleih") {
          return cat.is_for_lending;
        } else if (neighborType === "Tausch/Verschenken") {
          return cat.is_for_exchange || cat.is_for_giving;
        }
        return false;
      });

      setCategories(filtered);
    } catch (error) {
      console.error("Error loading categories:", error);
    }
  };

  const loadSubcategories = async () => {
    try {
      const { data, error } = await supabase
        .from("neighbor_subcategories")
        .select("id, name, category_id, is_for_help, is_for_lending, is_for_exchange, is_for_giving")
        .order("name");

      if (error) throw error;
      
      // Filter subcategories based on neighborType
      const filtered = (data || []).filter((sub) => {
        if (neighborType === "Dienstleistung") {
          return sub.is_for_help;
        } else if (neighborType === "Verleih") {
          return sub.is_for_lending;
        } else if (neighborType === "Tausch/Verschenken") {
          return sub.is_for_exchange || sub.is_for_giving;
        }
        return false;
      });
      
      setSubcategories(filtered);
    } catch (error) {
      console.error("Error loading subcategories:", error);
    }
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Fehler",
        description: "Bitte wähle eine Bilddatei aus.",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (max 10MB before compression)
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "Fehler",
        description: "Die Datei ist zu groß. Maximal 10MB.",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    try {
      // Compress the image
      const compressedBlob = await compressImage(file);
      
      // Create unique filename
      const fileExt = 'jpg';
      const fileName = `${userProfileId}_${Date.now()}.${fileExt}`;
      const filePath = fileName;

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from('neighbor-photos')
        .upload(filePath, compressedBlob, {
          contentType: 'image/jpeg',
          upsert: false
        });

      if (error) throw error;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('neighbor-photos')
        .getPublicUrl(filePath);

      setUploadedPhotoUrl(publicUrl);
      form.setValue('photo_url', publicUrl);

      toast({
        title: "Erfolg",
        description: "Foto wurde hochgeladen und komprimiert.",
      });
    } catch (error) {
      console.error("Error uploading photo:", error);
      toast({
        title: "Fehler",
        description: "Das Foto konnte nicht hochgeladen werden.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemovePhoto = () => {
    setUploadedPhotoUrl("");
    form.setValue('photo_url', "");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const onSubmit = async (values: any) => {
    setIsSubmitting(true);
    try {
      // Determine offer_type based on neighborType
      let offerType = "";
      let isFree = null;

      if (neighborType === "Dienstleistung") {
        offerType = "Dienstleistung";
      } else if (neighborType === "Verleih") {
        offerType = "Verleih";
      } else if (neighborType === "Tausch/Verschenken") {
        offerType = values.offer_type === "Tauschen" ? "Tausch" : "Verschenken";
        if (values.offer_type === "Verschenken") {
          isFree = true;
        }
      }

      // Prepare data for insertion
      const tagsArray = values.tags 
        ? values.tags.split(",").map(tag => tag.trim()).filter(tag => tag.length > 0)
        : [];

      const insertData: any = {
        owner_id: userProfileId,
        category_id: values.category_id,
        subcategory_id: values.subcategory_id,
        title: values.title,
        description: values.description,
        offer_type: offerType,
        is_free: isFree,
        available_from: values.available_from || null,
        available_until: values.available_until || null,
        duration: values.duration || null,
        deposit_required: values.deposit_required ? parseFloat(values.deposit_required) : null,
        usage_tips: values.usage_tips || null,
        exchange_preference: values.exchange_preference || null,
        availability_status: "verfügbar",
        deactivated: false,
        photo_url: values.photo_url || null,
        tags: tagsArray.length > 0 ? tagsArray : null,
      };

      const { data: newItem, error } = await supabase
        .from("neighbor_items")
        .insert(insertData)
        .select()
        .single();

      if (error) throw error;

      // Notify admins about the new offer
      if (newItem) {
        try {
          await supabase.functions.invoke('notify-admins-new-offer', {
            body: { itemId: newItem.id }
          });
        } catch (notifyError) {
          console.error('Error notifying admins:', notifyError);
          // Don't fail the whole operation if notification fails
        }
      }

      toast({
        title: "Angebot erstellt",
        description: "Dein Angebot wurde erfolgreich erstellt und zur Freigabe an die Admins gesendet.",
      });

      form.reset();
      onOpenChange(false);
    } catch (error) {
      console.error("Error creating offer:", error);
      toast({
        title: "Fehler",
        description: "Das Angebot konnte nicht erstellt werden.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getDialogTitle = () => {
    switch (neighborType) {
      case "Dienstleistung":
        return "Dienstleistung anbieten";
      case "Verleih":
        return "Gegenstand verleihen";
      case "Tausch/Verschenken":
        return "Gegenstand tauschen oder verschenken";
      default:
        return "Angebot erstellen";
    }
  };

  const getDialogDescription = () => {
    switch (neighborType) {
      case "Dienstleistung":
        return "Biete Deine Hilfe und Dienstleistungen für Deine Nachbarn an.";
      case "Verleih":
        return "Verleihe Gegenstände, die Du nicht täglich brauchst.";
      case "Tausch/Verschenken":
        return "Tausche oder verschenke Gegenstände an Deine Nachbarn.";
      default:
        return "";
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{getDialogTitle()}</DialogTitle>
          <DialogDescription>{getDialogDescription()}</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Option for Tausch/Verschenken */}
            {neighborType === "Tausch/Verschenken" && (
              <FormField
                control={form.control}
                name="offer_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Art des Angebots</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Wähle eine Option" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Tauschen">Tauschen</SelectItem>
                        <SelectItem value="Verschenken">Verschenken</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Title */}
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Titel</FormLabel>
                  <FormControl>
                    <Input placeholder="z.B. Bohrmaschine, Rasenmähen, etc." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Description */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Beschreibung</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Beschreibe Dein Angebot im Detail..."
                      className="min-h-[100px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Category */}
            <FormField
              control={form.control}
              name="category_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Kategorie</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Wähle eine Kategorie" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {categories.map((category) => (
                        <SelectItem key={category.id} value={category.id}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Subcategory */}
            <FormField
              control={form.control}
              name="subcategory_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Unterkategorie</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    disabled={!form.watch("category_id")}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Wähle eine Unterkategorie" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {filteredSubcategories.map((subcategory) => (
                        <SelectItem key={subcategory.id} value={subcategory.id}>
                          {subcategory.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Duration - for Dienstleistung and Verleih */}
            {(neighborType === "Dienstleistung" || neighborType === "Verleih") && (
              <FormField
                control={form.control}
                name="duration"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Dauer (optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="z.B. 2 Stunden, 1 Woche" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Deposit - for Verleih */}
            {neighborType === "Verleih" && (
              <FormField
                control={form.control}
                name="deposit_required"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Kaution (optional)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" placeholder="z.B. 50.00" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Usage Tips - for Verleih */}
            {neighborType === "Verleih" && (
              <FormField
                control={form.control}
                name="usage_tips"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nutzungstipps (optional)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Tipps zur Verwendung..."
                        className="min-h-[80px]"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Exchange Preference - for Tausch */}
            {neighborType === "Tausch/Verschenken" && form.watch("offer_type") === "Tauschen" && (
              <FormField
                control={form.control}
                name="exchange_preference"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tauschwunsch (optional)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Was möchtest Du im Tausch erhalten?"
                        className="min-h-[80px]"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Available From - for Dienstleistung and Verleih */}
            {(neighborType === "Dienstleistung" || neighborType === "Verleih") && (
              <FormField
                control={form.control}
                name="available_from"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Verfügbar ab (optional)</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? format(field.value, "PPP", { locale: de }) : "Datum wählen"}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) => date < new Date()}
                          initialFocus
                          className="pointer-events-auto"
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Available Until */}
            <FormField
              control={form.control}
              name="available_until"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Verfügbar bis (optional)</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full pl-3 text-left font-normal",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          {field.value ? format(field.value, "PPP", { locale: de }) : "Datum wählen"}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        disabled={(date) => date < new Date()}
                        initialFocus
                        className="pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Photo Upload */}
            <FormField
              control={form.control}
              name="photo_url"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Foto (optional)</FormLabel>
                  <div className="space-y-2">
                    {!uploadedPhotoUrl ? (
                      <div className="flex items-center gap-2">
                        <Input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*"
                          onChange={handleFileSelect}
                          disabled={isUploading}
                          className="flex-1"
                        />
                        {isUploading && (
                          <span className="text-sm text-muted-foreground">Lädt...</span>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div className="relative inline-block">
                          <img
                            src={uploadedPhotoUrl}
                            alt="Vorschau"
                            className="h-32 w-32 object-cover rounded-lg border"
                          />
                          <Button
                            type="button"
                            variant="destructive"
                            size="icon"
                            className="absolute -top-2 -right-2 h-6 w-6"
                            onClick={handleRemovePhoto}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Tags */}
            <FormField
              control={form.control}
              name="tags"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Schlagwörter (optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="z.B. Werkzeug, Elektro, Bosch (durch Komma getrennt)" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Submit Button */}
            <div className="flex justify-end space-x-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Abbrechen
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Wird erstellt..." : "Angebot erstellen"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
