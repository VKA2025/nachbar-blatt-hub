import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, FileText, Download, Eye, ExternalLink, GripVertical, Edit, Trash2 } from "lucide-react";

interface Flyer {
  id: string;
  title: string;
  description: string | null;
  file_url: string | null;
  file_name: string | null;
  file_size: number | null;
  external_url: string | null;
  is_external: boolean;
  upload_date: string;
  created_at: string;
  info_type_id: string | null;
  info_types?: {
    id: string;
    name: string;
  };
}

interface SortableFlyerCardProps {
  flyer: Flyer;
  isCustomSort: boolean;
  user: any;
  userProfile: {
    id: string;
    user_id: string;
    first_name: string | null;
    last_name: string | null;
    email: string | null;
    street: string | null;
    house_number: string | null;
  } | null;
  isAdmin: boolean;
  onViewFlyer: (flyer: Flyer) => void;
  onDownloadFlyer: (flyer: Flyer) => void;
  onEditFlyer?: (flyer: Flyer) => void;
  onDeleteFlyer?: (flyer: Flyer) => void;
  formatFileSize: (bytes: number | null) => string;
  formatUploadDate: (dateString: string) => string;
}

export const SortableFlyerCard = ({ 
  flyer, 
  isCustomSort, 
  user, 
  userProfile,
  isAdmin,
  onViewFlyer, 
  onDownloadFlyer, 
  onEditFlyer,
  onDeleteFlyer,
  formatFileSize, 
  formatUploadDate 
}: SortableFlyerCardProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: flyer.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const handleComplaintClick = async () => {
    if (!userProfile) return;
    
    // Copy instruction text to clipboard
    const instructionText = `Bitte wählen Sie im Formular: "Zeitung bitte nicht mehr zustellen!"`;
    
    try {
      await navigator.clipboard.writeText(instructionText);
      // Show toast notification
      const { toast } = await import("@/hooks/use-toast");
      toast({
        title: "Anweisung kopiert",
        description: "Die Anweisung wurde in die Zwischenablage kopiert. Das Formular wird jetzt geöffnet.",
      });
    } catch (error) {
      console.log("Clipboard not available");
    }
    
    // Open the complaint form
    const baseUrl = "https://www.rag-koeln.de/WebAdRAG/de-de/14/Reklamation";
    window.open(baseUrl, '_blank');
  };

  return (
    <Card 
      ref={setNodeRef}
      style={style}
      className={`hover:shadow-lg transition-shadow ${isDragging ? 'z-50' : ''} ${isCustomSort ? 'cursor-grab active:cursor-grabbing' : ''}`}
      {...(isCustomSort ? { ...attributes, ...listeners } : {})}
    >
      <CardHeader>
        <CardTitle className="flex items-start space-x-2 text-primary">
          {flyer.is_external ? (
            <ExternalLink className="w-5 h-5 mt-0.5 flex-shrink-0" />
          ) : (
            <FileText className="w-5 h-5 mt-0.5 flex-shrink-0" />
          )}
          <span className="line-clamp-2">{flyer.title}</span>
        </CardTitle>
        <div className="flex items-center justify-between">
          <CardDescription className="flex items-center space-x-2">
            <Calendar className="w-4 h-4" />
            <span>{formatUploadDate(flyer.upload_date)}</span>
          </CardDescription>
          <div className="flex items-center space-x-2">
            {flyer.info_types?.name && (
              <Badge variant="outline" className="text-xs">
                {flyer.info_types.name}
              </Badge>
            )}
            {flyer.is_external && (
              <Badge variant="secondary" className="text-xs">
                Externer Link
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {flyer.description && (
          <p className="text-sm text-muted-foreground line-clamp-3">
            {flyer.description}
          </p>
        )}
        
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          {flyer.is_external ? (
            <span className="break-all line-clamp-2">{flyer.external_url}</span>
          ) : (
            <>
              <span>{flyer.file_name}</span>
              <span>{formatFileSize(flyer.file_size)}</span>
            </>
          )}
        </div>

        {user && (
          <div className="space-y-2">
            <div className="flex space-x-2">
              <Button
                variant="default"
                size="sm"
                onClick={() => onViewFlyer(flyer)}
                className="flex-1"
              >
                {flyer.is_external ? (
                  <>
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Link öffnen
                  </>
                ) : (
                  <>
                    <Eye className="w-4 h-4 mr-2" />
                    Anzeigen
                  </>
                )}
              </Button>
              {!flyer.is_external && (
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => onDownloadFlyer(flyer)}
                  className="flex-1"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download
                </Button>
              )}
            </div>
            
            {flyer.info_types?.name === 'Zeitung' && userProfile && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleComplaintClick}
                className="w-full"
              >
                Papierversion abbestellen
              </Button>
            )}
            
            {isAdmin && (
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onEditFlyer?.(flyer)}
                  className="flex-1"
                >
                  <Edit className="w-4 h-4 mr-2" />
                  Bearbeiten
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => onDeleteFlyer?.(flyer)}
                  className="flex-1"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Löschen
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};