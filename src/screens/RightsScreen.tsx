import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking, Platform, useWindowDimensions } from 'react-native';
import Icon from '../components/Icon';
import { colors, spacing, radii, typography, shadows, fontFamily, isDesktop, getUniversityColors } from '../utils/theme';
import UNIVERSITIES from '../../config/universities.json';

const OFFICIAL_LINKS = [
  { label: 'Private Renting (GOV.UK)',           url: 'https://www.gov.uk/private-renting' },
  { label: 'Tenancy Deposit Protection',          url: 'https://www.gov.uk/tenancy-deposit-protection' },
  { label: 'Shelter England — Student Housing',  url: 'https://england.shelter.org.uk/housing_advice/private_renting/student_housing' },
  { label: 'Citizens Advice — Renting',          url: 'https://www.citizensadvice.org.uk/housing/renting-privately/' },
];

export default function RightsScreen({ universityId, isDarkMode = false }: { universityId: string, isDarkMode?: boolean }) {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const { width } = useWindowDimensions();
  const desktop = isDesktop(width);
  
  const currentUni = UNIVERSITIES.find(u => u.id === universityId) || UNIVERSITIES[0];
  const theme = getUniversityColors(universityId, isDarkMode);

  const RIGHTS = [
    {
      icon: 'file-text',
      color: colors.success,
      bg: '#EFFFF4',
      title: "Renters' Rights Act 2025",
      desc: 'New legislation ending Section 21 "no-fault" evictions, banning mid-tenancy bidding wars, and extending "Awaab’s Law" to the private sector to ensure damp/mould is fixed quickly.',
    },
    {
      icon: 'shield',
      color: colors.accentLegal,
      bg: colors.accentLegalBg,
      title: 'The Right to a Safe Home',
      desc: 'Your home must be fit for human habitation. This includes structural safety, absence of damp, and working utilities and heating.',
    },
    {
      icon: 'lock',
      color: colors.accentPrice,
      bg: colors.accentPriceBg,
      title: 'Tenancy Deposit Protection',
      desc: 'Your deposit must be protected in a government-backed scheme (TDS, DPS, or MyDeposits) within 30 days of payment.',
    },
    {
      icon: 'file-text',
      color: '#7C3AED',
      bg: '#F5F0FF',
      title: 'The Tenant Fees Act 2019',
      desc: 'Landlords cannot charge for references, credit checks, or admin. Permitted fees are strictly limited to rent, deposits, and minor contract changes.',
    },
  ];

  const FAQ = [
    { q: "What does the 2025 Act mean for my rolling contract?", a: "The 2025 Act transitions all tenancies to a single periodic system. This means fixed-terms are being phased out, giving you more flexibility to leave with 2 months' notice if your circumstances change.", link: 'https://www.gov.uk/government/publications/renters-rights-bill-2024-guide-for-tenants' },
    { q: "What do I do if my landlord won't fix the heating?", a: `Landlords are legally required to keep the supply of water, gas, electricity, and space heating in good repair. First, notify them in writing. If they don't respond, contact ${currentUni.city} City Council's Private Sector Housing team.`, link: universityId === 'exeter' ? 'https://exeter.gov.uk/housing/private-sector-housing/contact-the-private-sector-housing-team/' : 'https://www.bristol.gov.uk/residents/housing/private-tenants/report-a-rogue-landlord-or-letting-agent' },
    { q: "What do I do if I want to leave my contract early?", a: "Under the new 2025 rules, you can end your tenancy by giving two months' notice. You are no longer 'trapped' in a 12-month fixed term if the property is substandard or your situation changes.", link: 'https://england.shelter.org.uk/housing_advice/private_renting/how_to_end_a_fixed_term_tenancy_early' },
    { q: "What do I do if my deposit hasn't been protected?", a: "Your landlord must place your deposit in a government-backed scheme within 30 days. If they haven't, you can claim compensation of 1–3 times the deposit amount through the county court.", link: 'https://www.gov.uk/tenancy-deposit-protection/if-your-landlord-does-not-protect-your-deposit' },
    { q: "What do I do if the landlord enters without notice?", a: "Unless it is an emergency, landlords must give at least 24 hours' notice in writing before entering. You have the right to 'quiet enjoyment' of your home and can refuse entry if the time is inconvenient.", link: 'https://www.citizensadvice.org.uk/housing/renting-privately/during-your-tenancy/your-landlord-needs-to-come-into-your-home/' },
  ];

  const openLink = (url: string) => {
    if (Platform.OS === 'web') window.open(url, '_blank');
    else Linking.openURL(url);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

      {/* Page Header */}
      <View style={[styles.header, { backgroundColor: theme.surface, borderBottomColor: theme.border }, !desktop && styles.headerMobile]}>
        <View style={[styles.badge, { backgroundColor: theme.primaryLight }]}>
          <Icon name="shield" size={14} color={theme.primary} />
          <Text style={[styles.badgeText, { color: theme.primary }]}>UK TENANT LAW</Text>
        </View>
        <Text style={[styles.title, { color: theme.textPrimary }, !desktop && styles.titleMobile]}>Your Rights as a Student Renter</Text>
        <Text style={[styles.desc, { color: theme.textSecondary }, !desktop && styles.descMobile]}>
          A comprehensive guide to UK legislation and student-specific advice for the {currentUni.city} market.
        </Text>
      </View>

      <View style={[styles.content, !desktop && styles.contentMobile]}>
        
        {/* Desktop Grid or Mobile Stack */}
        <View style={desktop ? styles.desktopGrid : styles.mobileStack}>
          
          {/* Column/Section 1: Essentials */}
          <View style={desktop ? styles.desktopCol : styles.mobileSection}>
            <Text style={[styles.sectionLabel, { color: theme.textMuted }]}>THE LEGAL ESSENTIALS</Text>
            <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              {RIGHTS.map((right, i) => (
                <View key={i} style={[styles.rightItem, i < RIGHTS.length - 1 && [styles.borderBottom, { borderBottomColor: theme.border }]]}>
                  <View style={[styles.iconBox, { backgroundColor: right.bg }]}>
                    <Icon name={right.icon as any} size={16} color={right.color} />
                  </View>
                  <View style={styles.rightTextContent}>
                    <Text style={[styles.rightTitle, { color: theme.textPrimary }]}>{right.title}</Text>
                    <Text style={[styles.rightDesc, { color: theme.textSecondary }]}>{right.desc}</Text>
                  </View>
                </View>
              ))}
            </View>

            {/* Official References (inside first col on desktop, or stacked on mobile) */}
            <View style={{ marginTop: 32 }}>
              <Text style={[styles.sectionLabel, { color: theme.textMuted }]}>OFFICIAL REFERENCES</Text>
              <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                {OFFICIAL_LINKS.map((link, i) => (
                  <TouchableOpacity
                    key={i}
                    style={[styles.linkRow, i < OFFICIAL_LINKS.length - 1 && [styles.borderBottom, { borderBottomColor: theme.border }]]}
                    onPress={() => openLink(link.url)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.linkText, { color: theme.primary }]}>{link.label}</Text>
                    <View style={[styles.linkIcon, { backgroundColor: theme.primaryLight }]}>
                      <Icon name="arrow-up-right" size={13} color={theme.primary} />
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>

          {/* Column/Section 2: FAQ */}
          <View style={desktop ? styles.desktopCol : styles.mobileSection}>
            <Text style={[styles.sectionLabel, { color: theme.textMuted }]}>COMMON QUESTIONS</Text>
            <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              {FAQ.map((item, i) => {
                const isOpen = expandedIndex === i;
                return (
                  <View key={i} style={[styles.faqItem, i < FAQ.length - 1 && [styles.borderBottom, { borderBottomColor: theme.border }]]}>
                    <TouchableOpacity
                      style={styles.faqHeader}
                      onPress={() => setExpandedIndex(isOpen ? null : i)}
                      activeOpacity={0.75}
                    >
                      <View style={[styles.faqChevron, isOpen && { backgroundColor: theme.primaryLight }]}>
                        <Icon
                          name={isOpen ? 'chevron-up' : 'chevron-down'}
                          size={14}
                          color={isOpen ? theme.primary : theme.textMuted}
                        />
                      </View>
                      <Text style={[styles.faqQuestion, { color: theme.textPrimary }, isOpen && { color: theme.primary }]}>{item.q}</Text>
                    </TouchableOpacity>

                    {isOpen && (
                      <View style={[styles.faqAnswer, !desktop && styles.faqAnswerMobile]}>
                        <Text style={[styles.faqAnswerText, { color: theme.textSecondary }]}>{item.a}</Text>
                        <TouchableOpacity onPress={() => openLink(item.link)} style={styles.faqLink}>
                          <Text style={[styles.faqLinkText, { color: theme.primary }]}>Read official guidance</Text>
                          <Icon name="arrow-up-right" size={12} color={theme.primary} />
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          </View>

        </View>

        {/* Disclaimer */}
        <View style={[styles.disclaimer, !desktop && styles.disclaimerMobile, { backgroundColor: theme.primaryLight, borderColor: theme.primaryLight }]}>
          <View style={[styles.disclaimerIcon, { backgroundColor: theme.primary }]}>
            <Icon name="info" size={16} color={colors.white} />
          </View>
          <Text style={[styles.disclaimerText, { color: theme.primary }]}>
            This information is for guidance only and does not constitute legal advice. For specific cases,
            contact {universityId === 'exeter' ? "Exeter Guild Advice" : universityId === 'southampton' ? "SUSU or Solent SU Advice" : "Bristol or UWE SU Advice"} or Citizens Advice.
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { paddingBottom: 64 },

  // Header
  header: {
    padding: 32,
    paddingTop: 48,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerMobile: { padding: 16, paddingTop: 40 },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radii.full,
    marginBottom: 14,
  },
  badgeText: { ...typography.eyebrow, fontSize: 10 },
  title: { ...typography.h1Page, color: colors.textPrimary, marginBottom: 10 },
  titleMobile: { fontSize: 24 },
  desc: { ...typography.bodySubtle, color: colors.textSecondary, maxWidth: 780 },
  descMobile: { fontSize: 13 },

  // Content Structure
  content: { padding: 32, maxWidth: 1152, alignSelf: 'center', width: '100%' },
  contentMobile: { padding: 16 },
  
  desktopGrid: { flexDirection: 'row', gap: 24 },
  desktopCol: { flex: 1 },
  
  mobileStack: { flexDirection: 'column' },
  mobileSection: { width: '100%', marginBottom: 32 },

  // Shared Components
  sectionLabel: { ...typography.eyebrow, color: colors.textMuted, marginBottom: 12 },
  card: {
    backgroundColor: colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.soft,
    overflow: 'hidden',
  },
  borderBottom: { borderBottomWidth: 1, borderBottomColor: colors.border },

  // Rights Items
  rightItem: { flexDirection: 'row', padding: 24, gap: 16 },
  iconBox: {
    width: 40, height: 40, borderRadius: 8,
    alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  rightTextContent: { flex: 1 },
  rightTitle: { ...typography.h3Card, color: colors.textPrimary, marginBottom: 5 },
  rightDesc: { ...typography.bodySubtle, color: colors.textSecondary },

  // Links
  linkRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
    minHeight: 44,
  },
  linkText: { ...typography.bodySmall, fontWeight: '600' as any, flex: 1, marginRight: 12 },
  linkIcon: {
    width: 28, height: 28, borderRadius: 6,
    alignItems: 'center', justifyContent: 'center',
  },

  // FAQ
  faqItem: { width: '100%' },
  faqHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingHorizontal: 24,
    paddingVertical: 16,
    minHeight: 44,
  },
  faqChevron: {
    width: 24, height: 24, borderRadius: 4,
    backgroundColor: colors.surfaceSubtle,
    alignItems: 'center', justifyContent: 'center',
    marginTop: 1, flexShrink: 0,
  },
  faqQuestion: { ...typography.body, fontWeight: '600' as any, color: colors.textPrimary, flex: 1 },
  faqAnswer: { paddingHorizontal: 24, paddingBottom: 16, paddingLeft: 60 },
  faqAnswerMobile: { paddingLeft: 24 },
  faqAnswerText: { ...typography.bodySubtle, color: colors.textSecondary, marginBottom: 12 },
  faqLink: { flexDirection: 'row', alignItems: 'center', gap: 5, minHeight: 44 },
  faqLinkText: { ...typography.bodySmall, fontWeight: '700' as any },

  // Disclaimer
  disclaimer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderWidth: 1,
    padding: 24,
    borderRadius: 16,
    marginTop: 32,
    gap: 12,
  },
  disclaimerMobile: { padding: 16, marginTop: 8 },
  disclaimerIcon: {
    width: 30, height: 30, borderRadius: 15,
    alignItems: 'center', justifyContent: 'center',
    flexShrink: 0, marginTop: 1,
  },
  disclaimerText: { ...typography.bodySubtle, flex: 1 },
});
