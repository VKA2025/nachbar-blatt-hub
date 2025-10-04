import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { User, Session } from "@supabase/supabase-js";
import { z } from "zod";
import ReCAPTCHA from "react-google-recaptcha";
import { Checkbox } from "@/components/ui/checkbox";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";

const authSchema = z.object({
  email: z.string().email("Ungültige E-Mail-Adresse").max(255),
  password: z.string().min(6, "Passwort muss mindestens 6 Zeichen haben").max(100),
  firstName: z.string().trim().min(1, "Vorname ist erforderlich").max(50).optional(),
  lastName: z.string().trim().min(1, "Nachname ist erforderlich").max(50).optional(),
  street: z.string().optional(),
  houseNumber: z.string().optional(),
  emailNotifications: z.boolean().default(false),
});

interface Street {
  id: string;
  name: string;
}

const Auth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [street, setStreet] = useState("");
  const [houseNumber, setHouseNumber] = useState("");
  const [resetEmail, setResetEmail] = useState("");
  const [showPasswordReset, setShowPasswordReset] = useState(false);
  const [captchaValue, setCaptchaValue] = useState<string | null>(null);
  const [emailNotifications, setEmailNotifications] = useState(false);
  const [streets, setStreets] = useState<Street[]>([]);
  const [streetOpen, setStreetOpen] = useState(false);
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

  // Generate house numbers 1-999
  const houseNumbers = Array.from({ length: 999 }, (_, i) => (i + 1).toString());

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (!captchaValue) {
      toast({
        title: "Captcha erforderlich",
        description: "Bitte bestätige das Captcha.",
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    try {
      const validatedData = authSchema.parse({
        email: email.trim(),
        password,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        street: street || undefined,
        houseNumber: houseNumber || undefined,
        emailNotifications: emailNotifications,
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
            street: validatedData.street,
            house_number: validatedData.houseNumber,
            email_notifications: validatedData.emailNotifications,
          }
        }
      });

      if (error) {
        if (error.message.includes("already registered")) {
          toast({
            title: "Benutzer bereits registriert",
            description: "Ein Benutzer mit dieser E-Mail existiert bereits. Bitte melde Dich an.",
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
          description: "Bitte überprüfe Deine E-Mail für die Bestätigung.",
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
            ? "Ungültige Anmeldedaten. Bitte überprüfe E-Mail und Passwort."
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

  const handlePasswordReset = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!resetEmail.trim()) {
      toast({
        title: "E-Mail erforderlich",
        description: "Bitte gib Deine E-Mail-Adresse ein.",
        variant: "destructive",
      });
      return;
    }
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
          description: "Bitte überprüfe Deine E-Mail für Anweisungen zum Zurücksetzen des Passworts.",
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
          <CardTitle className="text-2xl font-bold text-primary">Schlossstadt.Info</CardTitle>
          <CardDescription>Nachbarschafts-Portal</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="signin" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">Anmelden</TabsTrigger>
              <TabsTrigger value="signup">Registrieren</TabsTrigger>
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
                <div className="text-center">
                  <button
                    type="button"
                    onClick={() => setShowPasswordReset(!showPasswordReset)}
                    className="text-sm text-primary hover:underline"
                  >
                    Passwort vergessen?
                  </button>
                </div>
                {showPasswordReset && (
                  <div className="space-y-2 p-4 border rounded">
                    <Label htmlFor="reset-email">E-Mail für Passwort-Reset</Label>
                    <Input
                      id="reset-email"
                      type="email"
                      placeholder="ihre.email@beispiel.de"
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                      maxLength={255}
                    />
                    <Button 
                      type="button"
                      onClick={handlePasswordReset}
                      className="w-full" 
                      disabled={resetLoading}
                      size="sm"
                    >
                      {resetLoading ? "E-Mail wird gesendet..." : "Passwort zurücksetzen"}
                    </Button>
                  </div>
                )}
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
                  <Label htmlFor="signup-street">Straße (optional)</Label>
                  <Popover open={streetOpen} onOpenChange={setStreetOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={streetOpen}
                        className="w-full justify-between"
                      >
                        {street
                          ? streets.find((streetOption) => streetOption.name === street)?.name || street
                          : "Straße wählen..."}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-full p-0">
                      <Command>
                        <CommandInput placeholder="Straße suchen..." />
                        <CommandList>
                          <CommandEmpty>Keine Straße gefunden.</CommandEmpty>
                          <CommandGroup>
                            <CommandItem
                              value=""
                              onSelect={() => {
                                setStreet("");
                                setStreetOpen(false);
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  street === "" ? "opacity-100" : "opacity-0"
                                )}
                              />
                              Keine Straße
                            </CommandItem>
                            {streets.map((streetOption) => (
                              <CommandItem
                                key={streetOption.id}
                                value={streetOption.name}
                                onSelect={(currentValue) => {
                                  setStreet(currentValue === street ? "" : currentValue);
                                  setStreetOpen(false);
                                }}
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    street === streetOption.name ? "opacity-100" : "opacity-0"
                                  )}
                                />
                                {streetOption.name}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
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
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="signup-emailNotifications"
                    checked={emailNotifications}
                    onCheckedChange={(checked) => setEmailNotifications(!!checked)}
                  />
                  <Label 
                    htmlFor="signup-emailNotifications"
                    className="text-sm font-normal leading-5 cursor-pointer"
                  >
                    Benachrichtigungen per E-Mail erhalten (z.B. Abholtermine aus Abfallkalender für meine Straße)
                  </Label>
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
                <div className="flex justify-center">
                  <ReCAPTCHA
                    sitekey="6Le9HNkrAAAAANxF9Kn-UehyH6JOMQgH3qQ2ccDN"
                    onChange={setCaptchaValue}
                    theme="light"
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Registrieren..." : "Registrieren"}
                </Button>
              </form>
            </TabsContent>

          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;