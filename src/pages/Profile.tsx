import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { User, Session } from "@supabase/supabase-js";
import { z } from "zod";
import { ArrowLeft, Save, User as UserIcon } from "lucide-react";

const profileSchema = z.object({
  firstName: z.string().trim().min(1, "Vorname ist erforderlich").max(50),
  lastName: z.string().trim().min(1, "Nachname ist erforderlich").max(50),
  email: z.string().email("Ungültige E-Mail-Adresse").max(255),
  street: z.string().optional(),
  houseNumber: z.string().optional(),
});

interface Street {
  id: string;
  name: string;
}

interface Profile {
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  street: string | null;
  house_number: string | null;
}

const Profile = () => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [street, setStreet] = useState("");
  const [houseNumber, setHouseNumber] = useState("");
  const [streets, setStreets] = useState<Street[]>([]);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (!session?.user) {
          navigate("/auth");
        }
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (!session?.user) {
        navigate("/auth");
      } else {
        loadProfile(session.user.id);
      }
    });

    // Load streets
    loadStreets();

    return () => subscription.unsubscribe();
  }, [navigate]);

  const loadStreets = async () => {
    try {
      const { data: streetsData, error } = await supabase
        .from('streets')
        .select('id, name')
        .order('name');
      
      if (error) {
        console.error('Error loading streets:', error);
      } else {
        setStreets(streetsData || []);
      }
    } catch (error) {
      console.error('Error loading streets:', error);
    }
  };

  const loadProfile = async (userId: string) => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('first_name, last_name, email, street, house_number')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) {
        console.error('Error loading profile:', error);
        toast({
          title: "Fehler beim Laden",
          description: "Das Profil konnte nicht geladen werden.",
          variant: "destructive",
        });
      } else if (data) {
        setFirstName(data.first_name || "");
        setLastName(data.last_name || "");
        setEmail(data.email || "");
        setStreet(data.street || "");
        setHouseNumber(data.house_number || "");
      }
    } catch (error) {
      console.error('Error loading profile:', error);
      toast({
        title: "Fehler",
        description: "Ein unerwarteter Fehler ist aufgetreten.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Generate house numbers 1-999
  const houseNumbers = Array.from({ length: 999 }, (_, i) => (i + 1).toString());

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    setSaving(true);

    try {
      const validatedData = profileSchema.parse({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim(),
        street: street || undefined,
        houseNumber: houseNumber || undefined,
      });

      // Update profile in database
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          first_name: validatedData.firstName,
          last_name: validatedData.lastName,
          email: validatedData.email,
          street: validatedData.street,
          house_number: validatedData.houseNumber,
        })
        .eq('user_id', user.id);

      if (profileError) {
        throw profileError;
      }

      // Update email in auth if it changed
      if (validatedData.email !== user.email) {
        const { error: emailError } = await supabase.auth.updateUser({
          email: validatedData.email
        });

        if (emailError) {
          console.error('Error updating email:', emailError);
          toast({
            title: "Warnung",
            description: "Profil wurde gespeichert, aber E-Mail-Update fehlgeschlagen. Versuchen Sie es später erneut.",
            variant: "destructive",
          });
        } else {
          toast({
            title: "E-Mail geändert",
            description: "Bitte bestätigen Sie Ihre neue E-Mail-Adresse über den Link in Ihrer E-Mail.",
          });
        }
      }

      toast({
        title: "Profil gespeichert",
        description: "Ihre Profildaten wurden erfolgreich aktualisiert.",
      });

    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({
          title: "Ungültige Eingabe",
          description: error.errors[0].message,
          variant: "destructive",
        });
      } else {
        console.error('Error saving profile:', error);
        toast({
          title: "Fehler beim Speichern",
          description: "Das Profil konnte nicht gespeichert werden.",
          variant: "destructive",
        });
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <h2 className="text-xl font-semibold">Lade Profil...</h2>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <Button variant="ghost" onClick={() => navigate("/")}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Zurück
            </Button>
            <h1 className="text-2xl font-bold text-primary">Mein Profil</h1>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-2xl">
        <Card>
          <CardHeader className="text-center">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <UserIcon className="w-8 h-8 text-primary" />
            </div>
            <CardTitle className="text-2xl">Profil bearbeiten</CardTitle>
            <CardDescription>
              Aktualisieren Sie Ihre persönlichen Informationen
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSaveProfile} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">Vorname *</Label>
                  <Input
                    id="firstName"
                    type="text"
                    placeholder="Max"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    required
                    maxLength={50}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Nachname *</Label>
                  <Input
                    id="lastName"
                    type="text"
                    placeholder="Mustermann"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    required
                    maxLength={50}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">E-Mail *</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="ihre.email@beispiel.de"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  maxLength={255}
                />
                <p className="text-sm text-muted-foreground">
                  Bei Änderung der E-Mail erhalten Sie eine Bestätigungs-E-Mail
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="street">Straße</Label>
                  <Select value={street} onValueChange={setStreet}>
                    <SelectTrigger>
                      <SelectValue placeholder="Straße wählen" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Keine Straße</SelectItem>
                      {streets.map((streetOption) => (
                        <SelectItem key={streetOption.id} value={streetOption.name}>
                          {streetOption.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="houseNumber">Hausnummer</Label>
                  <Select value={houseNumber} onValueChange={setHouseNumber}>
                    <SelectTrigger>
                      <SelectValue placeholder="Nr. wählen" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Keine Nummer</SelectItem>
                      {houseNumbers.map((number) => (
                        <SelectItem key={number} value={number}>
                          {number}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="pt-4 border-t">
                <Button 
                  type="submit" 
                  className="w-full" 
                  disabled={saving}
                >
                  <Save className="w-4 h-4 mr-2" />
                  {saving ? "Speichere..." : "Profil speichern"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default Profile;