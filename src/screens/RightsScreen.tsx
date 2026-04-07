import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking, Platform } from 'react-native';
import { colors, spacing, radii, typography, shadows } from '../utils/theme';

const OFFICIAL_LINKS = [
  { label: 'Private Renting (GOV.UK)', url: 'https://www.gov.uk/private-renting' },
  { label: 'Tenancy Deposit Protection', url: 'https://www.gov.uk/tenancy-deposit-protection' },
  { label: 'Shelter England - Student Housing', url: 'https://england.shelter.org.uk/housing_advice/private_renting/student_housing' },
  { label: 'Citizens Advice - Renting', url: 'https://www.citizensadvice.org.uk/housing/renting-privately/' },
];

const FAQ = [
  {
    q: "What do I do if my landlord won't fix the heating?",
    a: "Landlords are legally required to keep the supply of water, gas, electricity, and space heating in good repair. First, notify them in writing. If they don't respond, contact Exeter City Council's Environmental Health team.",
    link: 'https://www.exeter.gov.uk/housing/private-sector-housing/repairs-and-maintenance/'
  },
  {
    q: "What do I do if I want to leave my contract early?",
    a: "You are usually bound by a fixed-term contract. You can only leave early if there is a 'break clause' or if you find a replacement student to take over your tenancy (assignment). Always get the landlord's consent in writing.",
    link: 'https://england.shelter.org.uk/housing_advice/private_renting/how_to_end_a_fixed_term_tenancy_early'
  },
  {
    q: "What do I do if my deposit hasn't been protected?",
    a: "Your landlord must place your deposit in a government-backed scheme within 30 days. If they haven't, you can claim compensation of 1-3 times the deposit amount through the county court.",
    link: 'https://www.gov.uk/tenancy-deposit-protection/if-your-landlord-doesnt-protect-your-deposit'
  },
  {
    q: "What do I do if the landlord enters my house without notice?",
    a: "Unless it is an emergency, landlords must give at least 24 hours' notice in writing before entering. You have the right to 'quiet enjoyment' of your home and can refuse entry if the time is inconvenient.",
    link: 'https://www.citizensadvice.org.uk/housing/renting-privately/during-your-tenancy/your-landlord-needs-to-come-into-your-home/'
  },
  {
    q: "What do I do if I am being harassed by my landlord?",
    a: "Harassment is a criminal offence. Keep a log of all incidents. You can contact the police or Exeter City Council for help with illegal eviction and harassment.",
    link: 'https://www.gov.uk/private-renting-evictions/harassment-and-illegal-evictions'
  },
  {
    q: "What do I do if my housemates aren't paying their rent?",
    a: "If you have a 'joint and several' tenancy, you are all responsible for the total rent. The landlord can ask any tenant (or their guarantor) for the missing money. Communicate with your housemates and the Student Guild immediately.",
    link: 'https://www.exeterguild.com/advice'
  },
  {
    q: "What do I do if the inventory is wrong?",
    a: "Take photos of everything on the day you move in. Note any damage on the inventory, sign it, and send a copy to the landlord/agent within 7 days. This is your primary defence against deposit deductions.",
    link: 'https://england.shelter.org.uk/housing_advice/tentancy_deposits/tenancy_inventories'
  },
  {
    q: "What do I do if my landlord charges me for professional cleaning?",
    a: "The Tenant Fees Act 2019 banned most fees. A landlord cannot force you to pay for professional cleaning. You only need to leave the property to the same standard of cleanliness as when you moved in.",
    link: 'https://www.gov.uk/government/publications/tenant-fees-act-2019-guidance'
  },
  {
    q: "What do I do if I have damp and mould in my room?",
    a: "Determine if it's due to structural issues (leaky roof/pipes) or condensation. Report structural damp to the landlord immediately. If they ignore it and it affects your health, contact Environmental Health.",
    link: 'https://www.gov.uk/government/publications/health-and-safety-standards-in-the-private-rented-sector-help-for-tenants'
  },
  {
    q: "What do I do if I don't have a guarantor?",
    a: "Many student landlords require a UK-based guarantor. If you don't have one, you might need to pay 6-12 months of rent upfront or use a commercial guarantor service like Housing Hand.",
    link: 'https://www.housinghand.co.uk'
  }
];

export default function RightsScreen() {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  const openLink = (url: string) => {
    if (Platform.OS === 'web') window.open(url, '_blank');
    else Linking.openURL(url);
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Your Rights as a Student Renter</Text>
        <Text style={styles.subHeader}>A comprehensive guide to UK legislation and student-specific advice for the Exeter market.</Text>
      </View>

      <View style={styles.content}>
        <View style={styles.mainGrid}>
          {/* Column 1: Essentials */}
          <View style={styles.column}>
            <Text style={styles.sectionTitle}>The Legal Essentials</Text>
            
            <View style={styles.card}>
              <View style={styles.rightPoint}>
                <Text style={{ fontSize: 24 }}>🛡️</Text>
                <View style={styles.pointText}>
                  <Text style={styles.pointTitle}>The Right to a Safe Home</Text>
                  <Text style={styles.pointDesc}>Your home must be fit for human habitation. This includes structural safety, lack of damp, and working utilities.</Text>
                </View>
              </View>

              <View style={styles.rightPoint}>
                <Text style={{ fontSize: 24 }}>🔒</Text>
                <View style={styles.pointText}>
                  <Text style={styles.pointTitle}>Tenancy Deposit Protection</Text>
                  <Text style={styles.pointDesc}>Your deposit must be protected in a scheme like TDS, DPS, or MyDeposits. You must receive protection details within 30 days.</Text>
                </View>
              </View>

              <View style={styles.rightPoint}>
                <Text style={{ fontSize: 24 }}>📄</Text>
                <View style={styles.pointText}>
                  <Text style={styles.pointTitle}>The Tenant Fees Act 2019</Text>
                  <Text style={styles.pointDesc}>Landlords cannot charge for references, credit checks, or admin. Permitted fees are limited to rent, deposits, and contract changes (£50 cap).</Text>
                </View>
              </View>
            </View>

            <Text style={[styles.sectionTitle, { marginTop: 32 }]}>Official References</Text>
            <View style={styles.card}>
              {OFFICIAL_LINKS.map((link, i) => (
                <TouchableOpacity key={i} style={styles.linkRow} onPress={() => openLink(link.url)}>
                  <Text style={styles.linkText}>{link.label}</Text>
                  <Text style={{ fontSize: 16 }}>↗️</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Column 2: FAQ */}
          <View style={styles.column}>
            <Text style={styles.sectionTitle}>What do I do if?</Text>
            <View style={styles.card}>
              {FAQ.map((item, i) => (
                <View key={i} style={styles.qaItem}>
                  <TouchableOpacity 
                    style={styles.qButton} 
                    onPress={() => setExpandedIndex(expandedIndex === i ? null : i)}
                  >
                    <Text style={styles.qText}>{item.q}</Text>
                    <Text style={{ fontSize: 16 }}>{expandedIndex === i ? '▲' : '▼'}</Text>
                  </TouchableOpacity>
                  
                  {expandedIndex === i && (
                    <View style={styles.aContainer}>
                      <Text style={styles.aText}>{item.a}</Text>
                      <TouchableOpacity onPress={() => openLink(item.link)}>
                        <Text style={styles.aLink}>Read official guidance on this →</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              ))}
            </View>
          </View>
        </View>

        <View style={styles.footerInfo}>
          <Text style={{ fontSize: 24 }}>ℹ️</Text>
          <Text style={styles.footerText}>
            Disclaimer: This information is for guidance only and does not constitute legal advice. For specific cases, contact Exeter Guild Advice or Citizens Advice.
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  header: { padding: 40, backgroundColor: '#fff', borderBottomWidth: 1, borderColor: '#e5e7eb' },
  headerTitle: { fontSize: 28, fontWeight: '700', color: '#111827' },
  subHeader: { fontSize: 16, color: '#6b7280', marginTop: 8, maxWidth: 800 },
  content: { padding: 40 },
  mainGrid: { flexDirection: Platform.OS === 'web' ? 'row' : 'column' },
  column: { flex: 1, marginRight: Platform.OS === 'web' ? 24 : 0 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#374151', marginBottom: 16, textTransform: 'uppercase', letterSpacing: 1 },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 24, borderWidth: 1, borderColor: '#e5e7eb', marginBottom: 24 },
  rightPoint: { flexDirection: 'row', marginBottom: 24 },
  pointText: { marginLeft: 16, flex: 1 },
  pointTitle: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 4 },
  pointDesc: { fontSize: 14, color: '#4b5563', lineHeight: 20 },
  linkRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  linkText: { fontSize: 15, fontWeight: '600', color: '#006633' },
  qaItem: { borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  qButton: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 16 },
  qText: { fontSize: 15, fontWeight: '600', color: '#111827', flex: 1, marginRight: 16 },
  aContainer: { paddingBottom: 16 },
  aText: { fontSize: 14, color: '#4b5563', lineHeight: 22 },
  aLink: { fontSize: 14, color: '#006633', fontWeight: '700', marginTop: 12 },
  footerInfo: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f0fdf4', padding: 24, borderRadius: 16, marginTop: 20 },
  footerText: { marginLeft: 16, fontSize: 14, color: '#166534', flex: 1, lineHeight: 20 },
});
