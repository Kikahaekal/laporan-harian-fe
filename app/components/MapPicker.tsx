import { useState, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  CircularProgress,
} from "@mui/material";
import { useJsApiLoader, GoogleMap, Marker } from "@react-google-maps/api";

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

  if (!apiKey) {
    return (
      <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
        <DialogTitle>Pilih Lokasi di Peta</DialogTitle>
        <DialogContent>
          <Typography color="text.secondary">
            API key belum diatur. Tambahkan VITE_GOOGLE_MAPS_API_KEY di file .env
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Tutup</Button>
        </DialogActions>
      </Dialog>
    );
  }

  if (loadError) {
    return (
      <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
        <DialogTitle>Pilih Lokasi di Peta</DialogTitle>
        <DialogContent>
          <Typography color="error">Gagal memuat peta. Periksa API key.</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Tutup</Button>
        </DialogActions>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Pilih Lokasi di Peta</DialogTitle>
      <DialogContent>
        <Box sx={{ width: "100%", height: 400, mt: 1 }}>
          {!isLoaded ? (
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                height: "100%",
              }}
            >
              <CircularProgress />
            </Box>
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
        </Box>
        {isLoaded && (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Klik di peta atau geser marker untuk mengatur lokasi.
          </Typography>
        )}
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose} color="inherit">
          Batal
        </Button>
        <Button
          onClick={handleConfirm}
          variant="contained"
          disabled={!isLoaded}
        >
          Gunakan lokasi ini
        </Button>
      </DialogActions>
    </Dialog>
  );
}
