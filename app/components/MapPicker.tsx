import { useState, useEffect, useCallback } from "react";
import { useJsApiLoader, GoogleMap, Marker } from "@react-google-maps/api";
import { Loader2, X } from "lucide-react";

const DEFAULT_CENTER = { lat: 0.918, lng: 104.51 };
const MAP_CONTAINER_STYLE = { width: "100%", height: "400px" };

export interface MapPickerProps {
  open: boolean;
  onClose: () => void;
  initialLat?: number;
  initialLng?: number;
  onConfirm: (lat: number, lng: number) => void;
}

export default function MapPicker({
  open,
  onClose,
  initialLat,
  initialLng,
  onConfirm,
}: MapPickerProps) {
  const apiKey = (import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string) ?? "";

  const [position, setPosition] = useState<{ lat: number; lng: number }>(() => ({
    lat: initialLat ?? DEFAULT_CENTER.lat,
    lng: initialLng ?? DEFAULT_CENTER.lng,
  }));

  const { isLoaded, loadError } = useJsApiLoader({
    id: "google-map-script",
    googleMapsApiKey: apiKey,
  });

  useEffect(() => {
    if (open) {
      setPosition({
        lat: initialLat ?? DEFAULT_CENTER.lat,
        lng: initialLng ?? DEFAULT_CENTER.lng,
      });
    }
  }, [open, initialLat, initialLng]);

  const handleMapClick = useCallback((e: google.maps.MapMouseEvent) => {
    const latLng = e.latLng;
    if (latLng) {
      setPosition({ lat: latLng.lat(), lng: latLng.lng() });
    }
  }, []);

  const handleMarkerDragEnd = useCallback((e: google.maps.MapMouseEvent) => {
    const latLng = e.latLng;
    if (latLng) {
      setPosition({ lat: latLng.lat(), lng: latLng.lng() });
    }
  }, []);

  const handleConfirm = () => {
    onConfirm(position.lat, position.lng);
    onClose();
  };

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-[100]" onClick={onClose} />
      <div className="fixed inset-0 z-[101] flex items-center justify-center p-4 pointer-events-none">
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg pointer-events-auto flex flex-col">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <h3 className="font-bold text-gray-900 text-lg">Pilih Lokasi di Peta</h3>
            <button onClick={onClose} className="text-gray-400 hover:bg-gray-100 hover:text-gray-600 rounded-full p-1.5 transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
          
          <div className="p-5">
            {!apiKey ? (
              <p className="text-gray-500">API key belum diatur. Tambahkan VITE_GOOGLE_MAPS_API_KEY di file .env</p>
            ) : loadError ? (
              <p className="text-red-500">Gagal memuat peta. Periksa API key.</p>
            ) : (
              <div className="w-full h-[400px] bg-gray-100 rounded-xl overflow-hidden border border-gray-200">
                {!isLoaded ? (
                  <div className="flex items-center justify-center h-full">
                    <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
                  </div>
                ) : (
                  <GoogleMap
                    mapContainerStyle={MAP_CONTAINER_STYLE}
                    center={position}
                    zoom={15}
                    onClick={handleMapClick}
                    options={{ disableDefaultUI: false }}
                  >
                    <Marker
                      position={position}
                      draggable
                      onDragEnd={handleMarkerDragEnd}
                    />
                  </GoogleMap>
                )}
              </div>
            )}
            
            {isLoaded && !loadError && apiKey && (
              <p className="text-sm text-gray-500 mt-3">Klik di peta atau geser marker untuk mengatur lokasi.</p>
            )}
          </div>
          
          <div className="px-5 py-4 border-t border-gray-100 flex justify-end gap-2 bg-gray-50/50 rounded-b-2xl">
            <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg">
              Batal
            </button>
            <button 
              onClick={handleConfirm} 
              disabled={!isLoaded || !!loadError || !apiKey}
              className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg disabled:opacity-50 transition-colors"
            >
              Gunakan lokasi ini
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
