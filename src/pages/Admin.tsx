import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { User, Session } from "@supabase/supabase-js";
import { Upload, LogOut, Home, FileText, Link, Edit, Users, Trash2, Database } from "lucide-react";
import { z } from "zod";
import { importStreetData } from "@/utils/importStreetData";
import { importWasteSchedule } from "@/utils/importWasteSchedule";
import { SubcategoryManagement } from "@/components/SubcategoryManagement";
import { CategoryManagement } from "@/components/CategoryManagement";
import { NeighborItemApproval } from "@/components/NeighborItemApproval";

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
  const [backgroundImageFile, setBackgroundImageFile] = useState<File | null>(null);
  const [removeBackgroundImage, setRemoveBackgroundImage] = useState(false);
  const [externalUrl, setExternalUrl] = useState("");
  const [uploadType, setUploadType] = useState<"file" | "url" | "none">("file");
  const [editingFlyer, setEditingFlyer] = useState<any>(null);
  const [infoTypes, setInfoTypes] = useState<Array<{id: string, name: string}>>([]);
  const [selectedInfoType, setSelectedInfoType] = useState("");
  const [activeTab, setActiveTab] = useState("users");
  const [users, setUsers] = useState<any[]>([]);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [importingStreets, setImportingStreets] = useState(false);
  const [importResult, setImportResult] = useState<string | null>(null);
  const [streetImportYear, setStreetImportYear] = useState<number>(new Date().getFullYear());
  const [importingWaste, setImportingWaste] = useState(false);
  const [wasteImportResult, setWasteImportResult] = useState<string | null>(null);
  const [testingEmail, setTestingEmail] = useState(false);
  const [emailTestResult, setEmailTestResult] = useState<string | null>(null);
  const [userEmails, setUserEmails] = useState<string[]>([]);
  const [selectedEmail, setSelectedEmail] = useState<string>("alle");
  const [expiresAt, setExpiresAt] = useState<string>("");
  const [customEmailSubject, setCustomEmailSubject] = useState<string>("");
  const [customEmailContent, setCustomEmailContent] = useState<string>("");
  const [customEmailTheme, setCustomEmailTheme] = useState<string>("standard");
  const [sendingCustomEmail, setSendingCustomEmail] = useState(false);
  const [customEmailResult, setCustomEmailResult] = useState<string | null>(null);
  const [customEmailRecipient, setCustomEmailRecipient] = useState<string>("alle");
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

    // Load users for admin management
    if (activeTab === "users") {
      loadUsers();
    }

    // Load user emails for waste notifications and custom email sending
    if (activeTab === "waste" || activeTab === "email-send") {
      loadUserEmails();
    }

    // Check if we're editing a flyer
    const editFlyer = location.state?.editFlyer;
    if (editFlyer) {
      setActiveTab("flyers");
      setEditingFlyer(editFlyer);
      setTitle(editFlyer.title);
      setDescription(editFlyer.description || "");
      setSelectedInfoType(editFlyer.info_type_id || "");
      setExpiresAt(editFlyer.expires_at || "");
      // Determine upload type based on flyer properties
      if (editFlyer.is_external) {
        setUploadType("url");
        setExternalUrl(editFlyer.external_url || "");
      } else if (editFlyer.file_url) {
        setUploadType("file");
      } else {
        setUploadType("none");
      }
      setRemoveBackgroundImage(false);
    }
  }, [location.state, activeTab]);

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

  const handleImportStreetData = async () => {
    setImportingStreets(true);
    setImportResult(null);
    
    try {
      // Read the CSV file from public/data
      const response = await fetch('/data/strassen_Bezirke.csv');
      const csvContent = await response.text();
      
      const recordCount = await importStreetData(csvContent, streetImportYear);
      
      setImportResult(`Erfolgreich ${recordCount} Straßen-Bezirk-Zuordnungen importiert!`);
      
      toast({
        title: "Import erfolgreich",
        description: `${recordCount} Datensätze wurden importiert.`,
      });
    } catch (error) {
      console.error('Import error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unbekannter Fehler';
      setImportResult(`Import fehlgeschlagen: ${errorMessage}`);
      
      toast({
        title: "Import fehlgeschlagen",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setImportingStreets(false);
    }
  };

  const handleImportWasteSchedule = async () => {
    setImportingWaste(true);
    setWasteImportResult(null);
    
    try {
      // Read the CSV file from public/data
      const response = await fetch('/data/Abholdatum_Bezirke.csv');
      const csvContent = await response.text();
      
      const recordCount = await importWasteSchedule(csvContent);
      
      setWasteImportResult(`Erfolgreich ${recordCount} Abfallkalender-Einträge importiert!`);
      
      toast({
        title: "Import erfolgreich",
        description: `${recordCount} Abfallkalender-Einträge wurden importiert.`,
      });
    } catch (error) {
      console.error('Waste schedule import error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unbekannter Fehler';
      setWasteImportResult(`Import fehlgeschlagen: ${errorMessage}`);
      
      toast({
        title: "Import fehlgeschlagen",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setImportingWaste(false);
    }
  };

  const loadUserEmails = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('email')
        .not('email', 'is', null)
        .order('email')
        .limit(35);

      if (error) {
        console.error('Error loading user emails:', error);
        return;
      }

      const emails = data?.map(p => p.email).filter(Boolean) || [];
      setUserEmails(emails);
    } catch (error) {
      console.error('Error loading user emails:', error);
    }
  };

  const handleTestEmailNotifications = async () => {
    try {
      setTestingEmail(true);
      setEmailTestResult(null);
      
      const body = selectedEmail !== "alle" ? { testEmail: selectedEmail } : {};
      
      const { data, error } = await supabase.functions.invoke('daily-waste-notifications', {
        body
      });
      
      if (error) throw error;
      
      const successMsg = selectedEmail !== "alle" 
        ? `Test-E-Mail wurde erfolgreich an ${selectedEmail} versendet!`
        : 'Test-E-Mails wurden erfolgreich versendet!';
      setEmailTestResult(successMsg);
      toast({
        title: "Test erfolgreich",
        description: successMsg,
      });
    } catch (error) {
      console.error('Error testing email notifications:', error);
      const errorMsg = `Fehler beim Versand: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`;
      setEmailTestResult(errorMsg);
      toast({
        title: "Test fehlgeschlagen",
        description: errorMsg,
        variant: "destructive",
      });
    } finally {
      setTestingEmail(false);
    }
  };

  const handleSendCustomEmail = async () => {
    if (!customEmailContent.trim()) {
      toast({
        title: "Fehler",
        description: "Bitte geben Sie einen E-Mail-Inhalt ein.",
        variant: "destructive",
      });
      return;
    }

    try {
      setSendingCustomEmail(true);
      setCustomEmailResult(null);
      
      const body = {
        subject: customEmailSubject.trim() || "Nachricht von Schlossstadt.Info",
        content: customEmailContent.trim(),
        theme: customEmailTheme,
        ...(customEmailRecipient !== "alle" && { testEmail: customEmailRecipient })
      };
      
      const { data, error } = await supabase.functions.invoke('send-custom-email', {
        body
      });
      
      if (error) throw error;
      
      const successMsg = customEmailRecipient !== "alle" 
        ? `E-Mail wurde erfolgreich an ${customEmailRecipient} versendet!`
        : 'E-Mails wurden erfolgreich versendet!';
      setCustomEmailResult(successMsg);
      toast({
        title: "Versand erfolgreich",
        description: successMsg,
      });
    } catch (error) {
      console.error('Error sending custom email:', error);
      const errorMsg = `Fehler beim Versand: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`;
      setCustomEmailResult(errorMsg);
      toast({
        title: "Versand fehlgeschlagen",
        description: errorMsg,
        variant: "destructive",
      });
    } finally {
      setSendingCustomEmail(false);
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

  const handleBackgroundImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      // Check file size (max 10MB for background images)
      if (selectedFile.size > 10 * 1024 * 1024) {
        toast({
          title: "Datei zu groß",
          description: "Das Hintergrundbild darf maximal 10MB groß sein.",
          variant: "destructive",
        });
        return;
      }
      
      // Check file type - only images allowed for background
      const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
      if (!allowedTypes.includes(selectedFile.type)) {
        toast({
          title: "Ungültiger Dateityp",
          description: "Nur JPEG, PNG und WebP Bilder sind für Hintergrundbilder erlaubt.",
          variant: "destructive",
        });
        return;
      }
      
      setBackgroundImageFile(selectedFile);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) return;
    
    if (uploadType === "file" && !file && !editingFlyer) return;
    if (uploadType === "url" && !externalUrl.trim()) return;
    // uploadType "none" requires no file or URL
    
    setUploading(true);

    try {
      let backgroundImageUrl = null;
      
      // Handle background image upload if provided
      if (backgroundImageFile) {
        const bgFileExt = backgroundImageFile.name.split('.').pop();
        const bgFileName = `bg_${Date.now()}_${Math.random().toString(36).substring(2)}.${bgFileExt}`;
        const bgFilePath = `backgrounds/${bgFileName}`;

        const { error: bgUploadError } = await supabase.storage
          .from('flyers')
          .upload(bgFilePath, backgroundImageFile);

        if (bgUploadError) {
          throw bgUploadError;
        }

        // Get public URL for background image
        const { data: { publicUrl } } = supabase.storage
          .from('flyers')
          .getPublicUrl(bgFilePath);

        backgroundImageUrl = publicUrl;
      }

      if (editingFlyer) {
        // Update existing flyer
        const updateData: any = {
          title: title.trim(),
          description: description.trim() || null,
          info_type_id: selectedInfoType || null,
          expires_at: expiresAt || null,
        };

        // Update background image if new one was uploaded
        if (backgroundImageUrl) {
          // Delete old background image if it exists
          if (editingFlyer.background_image_url) {
            const oldBgPath = editingFlyer.background_image_url.split('/').pop();
            if (oldBgPath) {
              await supabase.storage.from('flyers').remove([`backgrounds/${oldBgPath}`]);
            }
          }
          updateData.background_image_url = backgroundImageUrl;
        } 
        // Remove background image if requested
        else if (removeBackgroundImage && editingFlyer.background_image_url) {
          const oldBgPath = editingFlyer.background_image_url.split('/').pop();
          if (oldBgPath) {
            await supabase.storage.from('flyers').remove([`backgrounds/${oldBgPath}`]);
          }
          updateData.background_image_url = null;
        }

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
        } else if (uploadType === "none") {
          // Clear any file or URL data
          updateData.external_url = null;
          updateData.is_external = false;
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
          title: "Info-Kachel aktualisiert",
          description: "Die Info-Kachel wurde erfolgreich aktualisiert.",
        });

        // Reset form and navigate back
        setEditingFlyer(null);
        setRemoveBackgroundImage(false);
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
            background_image_url: backgroundImageUrl,
            expires_at: expiresAt || null,
          });

        if (dbError) {
          // If database insert fails, clean up the uploaded file
          await supabase.storage.from('flyers').remove([filePath]);
          throw dbError;
        }

        toast({
          title: "Info-Kachel hochgeladen",
          description: "Die Info-Kachel wurde erfolgreich hochgeladen.",
        });
      } else if (uploadType === "url") {
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
            background_image_url: backgroundImageUrl,
            expires_at: expiresAt || null,
          });

        if (dbError) {
          throw dbError;
        }

        toast({
          title: "Link hinzugefügt",
          description: "Der externe Link wurde erfolgreich hinzugefügt.",
        });
      } else if (uploadType === "none") {
        // Handle info tile without file or URL
        const validatedData = flyerSchema.parse({
          title: title.trim(),
          description: description.trim() || undefined,
          info_type_id: selectedInfoType,
        });

        // Save info tile without file or URL to database
        const { error: dbError } = await supabase
          .from('flyers')
          .insert({
            title: validatedData.title,
            description: validatedData.description,
            uploaded_by: user.id,
            is_external: false,
            file_url: null,
            file_name: null,
            file_size: null,
            external_url: null,
            info_type_id: validatedData.info_type_id,
            background_image_url: backgroundImageUrl,
            expires_at: expiresAt || null,
          });

        if (dbError) {
          throw dbError;
        }

        toast({
          title: "Info-Kachel erstellt",
          description: "Die Info-Kachel wurde erfolgreich erstellt.",
        });
      }

      // Reset form
      if (!editingFlyer) {
        setTitle("");
        setDescription("");
        setFile(null);
        setBackgroundImageFile(null);
        setExternalUrl("");
        setSelectedInfoType("");
        setExpiresAt("");
        // Reset file inputs
        const fileInput = document.getElementById('file-input') as HTMLInputElement;
        if (fileInput) fileInput.value = '';
        const bgInput = document.getElementById('background-image') as HTMLInputElement;
        if (bgInput) bgInput.value = '';
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
            ? "Die Info-Kachel konnte nicht hochgeladen werden."
            : "Der Link konnte nicht gespeichert werden.",
          variant: "destructive",
        });
      }
    } finally {
      setUploading(false);
    }
  };

  const loadUsers = async () => {
    try {
      // Load all profiles with full details (admins have RLS access)
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, created_at, updated_at, first_name, last_name, email, street, house_number, email_notifications')
        .order('created_at', { ascending: false })
        .limit(100);

      if (profilesError) {
        throw profilesError;
      }

      // Load user roles separately
      const userIds = profilesData?.map(profile => profile.user_id) || [];
      const { data: rolesData, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role')
        .in('user_id', userIds);

      if (rolesError) {
        throw rolesError;
      }

      // Combine profiles with roles
      const usersWithRoles = profilesData?.map(profile => {
        const userRole = rolesData?.find(role => role.user_id === profile.user_id);
        return {
          user_id: profile.user_id,
          created_at: profile.created_at,
          updated_at: profile.updated_at,
          first_name: profile.first_name,
          last_name: profile.last_name,
          email: profile.email,
          street: profile.street,
          house_number: profile.house_number,
          email_notifications: profile.email_notifications,
          user_roles: userRole ? [userRole] : [],
          role: userRole?.role || 'user'
        };
      }) || [];

      setUsers(usersWithRoles);
    } catch (error) {
      console.error('Error loading users:', error);
      toast({
        title: "Fehler",
        description: "Benutzer konnten nicht geladen werden.",
        variant: "destructive",
      });
    }
  };

  const handleUpdateUserRole = async (userId: string, newRole: string) => {
    try {
      // First, remove existing role
      await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId);

      // Then add new role
      const { error } = await supabase
        .from('user_roles')
        .insert([{ user_id: userId, role: newRole as any }]);

      if (error) {
        throw error;
      }

      toast({
        title: "Rolle aktualisiert",
        description: "Die Benutzerrolle wurde erfolgreich aktualisiert.",
      });

      loadUsers(); // Reload users
    } catch (error) {
      console.error('Error updating user role:', error);
      toast({
        title: "Fehler",
        description: "Rolle konnte nicht aktualisiert werden.",
        variant: "destructive",
      });
    }
  };

  const handleUpdateUserProfile = async (userId: string, profileData: any) => {
    try {
      // Use secure function to update user profile with audit logging
      const { data, error } = await supabase
        .rpc('admin_update_profile', {
          target_user_id: userId,
          new_first_name: profileData.first_name,
          new_last_name: profileData.last_name,
          new_email: profileData.email,
          new_street: profileData.street,
          new_house_number: profileData.house_number,
          new_email_notifications: profileData.email_notifications
        });

      if (error) {
        throw error;
      }

      if (data) {
        toast({
          title: "Profil aktualisiert",
          description: "Das Benutzerprofil wurde erfolgreich aktualisiert.",
        });
        loadUsers(); // Reload users
      } else {
        throw new Error('Update failed - no changes made');
      }
    } catch (error) {
      console.error('Error updating user profile:', error);
      toast({
        title: "Fehler",
        description: "Profil konnte nicht aktualisiert werden.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm("Sind Sie sicher, dass Sie diesen Benutzer löschen möchten?")) {
      return;
    }

    try {
      // Delete user profile (this will also cascade to user_roles due to foreign key)
      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('user_id', userId);

      if (error) {
        throw error;
      }

      toast({
        title: "Benutzer gelöscht",
        description: "Der Benutzer wurde erfolgreich gelöscht.",
      });

      loadUsers(); // Reload users
    } catch (error) {
      console.error('Error deleting user:', error);
      toast({
        title: "Fehler",
        description: "Benutzer konnte nicht gelöscht werden.",
        variant: "destructive",
      });
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
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="mb-6 space-y-2">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="flyers">Info-Kacheln</TabsTrigger>
              <TabsTrigger value="users">Benutzer</TabsTrigger>
              <TabsTrigger value="neighbor-items">Nachbar-Artikel</TabsTrigger>
              <TabsTrigger value="categories">Kategorien</TabsTrigger>
            </TabsList>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="subcategories">Unterkategorien</TabsTrigger>
              <TabsTrigger value="streets">Straßendaten</TabsTrigger>
              <TabsTrigger value="waste">Abfallkalender</TabsTrigger>
              <TabsTrigger value="email-send">Mailversand</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="flyers">
            <Card className="max-w-2xl mx-auto">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Upload className="w-5 h-5 mr-2" />
                  {editingFlyer ? "Info-Kachel bearbeiten" : "Information hinzufügen"}
                </CardTitle>
                <CardDescription>
                  {editingFlyer 
                    ? "Bearbeiten Sie die Details der Info-Kachel."
                    : "Laden Sie Dateien hoch oder verlinken Sie zu externen Dokumenten."
                  }
                </CardDescription>
              </CardHeader>
              <CardContent>
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

                  <div className="space-y-2">
                    <Label htmlFor="expires-at">Ablaufdatum (optional)</Label>
                    <Input
                      id="expires-at"
                      type="date"
                      value={expiresAt}
                      onChange={(e) => setExpiresAt(e.target.value)}
                    />
                    <p className="text-sm text-muted-foreground">
                      Wenn leer, läuft die Kachel nicht ab. Nach dem Ablaufdatum wird sie nur noch für Admins sichtbar sein.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label>Inhaltstyp *</Label>
                    <RadioGroup value={uploadType} onValueChange={(value) => setUploadType(value as "file" | "url" | "none")}>
                      <div className="flex items-center space-x-6">
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="file" id="type-file" />
                          <Label htmlFor="type-file" className="cursor-pointer font-normal">
                            Datei hochladen
                          </Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="url" id="type-url" />
                          <Label htmlFor="type-url" className="cursor-pointer font-normal">
                            Externe URL
                          </Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="none" id="type-none" />
                          <Label htmlFor="type-none" className="cursor-pointer font-normal">
                            Ohne
                          </Label>
                        </div>
                      </div>
                    </RadioGroup>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="background-image">Hintergrundbild (optional)</Label>
                    <Input
                      id="background-image"
                      type="file"
                      accept=".jpg,.jpeg,.png,.webp"
                      onChange={handleBackgroundImageChange}
                    />
                    <p className="text-sm text-muted-foreground">
                      Hintergrundbild für die Infokachel. Erlaubte Formate: JPEG, PNG, WebP (max. 10MB)
                    </p>
                    {backgroundImageFile && (
                      <div className="p-4 bg-muted rounded-lg">
                        <div className="flex items-center space-x-2">
                          <FileText className="w-4 h-4" />
                          <span className="text-sm font-medium">{backgroundImageFile.name}</span>
                          <span className="text-sm text-muted-foreground">
                            ({Math.round(backgroundImageFile.size / 1024)} KB)
                          </span>
                        </div>
                      </div>
                    )}
                    {editingFlyer?.background_image_url && !backgroundImageFile && !removeBackgroundImage && (
                      <div className="p-4 bg-muted rounded-lg">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <FileText className="w-4 h-4" />
                            <span className="text-sm font-medium">Aktuelles Hintergrundbild</span>
                          </div>
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            onClick={() => setRemoveBackgroundImage(true)}
                          >
                            Löschen
                          </Button>
                        </div>
                      </div>
                    )}
                    {removeBackgroundImage && (
                      <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-destructive">Hintergrundbild wird beim Speichern entfernt</span>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setRemoveBackgroundImage(false)}
                          >
                            Rückgängig
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>

                  {uploadType === "file" && (
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
                    </div>
                  )}

                  {uploadType === "url" && (
                    <div className="space-y-2">
                      <Label htmlFor="external-url">URL zum Dokument *</Label>
                      <Input
                        id="external-url"
                        type="url"
                        placeholder="https://beispiel.de/werbeblatt.pdf"
                        value={externalUrl}
                        onChange={(e) => setExternalUrl(e.target.value)}
                        onFocus={() => setExternalUrl("")}
                        required={uploadType === "url"}
                        maxLength={500}
                      />
                      <p className="text-sm text-muted-foreground">
                        Geben Sie eine direkte URL zum Dokument ein
                      </p>
                      {externalUrl && (
                        <div className="p-4 bg-muted rounded-lg">
                          <div className="flex items-center space-x-2">
                            <Link className="w-4 h-4" />
                            <span className="text-sm font-medium break-all">{externalUrl}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  <Button 
                    type="submit" 
                    className="w-full" 
                    disabled={uploading || !selectedInfoType || (uploadType === "file" && !file && !editingFlyer) || (uploadType === "url" && !externalUrl.trim())}
                  >
                    {uploading ? (
                      <>
                        <Upload className="w-4 h-4 mr-2 animate-spin" />
                        {editingFlyer ? "Aktualisieren..." : (uploadType === "file" ? "Hochladen..." : uploadType === "url" ? "Speichern..." : "Erstellen...")}
                      </>
                    ) : (
                      <>
                        {editingFlyer ? (
                          <>
                            <Edit className="w-4 h-4 mr-2" />
                            Info-Kachel aktualisieren
                          </>
                        ) : uploadType === "file" ? (
                          <>
                            <Upload className="w-4 h-4 mr-2" />
                            Info-Kachel hochladen
                          </>
                        ) : uploadType === "url" ? (
                          <>
                            <Link className="w-4 h-4 mr-2" />
                            Link hinzufügen
                          </>
                        ) : (
                          <>
                            <Upload className="w-4 h-4 mr-2" />
                            Info-Kachel erstellen
                          </>
                        )}
                      </>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="users">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Users className="w-5 h-5 mr-2" />
                  Benutzerverwaltung
                </CardTitle>
                <CardDescription>
                  Verwalten Sie Benutzer und deren Rollen
                </CardDescription>
              </CardHeader>
              <CardContent>
                {editingUser ? (
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Benutzer bearbeiten</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Vorname</Label>
                        <Input
                          value={editingUser.first_name || ""}
                          onChange={(e) => setEditingUser({...editingUser, first_name: e.target.value})}
                        />
                      </div>
                      <div>
                        <Label>Nachname</Label>
                        <Input
                          value={editingUser.last_name || ""}
                          onChange={(e) => setEditingUser({...editingUser, last_name: e.target.value})}
                        />
                      </div>
                      <div>
                        <Label>E-Mail</Label>
                        <Input
                          value={editingUser.email || ""}
                          onChange={(e) => setEditingUser({...editingUser, email: e.target.value})}
                        />
                      </div>
                      <div>
                        <Label>Straße</Label>
                        <Input
                          value={editingUser.street || ""}
                          onChange={(e) => setEditingUser({...editingUser, street: e.target.value})}
                        />
                      </div>
                      <div>
                        <Label>Hausnummer</Label>
                        <Input
                          value={editingUser.house_number || ""}
                          onChange={(e) => setEditingUser({...editingUser, house_number: e.target.value})}
                        />
                      </div>
                      <div>
                        <Label>Status</Label>
                        <Select 
                          value={editingUser.status || "active"}
                          onValueChange={(value) => setEditingUser({...editingUser, status: value})}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="active">Aktiv</SelectItem>
                            <SelectItem value="inactive">Inaktiv</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <Button 
                        onClick={() => handleUpdateUserProfile(editingUser.user_id, {
                          first_name: editingUser.first_name,
                          last_name: editingUser.last_name,
                          email: editingUser.email,
                          street: editingUser.street,
                          house_number: editingUser.house_number,
                          status: editingUser.status
                        })}
                      >
                        Speichern
                      </Button>
                      <Button variant="outline" onClick={() => setEditingUser(null)}>
                        Abbrechen
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>E-Mail</TableHead>
                          <TableHead>Straße</TableHead>
                          <TableHead>Rolle</TableHead>
                          <TableHead>Mail-Benachr.</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Aktionen</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {users.map((userRecord) => (
                          <TableRow key={userRecord.id}>
                            <TableCell>
                              {userRecord.first_name || ""} {userRecord.last_name || ""}
                            </TableCell>
                            <TableCell>{userRecord.email}</TableCell>
                            <TableCell>
                              {userRecord.street} {userRecord.house_number}
                            </TableCell>
                            <TableCell>
                              <Select
                                value={userRecord.user_roles?.[0]?.role || "user"}
                                onValueChange={(value) => handleUpdateUserRole(userRecord.user_id, value)}
                              >
                                <SelectTrigger className="w-32">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="user">Benutzer</SelectItem>
                                  <SelectItem value="admin">Admin</SelectItem>
                                </SelectContent>
                              </Select>
                            </TableCell>
                            <TableCell>
                              <span className={`px-2 py-1 rounded-full text-xs ${
                                userRecord.email_notifications
                                  ? 'bg-green-100 text-green-800' 
                                  : 'bg-gray-100 text-gray-800'
                              }`}>
                                {userRecord.email_notifications ? 'Ja' : 'Nein'}
                              </span>
                            </TableCell>
                            <TableCell>
                              <span className={`px-2 py-1 rounded-full text-xs ${
                                userRecord.status === 'active' 
                                  ? 'bg-green-100 text-green-800' 
                                  : 'bg-red-100 text-red-800'
                              }`}>
                                {userRecord.status === 'active' ? 'Aktiv' : 'Inaktiv'}
                              </span>
                            </TableCell>
                            <TableCell>
                              <div className="flex space-x-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setEditingUser(userRecord)}
                                >
                                  <Edit className="w-4 h-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => handleDeleteUser(userRecord.user_id)}
                                  disabled
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    <div className="mt-4 text-sm text-muted-foreground">
                      Anzahl der Einträge: {users.length}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="neighbor-items">
            <NeighborItemApproval />
          </TabsContent>

          <TabsContent value="categories">
            <CategoryManagement />
          </TabsContent>

          <TabsContent value="subcategories">
            <SubcategoryManagement />
          </TabsContent>

          <TabsContent value="streets">
            <Card className="max-w-2xl mx-auto">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Database className="w-5 h-5 mr-2" />
                  Straßendaten importieren
                </CardTitle>
                <CardDescription>
                  Importieren Sie die Grunddatentabelle Straße-Bezirke für das Jahr 2025.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="p-4 bg-muted rounded-lg">
                  <h3 className="font-medium mb-2">CSV-Datei Format</h3>
                  <p className="text-sm text-muted-foreground mb-2">
                    Die CSV-Datei sollte folgende Spalten enthalten:
                  </p>
                  <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
                    <li><code>Strasse</code> - Name der Straße</li>
                    <li><code>Bemerkung</code> - Zusätzliche Hinweise (optional)</li>
                    <li><code>Bezirk</code> - Bezirks-Code (Zahl oder Buchstabe)</li>
                  </ul>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <Label htmlFor="streetImportYear" className="whitespace-nowrap">Jahr:</Label>
                    <Input
                      id="streetImportYear"
                      type="number"
                      min={2020}
                      max={2100}
                      value={streetImportYear}
                      onChange={(e) => setStreetImportYear(parseInt(e.target.value) || new Date().getFullYear())}
                      className="w-24"
                    />
                  </div>
                  <Button
                    onClick={handleImportStreetData}
                    disabled={importingStreets}
                    className="w-full"
                  >
                    {importingStreets ? (
                      <>
                        <Database className="w-4 h-4 mr-2 animate-spin" />
                        Importiere Daten...
                      </>
                    ) : (
                      <>
                        <Database className="w-4 h-4 mr-2" />
                        Straßendaten importieren
                      </>
                    )}
                  </Button>

                  {importResult && (
                    <div className={`p-4 rounded-lg border ${
                      importResult.includes('Erfolgreich') 
                        ? 'bg-green-50 border-green-200 text-green-800' 
                        : 'bg-red-50 border-red-200 text-red-800'
                    }`}>
                      <p className="text-sm font-medium">{importResult}</p>
                    </div>
                  )}
                </div>

                <div className="text-xs text-muted-foreground">
                  <p><strong>Hinweis:</strong> Der Import kann nur einmal durchgeführt werden. Bereits existierende Daten werden nicht überschrieben.</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="waste">
            <Card className="max-w-2xl mx-auto">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Database className="w-5 h-5 mr-2" />
                  Abfallkalender importieren
                </CardTitle>
                <CardDescription>
                  Importieren Sie die Abholdaten nach Bezirken und Abfallarten für 2025.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="p-4 bg-muted rounded-lg">
                  <h3 className="font-medium mb-2">CSV-Datei Format</h3>
                  <p className="text-sm text-muted-foreground mb-2">
                    Die CSV-Datei sollte folgende Spalten enthalten:
                  </p>
                  <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
                    <li><code>Abholdatum</code> - Datum im Format DD.MM.YYYY</li>
                    <li><code>Wochentag</code> - Wochentag der Abholung</li>
                    <li><code>Restmülltonne</code> - Bezirke für Restmüll</li>
                    <li><code>Gelber Sack</code> - Bezirke für Gelben Sack</li>
                    <li><code>Papiertonne</code> - Bezirke für Papiertonne</li>
                    <li><code>Biotonne</code> - Bezirke für Biotonne</li>
                  </ul>
                  <p className="text-sm text-muted-foreground mt-2">
                    Die Bezirke in den Spalten 3-6 werden mit der street_districts-Tabelle verknüpft.
                  </p>
                </div>

                <div className="space-y-4">
                  <Button 
                    onClick={handleImportWasteSchedule}
                    disabled={importingWaste}
                    className="w-full"
                  >
                    {importingWaste ? (
                      <>
                        <Database className="w-4 h-4 mr-2 animate-spin" />
                        Importiere Daten...
                      </>
                    ) : (
                      <>
                        <Database className="w-4 h-4 mr-2" />
                        Abfallkalender importieren
                      </>
                    )}
                  </Button>

                  {wasteImportResult && (
                    <div className={`p-4 rounded-lg border ${
                      wasteImportResult.includes('Erfolgreich') 
                        ? 'bg-green-50 border-green-200 text-green-800' 
                        : 'bg-red-50 border-red-200 text-red-800'
                    }`}>
                      <p className="text-sm font-medium">{wasteImportResult}</p>
                    </div>
                  )}
                </div>

                <div className="border-t pt-6 space-y-4">
                  <div className="p-4 bg-muted rounded-lg">
                    <h3 className="font-medium mb-2">E-Mail-Benachrichtigungen testen</h3>
                    <p className="text-sm text-muted-foreground">
                      Sendet Test-E-Mails für die heutigen Abholtermine an alle Benutzer oder eine spezifische E-Mail-Adresse mit aktivierten E-Mail-Benachrichtigungen.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email-select">E-Mail-Adresse auswählen</Label>
                    <Select value={selectedEmail} onValueChange={setSelectedEmail}>
                      <SelectTrigger id="email-select">
                        <SelectValue placeholder="E-Mail auswählen..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="alle">alle</SelectItem>
                        {userEmails.map((email) => (
                          <SelectItem key={email} value={email}>
                            {email}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <Button
                    onClick={handleTestEmailNotifications}
                    disabled={testingEmail}
                    variant="outline"
                    className="w-full"
                  >
                    {testingEmail ? (
                      <>
                        <Upload className="w-4 h-4 mr-2 animate-spin" />
                        Sende Test-E-Mails...
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4 mr-2" />
                        Test-E-Mails versenden
                      </>
                    )}
                  </Button>

                  {emailTestResult && (
                    <div className={`p-4 rounded-lg border ${
                      emailTestResult.includes('erfolgreich') 
                        ? 'bg-green-50 border-green-200 text-green-800' 
                        : 'bg-red-50 border-red-200 text-red-800'
                    }`}>
                      <p className="text-sm font-medium">{emailTestResult}</p>
                    </div>
                  )}
                </div>

                <div className="text-xs text-muted-foreground">
                  <p><strong>Hinweis:</strong> Bestehende Abfallkalender-Daten werden vor dem Import gelöscht und durch die neuen Daten ersetzt.</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="email-send">
            <Card className="max-w-2xl mx-auto">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Upload className="w-5 h-5 mr-2" />
                  Mailversand
                </CardTitle>
                <CardDescription>
                  Senden Sie benutzerdefinierte E-Mails an alle Benutzer mit aktivierten E-Mail-Benachrichtigungen oder an eine spezifische E-Mail-Adresse.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="custom-email-subject">Betreffzeile</Label>
                  <Input
                    id="custom-email-subject"
                    type="text"
                    placeholder="z.B. Wichtige Mitteilung"
                    value={customEmailSubject}
                    onChange={(e) => setCustomEmailSubject(e.target.value)}
                    maxLength={200}
                  />
                  <p className="text-sm text-muted-foreground">
                    Optional. Standard: "Nachricht von Schlossstadt.Info"
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="custom-email-content">Mail-Inhalt *</Label>
                  <Textarea
                    id="custom-email-content"
                    placeholder="Geben Sie hier den Inhalt Ihrer E-Mail ein..."
                    value={customEmailContent}
                    onChange={(e) => setCustomEmailContent(e.target.value)}
                    rows={10}
                    maxLength={5000}
                    required
                  />
                  <p className="text-sm text-muted-foreground">
                    Erforderlich. Maximale Länge: 5000 Zeichen
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="custom-email-theme">Mail-Theme</Label>
                  <Select value={customEmailTheme} onValueChange={setCustomEmailTheme}>
                    <SelectTrigger id="custom-email-theme">
                      <SelectValue placeholder="Theme auswählen..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="standard">Standard</SelectItem>
                      <SelectItem value="advent">Advent 🕯️</SelectItem>
                      <SelectItem value="christmas">Weihnachten 🎄</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-sm text-muted-foreground">
                    Wählen Sie das Design für Ihre E-Mail aus.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="custom-email-recipient">E-Mail-Adresse auswählen</Label>
                  <Select value={customEmailRecipient} onValueChange={setCustomEmailRecipient}>
                    <SelectTrigger id="custom-email-recipient">
                      <SelectValue placeholder="E-Mail auswählen..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="alle">alle</SelectItem>
                      {userEmails.map((email) => (
                        <SelectItem key={email} value={email}>
                          {email}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-sm text-muted-foreground">
                    E-Mails werden nur an Benutzer mit aktivierten Benachrichtigungen gesendet.
                  </p>
                </div>

                <Button
                  onClick={handleSendCustomEmail}
                  disabled={sendingCustomEmail || !customEmailContent.trim()}
                  className="w-full"
                >
                  {sendingCustomEmail ? (
                    <>
                      <Upload className="w-4 h-4 mr-2 animate-spin" />
                      Sende E-Mails...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4 mr-2" />
                      E-Mails versenden
                    </>
                  )}
                </Button>

                {customEmailResult && (
                  <div className={`p-4 rounded-lg border ${
                    customEmailResult.includes('erfolgreich') 
                      ? 'bg-green-50 border-green-200 text-green-800' 
                      : 'bg-red-50 border-red-200 text-red-800'
                  }`}>
                    <p className="text-sm font-medium">{customEmailResult}</p>
                  </div>
                )}

                <div className="text-xs text-muted-foreground">
                  <p><strong>Hinweis:</strong> Die E-Mails werden nur an Benutzer mit aktivierten E-Mail-Benachrichtigungen versendet.</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Admin;
