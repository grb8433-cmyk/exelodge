import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Linking,
  Alert,
  ActivityIndicator,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { getMatches, getMessages, sendMessage } from '../../utils/storage';
import { colors, radii, shadows, spacing, typography } from '../../utils/theme';

export default function MatchesScreen({ navigation }) {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeMatch, setActiveTabMatch] = useState(null);

  const load = useCallback(async () => {
    const m = await getMatches();
    setMatches(m);
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  if (loading) {
    return (
      <View style={styles.centre}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={matches}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          matches.length > 0 ? (
            <View style={styles.headerBanner}>
              <Ionicons name="heart" size={20} color={colors.error} />
              <Text style={styles.headerText}>
                {matches.length} mutual {matches.length === 1 ? 'match' : 'matches'}! Connect with them below.
              </Text>
            </View>
          ) : null
        }
        renderItem={({ item }) => (
          <MatchCard 
            profile={item} 
            onConnect={() => setActiveTabMatch(item)} 
          />
        )}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="heart-outline" size={64} color={colors.border} />
            <Text style={styles.emptyTitle}>No matches yet</Text>
            <Text style={styles.emptySubtitle}>
              Browse profiles and tap the heart icon to express interest. When someone is also interested in you, you'll match here!
            </Text>
            <TouchableOpacity
              style={styles.browseBtn}
              onPress={() => navigation.navigate('BrowseProfiles')}
            >
              <Text style={styles.browseBtnText}>Browse Profiles</Text>
            </TouchableOpacity>
          </View>
        }
      />

      {activeMatch && (
        <MessageModal 
          match={activeMatch} 
          onClose={() => setActiveTabMatch(null)} 
        />
      )}
    </View>
  );
}

function MatchCard({ profile, onConnect }) {
  return (
    <View style={styles.matchCard}>
      <View style={styles.matchHeader}>
        <View style={styles.avatar}>
          <Ionicons name="heart" size={24} color={colors.error} />
        </View>
        <View style={styles.matchInfo}>
          <Text style={styles.matchName}>{profile.displayName}</Text>
          <Text style={styles.matchCourse}>{profile.course} · {profile.year}</Text>
        </View>
        <View style={styles.matchBadge}>
          <Ionicons name="checkmark-circle" size={14} color={colors.primary} />
          <Text style={styles.matchBadgeText}>Mutual Match</Text>
        </View>
      </View>

      <View style={styles.detailsRow}>
        <Text style={styles.detailItem}>£{profile.budgetMin}–£{profile.budgetMax}</Text>
        <Text style={styles.detailSep}>·</Text>
        <Text style={styles.detailItem}>{profile.socialStyle}</Text>
        <Text style={styles.detailSep}>·</Text>
        <Text style={styles.detailItem}>{profile.areaPreferences?.[0]}</Text>
      </View>

      <TouchableOpacity style={styles.connectBtn} onPress={onConnect}>
        <Ionicons name="chatbubbles-outline" size={18} color={colors.white} />
        <Text style={styles.connectBtnText}>Message & Connect</Text>
      </TouchableOpacity>
    </View>
  );
}

function MessageModal({ match, onClose }) {
  const [msg, setMsg] = useState('');
  const [history, setHistory] = useState([]);

  useEffect(() => {
    getMessages(match.id).then(setHistory);
  }, [match.id]);

  const handleSend = async () => {
    if (!msg.trim()) return;
    await sendMessage(match.id, msg.trim());
    setMsg('');
    const updated = await getMessages(match.id);
    setHistory(updated);
  };

  const openLink = (type, val) => {
    const url = type === 'email' ? `mailto:${val}` : `https://instagram.com/${val.replace('@', '')}`;
    Linking.openURL(url).catch(() => Alert.alert('Error', 'Could not open link.'));
  };

  return (
    <Modal animationType="slide" transparent={true} visible={true}>
      <KeyboardAvoidingView 
        style={styles.modalOverlay} 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.modalContent}>
          {/* Modal Header */}
          <View style={styles.modalHeader}>
            <View>
              <Text style={styles.modalTitle}>Chat with {match.displayName}</Text>
              <Text style={styles.modalSub}>{match.course}</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={24} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>

          {/* Contact Details Reveal */}
          <View style={styles.revealSection}>
            <Text style={styles.revealTitle}>Contact Information Exchanged</Text>
            <View style={styles.revealRow}>
              <TouchableOpacity style={styles.revealItem} onPress={() => openLink('email', match.contactEmail)}>
                <Ionicons name="mail" size={16} color={colors.primary} />
                <Text style={styles.revealText}>{match.contactEmail}</Text>
              </TouchableOpacity>
              {match.instagram && (
                <TouchableOpacity style={styles.revealItem} onPress={() => openLink('instagram', match.instagram)}>
                  <Ionicons name="logo-instagram" size={16} color="#E1306C" />
                  <Text style={styles.revealText}>{match.instagram}</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Message Thread */}
          <ScrollView style={styles.thread} contentContainerStyle={styles.threadContent}>
            {history.length === 0 ? (
              <Text style={styles.emptyThread}>Start the conversation! Say hi to {match.displayName}.</Text>
            ) : (
              history.map((m) => (
                <View key={m.id} style={styles.bubble}>
                  <Text style={styles.bubbleText}>{m.text}</Text>
                  <Text style={styles.bubbleTime}>{new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
                </View>
              ))
            )}
          </ScrollView>

          {/* Input Area */}
          <View style={styles.inputArea}>
            <TextInput
              style={styles.textInput}
              placeholder="Type a message..."
              value={msg}
              onChangeText={setMsg}
              multiline
            />
            <TouchableOpacity style={styles.sendBtn} onPress={handleSend}>
              <Ionicons name="send" size={20} color={colors.white} />
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  list: { padding: spacing.md },
  headerBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#FFF1F2', borderRadius: radii.sm,
    padding: spacing.md, marginBottom: spacing.md,
    borderWidth: 1, borderColor: '#FECDD3',
  },
  headerText: { flex: 1, fontSize: 13, fontWeight: '600', color: '#BE123C' },
  centre: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyState: { alignItems: 'center', paddingVertical: 60, gap: 12, paddingHorizontal: spacing.lg },
  emptyTitle: { ...typography.h3, color: colors.textSecondary },
  emptySubtitle: { ...typography.bodySmall, textAlign: 'center', lineHeight: 20, maxWidth: 280 },
  browseBtn: { backgroundColor: colors.primary, paddingHorizontal: spacing.xl, paddingVertical: 12, borderRadius: radii.sm, marginTop: 4 },
  browseBtnText: { fontSize: 14, fontWeight: '700', color: colors.white },
  matchCard: {
    backgroundColor: colors.white, borderRadius: radii.lg, padding: spacing.md,
    marginBottom: spacing.md, borderWidth: 1, borderColor: '#FECDD3', ...shadows.card,
  },
  matchHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
  avatar: { width: 48, height: 48, borderRadius: radii.full, backgroundColor: '#FFF1F2', alignItems: 'center', justifyContent: 'center' },
  matchInfo: { flex: 1 },
  matchName: { ...typography.h4 },
  matchCourse: { ...typography.bodySmall },
  matchBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: colors.primaryLight, paddingHorizontal: 8, paddingVertical: 3, borderRadius: radii.full,
  },
  matchBadgeText: { fontSize: 11, fontWeight: '700', color: colors.primary },
  detailsRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: spacing.md },
  detailItem: { ...typography.bodySmall, fontWeight: '500' },
  detailSep: { color: colors.border },
  connectBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, backgroundColor: colors.primary, paddingVertical: 12, borderRadius: radii.sm,
  },
  connectBtnText: { fontSize: 14, fontWeight: '700', color: colors.white },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: colors.white, borderTopLeftRadius: radii.lg, borderTopRightRadius: radii.lg, height: '85%' },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  modalTitle: { ...typography.h3 },
  modalSub: { ...typography.bodySmall },
  closeBtn: { padding: 4 },
  revealSection: { padding: spacing.md, backgroundColor: colors.primaryLight, borderBottomWidth: 1, borderBottomColor: colors.border },
  revealTitle: { fontSize: 11, fontWeight: '800', color: colors.primaryDark, textTransform: 'uppercase', marginBottom: 8, letterSpacing: 0.5 },
  revealRow: { flexDirection: 'row', gap: 16, flexWrap: 'wrap' },
  revealItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  revealText: { fontSize: 13, fontWeight: '600', color: colors.textPrimary, textDecorationLine: 'underline' },
  thread: { flex: 1 },
  threadContent: { padding: spacing.md, gap: 10 },
  emptyThread: { textAlign: 'center', color: colors.textSecondary, marginTop: 40, fontStyle: 'italic' },
  bubble: {
    alignSelf: 'flex-end', backgroundColor: colors.primary,
    padding: 12, borderRadius: radii.md, borderBottomRightRadius: 2, maxWidth: '80%',
  },
  bubbleText: { color: colors.white, fontSize: 14 },
  bubbleTime: { color: 'rgba(255,255,255,0.7)', fontSize: 10, textAlign: 'right', marginTop: 4 },
  inputArea: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    padding: spacing.md, borderTopWidth: 1, borderTopColor: colors.border,
    paddingBottom: Platform.OS === 'ios' ? 30 : spacing.md,
  },
  textInput: {
    flex: 1, backgroundColor: colors.background, borderRadius: radii.md,
    paddingHorizontal: 16, paddingVertical: 10, maxHeight: 100, fontSize: 14,
  },
  sendBtn: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center',
  },
});
