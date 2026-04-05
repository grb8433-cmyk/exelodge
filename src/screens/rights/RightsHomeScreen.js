import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { RIGHTS_TOPICS } from '../../data/rightsContent';
import { colors, radii, shadows, spacing, typography } from '../../utils/theme';

export default function RightsHomeScreen({ navigation }) {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Intro */}
      <Text style={styles.intro}>
        Know your rights as an Exeter student tenant. Most landlords are fine — but when things go wrong, knowing this could save you hundreds of pounds.
      </Text>

      {/* Renters' Rights Act banner */}
      <TouchableOpacity
        style={styles.actBanner}
        onPress={() =>
          navigation.navigate('TopicDetail', {
            topicId: 'eviction',
            title: 'Eviction & The New Law',
          })
        }
        activeOpacity={0.9}
      >
        <View style={styles.actBannerTop}>
          <Ionicons name="flash" size={20} color={colors.white} />
          <Text style={styles.actBannerTitle}>New Law in Force from 1 May 2026</Text>
        </View>
        <Text style={styles.actBannerBody}>
          Section 21 "no-fault" evictions abolished. The biggest change to renting in 30 years — tap to learn more.
        </Text>
        <View style={styles.actBannerFooter}>
          <Text style={styles.actBannerLink}>Renters' Rights Act 2025 →</Text>
        </View>
      </TouchableOpacity>

      {/* Topic grid */}
      <Text style={styles.sectionHeader}>Topics</Text>
      <View style={styles.topicsGrid}>
        {RIGHTS_TOPICS.map((topic) => (
          <TouchableOpacity
            key={topic.id}
            style={styles.topicCard}
            onPress={() => navigation.navigate('TopicDetail', { topicId: topic.id, title: topic.title })}
            activeOpacity={0.85}
          >
            <View style={styles.topicLeftBorder} />
            <View style={styles.topicContent}>
              <View style={styles.topicIconRow}>
                <Ionicons name={topic.icon} size={20} color={colors.primary} />
              </View>
              <Text style={styles.topicTitle}>{topic.title}</Text>
              <Text style={styles.topicSummary} numberOfLines={2}>{topic.summary}</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
          </TouchableOpacity>
        ))}
      </View>

      {/* What Do I Do If */}
      <TouchableOpacity
        style={styles.whatDoBtn}
        onPress={() => navigation.navigate('WhatDoIDo')}
        activeOpacity={0.85}
      >
        <Ionicons name="help-circle-outline" size={22} color={colors.white} />
        <Text style={styles.whatDoBtnText}>What Do I Do If...?</Text>
        <Ionicons name="chevron-forward" size={18} color={colors.white} />
      </TouchableOpacity>

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
    ...typography.body,
    color: colors.textSecondary,
    lineHeight: 22,
    marginBottom: spacing.md,
  },
  actBanner: {
    backgroundColor: colors.primary,
    borderRadius: radii.lg,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  actBannerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  actBannerTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.white,
    flex: 1,
  },
  actBannerBody: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.9)',
    lineHeight: 18,
    marginBottom: 10,
  },
  actBannerFooter: {
    alignItems: 'flex-end',
  },
  actBannerLink: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primaryLight,
  },
  sectionHeader: {
    ...typography.h4,
    marginBottom: spacing.sm,
  },
  topicsGrid: {
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  topicCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: radii.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
  },
  topicLeftBorder: {
    width: 4,
    alignSelf: 'stretch',
    backgroundColor: colors.primary,
  },
  topicContent: {
    flex: 1,
    padding: spacing.md,
  },
  topicIconRow: {
    marginBottom: 4,
  },
  topicTitle: {
    ...typography.h4,
    marginBottom: 2,
  },
  topicSummary: {
    ...typography.bodySmall,
    lineHeight: 16,
  },
  whatDoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: radii.md,
    padding: spacing.md,
  },
  whatDoBtnText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    color: colors.white,
  },
});
