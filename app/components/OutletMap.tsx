import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { type OutletData } from "../pages/data/constant";

// Fix Leaflet's default icon issue with webpack/vite
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

export function OutletMap({ outlets }: { outlets: OutletData[] }) {
  // Center map on the average coordinates or a default center (e.g., Jakarta / specific city)
  const validOutlets = outlets.filter((o) => o.coor_latitude && o.coor_longitude);
  
  const centerLat = validOutlets.length > 0 
    ? validOutlets.reduce((sum, o) => sum + Number(o.coor_latitude), 0) / validOutlets.length 
    : -6.2088; // Default Jakarta
  const centerLng = validOutlets.length > 0 
    ? validOutlets.reduce((sum, o) => sum + Number(o.coor_longitude), 0) / validOutlets.length 
    : 106.8456;

  return (
    <div className="w-full h-[500px] rounded-2xl overflow-hidden border border-gray-200 shadow-sm relative z-0">
      <MapContainer 
        center={[centerLat, centerLng]} 
        zoom={12} 
        scrollWheelZoom={false} 
        style={{ width: "100%", height: "100%", zIndex: 0 }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {validOutlets.map((outlet) => (
          <Marker 
            key={outlet.id} 
            position={[Number(outlet.coor_latitude), Number(outlet.coor_longitude)]}
          >
            <Popup>
              <div className="font-sans">
                <h3 className="font-bold text-gray-900">{outlet.name}</h3>
                <p className="text-sm text-gray-600 mb-1">{outlet.address}</p>
                <div className="text-xs text-gray-500">
                  <span className="font-semibold">Pemilik:</span> {outlet.owner_name}
                </div>
                <div className="text-xs text-gray-500">
                  <span className="font-semibold">Jadwal:</span> {outlet.visit_day}
                </div>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
