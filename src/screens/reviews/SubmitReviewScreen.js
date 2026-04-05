import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Modal,
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import StarRating from '../../components/StarRating';
import { submitReview, getLandlords, supabase } from '../../utils/storage';
import AuthPrompt from '../../components/AuthPrompt';
import { colors, radii, shadows, spacing, typography } from '../../utils/theme';

const YEAR_OPTIONS = ['2021/22', '2022/23', '2023/24', '2024/25', '2025/26'];

const RATING_DIMENSIONS = [
  { key: 'maintenance', label: 'Maintenance & Repairs' },
  { key: 'deposit', label: 'Deposit Return' },
  { key: 'condition', label: 'Property Condition' },
  { key: 'communication', label: 'Communication' },
  { key: 'wouldRentAgain', label: 'Would Rent Again' },
];

export default function SubmitReviewScreen({ navigation, route }) {
  const { landlordId: initialLandlordId } = route.params || {};
  const isMounted = useRef(true);

  const [user, setUser] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);

  const [landlords, setLandlords] = useState([]);
  const [selectedLandlord, setSelectedLandlord] = useState(null);
  const [showPicker, setShowPicker] = useState(false);
  
  const [email, setEmail] = useState('');
  const [propertyAddress, setPropertyAddress] = useState('');
  const [academicYear, setAcademicYear] = useState('');
  const [overallRating, setOverallRating] = useState(0);
  const [ratings, setRatings] = useState({ maintenance: 0, deposit: 0, condition: 0, communication: 0, wouldRentAgain: 0 });
  const [reviewText, setReviewText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [loadingLandlords, setLoadingLandlords] = useState(!initialLandlordId);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
      if (user) setEmail(user.email);
      setAuthChecked(true);
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user || null);
      if (session?.user) setEmail(session.user.email);
    });

    return () => {
      authListener?.subscription?.unsubscribe();
    };
  }, []);

  useEffect(() => {
    isMounted.current = true;
    async function fetchLandlords() {
      try {
        const all = await getLandlords();
        if (isMounted.current) {
          setLandlords(all);
          if (initialLandlordId) {
            const found = all.find(l => l.id === initialLandlordId);
            setSelectedLandlord(found);
          }
          setLoadingLandlords(false);
        }
      } catch (e) {
        console.error('Fetch landlords error:', e);
      }
    }
    fetchLandlords();
    return () => { isMounted.current = false; };
  }, [initialLandlordId]);

  const isExeterEmail = email.trim().toLowerCase().endsWith('@exeter.ac.uk');

  const setDimensionRating = (key, value) => {
    setRatings((prev) => ({ ...prev, [key]: value }));
  };

  const validate = () => {
    if (!selectedLandlord) return 'Please select a landlord or agency.';
    if (!email.trim()) return 'Please enter your university email.';
    if (!isExeterEmail) return 'Please use your @exeter.ac.uk email address.';
    if (!propertyAddress.trim()) return 'Please enter the property address.';
    if (!academicYear) return 'Please select the academic year you rented.';
    if (overallRating === 0) return 'Please give an overall star rating.';
    if (Object.values(ratings).some((v) => v === 0)) return 'Please rate all dimensions.';
    if (reviewText.trim().length < 20) return 'Please write a review of at least 20 characters.';
    return null;
  };

  const showAlert = (title, message, onPress) => {
    if (Platform.OS === 'web') {
      window.alert(`${title}\n\n${message}`);
      onPress?.();
    } else {
      Alert.alert(title, message, [{ text: 'OK', onPress }]);
    }
  };

  const handleSubmit = async () => {
    const err = validate();
    if (err) {
      showAlert('Missing information', err);
      return;
    }

    setSubmitting(true);
    
    const reviewData = {
      landlordId: selectedLandlord.id,
      overallRating,
      ...ratings,
      review: reviewText.trim(),
      verified: isExeterEmail,
      propertyAddress: propertyAddress.trim(),
      academicYear,
    };

    const result = await submitReview(reviewData);
    if (isMounted.current) {
      setSubmitting(false);
      if (result) {
        showAlert(
          'Review submitted!',
          'Thank you for helping fellow Exeter students.',
          () => navigation.goBack()
        );
      } else {
        console.error('[SubmitReview] Storage error');
        showAlert('Error', 'Something went wrong while saving your review. Please try again.');
      }
    }
  };

  if (!authChecked || loadingLandlords) {
    return (
      <View style={styles.centre}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  // TASK 1: Remove Auth Barrier. We now allow anonymous posts.
  // email defaults to empty if not logged in.

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">

        <View style={styles.anonBanner}>
          <Ionicons name="eye-off-outline" size={20} color={colors.primary} />
          <Text style={styles.anonText}>
            {user ? `Posting as ${user.email}` : "Posting Anonymously. No login required."}
          </Text>
        </View>

        {/* Landlord selection */}
        <FormSection title="Landlord or Agency *">
          <TouchableOpacity 
            style={[styles.input, styles.pickerTrigger, !initialLandlordId && styles.pickerEditable]} 
            onPress={() => !initialLandlordId && setShowPicker(true)}
            disabled={!!initialLandlordId}
            accessibilityRole="button"
            accessibilityLabel={selectedLandlord ? `Selected landlord: ${selectedLandlord.name}` : "Select a landlord"}
            accessibilityHint="Opens a list of Exeter landlords to choose from"
          >
            <Text style={[styles.pickerText, !selectedLandlord && styles.pickerPlaceholder]}>
              {selectedLandlord ? selectedLandlord.name : 'Select a landlord...'}
            </Text>
            {!initialLandlordId && (
              <Ionicons name="chevron-down" size={18} color={colors.textSecondary} />
            )}
          </TouchableOpacity>
        </FormSection>

        {/* Privacy notice */}
        <View style={styles.privacyBanner}>
          <Ionicons name="shield-checkmark-outline" size={18} color={colors.primary} />
          <Text style={styles.privacyText}>
            Your name is never shown. Only your verified student status is displayed.
          </Text>
        </View>

        {/* Email */}
        <FormSection title="University Email *">
          <Text style={styles.inputLabel}>Enter your @exeter.ac.uk email</Text>
          <TextInput
            style={[styles.input, !email && styles.inputEmpty, email && !isExeterEmail && styles.inputError]}
            placeholder="yourname@exeter.ac.uk"
            placeholderTextColor={colors.inactive}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            accessibilityLabel="University Email Field"
            accessibilityHint="Required for verification badge"
          />
          {email.length > 0 && (
            <View style={styles.emailStatus}>
              <Ionicons
                name={isExeterEmail ? 'checkmark-circle' : 'close-circle'}
                size={15}
                color={isExeterEmail ? colors.primary : colors.error}
              />
              <Text style={[styles.emailStatusText, { color: isExeterEmail ? colors.primary : colors.error }]}>
                {isExeterEmail ? 'Verified Exeter Student badge will be shown' : 'Must end in @exeter.ac.uk'}
              </Text>
            </View>
          )}
        </FormSection>

        {/* Property address */}
        <FormSection title="Property Address *">
          <Text style={styles.inputLabel}>Which property did you rent?</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. 24 Culverland Road, Exeter"
            placeholderTextColor={colors.inactive}
            value={propertyAddress}
            onChangeText={setPropertyAddress}
            accessibilityLabel="Property Address Field"
          />
        </FormSection>

        {/* Academic year */}
        <FormSection title="Academic Year You Rented *">
          <View style={styles.yearRow}>
            {YEAR_OPTIONS.map((y) => (
              <TouchableOpacity
                key={y}
                style={[styles.yearChip, academicYear === y && styles.yearChipSelected]}
                onPress={() => setAcademicYear(y)}
                accessibilityRole="button"
                accessibilityLabel={`Academic year ${y}`}
                accessibilityState={{ selected: academicYear === y }}
              >
                <Text style={[styles.yearChipText, academicYear === y && styles.yearChipTextSelected]}>{y}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </FormSection>

        {/* Overall rating */}
        <FormSection title="Overall Rating *">
          <View style={styles.overallRatingRow}>
            <StarRating rating={overallRating} size={34} onRate={setOverallRating} />
            {overallRating > 0 && (
              <Text style={styles.ratingLabel}>{['', 'Poor', 'Below average', 'Average', 'Good', 'Excellent'][overallRating]}</Text>
            )}
          </View>
        </FormSection>

        {/* Dimension ratings */}
        <FormSection title="Detailed Ratings *">
          {RATING_DIMENSIONS.map(({ key, label }) => (
            <View key={key} style={styles.dimensionRow}>
              <Text style={styles.dimensionLabel}>{label}</Text>
              <StarRating rating={ratings[key]} size={22} onRate={(v) => setDimensionRating(key, v)} />
            </View>
          ))}
        </FormSection>

        {/* Written review */}
        <FormSection title="Your Review *">
          <Text style={styles.inputLabel}>Share your honest experience (min 20 chars)</Text>
          <TextInput
            style={[styles.input, styles.reviewInput]}
            placeholder="What was good, what could improve, and any advice for future students..."
            placeholderTextColor={colors.inactive}
            value={reviewText}
            onChangeText={setReviewText}
            multiline
            textAlignVertical="top"
            maxLength={1000}
            accessibilityLabel="Review text area"
          />
          <Text style={styles.charCount}>{reviewText.length}/1000</Text>
        </FormSection>

        {/* Submit */}
        <TouchableOpacity
          style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={submitting}
          accessibilityRole="button"
          accessibilityLabel="Submit Review"
          accessibilityState={{ disabled: submitting }}
        >
          {submitting ? (
            <ActivityIndicator color={colors.white} size="small" />
          ) : (
            <>
              <Ionicons name="send-outline" size={18} color={colors.white} />
              <Text style={styles.submitBtnText}>Submit Review</Text>
            </>
          )}
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Landlord Picker Modal */}
      <Modal visible={showPicker} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Landlord</Text>
              <TouchableOpacity 
                onPress={() => setShowPicker(false)}
                accessibilityRole="button"
                accessibilityLabel="Close picker"
              >
                <Ionicons name="close" size={24} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={landlords}
              keyExtractor={item => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity 
                  style={styles.pickerItem} 
                  accessibilityRole="button"
                  accessibilityLabel={item.name}
                  onPress={() => {
                    setSelectedLandlord(item);
                    setShowPicker(false);
                  }}
                >
                  <Text style={styles.pickerItemText}>{item.name}</Text>
                  <Text style={styles.pickerItemType}>{item.type}</Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

function FormSection({ title, children }) {
  return (
    <View style={formSectionStyles.container}>
      <Text style={formSectionStyles.title}>{title}</Text>
      {children}
    </View>
  );
}

const formSectionStyles = StyleSheet.create({
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
  },
  centre: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  anonBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.primaryLight,
    padding: spacing.md,
    borderRadius: radii.md,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.primary + '30',
  },
  anonText: {
    ...typography.bodySmall,
    color: colors.primaryDark,
    fontWeight: '600',
  },
  inputLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 4,
    fontWeight: '500',
  },
  input: {
    backgroundColor: colors.white,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radii.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    fontSize: 15,
    color: colors.textPrimary,
  },
  inputEmpty: {},
  inputError: {
    borderColor: colors.error,
  },
  pickerTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F3F4F6', // Light gray for read-only
    borderColor: colors.border,
  },
  pickerEditable: {
    backgroundColor: colors.white,
    borderColor: colors.primary + '60',
  },
  pickerText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  pickerPlaceholder: {
    color: colors.inactive,
    fontWeight: '400',
  },
  emailStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 6,
  },
  emailStatusText: {
    fontSize: 12,
    fontWeight: '500',
  },
  yearRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  yearChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: radii.full,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  yearChipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  yearChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  yearChipTextSelected: {
    color: colors.white,
  },
  overallRatingRow: {
    alignItems: 'flex-start',
    gap: 8,
  },
  ratingLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  dimensionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  dimensionLabel: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    color: colors.textPrimary,
  },
  reviewInput: {
    height: 140,
    paddingTop: 12,
  },
  charCount: {
    ...typography.caption,
    textAlign: 'right',
    marginTop: 4,
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    paddingVertical: 16,
    borderRadius: radii.sm,
  },
  submitBtnDisabled: {
    opacity: 0.6,
  },
  submitBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.white,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.white,
    borderTopLeftRadius: radii.lg,
    borderTopRightRadius: radii.lg,
    height: '70%',
    padding: spacing.md,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    ...typography.h3,
  },
  pickerItem: {
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.background,
  },
  pickerItemText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  pickerItemType: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
});
