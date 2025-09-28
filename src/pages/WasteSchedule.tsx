import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { CalendarIcon, ArrowLeft } from "lucide-react";
import { format, addDays, isAfter } from "date-fns";
import { de } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface WasteCollection {
  collection_date: string;
  waste_type: string;
  district: string;
  notes?: string;
}

interface Street {
  name: string;
}

interface UserProfile {
  street: string | null;
}

const WasteSchedule = () => {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [streets, setStreets] = useState<Street[]>([]);
  const [selectedStreet, setSelectedStreet] = useState<string>("");
  const [selectedWasteType, setSelectedWasteType] = useState<string>("alle");
  const [fromDate, setFromDate] = useState<Date>(new Date());
  const [collections, setCollections] = useState<WasteCollection[]>([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const wasteTypes = [
    { value: "alle", label: "Alle" },
    { value: "Restmülltonne", label: "Restmülltonne" },
    { value: "Gelber Sack", label: "Gelber Sack" },
    { value: "Papiertonne", label: "Blaue Tonne" },
    { value: "Biotonne", label: "Biotonne" }
  ];

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user ?? null);
        if (session?.user) {
          loadUserProfile(session.user.id);
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        loadUserProfile(session.user.id);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    loadStreets();
  }, []);

  useEffect(() => {
    if (selectedStreet && fromDate) {
      loadWasteCollections();
    }
  }, [selectedStreet, selectedWasteType, fromDate]);

  const loadUserProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('street')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) {
        console.error('Error loading user profile:', error);
      } else if (data) {
        setUserProfile(data);
        if (data.street) {
          setSelectedStreet(data.street);
        }
      }
    } catch (error) {
      console.error('Error loading user profile:', error);
    }
  };

  const loadStreets = async () => {
    try {
      const { data, error } = await supabase
        .from('street_districts')
        .select('street_name')
        .order('street_name');

      if (error) {
        console.error('Error loading streets:', error);
        return;
      }

      // Remove duplicates
      const uniqueStreets = Array.from(new Set(data?.map(item => item.street_name) || []))
        .map(name => ({ name }));
      
      setStreets(uniqueStreets);
    } catch (error) {
      console.error('Error loading streets:', error);
    }
  };

  const loadWasteCollections = async () => {
    if (!selectedStreet) return;

    setLoading(true);
    try {
      // First, get districts for the selected street
      const { data: streetDistricts, error: streetError } = await supabase
        .from('street_districts')
        .select('district, notes')
        .eq('street_name', selectedStreet);

      if (streetError) {
        console.error('Error loading street districts:', streetError);
        toast({
          title: "Fehler",
          description: "Bezirke konnten nicht geladen werden.",
          variant: "destructive",
        });
        return;
      }

      if (!streetDistricts || streetDistricts.length === 0) {
        setCollections([]);
        return;
      }

      const districts = streetDistricts.map(sd => sd.district);
      const districtNotes = streetDistricts.reduce((acc, sd) => {
        acc[sd.district] = sd.notes;
        return acc;
      }, {} as Record<string, string | null>);

      // Calculate date range (2 weeks from selected date)
      const endDate = addDays(fromDate, 14);

      // Build waste type filter
      let wasteTypeFilter = selectedWasteType === 'alle' 
        ? ['Restmülltonne', 'Gelber Sack', 'Papiertonne', 'Biotonne']
        : [selectedWasteType];

      // Query waste collections
      let query = supabase
        .from('waste_collection_schedule')
        .select('*')
        .in('district', districts)
        .in('waste_type', wasteTypeFilter)
        .gte('collection_date', format(fromDate, 'yyyy-MM-dd'))
        .lte('collection_date', format(endDate, 'yyyy-MM-dd'))
        .order('collection_date');

      const { data: wasteData, error: wasteError } = await query;

      if (wasteError) {
        console.error('Error loading waste collections:', wasteError);
        toast({
          title: "Fehler",
          description: "Abholtermine konnten nicht geladen werden.",
          variant: "destructive",
        });
        return;
      }

      // Add notes to collections and sort by notes first, then by date
      const collectionsWithNotes = (wasteData || []).map(collection => ({
        ...collection,
        notes: districtNotes[collection.district]
      })).sort((a, b) => {
        // First sort by notes (primary) - handle null/undefined values
        const notesA = (a.notes || '').toString().trim();
        const notesB = (b.notes || '').toString().trim();
        const notesComparison = notesA.localeCompare(notesB, 'de', { numeric: true, sensitivity: 'base' });
        
        if (notesComparison !== 0) {
          return notesComparison;
        }
        
        // Then sort by collection_date (secondary)
        const dateA = new Date(a.collection_date);
        const dateB = new Date(b.collection_date);
        return dateA.getTime() - dateB.getTime();
      });

      setCollections(collectionsWithNotes);
    } catch (error) {
      console.error('Error loading waste collections:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-light via-background to-accent-light">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <Button
            variant="outline"
            onClick={() => navigate('/')}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Zurück
          </Button>
        </div>

        <Card className="max-w-4xl mx-auto">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-primary-dark">
              Meine Abholtermine
            </CardTitle>
            <CardDescription>
              Finden Sie Ihre persönlichen Müllabholtermine für die nächsten zwei Wochen
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Input Fields */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Street Selection */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Straße</label>
                <Select value={selectedStreet} onValueChange={setSelectedStreet}>
                  <SelectTrigger>
                    <SelectValue placeholder="Straße auswählen..." />
                  </SelectTrigger>
                  <SelectContent>
                    {streets.map((street) => (
                      <SelectItem key={street.name} value={street.name}>
                        {street.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Waste Type Selection */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Abfallart</label>
                <Select value={selectedWasteType} onValueChange={setSelectedWasteType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {wasteTypes.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Date Selection */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Ab Datum</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !fromDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {fromDate ? format(fromDate, "PPP", { locale: de }) : <span>Datum wählen</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={fromDate}
                      onSelect={(date) => date && setFromDate(date)}
                      initialFocus
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            {/* Results Table */}
            {selectedStreet && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Abholtermine für die nächsten 2 Wochen</h3>
                
                {loading ? (
                  <div className="text-center py-8">
                    <p>Lade Abholtermine...</p>
                  </div>
                ) : collections.length > 0 ? (
                  <div className="border rounded-lg">
                    <Table>
                       <TableHeader>
                         <TableRow>
                           <TableHead>Abholdatum</TableHead>
                           <TableHead>Abfallart</TableHead>
                           <TableHead>Bemerkung</TableHead>
                           <TableHead>Bezirk</TableHead>
                         </TableRow>
                       </TableHeader>
                      <TableBody>
                         {collections.map((collection, index) => (
                           <TableRow key={index}>
                             <TableCell className="font-medium">
                               {format(new Date(collection.collection_date), "EEEE, dd.MM.yyyy", { locale: de })}
                             </TableCell>
                             <TableCell>{collection.waste_type}</TableCell>
                             <TableCell>{collection.notes || "-"}</TableCell>
                             <TableCell>{collection.district}</TableCell>
                           </TableRow>
                         ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>Keine Abholtermine für den ausgewählten Zeitraum gefunden.</p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default WasteSchedule;