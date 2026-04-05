import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Linking,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { RIGHTS_TOPICS } from '../../data/rightsContent';
import { colors, radii, shadows, spacing, typography } from '../../utils/theme';

const CONTACT_ICONS = {
  phone: 'call-outline',
  email: 'mail-outline',
  web: 'globe-outline',
};

export default function TopicDetailScreen({ route }) {
  const { topicId } = route.params;
  const topic = RIGHTS_TOPICS.find((t) => t.id === topicId);

  const openLink = (type, value) => {
    Linking.openURL(value).catch(() =>
      Alert.alert('Cannot open link', 'Please try manually.')
    );
  };

  if (!topic) {
    return (
      <View style={styles.centre}>
        <Text>Topic not found.</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Topic icon + title */}
      <View style={styles.topicHeader}>
        <View style={styles.topicIcon}>
          <Ionicons name={topic.icon} size={28} color={colors.primary} />
        </View>
        <Text style={styles.topicTitle}>{topic.title}</Text>
        <Text style={styles.topicSummary}>{topic.summary}</Text>
      </View>

      {/* Sections */}
      {topic.sections.map((section, idx) => {
        if (section.isBanner) {
          return (
            <View key={idx} style={styles.sectionBanner}>
              <Ionicons name="flash" size={16} color={colors.white} />
              <View style={styles.sectionBannerText}>
                <Text style={styles.sectionBannerHeading}>{section.heading}</Text>
                <Text style={styles.sectionBannerBody}>{section.body}</Text>
              </View>
            </View>
          );
        }

        if (section.isTip) {
          return (
            <View key={idx} style={styles.tipBox}>
              <View style={styles.tipHeader}>
                <Ionicons name="bulb-outline" size={16} color={colors.primary} />
                <Text style={styles.tipLabel}>Tip</Text>
              </View>
              <Text style={styles.tipBody}>{section.body}</Text>
            </View>
          );
        }

        if (section.isSteps) {
          const steps = section.body.split('\n').filter(Boolean);
          return (
            <View key={idx} style={styles.card}>
              <Text style={styles.sectionHeading}>{section.heading}</Text>
              {steps.map((step, si) => (
                <View key={si} style={styles.stepRow}>
                  <View style={styles.stepNumber}>
                    <Text style={styles.stepNumberText}>{si + 1}</Text>
                  </View>
                  <Text style={styles.stepText}>{step.replace(/^\d+\.\s*/, '')}</Text>
                </View>
              ))}
            </View>
          );
        }

        return (
          <View key={idx} style={styles.card}>
            <Text style={styles.sectionHeading}>{section.heading}</Text>
            <Text style={styles.sectionBody}>{section.body}</Text>
          </View>
        );
      })}

      {/* Contacts */}
      {topic.contacts && topic.contacts.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.contactsTitle}>Get Help</Text>
          {topic.contacts.map((c, idx) => (
            <TouchableOpacity
              key={idx}
              style={styles.contactRow}
              onPress={() => openLink(c.type, c.value)}
            >
              <Ionicons name={CONTACT_ICONS[c.type] || 'open-outline'} size={18} color={colors.primary} />
              <Text style={styles.contactLabel} numberOfLines={1}>{c.label}</Text>
              <Ionicons name="open-outline" size={14} color={colors.textSecondary} />
            </TouchableOpacity>
          ))}
        </View>
      )}

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
  centre: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topicHeader: {
    alignItems: 'center',
    marginBottom: spacing.lg,
    paddingHorizontal: spacing.sm,
  },
  topicIcon: {
    width: 64,
    height: 64,
    borderRadius: radii.full,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  topicTitle: {
    ...typography.h2,
    textAlign: 'center',
    marginBottom: 6,
  },
  topicSummary: {
    ...typography.bodySmall,
    textAlign: 'center',
    lineHeight: 20,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: radii.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
  },
  sectionHeading: {
    ...typography.h4,
    marginBottom: 8,
  },
  sectionBody: {
    ...typography.body,
    fontSize: 14,
    lineHeight: 22,
    color: colors.textPrimary,
  },
  sectionBanner: {
    flexDirection: 'row',
    gap: 10,
    backgroundColor: colors.primary,
    borderRadius: radii.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  sectionBannerText: {
    flex: 1,
  },
  sectionBannerHeading: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.white,
    marginBottom: 4,
  },
  sectionBannerBody: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.9)',
    lineHeight: 18,
  },
  tipBox: {
    backgroundColor: colors.primaryLight,
    borderRadius: radii.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.primary + '40',
  },
  tipHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  tipLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primaryDark,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  tipBody: {
    fontSize: 13,
    color: colors.primaryDark,
    lineHeight: 19,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 10,
  },
  stepNumber: {
    width: 24,
    height: 24,
    borderRadius: radii.full,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
    flexShrink: 0,
  },
  stepNumberText: {
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
  contactsTitle: {
    ...typography.h4,
    marginBottom: spacing.sm,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  contactLabel: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    color: colors.primary,
  },
});
