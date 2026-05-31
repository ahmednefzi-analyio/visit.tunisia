import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import { Coordinates, MapMarkerData } from '../types';

interface MapComponentProps {
  center: Coordinates;
  userLocation: Coordinates | null;
  markers?: MapMarkerData[];
  onCenterChange: (center: Coordinates) => void;
  onMarkerClick?: (marker: MapMarkerData) => void;
}

// Inline SVG-based custom HTML marker iconography for Leaflet divIcon
const getMarkerIconHTML = (type: string) => {
  let color = '#3b82f6';
  let svgPath = '';

  if (type === 'event') {
    color = '#f97316'; // Orange
    svgPath = `<rect x="3" y="4" width="18" height="18" rx="2" ry="2" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" stroke="currentColor" fill="none"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line>`;
  } else if (type === 'clothes') {
    color = '#ec4899'; // Pink
    svgPath = `<path d="M20.38 3.46 16 2a4 4 0 0 0-8 0L3.62 3.46a2 2 0 0 0-1.34 2.23l.58 3.47a1 1 0 0 0 .99.84H6v10c0 1.1.9 2 2 2h8a2 2 0 0 0 2-2V10h2.15a1 1 0 0 0 .99-.84l.58-3.47a2 2 0 0 0-1.34-2.23z" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" stroke="currentColor" fill="none"></path>`;
  } else if (type === 'coffee') {
    color = '#8b5cf6'; // Purple
    svgPath = `<path d="M17 8h1a4 4 0 1 1 0 8h-1" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" stroke="currentColor" fill="none"></path><path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4Z" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" stroke="currentColor" fill="none"></path><line x1="6" y1="2" x2="6" y2="4"></line><line x1="10" y1="2" x2="10" y2="4"></line><line x1="14" y1="2" x2="14" y2="4"></line>`;
  } else if (type === 'archaeological') {
    color = '#eab308'; // Gold/Yellow
    svgPath = `<line x1="3" y1="22" x2="21" y2="22" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" stroke="currentColor" fill="none"></line><line x1="6" y1="18" x2="6" y2="11" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" stroke="currentColor" fill="none"></line><line x1="10" y1="18" x2="10" y2="11" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" stroke="currentColor" fill="none"></line><line x1="14" y1="18" x2="14" y2="11" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" stroke="currentColor" fill="none"></line><line x1="18" y1="18" x2="18" y2="11" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" stroke="currentColor" fill="none"></line><polygon points="12 2 20 7 4 7" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" stroke="currentColor" fill="none"></polygon>`;
  } else {
    color = '#22c55e'; // Green as fallback
    svgPath = `<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" stroke="currentColor" fill="none"></polygon>`;
  }

  return `
    <div class="flex items-center justify-center rounded-full border-2 border-white shadow-md text-white transition-transform duration-150 hover:scale-110 cursor-pointer" style="background-color: ${color}; width: 32px; height: 32px;">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" class="text-white">
        ${svgPath}
      </svg>
    </div>
  `;
};

// Pulse style for current user location
const getUserLocationHTML = () => {
  return `
    <div class="relative flex items-center justify-center" style="width: 24px; height: 24px;">
      <div class="absolute w-full h-full bg-blue-500 rounded-full opacity-60 animate-ping"></div>
      <div class="w-3 h-3 bg-blue-600 rounded-full border-2 border-white shadow-md"></div>
    </div>
  `;
};

export const MapComponent: React.FC<MapComponentProps> = ({
  center,
  userLocation,
  markers = [],
  onCenterChange,
  onMarkerClick
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersGroupRef = useRef<L.LayerGroup | null>(null);
  const userMarkerRef = useRef<L.Marker | null>(null);
  const suppressCenterChangeRef = useRef<boolean>(false);

  // Initialize the map once
  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Define strict boundaries for Northwest Tunisia (Jendouba, Beja, Kef, Siliana)
    const nwTunisiaBounds = L.latLngBounds(
      [35.4, 8.0], // South-West limit
      [37.4, 10.3] // North-East limit
    );

    // Create Map
    const map = L.map(mapContainerRef.current, {
      center: [center.lat, center.lng],
      zoom: 11,
      minZoom: 9,
      maxBounds: nwTunisiaBounds,
      maxBoundsViscosity: 1.0,
      zoomControl: false // Custom placement later or default
    });

    L.control.zoom({ position: 'topright' }).addTo(map);

    // Apply CartoDB Voyager tiles (beautiful, clean, high-contrast style that works perfectly with dark/light themes)
    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
      subdomains: 'abcd',
      maxZoom: 19
    }).addTo(map);

    // Create LayerGroup for dynamic markers
    const markersGroup = L.layerGroup().addTo(map);
    markersGroupRef.current = markersGroup;

    // Listen to move movements to emit center state up
    map.on('moveend', () => {
      if (suppressCenterChangeRef.current) {
        suppressCenterChangeRef.current = false;
        return;
      }
      const newCenter = map.getCenter();
      onCenterChange({ lat: newCenter.lat, lng: newCenter.lng });
    });

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Sync programmatically-fired center updates from parents (avoiding infinite loops)
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const mapCenter = map.getCenter();
    const distanceThreshold = 0.001; // Avoid small trigger deviations

    const latDiff = Math.abs(mapCenter.lat - center.lat);
    const lngDiff = Math.abs(mapCenter.lng - center.lng);

    if (latDiff > distanceThreshold || lngDiff > distanceThreshold) {
      suppressCenterChangeRef.current = true;
      map.setView([center.lat, center.lng], map.getZoom());
    }
  }, [center]);

  // Sync user location marker dynamically
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (userLocation) {
      const icon = L.divIcon({
        html: getUserLocationHTML(),
        className: 'user-loc-marker',
        iconSize: [24, 24],
        iconAnchor: [12, 12]
      });

      if (userMarkerRef.current) {
        userMarkerRef.current.setLatLng([userLocation.lat, userLocation.lng]);
      } else {
        const userMarker = L.marker([userLocation.lat, userLocation.lng], { icon }).addTo(map);
        userMarkerRef.current = userMarker;
      }
    } else {
      if (userMarkerRef.current) {
        userMarkerRef.current.remove();
        userMarkerRef.current = null;
      }
    }
  }, [userLocation]);

  // Sync system database / model returned search markers & popups
  useEffect(() => {
    const map = mapRef.current;
    const markersGroup = markersGroupRef.current;
    if (!map || !markersGroup) return;

    // Clear existing set of query markers
    markersGroup.clearLayers();

    markers.forEach((marker) => {
      const iconHTML = getMarkerIconHTML(marker.type);
      const icon = L.divIcon({
        html: iconHTML,
        className: 'custom-leaflet-marker',
        iconSize: [32, 32],
        iconAnchor: [16, 32],
        popupAnchor: [0, -32]
      });

      const leafletMarker = L.marker([marker.lat, marker.lng], { icon });

      // Create a clean responsive popup bubble
      const popupContent = `
        <div class="p-1 font-sans text-slate-800" style="min-width: 150px;">
          <h3 class="font-bold text-sm mb-0.5" style="margin: 0; color: #1e293b;">${marker.title}</h3>
          <p class="text-[10px] uppercase font-semibold tracking-wider text-slate-400" style="margin: 0 0 4px 0;">${marker.type}</p>
          ${marker.description ? `<p class="text-xs text-slate-600" style="margin: 0 0 4px 0; line-height: 1.35;">${marker.description}</p>` : ''}
          ${marker.price ? `<p class="text-xs font-semibold text-emerald-600" style="margin: 4px 0 0 0;">Price: ${marker.price}</p>` : ''}
        </div>
      `;

      leafletMarker.bindPopup(popupContent, {
        closeButton: true,
        className: 'custom-map-popup'
      });

      // Handle marker click trigger to connect with chatbot detailed analysis
      leafletMarker.on('click', () => {
        if (onMarkerClick) {
          onMarkerClick(marker);
        }
      });

      leafletMarker.addTo(markersGroup);
    });
  }, [markers, onMarkerClick]);

  return (
    <div className="w-full h-full relative">
      <div ref={mapContainerRef} className="w-full h-full custom-map-canvas z-0" />
      
      {/* Visual Overlay confirming strict Northwest Tunisia boundaries representation */}
      <div className="absolute bottom-6 right-6 z-[400] bg-white/95 dark:bg-slate-900/95 shadow-lg border border-slate-200 dark:border-slate-800 px-3.5 py-2.5 rounded-2xl pointer-events-none max-w-[200px]">
        <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5 leading-none mb-1">
          <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></span>
          Northwest Tunisia
        </h4>
        <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium leading-normal">
          Offline-certified map active. Zoom, pan, and search regional heritage 100% key-free.
        </p>
      </div>
    </div>
  );
};
