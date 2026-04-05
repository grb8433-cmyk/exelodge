import React, { useState, useEffect } from 'react';
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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { saveMyProfile, supabase } from '../../utils/storage';
import AuthPrompt from '../../components/AuthPrompt';
import { colors, radii, spacing, typography } from '../../utils/theme';

const AREAS = ['Pennsylvania', 'St James', 'Heavitree', 'Newtown', 'Mount Pleasant', 'Haldon', 'City Centre'];
const SOCIAL_STYLES = ['Mostly quiet nights in', 'Occasional nights out', 'Frequent nights out'];
const SOCIAL_LABELS = { 'Mostly quiet nights in': 'Quiet', 'Occasional nights out': 'Occasional', 'Frequent nights out': 'Social' };
const SLEEP_SCHEDULES = ['Early Bird', 'Night Owl', 'Flexible'];
const GENDERS = ['Male', 'Female', 'Non-binary', 'Prefer not to say'];
const YEARS = ['1st Year', '2nd Year', '3rd Year', '4th Year', 'Postgrad'];
const SMOKING_OPTIONS = ['No', 'Yes', 'Outside only'];
const DRINKING_OPTIONS = ['No', 'Occasionally', 'Yes'];
const PETS_OPTIONS = ['No', 'Yes', 'No preference'];
const LOOKING_FOR = ['Forming a full house group', 'Looking to fill a spare room'];
const CLEANLINESS_LABELS = ['Relaxed', 'Fairly relaxed', 'Moderate', 'Fairly tidy', 'Very tidy'];
const BUDGET_MIN_OPTIONS = [100, 110, 120, 125, 130, 135, 140];
const BUDGET_MAX_OPTIONS = [140, 150, 155, 160, 165, 170, 175, 180, 200];

// Generate anonymous display name based on timestamp
const generateDisplayName = () => {
  const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const letter = letters[Math.floor(Math.random() * letters.length)];
  const num = Math.floor(10 + Math.random() * 90);
  return `Student #${letter}${num}`;
};

export default function CreateEditProfileScreen({ navigation, route }) {
  const existing = route.params?.existing || null;
  const isEditing = !!existing;

  const [user, setUser] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
      setAuthChecked(true);
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user || null);
    });

    return () => {
      authListener?.subscription?.unsubscribe();
    };
  }, []);

  const [displayName] = useState(existing?.displayName || generateDisplayName());
  const [age, setAge] = useState(existing?.age?.toString() || '');
  const [gender, setGender] = useState(existing?.gender || '');
  const [course, setCourse] = useState(existing?.course || '');
  const [year, setYear] = useState(existing?.year || '');
  const [budgetMin, setBudgetMin] = useState(existing?.budgetMin || 130);
  const [budgetMax, setBudgetMax] = useState(existing?.budgetMax || 160);
  const [areaPrefs, setAreaPrefs] = useState(existing?.areaPreferences || []);
  const [socialStyleFull, setSocialStyleFull] = useState(
    Object.keys(SOCIAL_LABELS).find((k) => SOCIAL_LABELS[k] === existing?.socialStyle) || ''
  );
  const [cleanliness, setCleanliness] = useState(existing?.cleanliness || 3);
  const [sleepSchedule, setSleepSchedule] = useState(existing?.sleepSchedule || '');
  const [languages, setLanguages] = useState(existing?.languages || '');
  const [smoking, setSmoking] = useState(existing?.smoking || '');
  const [drinking, setDrinking] = useState(existing?.drinking || '');
  const [pets, setPets] = useState(existing?.pets || '');
  const [lookingFor, setLookingFor] = useState(existing?.lookingFor || '');
  const [notes, setNotes] = useState(existing?.notes || '');

  const toggleArea = (area) => {
    setAreaPrefs((prev) =>
      prev.includes(area) ? prev.filter((a) => a !== area) : [...prev, area]
    );
  };

  const validate = () => {
    if (!age || isNaN(parseInt(age))) return 'Please enter your age.';
    if (!gender) return 'Please select your gender.';
    if (!course.trim()) return 'Please enter your course.';
    if (!year) return 'Please select your year of study.';
    if (areaPrefs.length === 0) return 'Please select at least one preferred area.';
    if (!socialStyleFull) return 'Please select your social style.';
    if (!sleepSchedule) return 'Please select your sleep schedule.';
    if (!smoking) return 'Please indicate your smoking preference.';
    if (!drinking) return 'Please indicate your drinking preference.';
    if (!pets) return 'Please indicate your pets preference.';
    if (!lookingFor) return 'Please select what you\'re looking for.';
    return null;
  };

  const handleSave = async () => {
    const err = validate();
    if (err) {
      Alert.alert('Missing information', err);
      return;
    }

    const profile = {
      displayName,
      age: parseInt(age),
      gender,
      course: course.trim(),
      year,
      budgetMin,
      budgetMax,
      areaPreferences: areaPrefs,
      socialStyle: SOCIAL_LABELS[socialStyleFull],
      cleanliness,
      sleepSchedule,
      languages: languages.trim(),
      smoking,
      drinking,
      pets,
      lookingFor,
      notes: notes.trim(),
    };

    await saveMyProfile(profile);

    Alert.alert(
      isEditing ? 'Profile updated' : 'Profile created!',
      isEditing ? 'Your profile has been saved.' : 'Your anonymous profile is now visible to other students.',
      [{ text: 'OK', onPress: () => navigation.goBack() }]
    );
  };

  const SingleSelect = ({ label, options, value, onSelect }) => (
    <FormSection title={label}>
      <View style={styles.chipsWrap}>
        {options.map((opt) => (
          <TouchableOpacity
            key={opt}
            style={[styles.chip, value === opt && styles.chipSelected]}
            onPress={() => onSelect(opt)}
          >
            <Text style={[styles.chipText, value === opt && styles.chipTextSelected]}>{opt}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </FormSection>
  );

  if (!authChecked) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  if (!user) {
    return <AuthPrompt message="Sign in with your university email to create a housemate profile." />;
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">

        {/* Anonymous name preview */}
        <View style={styles.anonymousBanner}>
          <Ionicons name="eye-off-outline" size={18} color={colors.primary} />
          <View style={styles.anonymousText}>
            <Text style={styles.anonymousTitle}>Your anonymous display name: {displayName}</Text>
            <Text style={styles.anonymousSubtitle}>Your real name is never shown. Only your student status is displayed.</Text>
          </View>
        </View>

        {/* Age */}
        <FormSection title="Age *">
          <TextInput
            style={styles.input}
            placeholder="e.g. 20"
            placeholderTextColor={colors.inactive}
            value={age}
            onChangeText={setAge}
            keyboardType="numeric"
            maxLength={2}
          />
        </FormSection>

        {/* Gender */}
        <SingleSelect label="Gender *" options={GENDERS} value={gender} onSelect={setGender} />

        {/* Course */}
        <FormSection title="Course *">
          <TextInput
            style={styles.input}
            placeholder="e.g. Economics, Law, Medicine..."
            placeholderTextColor={colors.inactive}
            value={course}
            onChangeText={setCourse}
          />
        </FormSection>

        {/* Year */}
        <SingleSelect label="Year of Study *" options={YEARS} value={year} onSelect={setYear} />

        {/* Budget */}
        <FormSection title={`Budget: £${budgetMin}–£${budgetMax} pppw`}>
          <View style={styles.budgetRow}>
            <View style={styles.budgetCol}>
              <Text style={styles.budgetLabel}>Minimum</Text>
              <View style={styles.chipsWrap}>
                {BUDGET_MIN_OPTIONS.map((b) => (
                  <TouchableOpacity
                    key={b}
                    style={[styles.smallChip, budgetMin === b && styles.chipSelected]}
                    onPress={() => setBudgetMin(b)}
                  >
                    <Text style={[styles.smallChipText, budgetMin === b && styles.chipTextSelected]}>£{b}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            <View style={styles.budgetCol}>
              <Text style={styles.budgetLabel}>Maximum</Text>
              <View style={styles.chipsWrap}>
                {BUDGET_MAX_OPTIONS.map((b) => (
                  <TouchableOpacity
                    key={b}
                    style={[styles.smallChip, budgetMax === b && styles.chipSelected]}
                    onPress={() => setBudgetMax(b)}
                  >
                    <Text style={[styles.smallChipText, budgetMax === b && styles.chipTextSelected]}>£{b}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
        </FormSection>

        {/* Area preferences */}
        <FormSection title="Preferred Areas * (select all that apply)">
          <View style={styles.chipsWrap}>
            {AREAS.map((area) => (
              <TouchableOpacity
                key={area}
                style={[styles.chip, areaPrefs.includes(area) && styles.chipSelected]}
                onPress={() => toggleArea(area)}
              >
                <Text style={[styles.chipText, areaPrefs.includes(area) && styles.chipTextSelected]}>{area}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </FormSection>

        {/* Social style */}
        <SingleSelect label="Social Style *" options={SOCIAL_STYLES} value={socialStyleFull} onSelect={setSocialStyleFull} />

        {/* Cleanliness */}
        <FormSection title={`Cleanliness: ${CLEANLINESS_LABELS[cleanliness - 1]}`}>
          <View style={styles.cleanlinessRow}>
            {[1, 2, 3, 4, 5].map((n) => (
              <TouchableOpacity
                key={n}
                style={[styles.cleanlinessBtn, cleanliness === n && styles.cleanlinessBtnActive]}
                onPress={() => setCleanliness(n)}
              >
                <Text style={[styles.cleanlinessBtnText, cleanliness === n && styles.cleanlinessBtnTextActive]}>{n}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={styles.cleanlinessLabels}>
            <Text style={styles.cleanlinessHint}>1 = Relaxed</Text>
            <Text style={styles.cleanlinessHint}>5 = Very tidy</Text>
          </View>
        </FormSection>

        {/* Sleep schedule */}
        <SingleSelect label="Sleep Schedule *" options={SLEEP_SCHEDULES} value={sleepSchedule} onSelect={setSleepSchedule} />

        {/* Languages */}
        <FormSection title="Languages Spoken">
          <TextInput
            style={styles.input}
            placeholder="e.g. English, Spanish, Mandarin..."
            placeholderTextColor={colors.inactive}
            value={languages}
            onChangeText={setLanguages}
          />
        </FormSection>

        <SingleSelect label="Smoking *" options={SMOKING_OPTIONS} value={smoking} onSelect={setSmoking} />
        <SingleSelect label="Drinking *" options={DRINKING_OPTIONS} value={drinking} onSelect={setDrinking} />
        <SingleSelect label="Pets *" options={PETS_OPTIONS} value={pets} onSelect={setPets} />
        <SingleSelect label="I am looking for... *" options={LOOKING_FOR} value={lookingFor} onSelect={setLookingFor} />

        {/* Notes */}
        <FormSection title="About Me (optional, max 200 chars)">
          <TextInput
            style={[styles.input, styles.notesInput]}
            placeholder="Anything else you'd like potential housemates to know about you..."
            placeholderTextColor={colors.inactive}
            value={notes}
            onChangeText={(t) => setNotes(t.slice(0, 200))}
            multiline
            textAlignVertical="top"
          />
          <Text style={styles.charCount}>{notes.length}/200</Text>
        </FormSection>

        {/* Save */}
        <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
          <Ionicons name="checkmark-circle-outline" size={20} color={colors.white} />
          <Text style={styles.saveBtnText}>{isEditing ? 'Save Changes' : 'Create Profile'}</Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function FormSection({ title, children }) {
  return (
    <View style={{ marginBottom: spacing.lg }}>
      <Text style={[typography.h4, { marginBottom: spacing.sm }]}>{title}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md },
  anonymousBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: colors.primaryLight,
    borderRadius: radii.sm,
    padding: spacing.md,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.primary + '40',
  },
  anonymousText: { flex: 1 },
  anonymousTitle: { fontSize: 13, fontWeight: '700', color: colors.primaryDark, marginBottom: 2 },
  anonymousSubtitle: { fontSize: 12, color: colors.primaryDark },
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
  notesInput: { height: 100, paddingTop: 12 },
  charCount: { ...typography.caption, textAlign: 'right', marginTop: 4 },
  chipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radii.full,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  chipSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: 13, fontWeight: '600', color: colors.textSecondary },
  chipTextSelected: { color: colors.white },
  smallChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radii.full,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  smallChipText: { fontSize: 12, fontWeight: '600', color: colors.textSecondary },
  budgetRow: { gap: spacing.md },
  budgetCol: { gap: 6 },
  budgetLabel: { ...typography.label },
  cleanlinessRow: { flexDirection: 'row', gap: 10 },
  cleanlinessBtn: {
    flex: 1, height: 44, borderRadius: radii.sm, borderWidth: 1.5,
    borderColor: colors.border, backgroundColor: colors.white,
    alignItems: 'center', justifyContent: 'center',
  },
  cleanlinessBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  cleanlinessBtnText: { fontSize: 15, fontWeight: '700', color: colors.textSecondary },
  cleanlinessBtnTextActive: { color: colors.white },
  cleanlinessLabels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  cleanlinessHint: { ...typography.caption },
  saveBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, backgroundColor: colors.primary, paddingVertical: 16, borderRadius: radii.sm,
  },
  saveBtnText: { fontSize: 16, fontWeight: '700', color: colors.white },
});
