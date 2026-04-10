import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Platform } from 'react-native';
import { supabase } from '../lib/supabase';
import { colors, spacing, radii, typography, shadows, fontFamily } from '../utils/theme';
import Icon from '../components/Icon';

interface SubmitReviewScreenProps {
  landlordId: string;
  onCancel: () => void;
  onSuccess: () => void;
}

export default function SubmitReviewScreen({ landlordId, onCancel, onSuccess }: SubmitReviewScreenProps) {
  const scrollRef = useRef<ScrollView>(null);
  const [landlord, setLandlord] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  
  // Rating states
  const [maintenance, setMaintenance] = useState(0);
  const [communication, setCommunication] = useState(0);
  const [value, setValue] = useState(0);
  const [deposit, setDeposit] = useState(0);
  
  const [reviewText, setReviewText] = useState('');
  const [landlordName, setLandlordName] = useState('');
  
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submissionError, setSubmissionError] = useState<string | null>(null);

  useEffect(() => {
    if (landlordId !== 'other') {
      fetchLandlord();
    } else {
      setLandlord({ name: 'General Landlords' });
      setLoading(false);
    }
  }, [landlordId]);

  const fetchLandlord = async () => {
    try {
      const { data, error } = await supabase.from('landlords').select('*').eq('id', landlordId).single();
      if (error) throw error;
      setLandlord(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setMaintenance(0);
    setCommunication(0);
    setValue(0);
    setDeposit(0);
    setReviewText('');
    setLandlordName('');
    setErrors({});
    setSubmissionError(null);
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};
    
    if (landlordId === 'other') {
      if (!landlordName.trim()) {
        newErrors.landlordName = "Please enter a landlord name";
      } else if (landlordName.trim().length < 2) {
        newErrors.landlordName = "Landlord name must be at least 2 characters";
      } else if (landlordName.trim().length > 100) {
        newErrors.landlordName = "Landlord name is too long (max 100)";
      }
    }
    
    if (maintenance === 0) newErrors.maintenance = "Please select a rating for Maintenance & Repairs";
    if (communication === 0) newErrors.communication = "Please select a rating for Communication & Respect";
    if (value === 0) newErrors.value = "Please select a rating for Value for Money";
    if (deposit === 0) newErrors.deposit = "Please select a rating for Deposit Handling & Fairness";
    
    if (!reviewText.trim()) {
      newErrors.reviewText = "Please write about your experience";
    } else if (reviewText.trim().length < 20) {
      newErrors.reviewText = "Please write at least 20 characters about your experience";
    } else if (reviewText.trim().length > 1000) {
      newErrors.reviewText = "Review text is too long (max 1000 characters)";
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) {
      scrollRef.current?.scrollTo({ y: 0, animated: true });
      return;
    }

    setSubmitting(true);
    setSubmissionError(null);

    const overallRating = Math.round((maintenance + communication + value + deposit) / 4);
    const targetId = landlordId === 'other' ? 'general' : landlordId;

    try {
      const { error } = await supabase.from('reviews').insert([{
        landlord_id: targetId,
        landlord_name: landlordId === 'other' ? landlordName.trim() : landlord.name,
        maintenance_rating: maintenance,
        communication_rating: communication,
        value_rating: value,
        deposit_rating: deposit,
        review_text: reviewText.trim(),
        overall_rating: overallRating,
      }]);

      if (error) throw error;
      
      setShowSuccess(true);
      resetForm();
      scrollRef.current?.scrollTo({ y: 0, animated: true });
      
      setTimeout(() => {
        setShowSuccess(false);
        // We don't call onSuccess() here because the requirement says "show the blank form again ready for another review"
      }, 4000);

    } catch (err: any) {
      setSubmissionError('Something went wrong submitting your review. Please try again.');
      console.error('Supabase submission error:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const RatingInput = ({ label, value, onChange, error }: { label: string, value: number, onChange: (v: number) => void, error?: string }) => (
    <View style={styles.ratingInputGroup}>
      <Text style={styles.ratingLabel}>{label}</Text>
      <View style={styles.starsRow}>
        {[1, 2, 3, 4, 5].map((star) => (
          <TouchableOpacity 
            key={star} 
            onPress={() => onChange(star === value ? 0 : star)}
            style={styles.starTouch}
            activeOpacity={0.7}
          >
            <Text style={[styles.starIcon, { color: star <= value ? colors.accent : colors.borderDark }]}>
              {star <= value ? '★' : '☆'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      {error && <Text style={styles.inlineError}>{error}</Text>}
    </View>
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView 
      ref={scrollRef}
      style={styles.container} 
      contentContainerStyle={styles.content}
    >
      <View style={styles.formCard}>
        <View style={styles.formHeader}>
          <TouchableOpacity onPress={onCancel} style={styles.backBtn}>
            <Text style={{ fontSize: 24, color: "#374151" }}>←</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Review: {landlord?.name}</Text>
        </View>

        {showSuccess ? (
          <View style={styles.successBox}>
            <Icon name="check-circle" size={24} color={colors.success} />
            <Text style={styles.successText}>Thank you! Your review has been submitted and will help other Exeter students.</Text>
          </View>
        ) : (
          <>
            <Text style={styles.instruction}>Your feedback is anonymous and helps other Exeter students make informed decisions.</Text>

            {submissionError && (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{submissionError}</Text>
              </View>
            )}

            {landlordId === 'other' && (
              <View style={styles.commentSection}>
                <Text style={styles.ratingLabel}>Landlord Name</Text>
                <TextInput 
                  style={[styles.textArea, { minHeight: 50 }, errors.landlordName && styles.errorInput]}
                  placeholder="Enter the name of the landlord or agency"
                  value={landlordName}
                  onChangeText={setLandlordName}
                />
                {errors.landlordName && <Text style={styles.inlineError}>{errors.landlordName}</Text>}
              </View>
            )}

            <View style={styles.ratingsSection}>
              <RatingInput 
                label="Maintenance & Repairs" 
                value={maintenance} 
                onChange={setMaintenance} 
                error={errors.maintenance}
              />
              <RatingInput 
                label="Communication & Respect" 
                value={communication} 
                onChange={setCommunication} 
                error={errors.communication}
              />
              <RatingInput 
                label="Value for Money" 
                value={value} 
                onChange={setValue} 
                error={errors.value}
              />
              <RatingInput 
                label="Deposit Handling & Fairness" 
                value={deposit} 
                onChange={setDeposit} 
                error={errors.deposit}
              />
            </View>

            <View style={styles.commentSection}>
              <Text style={styles.ratingLabel}>Your Experience</Text>
              <TextInput 
                style={[styles.textArea, errors.reviewText && styles.errorInput]}
                placeholder="Tell us about your time with this landlord. What went well? What could be improved?"
                multiline
                numberOfLines={6}
                value={reviewText}
                onChangeText={setReviewText}
                textAlignVertical="top"
              />
              {errors.reviewText && <Text style={styles.inlineError}>{errors.reviewText}</Text>}
            </View>

            <TouchableOpacity 
              style={[styles.submitBtn, submitting && styles.disabledBtn]} 
              onPress={handleSubmit}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.submitBtnText}>Post Review</Text>
              )}
            </TouchableOpacity>
          </>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 40, alignItems: 'center' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  formCard: { 
    width: '100%', 
    maxWidth: 600, 
    backgroundColor: '#fff', 
    borderRadius: 24, 
    padding: 40,
    ...shadows.medium,
  },
  formHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  backBtn: { marginRight: 16 },
  title: { fontSize: 24, fontWeight: '700', color: '#111827', fontFamily },
  instruction: { fontSize: 15, color: '#6b7280', marginBottom: 32, lineHeight: 22, fontFamily },
  ratingsSection: { marginBottom: 32 },
  ratingInputGroup: { marginBottom: 24 },
  ratingLabel: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 12, fontFamily },
  starsRow: { flexDirection: 'row' },
  starTouch: { paddingVertical: 4, paddingRight: 8 },
  starIcon: { fontSize: 32 },
  commentSection: { marginBottom: 40 },
  textArea: { 
    backgroundColor: '#f3f4f6', 
    borderRadius: 12, 
    padding: 16, 
    fontSize: 15, 
    color: '#111827', 
    minHeight: 150,
    fontFamily,
    ...Platform.select({
      web: { outlineStyle: 'none' } as any
    })
  },
  errorInput: { borderWidth: 1, borderColor: colors.error },
  submitBtn: { backgroundColor: colors.primary, paddingVertical: 16, borderRadius: 12, alignItems: 'center' },
  disabledBtn: { opacity: 0.7 },
  submitBtnText: { color: '#fff', fontSize: 16, fontWeight: '700', fontFamily },
  errorBox: { backgroundColor: '#fef2f2', padding: 16, borderRadius: 12, marginBottom: 24 },
  errorText: { color: colors.error, fontSize: 14, fontWeight: '500', fontFamily },
  inlineError: { color: colors.error, fontSize: 12, marginTop: 4, fontFamily },
  successBox: { 
    backgroundColor: '#f0fdf4', 
    padding: 24, 
    borderRadius: 16, 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 12,
    borderWidth: 1,
    borderColor: '#bcf0da'
  },
  successText: { color: colors.success, fontSize: 16, fontWeight: '600', flex: 1, lineHeight: 24, fontFamily }
});

