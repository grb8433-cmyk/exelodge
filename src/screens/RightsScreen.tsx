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

export default function RightsScreen({ universityId }: { universityId: string }) {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const { width } = useWindowDimensions();
  const desktop = isDesktop(width);
  
  const currentUni = UNIVERSITIES.find(u => u.id === universityId) || UNIVERSITIES[0];
  const theme = getUniversityColors(universityId);

  const RIGHTS = [
    {
      icon: 'shield' as const,
      color: theme.primary,
      bg: theme.primaryLight,
      title: 'The Right to a Safe Home',
      desc: 'Your home must be fit for human habitation. This includes structural safety, absence of damp, and working utilities and heating.',
    },
    {
      icon: 'lock' as const,
      color: '#4B6CF5',
      bg: '#F0F4FF',
      title: 'Tenancy Deposit Protection',
      desc: 'Your deposit must be protected in a government-backed scheme (TDS, DPS, or MyDeposits) within 30 days of payment.',
    },
    {
      icon: 'file-text' as const,
      color: '#7C3AED',
      bg: '#F5F0FF',
      title: 'The Tenant Fees Act 2019',
      desc: 'Landlords cannot charge for references, credit checks, or admin. Permitted fees are strictly limited to rent, deposits, and minor contract changes (£50 cap).',
    },
  ];

  const FAQ = [
    { q: "What do I do if my landlord won't fix the heating?", a: `Landlords are legally required to keep the supply of water, gas, electricity, and space heating in good repair. First, notify them in writing. If they don't respond, contact ${currentUni.city} City Council's Environmental Health team.`, link: universityId === 'exeter' ? 'https://www.exeter.gov.uk/housing/private-sector-housing/repairs-and-maintenance/' : 'https://www.bristol.gov.uk/residents/housing/private-renting/problems-with-your-landlord/report-a-repair-problem' },
    { q: "What do I do if I want to leave my contract early?", a: "You are usually bound by a fixed-term contract. You can only leave early if there is a 'break clause' or if you find a replacement student to take over your tenancy (assignment). Always get the landlord's consent in writing.", link: 'https://england.shelter.org.uk/housing_advice/private_renting/how_to_end_a_fixed_term_tenancy_early' },
    { q: "What do I do if my deposit hasn't been protected?", a: "Your landlord must place your deposit in a government-backed scheme within 30 days. If they haven't, you can claim compensation of 1–3 times the deposit amount through the county court.", link: 'https://www.gov.uk/tenancy-deposit-protection/if-your-landlord-doesnt-protect-your-deposit' },
    { q: "What do I do if the landlord enters without notice?", a: "Unless it is an emergency, landlords must give at least 24 hours' notice in writing before entering. You have the right to 'quiet enjoyment' of your home and can refuse entry if the time is inconvenient.", link: 'https://www.citizensadvice.org.uk/housing/renting-privately/during-your-tenancy/your-landlord-needs-to-come-into-your-home/' },
    { q: "What do I do if I am being harassed by my landlord?", a: `Harassment is a criminal offence. Keep a log of all incidents. You can contact the police or ${currentUni.city} City Council for help with illegal eviction and harassment.`, link: 'https://www.gov.uk/private-renting-evictions/harassment-and-illegal-evictions' },
    { q: "What do I do if my housemates aren't paying their rent?", a: `If you have a 'joint and several' tenancy, you are all responsible for the total rent. The landlord can ask any tenant (or their guarantor) for the missing money. Communicate with your housemates and the ${universityId === 'exeter' ? "Student Guild" : "SU"} immediately.`, link: universityId === 'exeter' ? 'https://www.exeterguild.com/advice' : 'https://www.bristolsu.org.uk/advice-support' },
    { q: "What do I do if the inventory is wrong?", a: "Take photos of everything on the day you move in. Note any damage on the inventory, sign it, and send a copy to the landlord/agent within 7 days. This is your primary defence against deposit deductions.", link: 'https://england.shelter.org.uk/housing_advice/tentancy_deposits/tenancy_inventories' },
    { q: "What do I do if my landlord charges for professional cleaning?", a: "The Tenant Fees Act 2019 banned most fees. A landlord cannot force you to pay for professional cleaning — you only need to leave the property at the same standard of cleanliness as when you moved in.", link: 'https://www.gov.uk/government/publications/tenant-fees-act-2019-guidance' },
    { q: "What do I do if I have damp and mould?", a: "Determine if it's due to structural issues (leaky roof/pipes) or condensation. Report structural damp to the landlord immediately. If they ignore it and it affects your health, contact Environmental Health.", link: 'https://www.gov.uk/government/publications/health-and-safety-standards-in-the-private-rented-sector-help-for-tenants' },
    { q: "What do I do if I don't have a guarantor?", a: "Many student landlords require a UK-based guarantor. If you don't have one, you might need to pay 6–12 months of rent upfront or use a commercial guarantor service like Housing Hand.", link: 'https://www.housinghand.co.uk' },
  ];

  const openLink = (url: string) => {
    if (Platform.OS === 'web') window.open(url, '_blank');
    else Linking.openURL(url);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

      {/* Page header */}
      <View style={[styles.pageHeader, !desktop && styles.pageHeaderMobile]}>
        <View style={[styles.headerBadge, { backgroundColor: theme.primaryLight }]}>
          <Icon name="shield" size={14} color={theme.primary} />
          <Text style={[styles.headerBadgeText, { color: theme.primary }]}>UK Tenant Law</Text>
        </View>
        <Text style={[styles.pageTitle, !desktop && { fontSize: 24 }]}>Your Rights as a Student Renter</Text>
        <Text style={[styles.pageDesc, !desktop && { fontSize: 13 }]}>
          A comprehensive guide to UK legislation and student-specific advice for the {currentUni.city} market.
        </Text>
      </View>

      <View style={[styles.content, !desktop && styles.contentMobile]}>
        <View style={[styles.grid, !desktop && styles.gridMobile]}>

          {/* Column 1: Essentials + Links */}
          <View style={[styles.col, !desktop && styles.colMobile]}>
            <Text style={styles.sectionLabel}>THE LEGAL ESSENTIALS</Text>
            <View style={styles.card}>
              {RIGHTS.map((right, i) => (
                <View key={i} style={[styles.rightItem, i < RIGHTS.length - 1 && styles.rightItemBorder]}>
                  <View style={[styles.rightIconWrap, { backgroundColor: right.bg }]}>
                    <Icon name={right.icon} size={16} color={right.color} />
                  </View>
                  <View style={styles.rightText}>
                    <Text style={styles.rightTitle}>{right.title}</Text>
                    <Text style={styles.rightDesc}>{right.desc}</Text>
                  </View>
                </View>
              ))}
            </View>

            <Text style={[styles.sectionLabel, { marginTop: spacing.xl }]}>OFFICIAL REFERENCES</Text>
            <View style={styles.card}>
              {OFFICIAL_LINKS.map((link, i) => (
                <TouchableOpacity
                  key={i}
                  style={[styles.linkRow, i < OFFICIAL_LINKS.length - 1 && styles.linkRowBorder]}
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

          {/* Column 2: FAQ */}
          <View style={[styles.col, !desktop && styles.colMobile]}>
            <Text style={styles.sectionLabel}>COMMON QUESTIONS</Text>
            <View style={styles.card}>
              {FAQ.map((item, i) => {
                const isOpen = expandedIndex === i;
                return (
                  <View key={i} style={[styles.qaItem, i < FAQ.length - 1 && styles.qaItemBorder]}>
                    <TouchableOpacity
                      style={styles.qaButton}
                      onPress={() => setExpandedIndex(isOpen ? null : i)}
                      activeOpacity={0.75}
                    >
                      <View style={[styles.qaChevronWrap, isOpen && { backgroundColor: theme.primaryLight }]}>
                        <Icon
                          name={isOpen ? 'chevron-up' : 'chevron-down'}
                          size={14}
                          color={isOpen ? theme.primary : colors.textMuted}
                        />
                      </View>
                      <Text style={[styles.qaQuestion, isOpen && { color: theme.primary }]}>{item.q}</Text>
                    </TouchableOpacity>

                    {isOpen && (
                      <View style={styles.qaAnswer}>
                        <Text style={styles.qaAnswerText}>{item.a}</Text>
                        <TouchableOpacity onPress={() => openLink(item.link)} style={styles.qaLink}>
                          <Text style={[styles.qaLinkText, { color: theme.primary }]}>Read official guidance</Text>
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
            contact {universityId === 'exeter' ? "Exeter Guild Advice" : "Bristol SU Advice"} or Citizens Advice.
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scroll: { paddingBottom: 48 },

  pageHeader: {
    padding: spacing.xl,
    paddingTop: 40,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  pageHeaderMobile: { padding: spacing.lg, paddingTop: spacing.xl },
  headerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radii.full,
    marginBottom: 14,
  },
  headerBadgeText: { fontFamily, fontSize: 11, fontWeight: '700' as any, letterSpacing: 0.3 },
  pageTitle: { fontFamily, fontSize: 30, fontWeight: '800' as any, color: colors.textPrimary, letterSpacing: -0.5, marginBottom: 10 },
  pageDesc: { fontFamily, fontSize: 15, color: colors.textSecondary, lineHeight: 24, maxWidth: 780 },

  content: { padding: spacing.xl, maxWidth: 1200, alignSelf: 'center', width: '100%' },
  contentMobile: { padding: spacing.md },
  grid: { flexDirection: 'row', gap: spacing.xl },
  gridMobile: { flexDirection: 'column', gap: 0 },
  col: { flex: 1 },
  colMobile: { marginBottom: spacing.xl },

  sectionLabel: {
    fontFamily,
    fontSize: 11,
    fontWeight: '700' as any,
    color: colors.textMuted,
    letterSpacing: 1,
    marginBottom: spacing.md,
    textTransform: 'uppercase' as any,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    ...shadows.soft,
    marginBottom: spacing.lg,
  },

  rightItem: { flexDirection: 'row', gap: spacing.md, padding: spacing.lg },
  rightItemBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },
  rightIconWrap: {
    width: 38, height: 38, borderRadius: radii.sm,
    alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  rightText: { flex: 1 },
  rightTitle: { fontFamily, fontSize: 15, fontWeight: '700' as any, color: colors.textPrimary, marginBottom: 5 },
  rightDesc: { fontFamily, fontSize: 13, color: colors.textSecondary, lineHeight: 20 },

  linkRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: 16,
    minHeight: 44,
  },
  linkRowBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },
  linkText: { fontFamily, fontSize: 14, fontWeight: '600' as any, flex: 1, marginRight: spacing.sm },
  linkIcon: {
    width: 28, height: 28, borderRadius: radii.sm,
    alignItems: 'center', justifyContent: 'center',
  },

  qaItem: { overflow: 'hidden' },
  qaItemBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },
  qaButton: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingHorizontal: spacing.lg,
    paddingVertical: 16,
    minHeight: 44,
  },
  qaChevronWrap: {
    width: 24, height: 24, borderRadius: radii.xs,
    backgroundColor: colors.surfaceSubtle,
    alignItems: 'center', justifyContent: 'center',
    marginTop: 1, flexShrink: 0,
  },
  qaQuestion: {
    fontFamily, fontSize: 14, fontWeight: '600' as any,
    color: colors.textPrimary, flex: 1, lineHeight: 21,
  },
  qaAnswer: { paddingHorizontal: spacing.lg, paddingBottom: 16, paddingLeft: 52 },
  qaAnswerText: { fontFamily, fontSize: 13, color: colors.textSecondary, lineHeight: 21, marginBottom: 12 },
  qaLink: { flexDirection: 'row', alignItems: 'center', gap: 5, minHeight: 44 },
  qaLinkText: { fontFamily, fontSize: 13, fontWeight: '700' as any },

  disclaimer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderWidth: 1,
    padding: spacing.lg,
    borderRadius: radii.lg,
    marginTop: spacing.xl,
    gap: 12,
  },
  disclaimerMobile: { padding: spacing.md },
  disclaimerIcon: {
    width: 30, height: 30, borderRadius: 15,
    alignItems: 'center', justifyContent: 'center',
    flexShrink: 0, marginTop: 1,
  },
  disclaimerText: { fontFamily, fontSize: 13, lineHeight: 21, flex: 1 },
});
