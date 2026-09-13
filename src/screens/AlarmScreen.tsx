import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, TextInput } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSettings } from '../context/SettingsContext';
import { useWakeFlow } from '../context/WakeFlowContext';
import { useTheme } from '../context/ThemeContext';
import { ThemeConfig, SEMANTIC_COLORS } from '../theme/themes';

const DAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const FULL_DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const SHAPE = { md: 12, lg: 16, xl: 28, full: 999 };

export default function AlarmScreen() {
  const insets = useSafeAreaInsets();
  const { settings, updateSettings } = useSettings();
  const { startPreview } = useWakeFlow();
  const { theme } = useTheme();
  const [currentTime, setCurrentTime] = useState(new Date());

  const styles = createStyles(theme);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const formatLiveTime = (date: Date) => {
    const hh = String(date.getHours()).padStart(2, '0');
    const mm = String(date.getMinutes()).padStart(2, '0');
    return `${hh}:${mm}`;
  };

  // --- Manual time entry (buffered, like a real M3 time-picker text field) ---
  const [isEditingHour, setIsEditingHour] = useState(false);
  const [hourInput, setHourInput] = useState(String(settings.alarmHour).padStart(2, '0'));
  const [isEditingMinute, setIsEditingMinute] = useState(false);
  const [minuteInput, setMinuteInput] = useState(String(settings.alarmMinute).padStart(2, '0'));

  useEffect(() => {
    if (!isEditingHour) setHourInput(String(settings.alarmHour).padStart(2, '0'));
  }, [settings.alarmHour, isEditingHour]);

  useEffect(() => {
    if (!isEditingMinute) setMinuteInput(String(settings.alarmMinute).padStart(2, '0'));
  }, [settings.alarmMinute, isEditingMinute]);

  const commitHour = (raw: string) => {
    const val = parseInt(raw, 10);
    const clamped = isNaN(val) ? settings.alarmHour : Math.max(0, Math.min(23, val));
    updateSettings({ alarmHour: clamped });
    setHourInput(String(clamped).padStart(2, '0'));
  };

  const commitMinute = (raw: string) => {
    const val = parseInt(raw, 10);
    const clamped = isNaN(val) ? settings.alarmMinute : Math.max(0, Math.min(59, val));
    updateSettings({ alarmMinute: clamped });
    setMinuteInput(String(clamped).padStart(2, '0'));
  };

  const toggleDay = (dayIndex: number) => {
    if (settings.isArmed) return;
    const isSelected = settings.repeatDays.includes(dayIndex);
    const newDays = isSelected
      ? settings.repeatDays.filter((d) => d !== dayIndex)
      : [...settings.repeatDays, dayIndex].sort();
    updateSettings({ repeatDays: newDays });
  };

  const adjustHour = (delta: number) => {
    if (settings.isArmed) return;
    let newHour = settings.alarmHour + delta;
    if (newHour > 23) newHour = 0;
    if (newHour < 0) newHour = 23;
    updateSettings({ alarmHour: newHour });
  };

  const adjustMinute = (delta: number) => {
    if (settings.isArmed) return;
    let newMinute = settings.alarmMinute + delta;
    let newHour = settings.alarmHour;
    if (newMinute > 59) {
      newMinute = 0;
      newHour += 1;
      if (newHour > 23) newHour = 0;
    } else if (newMinute < 0) {
      newMinute = 59;
      newHour -= 1;
      if (newHour < 0) newHour = 23;
    }
    updateSettings({ alarmHour: newHour, alarmMinute: newMinute });
  };

  const toggleArmed = () => {
    if (settings.repeatDays.length === 0 && !settings.isArmed) return;
    updateSettings({ isArmed: !settings.isArmed });
  };

  const noDaysSelected = settings.repeatDays.length === 0;
  const isArmButtonDisabled = noDaysSelected && !settings.isArmed;

  return (
    <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
      {/* --- Hero gradient band: theme identity + live clock, full color "wow" moment --- */}
      <LinearGradient colors={theme.ringingGradient} style={[styles.hero, { paddingTop: insets.top + 20 }]}>
        <Text style={styles.heroLabel}>{settings.isArmed ? 'ALARM ARMED' : 'NEXT WAKE-UP'}</Text>
        <Text style={styles.heroClock}>{formatLiveTime(currentTime)}</Text>
        <View style={styles.heroPill}>
          <Ionicons
            name={settings.isArmed ? 'lock-closed' : 'time-outline'}
            size={13}
            color={theme.text}
          />
          <Text style={styles.heroPillText}>
            {String(settings.alarmHour).padStart(2, '0')}:{String(settings.alarmMinute).padStart(2, '0')} ·{' '}
            {settings.repeatDays.length === 7
              ? 'Every day'
              : settings.repeatDays.length === 0
              ? 'Once'
              : `${settings.repeatDays.length} day${settings.repeatDays.length > 1 ? 's' : ''}/week`}
          </Text>
        </View>
      </LinearGradient>

      <View style={styles.body}>
        {/* --- Schedule card: accent-tinted left bar + icon badge for section identity --- */}
        <View style={styles.card}>
          <View style={[styles.leftBar, { backgroundColor: theme.accent }]} />
          <View style={styles.cardInner}>
            <View style={styles.cardHeaderRow}>
              <View style={[styles.iconBadge, { backgroundColor: `${theme.accent}26` }]}>
                <Ionicons name="alarm" size={18} color={theme.accent} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>Wake-up time</Text>
                {settings.isArmed && <Text style={styles.cardCaption}>Locked while armed</Text>}
              </View>
            </View>

            <View style={styles.timeControlsContainer}>
              <View style={styles.timeSection}>
                <Pressable
                  style={({ pressed }) => [styles.adjustButton, pressed && styles.pressed]}
                  onPress={() => adjustHour(1)}
                  accessibilityLabel="Increase hour"
                  disabled={settings.isArmed}
                >
                  <Ionicons name="chevron-up" size={18} color={theme.accent} />
                </Pressable>
                <TextInput
                  style={styles.timeInput}
                  value={isEditingHour ? hourInput : String(settings.alarmHour).padStart(2, '0')}
                  editable={!settings.isArmed}
                  keyboardType="number-pad"
                  maxLength={2}
                  selectTextOnFocus
                  accessibilityLabel="Alarm hour, type to edit"
                  onFocus={() => {
                    setIsEditingHour(true);
                    setHourInput(String(settings.alarmHour).padStart(2, '0'));
                  }}
                  onChangeText={(text) => setHourInput(text.replace(/\D/g, '').slice(0, 2))}
                  onBlur={() => {
                    setIsEditingHour(false);
                    commitHour(hourInput);
                  }}
                />
                <Pressable
                  style={({ pressed }) => [styles.adjustButton, pressed && styles.pressed]}
                  onPress={() => adjustHour(-1)}
                  accessibilityLabel="Decrease hour"
                  disabled={settings.isArmed}
                >
                  <Ionicons name="chevron-down" size={18} color={theme.accent} />
                </Pressable>
                <Text style={styles.timeSectionLabel}>HOUR</Text>
              </View>

              <Text style={styles.timeColon}>:</Text>

              <View style={styles.timeSection}>
                <Pressable
                  style={({ pressed }) => [styles.adjustButton, pressed && styles.pressed]}
                  onPress={() => adjustMinute(1)}
                  accessibilityLabel="Increase minute"
                  disabled={settings.isArmed}
                >
                  <Ionicons name="chevron-up" size={18} color={theme.accent} />
                </Pressable>
                <TextInput
                  style={styles.timeInput}
                  value={isEditingMinute ? minuteInput : String(settings.alarmMinute).padStart(2, '0')}
                  editable={!settings.isArmed}
                  keyboardType="number-pad"
                  maxLength={2}
                  selectTextOnFocus
                  accessibilityLabel="Alarm minute, type to edit"
                  onFocus={() => {
                    setIsEditingMinute(true);
                    setMinuteInput(String(settings.alarmMinute).padStart(2, '0'));
                  }}
                  onChangeText={(text) => setMinuteInput(text.replace(/\D/g, '').slice(0, 2))}
                  onBlur={() => {
                    setIsEditingMinute(false);
                    commitMinute(minuteInput);
                  }}
                />
                <Pressable
                  style={({ pressed }) => [styles.adjustButton, pressed && styles.pressed]}
                  onPress={() => adjustMinute(-1)}
                  accessibilityLabel="Decrease minute"
                  disabled={settings.isArmed}
                >
                  <Ionicons name="chevron-down" size={18} color={theme.accent} />
                </Pressable>
                <Text style={styles.timeSectionLabel}>MIN</Text>
              </View>
            </View>

            <View style={styles.segmentedContainer}>
              {DAYS.map((day, index) => {
                const isSelected = settings.repeatDays.includes(index);
                return (
                  <Pressable
                    key={index}
                    style={({ pressed }) => [
                      styles.segment,
                      index === 0 && styles.segmentFirst,
                      isSelected && styles.segmentSelected,
                      settings.isArmed && styles.segmentDisabled,
                      pressed && !settings.isArmed && styles.pressed,
                    ]}
                    onPress={() => toggleDay(index)}
                    accessibilityLabel={`Toggle ${FULL_DAY_NAMES[index]}`}
                    accessibilityState={{ selected: isSelected }}
                    disabled={settings.isArmed}
                  >
                    <Text style={[styles.segmentText, isSelected && styles.segmentTextSelected]}>{day}</Text>
                  </Pressable>
                );
              })}
            </View>

            {noDaysSelected && (
              <View style={styles.warningRow}>
                <Ionicons name="alert-circle" size={14} color={SEMANTIC_COLORS.warning} />
                <Text style={styles.warningText}>Select at least one day</Text>
              </View>
            )}
          </View>
        </View>

        {/* --- Primary action: extended FAB --- */}
        <Pressable
          style={({ pressed }) => [
            styles.fab,
            isArmButtonDisabled && styles.fabDisabled,
            settings.isArmed && styles.fabArmed,
            pressed && !isArmButtonDisabled && styles.fabPressed,
          ]}
          onPress={toggleArmed}
          disabled={isArmButtonDisabled}
          accessibilityLabel={settings.isArmed ? 'Cancel Alarm' : 'Arm Alarm'}
          accessibilityHint={
            isArmButtonDisabled ? 'Select at least one repeat day before arming the alarm.' : undefined
          }
        >
          <Ionicons
            name={settings.isArmed ? 'close-circle' : 'shield-checkmark'}
            size={22}
            color={settings.isArmed ? SEMANTIC_COLORS.error : theme.accentText}
          />
          <Text style={[styles.fabText, settings.isArmed && { color: SEMANTIC_COLORS.error }]}>
            {settings.isArmed ? 'Cancel alarm' : 'Arm alarm'}
          </Text>
        </Pressable>

        {settings.isArmed && (
          <>
            <Pressable
              style={({ pressed }) => [styles.tonalButton, pressed && styles.pressed]}
              onPress={startPreview}
              accessibilityLabel="Preview Wake-up Flow"
            >
              <Ionicons name="play-outline" size={16} color={theme.accent} />
              <Text style={styles.tonalButtonText}>Preview wake-up flow</Text>
            </Pressable>
            <Text style={styles.previewHint}>
              Preview simulates the alarm while the app is open. It does not yet run in the background.
            </Text>
          </>
        )}
      </View>
    </ScrollView>
  );
}

function createStyles(theme: ThemeConfig) {
  return StyleSheet.create({
    container: { flexGrow: 1, backgroundColor: theme.background },
    body: { paddingHorizontal: 16, paddingTop: 20 },

    // Hero band — full theme-color gradient, the "wow" surface.
    // Uses theme.text (always light, made for dark backgrounds) instead of
    // theme.accentText (which is dark for Amber/Neon/Blossom, causing low
    // contrast against the gradient). Text-shadow adds extra legibility.
    hero: { paddingBottom: 28, paddingHorizontal: 24, alignItems: 'center', borderBottomLeftRadius: 32, borderBottomRightRadius: 32 },
    heroLabel: {
      fontSize: 12, fontWeight: '800', letterSpacing: 2, color: `${theme.text}CC`, marginBottom: 6,
      textShadowColor: 'rgba(0,0,0,0.35)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4,
    },
    heroClock: {
      fontSize: 76, fontWeight: '800', color: theme.text, letterSpacing: -2, fontFamily: theme.fontFamily,
      textShadowColor: 'rgba(0,0,0,0.4)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 8,
    },
    heroPill: {
      flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 14,
      backgroundColor: 'rgba(0,0,0,0.3)', paddingHorizontal: 14, paddingVertical: 7, borderRadius: SHAPE.full,
    },
    heroPillText: { color: theme.text, fontSize: 12, fontWeight: '700' },

    card: { flexDirection: 'row', backgroundColor: theme.card, borderRadius: SHAPE.xl, marginBottom: 20, overflow: 'hidden',
      shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 5, elevation: 3 },
    leftBar: { width: 5 },
    cardInner: { flex: 1, padding: 20 },
    cardHeaderRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
    iconBadge: { width: 36, height: 36, borderRadius: SHAPE.full, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
    cardTitle: { fontSize: 19, fontWeight: '800', color: theme.text, fontFamily: theme.fontFamily },
    cardCaption: { fontSize: 12, color: theme.textSecondary, marginTop: 1 },

    timeControlsContainer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginBottom: 22, gap: 4 },
    timeSection: { alignItems: 'center', gap: 2 },
    adjustButton: { width: 34, height: 26, borderRadius: SHAPE.md, backgroundColor: theme.background, alignItems: 'center', justifyContent: 'center' },
    timeInput: {
      fontSize: 44, fontWeight: '800', color: theme.text, width: 70, textAlign: 'center',
      fontFamily: theme.fontFamily, paddingVertical: 2,
    },
    timeSectionLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 1, color: theme.textSecondary, marginTop: 2 },
    timeColon: { fontSize: 40, fontWeight: '800', color: theme.textSecondary, marginHorizontal: 2, alignSelf: 'center' },

    segmentedContainer: { flexDirection: 'row', borderRadius: SHAPE.full, borderWidth: 1, borderColor: theme.border, overflow: 'hidden' },
    segment: { flex: 1, height: 42, alignItems: 'center', justifyContent: 'center', borderLeftWidth: 1, borderLeftColor: theme.border },
    segmentFirst: { borderLeftWidth: 0 },
    segmentSelected: { backgroundColor: theme.accent },
    segmentDisabled: { opacity: 0.4 },
    segmentText: { color: theme.textSecondary, fontWeight: '700', fontSize: 13 },
    segmentTextSelected: { color: theme.accentText },

    warningRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 14, justifyContent: 'center' },
    warningText: { color: SEMANTIC_COLORS.warning, fontWeight: '700', fontSize: 12 },

    fab: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
      backgroundColor: theme.accent, borderRadius: SHAPE.full, paddingVertical: 17, marginBottom: 12,
      shadowColor: theme.accent, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 10, elevation: 5,
    },
    fabArmed: { backgroundColor: theme.card, borderWidth: 1.5, borderColor: SEMANTIC_COLORS.error, shadowOpacity: 0, elevation: 0 },
    fabDisabled: { backgroundColor: '#333333', opacity: 0.6, shadowOpacity: 0 },
    fabPressed: { opacity: 0.85, transform: [{ scale: 0.99 }] },
    fabText: { color: theme.accentText, fontSize: 16, fontWeight: '800' },

    tonalButton: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
      backgroundColor: theme.card, borderWidth: 1, borderColor: theme.accent, borderRadius: SHAPE.full, paddingVertical: 12, marginBottom: 8,
    },
    tonalButtonText: { color: theme.accent, fontSize: 14, fontWeight: '700' },
    previewHint: { color: theme.textSecondary, fontSize: 12, textAlign: 'center', marginBottom: 24, lineHeight: 18 },

    pressed: { opacity: 0.7 },
  });
}
