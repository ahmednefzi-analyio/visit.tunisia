import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { renderToStaticMarkup } from 'react-dom/server';
import { Calendar, Star, MapPin, Landmark, Shirt, Coffee } from 'lucide-react';
import { Coordinates, MapMarkerData } from '../types';

// Standard Marker Icon
const iconUrl = 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png';
const iconShadow = 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png';

const DefaultIcon = L.icon({
  iconUrl: iconUrl,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});

L.Marker.prototype.options.icon = DefaultIcon;

// Custom Icons
const createCustomIcon = (type: string) => {
  let color = '#3b82f6';
  let IconComponent = MapPin;

  if (type === 'event') {
    color = '#f97316';
    IconComponent = Calendar;
  } else if (type === 'clothes') {
    color = '#ec4899';
    IconComponent = Shirt;
  } else if (type === 'coffee') {
    color = '#8b5cf6';
    IconComponent = Coffee;
  } else if (type === 'archaeological') {
    color = '#eab308';
    IconComponent = Landmark;
  } else if (type === 'place') {
    color = '#eab308';
    IconComponent = Star;
  }
  
  const iconHtml = renderToStaticMarkup(
    <div style={{
      backgroundColor: color,
      width: '32px',
      height: '32px',
      borderRadius: '50%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      border: '2px solid white',
      boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
      color: 'white'
    }}>
      <IconComponent size={18} />
    </div>
  );

  return L.divIcon({
    html: iconHtml,
    className: 'custom-map-icon',
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -34],
  });
};

interface MapComponentProps {
  center: Coordinates;
  userLocation: Coordinates | null;
  markers?: MapMarkerData[];
  onCenterChange: (center: Coordinates) => void;
  onMarkerClick?: (marker: MapMarkerData) => void;
}

// Component to handle map movement events
const MapEvents: React.FC<{ onCenterChange: (c: Coordinates) => void }> = ({ onCenterChange }) => {
  const map = useMapEvents({
    moveend: () => {
      const center = map.getCenter();
      onCenterChange({ lat: center.lat, lng: center.lng });
    },
  });
  return null;
};

// Component to update view when center prop changes programmatically
const MapUpdater: React.FC<{ center: Coordinates }> = ({ center }) => {
  const map = useMap();
  
  useEffect(() => {
    const current = map.getCenter();
    const diffLat = Math.abs(current.lat - center.lat);
    const diffLng = Math.abs(current.lng - center.lng);
    
    if (diffLat > 0.0001 || diffLng > 0.0001) {
      map.flyTo([center.lat, center.lng], map.getZoom());
    }
  }, [center.lat, center.lng, map]);
  
  return null;
};

export const MapComponent: React.FC<MapComponentProps> = ({ 
  center, 
  userLocation, 
  markers = [], 
  onCenterChange,
  onMarkerClick
}) => {
  // Define strict bounds for Northwest Tunisia (Jendouba, Beja, Kef, Siliana)
  const nwTunisiaBounds: L.LatLngBoundsExpression = [
    [35.5, 8.0], // South-West limit
    [37.4, 10.0] // North-East limit
  ];

  return (
    <MapContainer
      center={[center.lat, center.lng]}
      zoom={13}
      minZoom={8}
      maxBounds={nwTunisiaBounds}
      maxBoundsViscosity={1.0}
      scrollWheelZoom={true}
      className="w-full h-full"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      
      {userLocation && (
        <Marker position={[userLocation.lat, userLocation.lng]}>
          <Popup>You are here</Popup>
        </Marker>
      )}

      {markers.map((marker) => (
        <Marker
          key={marker.id}
          position={[marker.lat, marker.lng]}
          icon={createCustomIcon(marker.type)}
          eventHandlers={{
            click: () => {
              if (onMarkerClick) onMarkerClick(marker);
            },
          }}
        >
          <Popup>
            <div className="min-w-[150px]">
              <h3 className="font-bold text-sm mb-1">{marker.title}</h3>
              <p className="text-xs text-gray-600 capitalize mb-1">{marker.type}</p>
              {marker.description && <p className="text-xs">{marker.description}</p>}
              {marker.price && <p className="text-xs font-semibold mt-1 text-green-700 dark:text-green-400">Price: {marker.price}</p>}
            </div>
          </Popup>
        </Marker>
      ))}

      <MapEvents onCenterChange={onCenterChange} />
      <MapUpdater center={center} />
    </MapContainer>
  );
};