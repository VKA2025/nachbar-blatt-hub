import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { User, Session } from "@supabase/supabase-js";
import { Upload, LogOut, Home, FileText } from "lucide-react";
import { z } from "zod";

const flyerSchema = z.object({
  title: z.string().trim().min(1, "Titel ist erforderlich").max(100),
  description: z.string().trim().max(500).optional(),
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
  const navigate = useNavigate();
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

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!file || !user) return;
    
    setUploading(true);

    try {
      const validatedData = flyerSchema.parse({
        title: title.trim(),
        description: description.trim() || undefined,
      });

      // Upload file to storage
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

      // Save flyer record to database
      const { error: dbError } = await supabase
        .from('flyers')
        .insert({
          title: validatedData.title,
          description: validatedData.description,
          file_url: publicUrl,
          file_name: file.name,
          file_size: file.size,
          uploaded_by: user.id,
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

      // Reset form
      setTitle("");
      setDescription("");
      setFile(null);
      // Reset file input
      const fileInput = document.getElementById('file-input') as HTMLInputElement;
      if (fileInput) fileInput.value = '';

    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({
          title: "Ungültige Eingabe",
          description: error.errors[0].message,
          variant: "destructive",
        });
      } else {
        console.error('Error uploading flyer:', error);
        toast({
          title: "Upload fehlgeschlagen",
          description: "Das Werbeblatt konnte nicht hochgeladen werden.",
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
            <h1 className="text-2xl font-bold">Schlossbote Admin</h1>
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
              Werbeblatt hochladen
            </CardTitle>
            <CardDescription>
              Laden Sie wöchentliche Werbeblätter für die Nachbarschaft hoch.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleUpload} className="space-y-6">
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
                  placeholder="Kurze Beschreibung des Werbeblatts..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  maxLength={500}
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="file-input">Datei auswählen *</Label>
                <Input
                  id="file-input"
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png,.webp"
                  onChange={handleFileChange}
                  required
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

              <Button type="submit" className="w-full" disabled={uploading || !file}>
                {uploading ? (
                  <>
                    <Upload className="w-4 h-4 mr-2 animate-spin" />
                    Hochladen...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    Werbeblatt hochladen
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default Admin;