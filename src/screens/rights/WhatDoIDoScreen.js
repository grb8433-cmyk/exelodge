import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Linking,
  Alert,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { WHAT_DO_I_DO } from '../../data/rightsContent';
import { colors, radii, shadows, spacing, typography } from '../../utils/theme';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export default function WhatDoIDoScreen() {
  const [expanded, setExpanded] = useState(null);

  const toggle = (id) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded((prev) => (prev === id ? null : id));
  };

  const openLink = (type, value) => {
    Linking.openURL(value).catch(() =>
      Alert.alert('Cannot open link', 'Please try manually.')
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.intro}>
        Tap your situation to see a clear, step-by-step action plan. You've got this.
      </Text>

      {WHAT_DO_I_DO.map((situation) => {
        const isOpen = expanded === situation.id;

        return (
          <View key={situation.id} style={styles.situationCard}>
            {/* Accordion header */}
            <TouchableOpacity
              style={styles.situationHeader}
              onPress={() => toggle(situation.id)}
              activeOpacity={0.85}
            >
              <View style={styles.situationIconWrap}>
                <Ionicons
                  name={isOpen ? 'chevron-up-circle' : 'help-circle-outline'}
                  size={22}
                  color={isOpen ? colors.primary : colors.textSecondary}
                />
              </View>
              <Text style={[styles.situationQuestion, isOpen && styles.situationQuestionOpen]}>
                {situation.question}
              </Text>
              <Ionicons
                name={isOpen ? 'chevron-up' : 'chevron-down'}
                size={18}
                color={colors.textSecondary}
              />
            </TouchableOpacity>

            {/* Expanded steps */}
            {isOpen && (
              <View style={styles.stepsContainer}>
                <View style={styles.stepsDivider} />

                {situation.steps.map((s) => (
                  <View key={s.step} style={styles.stepRow}>
                    <View style={styles.stepBadge}>
                      <Text style={styles.stepBadgeText}>{s.step}</Text>
                    </View>
                    <Text style={styles.stepText}>{s.text}</Text>
                  </View>
                ))}

                {/* Contact shortcut */}
                {situation.contact && (
                  <TouchableOpacity
                    style={styles.contactBtn}
                    onPress={() => openLink(situation.contact.type, situation.contact.value)}
                  >
                    <Ionicons
                      name={situation.contact.type === 'phone' ? 'call-outline' : 'mail-outline'}
                      size={16}
                      color={colors.primary}
                    />
                    <Text style={styles.contactBtnText}>{situation.contact.label}</Text>
                    <Ionicons name="open-outline" size={14} color={colors.primary} />
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>
        );
      })}

      {/* General advice footer */}
      <View style={styles.footerCard}>
        <Ionicons name="information-circle-outline" size={20} color={colors.primary} />
        <View style={styles.footerText}>
          <Text style={styles.footerTitle}>Always remember</Text>
          <Text style={styles.footerBody}>
            The Guild Advice Team at advice@exeterguild.com is free, confidential, and can support you with any housing issue. You are never alone.
          </Text>
        </View>
      </View>

      <View style={{ height: 32 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.md,
  },
  intro: {
    ...typography.bodySmall,
    lineHeight: 20,
    marginBottom: spacing.md,
    color: colors.textSecondary,
  },
  situationCard: {
    backgroundColor: colors.white,
    borderRadius: radii.lg,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    ...shadows.card,
  },
  situationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
  },
  situationIconWrap: {
    flexShrink: 0,
  },
  situationQuestion: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
    lineHeight: 20,
  },
  situationQuestionOpen: {
    color: colors.primary,
  },
  stepsContainer: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
  },
  stepsDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginBottom: spacing.md,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 12,
  },
  stepBadge: {
    width: 26,
    height: 26,
    borderRadius: radii.full,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    marginTop: 1,
  },
  stepBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.white,
  },
  stepText: {
    flex: 1,
    fontSize: 14,
    color: colors.textPrimary,
    lineHeight: 20,
  },
  contactBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.primaryLight,
    borderRadius: radii.sm,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 4,
    borderWidth: 1,
    borderColor: colors.primary + '40',
  },
  contactBtnText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary,
  },
  footerCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: colors.primaryLight,
    borderRadius: radii.lg,
    padding: spacing.md,
    marginTop: spacing.sm,
    borderWidth: 1,
    borderColor: colors.primary + '40',
  },
  footerText: {
    flex: 1,
  },
  footerTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primaryDark,
    marginBottom: 4,
  },
  footerBody: {
    fontSize: 13,
    color: colors.primaryDark,
    lineHeight: 18,
  },
});
