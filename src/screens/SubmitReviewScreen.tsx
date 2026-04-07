import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, Platform } from 'react-native';
import { supabase } from '../lib/supabase';
import { Ionicons } from '@expo/vector-icons';

export default function SubmitReviewScreen({ landlordId, onCancel, onSuccess }: { landlordId: string, onCancel: () => void, onSuccess: () => void }) {
  const [landlord, setLandlord] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [maintenance, setMaintenance] = useState(0);
  const [communication, setCommunication] = useState(0);
  const [value, setValue] = useState(0);
  const [deposit, setDeposit] = useState(0);
  const [comment, setComment] = useState('');
  const [otherName, setOtherName] = useState('');
  const [error, setError] = useState<string | null>(null);

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

  const handleSubmit = async () => {
    if (landlordId === 'other' && !otherName.trim()) {
      setError('Please provide the name of the landlord.');
      return;
    }
    
    if (maintenance === 0 || communication === 0 || value === 0 || deposit === 0 || !comment.trim()) {
      setError('Please fill in all mandatory fields and provide a comment.');
      return;
    }

    setSubmitting(true);
    setError(null);

    const finalComment = landlordId === 'other' ? `[LANDLORD: ${otherName.trim()}] ${comment.trim()}` : comment.trim();
    const overall_rating = Math.round((maintenance + communication + value + deposit) / 4);
    
    // Fallback to 'general' if id is 'other' to satisfy DB foreign key constraints
    const targetId = landlordId === 'other' ? 'general' : landlordId;

    try {
      const { error } = await supabase.from('reviews').insert([
        {
          landlord_id: targetId,
          maintenance,
          communication,
          deposit,
          review: finalComment,
          overall_rating,
          created_at: new Date().toISOString(),
        }
      ]);

      if (error) throw error;
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Failed to submit review. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const RatingInput = ({ label, value, onChange }: { label: string, value: number, onChange: (v: number) => void }) => (
    <View style={styles.ratingInputGroup}>
      <Text style={styles.ratingLabel}>{label}</Text>
      <View style={styles.starsRow}>
        {[1, 2, 3, 4, 5].map((s) => (
          <TouchableOpacity key={s} onPress={() => onChange(s)}>
            <Ionicons 
              name={s <= value ? "star" : "star-outline"} 
              size={32} 
              color={s <= value ? "#fbbf24" : "#d1d5db"} 
              style={{ marginRight: 8 }}
            />
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  if (loading) return <View style={styles.center}><ActivityIndicator color="#006633" /></View>;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.formCard}>
        <View style={styles.formHeader}>
          <TouchableOpacity onPress={onCancel} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color="#374151" />
          </TouchableOpacity>
          <Text style={styles.title}>Review: {landlord?.name}</Text>
        </View>

        <Text style={styles.instruction}>Your feedback is anonymous and helps other Exeter students make informed decisions.</Text>

        {error && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {landlordId === 'other' && (
          <View style={styles.commentSection}>
            <Text style={styles.ratingLabel}>Landlord Name</Text>
            <TextInput
              style={[styles.textArea, { minHeight: 50 }]}
              placeholder="Enter the name of the landlord or agency"
              value={otherName}
              onChangeText={setOtherName}
            />
          </View>
        )}

        <View style={styles.ratingsSection}>
          <RatingInput label="Maintenance & Repairs" value={maintenance} onChange={setMaintenance} />
          <RatingInput label="Communication & Respect" value={communication} onChange={setCommunication} />
          <RatingInput label="Value for Money" value={value} onChange={setValue} />
          <RatingInput label="Deposit Handling & Fairness" value={deposit} onChange={setDeposit} />
        </View>

        <View style={styles.commentSection}>
          <Text style={styles.ratingLabel}>Your Experience</Text>
          <TextInput
            style={styles.textArea}
            placeholder="Tell us about your time with this landlord. What went well? What could be improved?"
            multiline
            numberOfLines={6}
            value={comment}
            onChangeText={setComment}
            textAlignVertical="top"
          />
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
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  content: { padding: 40, alignItems: 'center' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  formCard: { width: '100%', maxWidth: 600, backgroundColor: '#fff', borderRadius: 24, padding: 40, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 15, elevation: 5 },
  formHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  backBtn: { marginRight: 16 },
  title: { fontSize: 24, fontWeight: '700', color: '#111827' },
  instruction: { fontSize: 15, color: '#6b7280', marginBottom: 32, lineHeight: 22 },
  ratingsSection: { marginBottom: 32 },
  ratingInputGroup: { marginBottom: 24 },
  ratingLabel: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 12 },
  starsRow: { flexDirection: 'row' },
  commentSection: { marginBottom: 40 },
  textArea: { backgroundColor: '#f3f4f6', borderRadius: 12, padding: 16, fontSize: 15, color: '#111827', minHeight: 150, ...Platform.select({ web: { outlineStyle: 'none' } }) } as any,
  submitBtn: { backgroundColor: '#006633', paddingVertical: 16, borderRadius: 12, alignItems: 'center' },
  disabledBtn: { opacity: 0.7 },
  submitBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  errorBox: { backgroundColor: '#fef2f2', padding: 16, borderRadius: 12, marginBottom: 24 },
  errorText: { color: '#ef4444', fontSize: 14, fontWeight: '500' }
});