import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { CAMPUS_COORDS } from '../data/seeds';
import { colors, spacing, radii, typography } from '../utils/theme';

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
  const uniCoords = (CAMPUS_COORDS as any)[universityId];
  const firstCampusKey = Object.keys(uniCoords || {})[0];
  const center: [number, number] = uniCoords && firstCampusKey
    ? [uniCoords[firstCampusKey].latitude, uniCoords[firstCampusKey].longitude]
    : [50.7354, -3.5353];

  const getMarkerIcon = (price: number) => {
    const color = price < 130 ? '#10B981' : price <= 180 ? '#F59E0B' : '#EF4444';
    return L.divIcon({
      className: 'custom-div-icon',
      html: `<div style="background-color:${color};width:12px;height:12px;border-radius:50%;border:2px solid white;box-shadow:0 2px 4px rgba(0,0,0,0.3);"></div>`,
      iconSize: [12, 12],
      iconAnchor: [6, 6],
      popupAnchor: [0, -6],
    });
  };

  return (
    <View style={styles.container}>
      <MapContainer center={center} zoom={14} style={{ height: '100%', width: '100%' }}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {properties.map((p) => {
          if (!p.latitude || !p.longitude) return null;
          const price = parseFloat(p.price_pppw);
          return (
            <Marker key={p.id} position={[p.latitude, p.longitude]} icon={getMarkerIcon(price)}>
              <Popup>
                <View style={styles.popupContent}>
                  <Text style={styles.popupTitle}>{p.address}</Text>
                  <Text style={styles.popupPrice}>£{Math.round(price)} pppw</Text>
                  <TouchableOpacity style={styles.viewBtn} onPress={() => onSelectProperty(p.id)}>
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
  popupContent: { padding: 4, minWidth: 150 },
  popupTitle: { ...typography.h3Card, fontSize: 14, marginBottom: 4 },
  popupPrice: { ...typography.bodySmall, color: colors.textSecondary, marginBottom: 8 },
  viewBtn: {
    backgroundColor: '#0B6E4F',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: radii.sm,
    alignItems: 'center',
  },
  viewBtnText: { color: colors.white, fontSize: 12, fontWeight: '700' as any },
});
