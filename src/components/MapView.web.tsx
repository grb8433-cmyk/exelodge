import React, { useRef, useEffect } from 'react';
import L from 'leaflet';

const CITY_CENTERS: Record<string, [number, number]> = {
  exeter:       [50.7354, -3.5353],
  bristol:      [51.4584, -2.6030],
  southampton:  [50.9350, -1.3960],
};

// Only show pins within a sensible radius of each city — filters out bad geocoding
const CITY_BOUNDS: Record<string, { minLat: number; maxLat: number; minLon: number; maxLon: number }> = {
  exeter:      { minLat: 50.65, maxLat: 50.82, minLon: -3.70, maxLon: -3.40 },
  bristol:     { minLat: 51.38, maxLat: 51.58, minLon: -2.75, maxLon: -2.48 },
  southampton: { minLat: 50.85, maxLat: 51.02, minLon: -1.60, maxLon: -1.20 },
};

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

interface MapViewProps {
  properties: any[];
  universityId: string;
  onSelectProperty: (id: string) => void;
}

export default function MapView({ properties, universityId, onSelectProperty }: MapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  // Keep a stable ref to the callback so the marker effect doesn't re-run on every render
  const onSelectRef = useRef(onSelectProperty);
  useEffect(() => { onSelectRef.current = onSelectProperty; }, [onSelectProperty]);

  // Initialise (or re-centre) the map only when the university changes
  useEffect(() => {
    if (!containerRef.current) return;

    if (mapRef.current) {
      mapRef.current.remove();
      mapRef.current = null;
    }

    const center: [number, number] = CITY_CENTERS[universityId] ?? CITY_CENTERS.exeter;

    // Clear any stale Leaflet ID so re-initialisation never throws
    delete (containerRef.current as any)._leaflet_id;

    const map = L.map(containerRef.current, { center, zoom: 14 });
    mapRef.current = map;

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map);

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [universityId]);

  // Update markers whenever properties change (without touching the map centre)
  useEffect(() => {
    if (!mapRef.current) return;

    // Clear old markers
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    const bounds = CITY_BOUNDS[universityId];
    properties.forEach((p) => {
      if (!p.latitude || !p.longitude) return;
      if (bounds) {
        const lat = parseFloat(p.latitude);
        const lon = parseFloat(p.longitude);
        if (lat < bounds.minLat || lat > bounds.maxLat || lon < bounds.minLon || lon > bounds.maxLon) return;
      }
      const price = parseFloat(p.price_pppw);
      const color = price < 130 ? '#10B981' : price <= 180 ? '#F59E0B' : '#EF4444';

      const icon = L.divIcon({
        className: '',
        html: `<div style="background:${color};width:12px;height:12px;border-radius:50%;border:2px solid white;box-shadow:0 2px 4px rgba(0,0,0,0.3);"></div>`,
        iconSize: [12, 12],
        iconAnchor: [6, 6],
        popupAnchor: [0, -10],
      });

      const marker = L.marker([p.latitude, p.longitude], { icon });
      marker.addTo(mapRef.current);
      marker.bindPopup(`
        <div style="min-width:140px;font-family:sans-serif;">
          <div style="font-weight:700;font-size:13px;margin-bottom:4px;">${p.address || 'Property'}</div>
          <div style="color:#666;font-size:12px;margin-bottom:8px;">£${Math.round(price)} pppw</div>
          <button onclick="window.__mapSelectProperty('${p.id}')"
            style="background:#0B6E4F;color:#fff;border:none;padding:5px 10px;border-radius:4px;font-size:12px;font-weight:700;cursor:pointer;width:100%;">
            View Property
          </button>
        </div>
      `);
      markersRef.current.push(marker);
    });

    (window as any).__mapSelectProperty = (id: string) => onSelectRef.current(id);
  }, [properties]);

  return (
    <div
      ref={containerRef}
      style={{ height: '100%', width: '100%', borderRadius: 16, overflow: 'hidden' }}
    />
  );
}
