import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radii, spacing, typography } from '../../utils/theme';

const AREAS = ['All', 'Pennsylvania', 'St James', 'Heavitree', 'Newtown', 'Mount Pleasant', 'Haldon', 'City Centre'];
const CAMPUS_OPTIONS = ['Streatham', "St Luke's"];
const BED_OPTIONS = [0, 2, 3, 4, 5, 6, 7, 8, 9, 10];
const PRICE_OPTIONS = [0, 120, 130, 140, 150, 160, 170, 180, 200, 250];

export default function FilterScreen({ navigation, route }) {
  const incoming = route.params?.filters || {};
  const defaults = route.params?.defaultFilters || {};

  const [areas, setAreas] = useState(incoming.areas || []);
  const [minBeds, setMinBeds] = useState(incoming.minBeds || 0);
  const [maxPrice, setMaxPrice] = useState(incoming.maxPrice || 0);
  const [campus, setCampus] = useState(incoming.campus || 'Streatham');
  const [billsIncluded, setBillsIncluded] = useState(incoming.billsIncluded ?? null);

  const toggleArea = (area) => {
    if (area === 'All') {
      setAreas([]);
      return;
    }
    setAreas((prev) => {
      if (prev.includes(area)) return prev.filter((a) => a !== area);
      return [...prev, area];
    });
  };

  const applyFilters = () => {
    navigation.navigate('HouseList', {
      filters: { areas, minBeds, maxPrice, campus, billsIncluded },
    });
  };

  const resetFilters = () => {
    setAreas([]);
    setMinBeds(0);
    setMaxPrice(0);
    setCampus('Streatham');
    setBillsIncluded(null);
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Area */}
        <Section title="Area">
          <View style={styles.chipsWrap}>
            {AREAS.map((area) => {
              const isAll = area === 'All';
              const selected = isAll ? areas.length === 0 : areas.includes(area);
              return (
                <TouchableOpacity
                  key={area}
                  style={[styles.chip, selected && styles.chipSelected]}
                  onPress={() => toggleArea(area)}
                >
                  <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{area}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </Section>

        {/* Bedrooms */}
        <Section title="Minimum Bedrooms">
          <View style={styles.stepperRow}>
            {BED_OPTIONS.map((b) => (
              <TouchableOpacity
                key={b}
                style={[styles.stepBtn, minBeds === b && styles.stepBtnSelected]}
                onPress={() => setMinBeds(b)}
              >
                <Text style={[styles.stepBtnText, minBeds === b && styles.stepBtnTextSelected]}>
                  {b === 0 ? 'Any' : `${b}+`}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </Section>

        {/* Max price */}
        <Section title="Max Price (pppw)">
          <View style={styles.chipsWrap}>
            {PRICE_OPTIONS.map((p) => (
              <TouchableOpacity
                key={p}
                style={[styles.chip, maxPrice === p && styles.chipSelected]}
                onPress={() => setMaxPrice(p)}
              >
                <Text style={[styles.chipText, maxPrice === p && styles.chipTextSelected]}>
                  {p === 0 ? 'Any' : `£${p}`}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          {maxPrice > 0 && (
            <Text style={styles.priceHint}>Showing properties up to £{maxPrice} pppw</Text>
          )}
        </Section>

        {/* Campus sort */}
        <Section title="Sort by Distance To">
          <View style={styles.toggleRow}>
            {CAMPUS_OPTIONS.map((c) => (
              <TouchableOpacity
                key={c}
                style={[styles.toggleBtn, campus === c && styles.toggleBtnSelected]}
                onPress={() => setCampus(c)}
              >
                <Ionicons
                  name="school-outline"
                  size={14}
                  color={campus === c ? colors.white : colors.textSecondary}
                />
                <Text style={[styles.toggleBtnText, campus === c && styles.toggleBtnTextSelected]}>{c}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </Section>

        {/* Bills included */}
        <Section title="Bills Included">
          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>
              {billsIncluded === null ? 'Show all' : billsIncluded ? 'Bills included only' : 'Bills not included only'}
            </Text>
            <Switch
              value={billsIncluded === true}
              onValueChange={(v) => setBillsIncluded(v ? true : null)}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor={colors.white}
            />
          </View>
        </Section>
      </ScrollView>

      {/* Bottom action buttons */}
      <View style={styles.footer}>
        <TouchableOpacity style={styles.resetBtn} onPress={resetFilters}>
          <Text style={styles.resetBtnText}>Reset</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.applyBtn} onPress={applyFilters}>
          <Text style={styles.applyBtnText}>Apply Filters</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function Section({ title, children }) {
  return (
    <View style={sectionStyles.container}>
      <Text style={sectionStyles.title}>{title}</Text>
      {children}
    </View>
  );
}

const sectionStyles = StyleSheet.create({
  container: {
    marginBottom: spacing.lg,
  },
  title: {
    ...typography.h4,
    marginBottom: spacing.sm,
  },
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.md,
    paddingBottom: 20,
  },
  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: radii.full,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  chipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  chipTextSelected: {
    color: colors.white,
  },
  stepperRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  stepBtn: {
    width: 48,
    height: 36,
    borderRadius: radii.sm,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBtnSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  stepBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  stepBtnTextSelected: {
    color: colors.white,
  },
  priceHint: {
    ...typography.bodySmall,
    marginTop: 8,
    color: colors.primary,
    fontWeight: '500',
  },
  toggleRow: {
    flexDirection: 'row',
    gap: 10,
  },
  toggleBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: radii.sm,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  toggleBtnSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  toggleBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  toggleBtnTextSelected: {
    color: colors.white,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.white,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
  },
  switchLabel: {
    ...typography.body,
    fontSize: 14,
  },
  footer: {
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.md,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  resetBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: radii.sm,
    borderWidth: 1.5,
    borderColor: colors.primary,
    alignItems: 'center',
  },
  resetBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.primary,
  },
  applyBtn: {
    flex: 2,
    paddingVertical: 14,
    borderRadius: radii.sm,
    backgroundColor: colors.primary,
    alignItems: 'center',
  },
  applyBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.white,
  },
});
