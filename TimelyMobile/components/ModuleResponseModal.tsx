import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, Modal, TouchableOpacity, StyleSheet, TextInput, Platform, ActivityIndicator, ScrollView, Image, Dimensions, Alert } from 'react-native';
import { Video } from 'expo-av';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { supabase, supabaseAnonKey } from '../lib/supabase';
import { insertActivityLogMobile } from '../lib/supabase';

export type TimelineModule = {
  id: string;
  module_type: 'question' | 'feedback' | 'multiple_choice' | 'photo_video';
  title?: string;
  question?: string;
  label?: string;
  date?: string;
  time?: string;
  survey_data?: any; // for multiple_choice: { options: string[] }
  feedback_data?: any;
  created_at?: string;
};

type Props = {
  visible: boolean;
  module: TimelineModule | null;
  guestId: string;
  userId?: string | null;
  eventId: string;
  onClose: () => void;
};

export default function ModuleResponseModal({ visible, module, guestId, userId = null, eventId, onClose }: Props) {
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [answerText, setAnswerText] = useState(''); // question
  const [selectedOption, setSelectedOption] = useState<string | null>(null); // multiple_choice
  const [rating, setRating] = useState<number>(0); // feedback (0-5, 0.1 step)
  const [comment, setComment] = useState(''); // optional feedback comment
  const [pickedFile, setPickedFile] = useState<{ uri: string; type: string; name?: string } | null>(null);
  const starBarWidth = useRef<number>(0);

  useEffect(() => {
    if (!module) return;
    setError(null);
    setSubmitting(false);
    setSubmitted(false);
    setAnswerText('');
    setSelectedOption(null);
    setRating(0);
    setComment('');
    setPickedFile(null);
    // Local cache check for quick disable
    (async () => {
      try {
        const cacheKey = `module_resp_submitted_${eventId}_${guestId}_${module.id}`;
        const cached = await AsyncStorage.getItem(cacheKey);
        if (cached === '1') {
          setSubmitted(true);
          return; // no need to hit network if already cached
        }
      } catch {}
      // Preferred: SECURITY DEFINER RPC to check existence (avoids RLS issues)
      try {
        const { data: existsRpc, error: rpcErr } = await supabase.rpc('user_or_guest_has_module_answer', {
          p_guest_id: guestId ?? null,
          p_user_id: userId ?? null,
          p_module_id: module.id,
          p_event_id: eventId,
        });
        if (!rpcErr && (existsRpc === true || existsRpc === 'true' || existsRpc === 1)) {
          setSubmitted(true);
          try { await AsyncStorage.setItem(`module_resp_submitted_${eventId}_${guestId}_${module.id}`, '1'); } catch {}
          return;
        }
      } catch {}
      // Fallback: direct table check (may be blocked by RLS depending on policies)
      try {
        const { data, error: selErr } = await supabase
          .from('guest_module_answers')
          .select('id')
          .eq('guest_id', guestId)
          .eq('module_id', module?.id)
          .eq('event_id', eventId)
          .limit(1);
        if (!selErr && data && data.length > 0) {
          setSubmitted(true);
          try {
            const cacheKey = `module_resp_submitted_${eventId}_${guestId}_${module.id}`;
            await AsyncStorage.setItem(cacheKey, '1');
          } catch {}
        }
      } catch {}
    })();
  }, [module, guestId, eventId, visible]);

  const title = module?.title || module?.question || module?.label || 'Module';
  const description = useMemo(() => {
    if (!module) return '';
    // Avoid repeating text for multiple choice and duplicates
    if (module.module_type === 'multiple_choice') return '';
    const desc = module.question || module.feedback_data?.question || '';
    return desc === title ? '' : (desc || '');
  }, [module]);

  const displayDate = useMemo(() => {
    const src = module?.date || (module?.created_at ? new Date(module.created_at).toISOString().slice(0,10) : '');
    if (!src) return '';
    // Convert YYYY-MM-DD to DD/MM/YYYY
    if (src.includes('-')) {
      const [y,m,d] = src.split('-');
      if (y && m && d) return `${d}/${m}/${y}`;
    }
    return src;
  }, [module]);

  const pickMedia = async () => {
    // Use legacy API for compatibility with current expo-image-picker version
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.All, quality: 0.8 });
    if (!res.canceled && res.assets?.[0]) {
      const a = res.assets[0];
      setPickedFile({ uri: a.uri, type: a.type === 'video' ? 'video/mp4' : a.mimeType || 'image/jpeg', name: a.fileName });
    }
  };

  const uploadViaEdge = async (file: { uri: string; type: string }) => {
    const base64 = await FileSystem.readAsStringAsync(file.uri, { encoding: FileSystem.EncodingType.Base64 });
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);
    try {
      const response = await fetch('https://ijsktwmevnqgzwwuggkf.functions.supabase.co/guest-upload-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseAnonKey}`,
          'apikey': supabaseAnonKey,
        },
        body: JSON.stringify({
          guest_id: guestId,
          module_id: module?.id,
          event_id: eventId,
          file_base64: base64,
          file_type: file.type,
        }),
        signal: controller.signal,
      });
      let result: any = {};
      try { result = await response.json(); } catch {}
      if (!response.ok || (!result?.publicUrl && !result?.url)) {
        const errText = typeof result?.error === 'string' ? result.error : await response.text().catch(() => 'Upload failed');
        throw new Error(errText || 'Upload failed');
      }
      return result.publicUrl || result.url;
    } finally {
      clearTimeout(timeoutId);
    }
  };

  const submit = async () => {
    if (!module || submitted) return;
    setSubmitting(true);
    setError(null);
    try {
      // Require either guestId or userId
      if ((!guestId && !userId) || !eventId || !module?.id) {
        const msg = 'Missing identifiers for submission (need guestId OR userId, plus eventId and moduleId).';
        console.warn('[MODULE SUBMIT] ' + msg, { guestId, userId, eventId, moduleId: module?.id });
        setError(msg);
        Alert.alert('Error', msg);
        setSubmitting(false);
        return;
      }
      let answer: string = '';
      if (module.module_type === 'question') {
        if (!answerText.trim()) throw new Error('Please enter an answer');
        answer = answerText.trim();
      } else if (module.module_type === 'multiple_choice') {
        if (!selectedOption) throw new Error('Please select an option');
        answer = selectedOption;
      } else if (module.module_type === 'feedback') {
        if (rating <= 0) throw new Error('Please select a rating');
        answer = JSON.stringify({ rating, comment: comment.trim() });
      } else if (module.module_type === 'photo_video') {
        if (!pickedFile) throw new Error('Please choose a file');
        const url = await uploadViaEdge(pickedFile);
        answer = JSON.stringify({ url, type: pickedFile.type });
      }

      const { data, error } = await supabase.rpc('insert_module_answer_unified', {
        p_guest_id: guestId ?? null,
        p_user_id: userId ?? null,
        p_module_id: module.id,
        p_answer_text: answer,
        p_event_id: eventId,
      });

      if (error) {
        setError(error.message || 'Failed to submit');
        setSubmitting(false);
        return;
      }

      setSubmitted(true);

      // activity: module response
      insertActivityLogMobile({
        company_id: (await supabase.from('events').select('company_id').eq('id', eventId).single()).data?.company_id || '',
        user_id: userId || null,
        event_id: eventId,
        action: 'module_response',
        summary: `${userId ? 'Staff' : 'Guest'} submitted a response to "${title}"`,
        meta: { module_id: module.id, type: module.module_type }
      });

      try { await AsyncStorage.setItem(`module_resp_submitted_${eventId}_${guestId}_${module.id}`, '1'); } catch {}
      onClose();
      setSubmitting(false);
    } catch (e: any) {
      setError(e?.message || 'Failed to submit');
      // Keep error alert for visibility
      Alert.alert('Error', e?.message || 'Failed to submit');
    } finally {
      setSubmitting(false);
    }
  };

  // Feedback star gesture area (0-5 with 0.1 step)
  const onStarResponder = (evt: any) => {
    if (!evt?.nativeEvent?.locationX) return;
    const width = starBarWidth.current || 200;
    const x = Math.max(0, Math.min(width, evt.nativeEvent.locationX));
    const pct = x / width;
    const precise = Math.round(pct * 50) / 10;
    setRating(precise);
  };

  const SCREEN_HEIGHT = Dimensions.get('window').height;
  const MAX_MODAL_HEIGHT = Math.round(SCREEN_HEIGHT * 0.85);

  const estimatedHeight = useMemo(() => {
    if (!module) return Math.round(SCREEN_HEIGHT * 0.55);
    const baseHeader = 90; // title + date spacing
    const actions = 64; // buttons row
    const descBlock = description ? 40 : 0;
    switch (module.module_type) {
      case 'question': {
        // header + input + small spacing
        return Math.min(MAX_MODAL_HEIGHT, baseHeader + descBlock + 140 + actions);
      }
      case 'feedback': {
        // header + stars + rating + comment
        return Math.min(MAX_MODAL_HEIGHT, baseHeader + descBlock + 240 + actions);
      }
      case 'multiple_choice': {
        const optionsCount = (module.survey_data?.options || []).length;
        // each option ~56px, cap to 6 visible rows before internal scroll
        const visibleRows = Math.min(optionsCount, 6);
        return Math.min(MAX_MODAL_HEIGHT, baseHeader + descBlock + (visibleRows * 56) + 40 + actions);
      }
      case 'photo_video': {
        // header + pick + preview square ~220 on phones
        return Math.min(MAX_MODAL_HEIGHT, baseHeader + 260 + actions);
      }
      default:
        return Math.round(SCREEN_HEIGHT * 0.6);
    }
  }, [module, description, pickedFile]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.card, { maxHeight: MAX_MODAL_HEIGHT, minHeight: estimatedHeight }] }>
          {/* Header */}
          <View style={styles.headerArea}>
            <Text style={[styles.title, styles.centerText]}>{title}</Text>
            {(module?.date || module?.time) && (
              <Text style={[styles.meta, styles.centerText, { marginTop: 6 }]}>{displayDate} {module?.time ? `• ${module.time}` : ''}</Text>
            )}
            {!!description && <Text style={[styles.desc, styles.centerText, { marginTop: 8 }]}>{description}</Text>}
          </View>

          {/* Content */}
          <ScrollView style={styles.bodyArea} contentContainerStyle={[styles.bodyContent, { justifyContent: 'center' }]}>
            {module?.module_type === 'question' && (
              <View style={styles.formGroup}>
                <Text style={styles.label}>Your Answer</Text>
              <TextInput
                value={answerText}
                onChangeText={setAnswerText}
                placeholder="Type your answer"
                placeholderTextColor="#9aa0a6"
                multiline
                style={[styles.input, styles.block]}
                editable={!submitted && !submitting}
              />
              </View>
            )}

            {module?.module_type === 'multiple_choice' && (
              <View style={styles.formGroup}>
                <Text style={styles.label}>Select an option</Text>
                <ScrollView style={[styles.optionsScroll, { alignSelf: 'stretch' }]} nestedScrollEnabled>
                  <View style={styles.optionsColumn}>
                    {(module?.survey_data?.options || []).map((opt: string, idx: number) => (
                      <TouchableOpacity
                        key={idx}
                        style={[styles.optionRow, selectedOption === opt && styles.optionRowSelected]}
                        onPress={() => setSelectedOption(opt)}
                        disabled={submitted}
                      >
                        <Text style={[styles.optionRowText, selectedOption === opt && styles.optionRowTextSelected]}>{opt}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>
              </View>
            )}

            {module?.module_type === 'feedback' && (
              <View style={styles.feedbackArea}>
                <Text style={[styles.label, { alignSelf: 'center' }]}>Rate your experience</Text>
                <View
                  onStartShouldSetResponder={() => true}
                  onMoveShouldSetResponder={() => true}
                  onResponderGrant={onStarResponder}
                  onResponderMove={onStarResponder}
                  style={styles.starBar}
                  onLayout={(e) => { starBarWidth.current = e.nativeEvent.layout.width; }}
                >
                  <View style={styles.starRow} pointerEvents="none">
                    {[1,2,3,4,5].map((i) => {
                      const partial = Math.max(0, Math.min(1, rating - (i - 1)));
                      return (
                        <View key={`s-${i}`} style={styles.starBox}>
                          <Text style={styles.starOutline}>☆</Text>
                          {partial > 0 && (
                            <View style={[styles.starFillClipBox, { width: `${partial * 100}%` }]}>
                              <Text style={styles.starFilled}>★</Text>
                            </View>
                          )}
                        </View>
                      );
                    })}
                  </View>
                </View>
                <Text style={styles.ratingText}>{rating.toFixed(1)} / 5.0</Text>
                <Text style={styles.label}>Comment</Text>
                <TextInput
                  value={comment}
                  onChangeText={setComment}
                  placeholder="Add a comment (optional)"
                  placeholderTextColor="#9aa0a6"
                  style={[styles.input, styles.block]}
                  multiline
                  editable={!submitted && !submitting}
                />
              </View>
            )}

            {module?.module_type === 'photo_video' && (
              <View style={styles.mediaArea}>
                <Text style={styles.label}>Upload media</Text>
                <TouchableOpacity style={styles.pickButton} onPress={pickMedia} disabled={submitted || submitting}>
                  <Text style={styles.pickButtonText}>{pickedFile ? 'Change File' : 'Pick Photo/Video'}</Text>
                </TouchableOpacity>
                {pickedFile && (
                  <View style={{ width: '100%', position: 'relative' }}>
                    {pickedFile.type?.startsWith('image/') ? (
                      <Image source={{ uri: pickedFile.uri }} style={styles.mediaSquare} resizeMode="cover" />
                    ) : (
                      <Video
                        source={{ uri: pickedFile.uri }}
                        useNativeControls
                        resizeMode={Platform.OS === 'ios' ? 'cover' : 'contain'}
                        style={{ width: '100%', height: 220, borderRadius: 10, backgroundColor: '#000' }}
                      />
                    )}
                    <TouchableOpacity
                      accessibilityLabel="Clear media"
                      onPress={() => setPickedFile(null)}
                      style={{ position: 'absolute', top: 8, right: 8, width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(0,0,0,0.6)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)', alignItems: 'center', justifyContent: 'center' }}
                    >
                      <Text style={{ color: '#fff', fontWeight: '800' }}>×</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            )}

            {!!error && <Text style={styles.error}>{error}</Text>}
          </ScrollView>

          {/* Actions */}
          <View style={styles.actions}>
            <TouchableOpacity style={[styles.button, styles.cancel]} onPress={onClose} disabled={submitting}>
              <Text style={styles.buttonText}>Close</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, submitted ? styles.disabled : styles.primary]}
              onPress={submit}
              disabled={submitted || submitting}
            >
              {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>{submitted ? 'Submitted' : 'Submit'}</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center', padding: 20 },
  card: { width: '100%', borderRadius: 16, backgroundColor: '#1f1f1f', padding: 20 },
  content: { paddingBottom: 12, alignItems: 'center', justifyContent: 'center', rowGap: 10 },
  title: { color: '#fff', fontSize: 20, fontWeight: '800' },
  meta: { color: '#aaa', fontSize: 12 },
  desc: { color: '#ddd', fontSize: 14 },
  input: { backgroundColor: '#2a2a2a', color: '#fff', borderRadius: 10, padding: 12, minHeight: 44 },
  block: { alignSelf: 'stretch' },
  optionsScroll: { maxHeight: 240, width: '100%' },
  optionsColumn: { flexDirection: 'column', gap: 8, width: '100%' },
  optionRow: { paddingVertical: 14, paddingHorizontal: 14, borderRadius: 10, backgroundColor: '#2a2a2a', width: '100%', marginBottom: 8 },
  optionRowSelected: { backgroundColor: '#00bfa5' },
  optionRowText: { color: '#ddd' },
  optionRowTextSelected: { color: '#001b14', fontWeight: '700' },
  pickButton: { backgroundColor: '#2a2a2a', padding: 12, borderRadius: 10, alignItems: 'center' },
  pickButtonText: { color: '#fff', fontWeight: '600' },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 6 },
  button: { paddingVertical: 10, paddingHorizontal: 14, borderRadius: 10 },
  primary: { backgroundColor: '#00bfa5' },
  cancel: { backgroundColor: '#3a3a3a' },
  disabled: { backgroundColor: '#3a3a3a' },
  buttonText: { color: '#fff', fontWeight: '700' },
  error: { color: '#f87171' },
  headerArea: { alignItems: 'center', marginBottom: 16, marginTop: 4 },
  bodyArea: { flex: 1 },
  bodyContent: { paddingBottom: 12, rowGap: 16, flexGrow: 1, justifyContent: 'flex-start' },
  feedbackArea: { alignItems: 'center', gap: 10 },
  starBar: { width: '86%', maxWidth: 320, height: 52, alignSelf: 'center' },
  starRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  starOutline: { fontSize: 36, color: 'rgba(255,255,255,0.35)' },
  starFilled: { fontSize: 36, color: '#fbbf24' },
  starFillClipBox: { position: 'absolute', left: 0, top: 0, bottom: 0, overflow: 'hidden', alignItems: 'center' },
  ratingText: { color: '#fbbf24', fontWeight: '700', marginTop: 6 },
  mediaArea: { gap: 10 },
  mediaSquare: { width: '100%', aspectRatio: 1, borderRadius: 10, backgroundColor: '#2a2a2a' },
  label: { color: '#9aa0a6', fontSize: 12, fontWeight: '600', marginBottom: 6 },
  formGroup: { width: '100%' },
});

