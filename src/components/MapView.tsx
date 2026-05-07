import React from 'react';
import { View, Text, Platform, TouchableOpacity, StyleSheet } from 'react-native';
import { CAMPUS_COORDS } from '../data/seeds';
import { colors, spacing, radii, typography, shadows } from '../utils/theme';

// Conditional imports for Web only
let MapContainer: any, TileLayer: any, Marker: any, Popup: any, L: any;
if (Platform.OS === 'web') {
  const Leaflet = require('react-leaflet');
  MapContainer = Leaflet.MapContainer;
  TileLayer = Leaflet.TileLayer;
  Marker = Leaflet.Marker;
  Popup = Leaflet.Popup;
  L = require('leaflet');

  // Fix for default marker icons in Leaflet
  delete (L.Icon.Default.prototype as any)._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  });
}

interface MapViewProps {
  properties: any[];
  universityId: string;
  onSelectProperty: (id: string) => void;
}

export default function MapView({ properties, universityId, onSelectProperty }: MapViewProps) {
  if (Platform.OS !== 'web') {
    return (
      <View style={styles.fallback}>
        <Text>Map View is only available on Web.</Text>
      </View>
    );
  }

  const uniCoords = (CAMPUS_COORDS as any)[universityId];
  // Default center: use the first campus found for the uni
  const firstCampusKey = Object.keys(uniCoords || {})[0];
  const center = uniCoords && firstCampusKey 
    ? [uniCoords[firstCampusKey].latitude, uniCoords[firstCampusKey].longitude] 
    : [50.7354, -3.5353]; // Default to Exeter Streatham

  const getMarkerIcon = (price: number) => {
    const color = price < 130 ? '#10B981' : price <= 180 ? '#F59E0B' : '#EF4444';
    
    return L.divIcon({
      className: 'custom-div-icon',
      html: `<div style="background-color: ${color}; width: 12px; height: 12px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>`,
      iconSize: [12, 12],
      iconAnchor: [6, 6],
      popupAnchor: [0, -6]
    });
  };

  return (
    <View style={styles.container}>
      <MapContainer 
        center={center} 
        zoom={14} 
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {properties.map((p) => {
          if (!p.latitude || !p.longitude) return null;
          const price = parseFloat(p.price_pppw);
          
          return (
            <Marker 
              key={p.id} 
              position={[p.latitude, p.longitude]}
              icon={getMarkerIcon(price)}
            >
              <Popup>
                <View style={styles.popupContent}>
                  <Text style={styles.popupTitle}>{p.address}</Text>
                  <Text style={styles.popupPrice}>£{Math.round(price)} pppw</Text>
                  <TouchableOpacity 
                    style={styles.viewBtn} 
                    onPress={() => onSelectProperty(p.id)}
                  >
                    <Text style={styles.viewBtnText}>View Property</Text>
                  </TouchableOpacity>
                </View>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    height: '100%',
    width: '100%',
    borderRadius: radii.lg,
    overflow: 'hidden',
  },
  fallback: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  popupContent: {
    padding: 4,
    minWidth: 150,
  },
  popupTitle: {
    ...typography.h3Card,
    fontSize: 14,
    marginBottom: 4,
  },
  popupPrice: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  viewBtn: {
    backgroundColor: '#0B6E4F', // Default uni primary
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: radii.sm,
    alignItems: 'center',
  },
  viewBtnText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: '700' as any,
  },
});
