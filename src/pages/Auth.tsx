import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { User, Session } from "@supabase/supabase-js";
import { z } from "zod";

const authSchema = z.object({
  email: z.string().email("Ungültige E-Mail-Adresse").max(255),
  password: z.string().min(6, "Passwort muss mindestens 6 Zeichen haben").max(100),
  firstName: z.string().trim().min(1, "Vorname ist erforderlich").max(50).optional(),
  lastName: z.string().trim().min(1, "Nachname ist erforderlich").max(50).optional(),
});

const Auth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [resetEmail, setResetEmail] = useState("");
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          navigate("/");
        }
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        navigate("/");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const validatedData = authSchema.parse({
        email: email.trim(),
        password,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
      });

      const redirectUrl = `${window.location.origin}/`;
      
      const { error } = await supabase.auth.signUp({
        email: validatedData.email,
        password: validatedData.password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            first_name: validatedData.firstName,
            last_name: validatedData.lastName,
          }
        }
      });

      if (error) {
        if (error.message.includes("already registered")) {
          toast({
            title: "Benutzer bereits registriert",
            description: "Ein Benutzer mit dieser E-Mail existiert bereits. Bitte melden Sie sich an.",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Registrierung fehlgeschlagen",
            description: error.message,
            variant: "destructive",
          });
        }
      } else {
        toast({
          title: "Registrierung erfolgreich",
          description: "Bitte überprüfen Sie Ihre E-Mail für die Bestätigung.",
        });
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({
          title: "Ungültige Eingabe",
          description: error.errors[0].message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Fehler",
          description: "Ein unerwarteter Fehler ist aufgetreten.",
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const validatedData = authSchema.pick({ email: true, password: true }).parse({
        email: email.trim(),
        password,
      });

      const { error } = await supabase.auth.signInWithPassword({
        email: validatedData.email,
        password: validatedData.password,
      });

      if (error) {
        toast({
          title: "Anmeldung fehlgeschlagen",
          description: error.message === "Invalid login credentials" 
            ? "Ungültige Anmeldedaten. Bitte überprüfen Sie E-Mail und Passwort."
            : error.message,
          variant: "destructive",
        });
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({
          title: "Ungültige Eingabe",
          description: error.errors[0].message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Fehler",
          description: "Ein unerwarteter Fehler ist aufgetreten.",
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetLoading(true);

    try {
      const validatedEmail = z.string().email("Ungültige E-Mail-Adresse").parse(resetEmail.trim());

      const { error } = await supabase.auth.resetPasswordForEmail(validatedEmail, {
        redirectTo: `${window.location.origin}/auth`
      });

      if (error) {
        toast({
          title: "Fehler beim Passwort-Reset",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "E-Mail gesendet",
          description: "Bitte überprüfen Sie Ihre E-Mail für Anweisungen zum Zurücksetzen des Passworts.",
        });
        setResetEmail("");
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({
          title: "Ungültige E-Mail",
          description: error.errors[0].message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Fehler",
          description: "Ein unerwarteter Fehler ist aufgetreten.",
          variant: "destructive",
        });
      }
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Schlossstadt.Info</CardTitle>
          <CardDescription>Nachbarschafts-Portal</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="signin" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="signin">Anmelden</TabsTrigger>
              <TabsTrigger value="signup">Registrieren</TabsTrigger>
              <TabsTrigger value="reset">Passwort zurücksetzen</TabsTrigger>
            </TabsList>
            
            <TabsContent value="signin">
              <form onSubmit={handleSignIn} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signin-email">E-Mail</Label>
                  <Input
                    id="signin-email"
                    type="email"
                    placeholder="ihre.email@beispiel.de"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    maxLength={255}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signin-password">Passwort</Label>
                  <Input
                    id="signin-password"
                    type="password"
                    placeholder="Ihr Passwort"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                    maxLength={100}
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Anmelden..." : "Anmelden"}
                </Button>
              </form>
            </TabsContent>
            
            <TabsContent value="signup">
              <form onSubmit={handleSignUp} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-firstname">Vorname</Label>
                    <Input
                      id="signup-firstname"
                      type="text"
                      placeholder="Max"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      required
                      maxLength={50}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-lastname">Nachname</Label>
                    <Input
                      id="signup-lastname"
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
                  <Label htmlFor="signup-email">E-Mail</Label>
                  <Input
                    id="signup-email"
                    type="email"
                    placeholder="ihre.email@beispiel.de"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    maxLength={255}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password">Passwort</Label>
                  <Input
                    id="signup-password"
                    type="password"
                    placeholder="Mindestens 6 Zeichen"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                    maxLength={100}
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Registrieren..." : "Registrieren"}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="reset">
              <form onSubmit={handlePasswordReset} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="reset-email">E-Mail-Adresse</Label>
                  <Input
                    id="reset-email"
                    type="email"
                    placeholder="ihre.email@beispiel.de"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    required
                    maxLength={255}
                  />
                </div>
                <Button type="submit" className="w-full" disabled={resetLoading}>
                  {resetLoading ? "E-Mail wird gesendet..." : "Passwort zurücksetzen"}
                </Button>
                <p className="text-sm text-muted-foreground text-center">
                  Sie erhalten eine E-Mail mit Anweisungen zum Zurücksetzen Ihres Passworts.
                </p>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;