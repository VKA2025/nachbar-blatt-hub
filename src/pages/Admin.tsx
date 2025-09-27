import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { User, Session } from "@supabase/supabase-js";
import { Upload, LogOut, Home, FileText, Link, Edit } from "lucide-react";
import { z } from "zod";

const flyerSchema = z.object({
  title: z.string().trim().min(1, "Titel ist erforderlich").max(100),
  description: z.string().trim().max(500).optional(),
  info_type_id: z.string().uuid("Bitte wählen Sie eine Info-Art aus"),
});

const urlSchema = z.object({
  title: z.string().trim().min(1, "Titel ist erforderlich").max(100),
  description: z.string().trim().max(500).optional(),
  external_url: z.string().url("Bitte geben Sie eine gültige URL ein").max(500),
  info_type_id: z.string().uuid("Bitte wählen Sie eine Info-Art aus"),
});

const Admin = () => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [externalUrl, setExternalUrl] = useState("");
  const [uploadType, setUploadType] = useState<"file" | "url">("file");
  const [editingFlyer, setEditingFlyer] = useState<any>(null);
  const [infoTypes, setInfoTypes] = useState<Array<{id: string, name: string}>>([]);
  const [selectedInfoType, setSelectedInfoType] = useState("");
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (!session?.user) {
          navigate("/auth");
        } else {
          checkAdminStatus(session.user.id);
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (!session?.user) {
        navigate("/auth");
      } else {
        checkAdminStatus(session.user.id);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  useEffect(() => {
    // Load info types
    const loadInfoTypes = async () => {
      const { data, error } = await supabase
        .from('info_types')
        .select('id, name')
        .order('name');
      
      if (error) {
        console.error('Error loading info types:', error);
      } else {
        setInfoTypes(data || []);
      }
    };

    loadInfoTypes();

    // Check if we're editing a flyer
    const editFlyer = location.state?.editFlyer;
    if (editFlyer) {
      setEditingFlyer(editFlyer);
      setTitle(editFlyer.title);
      setDescription(editFlyer.description || "");
      setSelectedInfoType(editFlyer.info_type_id || "");
      setUploadType(editFlyer.is_external ? "url" : "file");
      if (editFlyer.is_external) {
        setExternalUrl(editFlyer.external_url || "");
      }
    }
  }, [location.state]);

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
        if (!data) {
          toast({
            title: "Zugriff verweigert",
            description: "Sie haben keine Administrator-Berechtigung.",
            variant: "destructive",
          });
          navigate("/");
        }
      }
    } catch (error) {
      console.error('Error checking admin status:', error);
      setIsAdmin(false);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      // Check file size (max 20MB)
      if (selectedFile.size > 20 * 1024 * 1024) {
        toast({
          title: "Datei zu groß",
          description: "Die Datei darf maximal 20MB groß sein.",
          variant: "destructive",
        });
        return;
      }
      
      // Check file type
      const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
      if (!allowedTypes.includes(selectedFile.type)) {
        toast({
          title: "Ungültiger Dateityp",
          description: "Nur PDF, JPEG, PNG und WebP Dateien sind erlaubt.",
          variant: "destructive",
        });
        return;
      }
      
      setFile(selectedFile);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) return;
    
    if (uploadType === "file" && !file && !editingFlyer) return;
    if (uploadType === "url" && !externalUrl.trim()) return;
    
    setUploading(true);

    try {
      if (editingFlyer) {
        // Update existing flyer
        const updateData: any = {
          title: title.trim(),
          description: description.trim() || null,
          info_type_id: selectedInfoType || null,
        };

        if (uploadType === "url") {
          const validatedData = urlSchema.parse({
            title: title.trim(),
            description: description.trim() || undefined,
            external_url: externalUrl.trim(),
            info_type_id: selectedInfoType,
          });
          
          updateData.external_url = validatedData.external_url;
          updateData.is_external = true;
          updateData.file_url = null;
          updateData.file_name = null;
          updateData.file_size = null;
        } else if (file) {
          // Handle file update
          const validatedData = flyerSchema.parse({
            title: title.trim(),
            description: description.trim() || undefined,
            info_type_id: selectedInfoType,
          });

          // Upload new file
          const fileExt = file.name.split('.').pop();
          const fileName = `${Date.now()}_${Math.random().toString(36).substring(2)}.${fileExt}`;
          const filePath = `${fileName}`;

          const { error: uploadError } = await supabase.storage
            .from('flyers')
            .upload(filePath, file);

          if (uploadError) {
            throw uploadError;
          }

          // Get public URL
          const { data: { publicUrl } } = supabase.storage
            .from('flyers')
            .getPublicUrl(filePath);

          // Delete old file if it exists
          if (!editingFlyer.is_external && editingFlyer.file_url) {
            const oldFilePath = editingFlyer.file_url.split('/').pop();
            if (oldFilePath) {
              await supabase.storage.from('flyers').remove([oldFilePath]);
            }
          }

          updateData.file_url = publicUrl;
          updateData.file_name = file.name;
          updateData.file_size = file.size;
          updateData.is_external = false;
          updateData.external_url = null;
        }

        const { error: dbError } = await supabase
          .from('flyers')
          .update(updateData)
          .eq('id', editingFlyer.id);

        if (dbError) {
          throw dbError;
        }

        toast({
          title: "Werbeblatt aktualisiert",
          description: "Das Werbeblatt wurde erfolgreich aktualisiert.",
        });

        // Reset form and navigate back
        setEditingFlyer(null);
        navigate("/", { replace: true });
      } else if (uploadType === "file") {
        const validatedData = flyerSchema.parse({
          title: title.trim(),
          description: description.trim() || undefined,
          info_type_id: selectedInfoType,
        });

        // Upload file to storage
        const fileExt = file!.name.split('.').pop();
        const fileName = `${Date.now()}_${Math.random().toString(36).substring(2)}.${fileExt}`;
        const filePath = `${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('flyers')
          .upload(filePath, file!);

        if (uploadError) {
          throw uploadError;
        }

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from('flyers')
          .getPublicUrl(filePath);

        // Save flyer record to database
        const { error: dbError } = await supabase
          .from('flyers')
          .insert({
            title: validatedData.title,
            description: validatedData.description,
            file_url: publicUrl,
            file_name: file!.name,
            file_size: file!.size,
            uploaded_by: user.id,
            is_external: false,
            external_url: null,
            info_type_id: validatedData.info_type_id,
          });

        if (dbError) {
          // If database insert fails, clean up the uploaded file
          await supabase.storage.from('flyers').remove([filePath]);
          throw dbError;
        }

        toast({
          title: "Werbeblatt hochgeladen",
          description: "Das Werbeblatt wurde erfolgreich hochgeladen.",
        });
      } else {
        // Handle external URL
        const validatedData = urlSchema.parse({
          title: title.trim(),
          description: description.trim() || undefined,
          external_url: externalUrl.trim(),
          info_type_id: selectedInfoType,
        });

        // Save external URL to database
        const { error: dbError } = await supabase
          .from('flyers')
          .insert({
            title: validatedData.title,
            description: validatedData.description,
            external_url: validatedData.external_url,
            uploaded_by: user.id,
            is_external: true,
            file_url: null,
            file_name: null,
            file_size: null,
            info_type_id: validatedData.info_type_id,
          });

        if (dbError) {
          throw dbError;
        }

        toast({
          title: "Link hinzugefügt",
          description: "Der externe Link wurde erfolgreich hinzugefügt.",
        });
      }

      // Reset form
      if (!editingFlyer) {
        setTitle("");
        setDescription("");
        setFile(null);
        setExternalUrl("");
        setSelectedInfoType("");
        // Reset file input
        const fileInput = document.getElementById('file-input') as HTMLInputElement;
        if (fileInput) fileInput.value = '';
      }

    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({
          title: "Ungültige Eingabe",
          description: error.errors[0].message,
          variant: "destructive",
        });
      } else {
        console.error('Error saving flyer:', error);
        toast({
          title: uploadType === "file" ? "Upload fehlgeschlagen" : "Speichern fehlgeschlagen",
          description: uploadType === "file" 
            ? "Das Werbeblatt konnte nicht hochgeladen werden."
            : "Der Link konnte nicht gespeichert werden.",
          variant: "destructive",
        });
      }
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <h2 className="text-xl font-semibold">Lade...</h2>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-destructive">Zugriff verweigert</h2>
          <p className="text-muted-foreground mt-2">Sie haben keine Administrator-Berechtigung.</p>
          <Button onClick={() => navigate("/")} className="mt-4">
            <Home className="w-4 h-4 mr-2" />
            Zur Startseite
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <h1 className="text-2xl font-bold">Schlossstadt.Info Admin</h1>
          </div>
          <div className="flex items-center space-x-4">
            <Button variant="outline" onClick={() => navigate("/")}>
              <Home className="w-4 h-4 mr-2" />
              Startseite
            </Button>
            <Button variant="outline" onClick={handleSignOut}>
              <LogOut className="w-4 h-4 mr-2" />
              Abmelden
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Upload className="w-5 h-5 mr-2" />
              {editingFlyer ? "Werbeblatt bearbeiten" : "Werbeblatt hinzufügen"}
            </CardTitle>
            <CardDescription>
              {editingFlyer 
                ? "Bearbeiten Sie die Details des Werbeblatts."
                : "Laden Sie Dateien hoch oder verlinken Sie zu externen Dokumenten."
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={uploadType} onValueChange={(value) => setUploadType(value as "file" | "url")}>
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="file">Datei hochladen</TabsTrigger>
                <TabsTrigger value="url">Externe URL</TabsTrigger>
              </TabsList>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="title">Titel *</Label>
                  <Input
                    id="title"
                    type="text"
                    placeholder="z.B. Wochenangebote KW 38"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                    maxLength={100}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Beschreibung (optional)</Label>
                  <Textarea
                    id="description"
                    placeholder="Kurze Beschreibung..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    maxLength={500}
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="info-type">Info-Art *</Label>
                  <Select value={selectedInfoType} onValueChange={setSelectedInfoType} required>
                    <SelectTrigger>
                      <SelectValue placeholder="Wählen Sie eine Info-Art..." />
                    </SelectTrigger>
                    <SelectContent>
                      {infoTypes.map((infoType) => (
                        <SelectItem key={infoType.id} value={infoType.id}>
                          {infoType.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <TabsContent value="file" className="space-y-4 mt-0">
                  <div className="space-y-2">
                    <Label htmlFor="file-input">Datei auswählen *</Label>
                    <Input
                      id="file-input"
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png,.webp"
                      onChange={handleFileChange}
                      required={uploadType === "file" && !editingFlyer}
                    />
                    <p className="text-sm text-muted-foreground">
                      Erlaubte Formate: PDF, JPEG, PNG, WebP (max. 20MB)
                    </p>
                  </div>

                  {file && (
                    <div className="p-4 bg-muted rounded-lg">
                      <div className="flex items-center space-x-2">
                        <FileText className="w-4 h-4" />
                        <span className="text-sm font-medium">{file.name}</span>
                        <span className="text-sm text-muted-foreground">
                          ({Math.round(file.size / 1024)} KB)
                        </span>
                      </div>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="url" className="space-y-4 mt-0">
                  <div className="space-y-2">
                    <Label htmlFor="external-url">URL zum Dokument *</Label>
                    <Input
                      id="external-url"
                      type="url"
                      placeholder="https://beispiel.de/werbeblatt.pdf"
                      value={externalUrl}
                      onChange={(e) => setExternalUrl(e.target.value)}
                      required={uploadType === "url"}
                      maxLength={500}
                    />
                    <p className="text-sm text-muted-foreground">
                      Geben Sie eine direkte URL zum Dokument ein
                    </p>
                  </div>

                  {externalUrl && (
                    <div className="p-4 bg-muted rounded-lg">
                      <div className="flex items-center space-x-2">
                        <Link className="w-4 h-4" />
                        <span className="text-sm font-medium break-all">{externalUrl}</span>
                      </div>
                    </div>
                  )}
                </TabsContent>

                <Button 
                  type="submit" 
                  className="w-full" 
                  disabled={uploading || !selectedInfoType || (uploadType === "file" && !file && !editingFlyer) || (uploadType === "url" && !externalUrl.trim())}
                >
                  {uploading ? (
                    <>
                      <Upload className="w-4 h-4 mr-2 animate-spin" />
                      {editingFlyer ? "Aktualisieren..." : (uploadType === "file" ? "Hochladen..." : "Speichern...")}
                    </>
                  ) : (
                    <>
                      {editingFlyer ? (
                        <>
                          <Edit className="w-4 h-4 mr-2" />
                          Werbeblatt aktualisieren
                        </>
                      ) : uploadType === "file" ? (
                        <>
                          <Upload className="w-4 h-4 mr-2" />
                          Werbeblatt hochladen
                        </>
                      ) : (
                        <>
                          <Link className="w-4 h-4 mr-2" />
                          Link hinzufügen
                        </>
                      )}
                    </>
                  )}
                </Button>
              </form>
            </Tabs>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default Admin;