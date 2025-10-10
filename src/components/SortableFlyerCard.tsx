import { useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, FileText, Download, Eye, ExternalLink, GripVertical, Edit, Trash2, Info, Search, Package, FileQuestion } from "lucide-react";

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
  background_image_url: string | null;
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
  const [showUnsubscribeInfo, setShowUnsubscribeInfo] = useState(false);
  const [showPickupInfo, setShowPickupInfo] = useState(false);
  const [showExternalUrlInfo, setShowExternalUrlInfo] = useState(false);
  const [showSearchOffersInfo, setShowSearchOffersInfo] = useState(false);
  const [showMyOffersInfo, setShowMyOffersInfo] = useState(false);
  const [showMyRequestsInfo, setShowMyRequestsInfo] = useState(false);
  
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

  // Generate preview URL for external links without background image
  const getPreviewImageUrl = (flyer: Flyer) => {
    if (flyer.background_image_url) {
      return flyer.background_image_url;
    }
    
    if (flyer.is_external && flyer.external_url) {
      // Use thum.io service with parameters to minimize cookie banners
      const encodedUrl = encodeURIComponent(flyer.external_url);
      return `https://image.thum.io/get/width/400/crop/800/allowJPG/wait/20/noanimate/${flyer.external_url}`;
    }
    
    return null;
  };

  const previewImageUrl = getPreviewImageUrl(flyer);

  const handleComplaintClick = () => {
    if (!userProfile) return;
    
    // Build the URL with pre-filled data
    const baseUrl = "https://www.rag-koeln.de/WebAdRAG/de-de/14/Reklamation";
    const params = new URLSearchParams();
    
    // Pre-fill with profile data using correct field names
    //if (userProfile.first_name) params.append('Vorname', userProfile.first_name);
    //if (userProfile.last_name) params.append('Nachname', userProfile.last_name);
    //if (userProfile.email) params.append('Email', userProfile.email);
    //if (userProfile.street) params.append('Strasse', userProfile.street);
    //if (userProfile.house_number) params.append('HsNr', userProfile.house_number);
    
    // Pre-fill the reason with the correct field name and value
    params.append('GewaehlterGrund', '5');
    
    const urlWithParams = `${baseUrl}?${params.toString()}`;
    window.open(urlWithParams, '_blank');
  };

  return (
    <Card 
      ref={setNodeRef}
      style={style}
      className={`relative overflow-hidden hover:shadow-lg transition-shadow ${isDragging ? 'z-50' : ''} ${isCustomSort ? 'cursor-grab active:cursor-grabbing' : ''}`}
      {...(isCustomSort ? { ...attributes, ...listeners } : {})}
    >
      {/* Background Image */}
      {previewImageUrl && (
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-30"
          style={{ backgroundImage: `url(${previewImageUrl})` }}
        />
      )}
      
      {/* Content overlay */}
      <div className="relative z-10">
        <CardHeader>
          <CardTitle className="flex items-start space-x-2 text-primary-dark">
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
            <p className="text-sm text-primary-dark line-clamp-3">
              {flyer.description}
            </p>
          )}
          
          {!flyer.is_external && (
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>{flyer.file_name}</span>
              <span>{formatFileSize(flyer.file_size)}</span>
            </div>
          )}

          {user && (
            <div className="space-y-2">
              {flyer.info_types?.name !== 'NachbarNetz' && (
                <div className="flex space-x-2">
                  {flyer.is_external ? (
                    <div className="flex gap-2 w-full">
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => onViewFlyer(flyer)}
                        className="flex-1"
                      >
                        <ExternalLink className="w-4 h-4 mr-2" />
                        Link öffnen
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowExternalUrlInfo(!showExternalUrlInfo)}
                        className="px-3"
                      >
                        <Info className="w-4 h-4" />
                      </Button>
                    </div>
                  ) : (
                    <>
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => onViewFlyer(flyer)}
                        className="flex-1"
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        Anzeigen
                      </Button>
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => onDownloadFlyer(flyer)}
                        className="flex-1"
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Download
                      </Button>
                    </>
                  )}
                </div>
              )}
              
              {flyer.is_external && showExternalUrlInfo && (
                <div className="text-sm text-black bg-muted/50 p-3 rounded-md break-all">
                  {flyer.external_url}
                </div>
              )}
              
              {flyer.info_types?.name === 'Zeitung' && userProfile && (
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleComplaintClick}
                      className="flex-1"
                    >
                      Papierversion abbestellen
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowUnsubscribeInfo(!showUnsubscribeInfo)}
                      className="px-3"
                    >
                      <Info className="w-4 h-4" />
                    </Button>
                  </div>
                  {showUnsubscribeInfo && (
                    <div className="text-sm text-black bg-muted/50 p-3 rounded-md">
                      Weiterleitung auf die Zustellerseite. Bitte dort den Grund "Zeitung bitte nicht mehr zustellen!" auswählen.
                    </div>
                  )}
                </div>
              )}
              
              {flyer.info_types?.name === 'Abfallkalender' && userProfile && (
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open('/abholtermine', '_self')}
                      className="flex-1"
                    >
                      Meine Abholtermine
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowPickupInfo(!showPickupInfo)}
                      className="px-3"
                    >
                      <Info className="w-4 h-4" />
                    </Button>
                  </div>
                  {showPickupInfo && (
                    <div className="text-sm text-black bg-muted/50 p-3 rounded-md">
                      Anzeige der Müllabfuhrtermine Deiner Straße für die nächsten vier Wochen.
                    </div>
                  )}
                </div>
              )}
              
              {flyer.info_types?.name === 'NachbarNetz' && userProfile && (
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {/* TODO: Implement search offers */}}
                      className="flex-1"
                    >
                      <Search className="w-4 h-4 mr-2" />
                      Angebote suchen
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowSearchOffersInfo(!showSearchOffersInfo)}
                      className="px-3"
                    >
                      <Info className="w-4 h-4" />
                    </Button>
                  </div>
                  {showSearchOffersInfo && (
                    <div className="text-sm text-black bg-muted/50 p-3 rounded-md">
                      Finde passende Angebote von Deinen Nachbarn.
                    </div>
                  )}
                  
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {/* TODO: Implement my offers */}}
                      className="flex-1"
                    >
                      <Package className="w-4 h-4 mr-2" />
                      Ich biete
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowMyOffersInfo(!showMyOffersInfo)}
                      className="px-3"
                    >
                      <Info className="w-4 h-4" />
                    </Button>
                  </div>
                  {showMyOffersInfo && (
                    <div className="text-sm text-black bg-muted/50 p-3 rounded-md">
                      Angebote für Nachbarn einstellen
                    </div>
                  )}
                  
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {/* TODO: Implement my requests */}}
                      className="flex-1"
                    >
                      <FileQuestion className="w-4 h-4 mr-2" />
                      Mein Bereich
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowMyRequestsInfo(!showMyRequestsInfo)}
                      className="px-3"
                    >
                      <Info className="w-4 h-4" />
                    </Button>
                  </div>
                  {showMyRequestsInfo && (
                    <div className="text-sm text-black bg-muted/50 p-3 rounded-md">
                      Meine Angebote und Anfragen dazu verwalten.
                    </div>
                  )}
                </div>
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
      </div>
    </Card>
  );
};