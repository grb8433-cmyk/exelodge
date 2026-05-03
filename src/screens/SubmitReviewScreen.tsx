import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Platform } from 'react-native';
import { supabase } from '../lib/supabase';
import { colors, spacing, radii, typography, shadows, fontFamily, getUniversityColors } from '../utils/theme';
import Icon from '../components/Icon';
import UNIVERSITIES from '../../config/universities.json';

interface SubmitReviewScreenProps {
  landlordId: string;
  universityId: string;
  onCancel: () => void;
  onSuccess: () => void;
}

export default function SubmitReviewScreen({ landlordId, universityId, onCancel, onSuccess }: SubmitReviewScreenProps) {
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
  const [honeypot, setHoneypot] = useState(''); 
  
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submissionError, setSubmissionError] = useState<string | null>(null);

  const currentUni = UNIVERSITIES.find(u => u.id === universityId) || UNIVERSITIES[0];
  const theme = getUniversityColors(universityId);

  useEffect(() => {
    if (landlordId !== 'other') {
      fetchLandlord();
    } else {
      setLandlord({ name: 'General Landlords' });
      setLoading(false);
    }
  }, [landlordId]);

  const fetchLandlord = async () => {
    const timeout = setTimeout(() => {
      if (loading) {
        setLoading(false);
        setSubmissionError("Connection is slow, but you can still write your review.");
      }
    }, 5000);

    try {
      const { data, error } = await supabase.from('landlords').select('*').eq('id', landlordId).single();
      if (error) {
        setLandlord({ name: landlordId.replace(/([A-Z])/g, ' $1').trim() });
      } else {
        setLandlord(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      clearTimeout(timeout);
      setLoading(false);
    }
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (landlordId === 'other') {
      if (!landlordName.trim()) newErrors.landlordName = "Please enter a landlord name";
    }
    if (maintenance === 0) newErrors.maintenance = "Select a rating";
    if (communication === 0) newErrors.communication = "Select a rating";
    if (value === 0) newErrors.value = "Select a rating";
    if (deposit === 0) newErrors.deposit = "Select a rating";
    if (!reviewText.trim()) newErrors.reviewText = "Please write about your experience";
    else if (reviewText.trim().length < 20) newErrors.reviewText = "Please write at least 20 characters";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    try {
      if (honeypot.length > 0) {
        setShowSuccess(true);
        return;
      }
      if (!validate()) {
        scrollRef.current?.scrollTo({ y: 0, animated: true });
        return;
      }
      setSubmitting(true);
      const overallRating = Math.round((maintenance + communication + value + deposit) / 4);
      const targetId = landlordId === 'other' ? 'general' : landlordId;
      const finalName = landlordId === 'other' ? landlordName.trim() : (landlord?.name || landlordId);

      const { error } = await supabase.from('reviews').insert([{
        landlord_id: targetId,
        landlord_name: finalName,
        maintenance_rating: maintenance,
        communication_rating: communication,
        value_rating: value,
        deposit_rating: deposit,
        review_text: reviewText.trim(),
        overall_rating: overallRating,
        approved: false,
        university: universityId,
      }]);

      if (error) throw error;
      setShowSuccess(true);
      scrollRef.current?.scrollTo({ y: 0, animated: true });
    } catch (err: any) {
      setSubmissionError(`Submission failed. Please try again.`);
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
            <Icon 
              name="star" 
              size={24} 
              color={star <= value ? colors.starFilled : colors.starEmpty} 
              fill={star <= value ? colors.starFilled : 'transparent'}
            />
          </TouchableOpacity>
        ))}
      </View>
      {error && <Text style={styles.inlineError}>{error}</Text>}
    </View>
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={theme.primary} />
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
            <Icon name="arrow-left" size={20} color={colors.textPrimary} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>Review: {landlord?.name}</Text>
          </View>
        </View>

        {showSuccess ? (
          <View style={styles.successContainer}>
            <View style={styles.successBox}>
              <Icon name="check-circle" size={28} color={colors.success} />
              <View style={{ flex: 1 }}>
                <Text style={styles.successTitle}>Review Submitted!</Text>
                <Text style={styles.successText}>Thank you! Your review is being reviewed and will be live once approved.</Text>
              </View>
            </View>
            <TouchableOpacity 
              style={[styles.backHomeBtn, { backgroundColor: theme.primary }]}
              onPress={onCancel}
            >
              <Text style={styles.backHomeBtnText}>Back to Reviews</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <Text style={styles.instruction}>Your feedback is anonymous and helps other {currentUni.city} students make informed decisions.</Text>

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
                  placeholderTextColor={colors.textMuted}
                  value={landlordName}
                  onChangeText={setLandlordName}
                />
                {errors.landlordName && <Text style={styles.inlineError}>{errors.landlordName}</Text>}
              </View>
            )}

            <TextInput
              style={styles.honeypot}
              value={honeypot}
              onChangeText={setHoneypot}
              tabIndex={-1}
              autoComplete="off"
            />

            <View style={styles.ratingsSection}>
              <RatingInput label="Maintenance & Repairs" value={maintenance} onChange={setMaintenance} error={errors.maintenance} />
              <RatingInput label="Communication & Respect" value={communication} onChange={setCommunication} error={errors.communication} />
              <RatingInput label="Value for Money" value={value} onChange={setValue} error={errors.value} />
              <RatingInput label="Deposit Handling & Fairness" value={deposit} onChange={setDeposit} error={errors.deposit} />
            </View>

            <View style={styles.commentSection}>
              <Text style={styles.ratingLabel}>Your Experience</Text>
              <TextInput 
                style={[styles.textArea, errors.reviewText && { borderColor: colors.error, borderWidth: 1 }]}
                placeholder="Tell us about your time with this landlord. What went well? What could be improved?"
                placeholderTextColor={colors.textMuted}
                multiline
                numberOfLines={6}
                value={reviewText}
                onChangeText={setReviewText}
                textAlignVertical="top"
              />
              {errors.reviewText && <Text style={styles.inlineError}>{errors.reviewText}</Text>}
            </View>

            <TouchableOpacity 
              style={[styles.submitBtn, { backgroundColor: theme.primary }, submitting && styles.disabledBtn]} 
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
  content: { padding: 20, alignItems: 'center', paddingTop: 40, paddingBottom: 60 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  formCard: { 
    width: '100%', 
    maxWidth: 600, 
    backgroundColor: colors.white, 
    borderRadius: 16, 
    padding: 32,
    ...shadows.medium,
  },
  formHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 32, gap: 16 },
  backBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.surfaceSubtle, alignItems: 'center', justifyContent: 'center' },
  title: { ...typography.h2Section, fontSize: 22, color: colors.textPrimary },
  instruction: { ...typography.body, color: colors.textSecondary, marginBottom: 32 },
  ratingsSection: { marginBottom: 32 },
  ratingInputGroup: { marginBottom: 24 },
  ratingLabel: { ...typography.eyebrow, marginBottom: 12, color: colors.textSecondary },
  starsRow: { flexDirection: 'row', gap: 8 },
  starTouch: { paddingVertical: 4 },
  commentSection: { marginBottom: 40 },
  textArea: { 
    backgroundColor: colors.surfaceSubtle, 
    borderRadius: 12, 
    padding: 16, 
    ...typography.body,
    color: colors.textPrimary, 
    minHeight: 150,
  },
  errorInput: { borderColor: colors.error, borderWidth: 1 },
  honeypot: { position: 'absolute', width: 0, height: 0, opacity: 0, left: -9999 },
  submitBtn: { paddingVertical: 16, borderRadius: 12, alignItems: 'center', minHeight: 56, justifyContent: 'center' },
  disabledBtn: { opacity: 0.7 },
  submitBtnText: { color: '#fff', fontSize: 16, fontWeight: '700', fontFamily },
  errorBox: { backgroundColor: '#fef2f2', padding: 16, borderRadius: 12, marginBottom: 24 },
  errorText: { color: colors.error, fontSize: 14, fontWeight: '500', fontFamily },
  inlineError: { color: colors.error, fontSize: 12, marginTop: 4, fontFamily },
  successContainer: { alignItems: 'center', width: '100%', gap: 32, paddingVertical: 20 },
  successBox: { 
    backgroundColor: '#f0fdf4', 
    padding: 24, 
    borderRadius: 16, 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 16,
    borderWidth: 1,
    borderColor: '#bcf0da',
    width: '100%',
  },
  successTitle: { ...typography.h3Card, color: '#166534', marginBottom: 4 },
  successText: { ...typography.body, color: '#166534', flex: 1 },
  backHomeBtn: {
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 12,
    ...shadows.soft,
    minHeight: 48,
    justifyContent: 'center',
  },
  backHomeBtnText: { color: '#fff', fontSize: 16, fontWeight: '700', fontFamily },
});
