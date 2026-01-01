// components/EventMap.tsx
'use client';

import { MapContainer, TileLayer, Marker } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useEffect, useState } from 'react';

export function EventMap({ lat, lng }: { lat: number; lng: number }) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return (
      <div style={{ width: '100%', height: '300px', position: 'relative', zIndex: 0 }} className="bg-neutral-100 animate-pulse rounded" />
    );
  }

  return (
    <MapContainer
      center={{ lat, lng }}
      zoom={16}
      scrollWheelZoom={false}
      style={{ width: '100%', height: '300px', position: 'relative', zIndex: 0 }}
      attributionControl={false}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution="&copy; OpenStreetMap contributors"
      />
      <Marker
        position={{ lat, lng }}
        icon={L.divIcon({
          className: 'custom-marker',
          html: `<div class="bg-vtk-yellow w-8 h-8 rounded-full flex items-center justify-center shadow-lg">📍</div>`,
          iconSize: [32, 32],
          iconAnchor: [16, 32],
        })}
      />
    </MapContainer>
  );
}