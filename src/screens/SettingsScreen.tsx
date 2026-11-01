import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Modal, AppState, Switch, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSettings } from '../context/SettingsContext';
import { useWakeFlow } from '../context/WakeFlowContext';
import { useTheme } from '../context/ThemeContext';
import { ThemeConfig, SEMANTIC_COLORS } from '../theme/themes';
import * as Alarm from '../../modules/clockguard-alarm';
import type { AlarmPermissions, SettingsPage } from '../../modules/clockguard-alarm';

const SHAPE = { md: 12, lg: 16, xl: 28, full: 999 };

const PERMISSION_ROWS: { key: keyof AlarmPermissions; label: string; hint: string; page: SettingsPage }[] = [
  { key: 'notifications', label: 'Notifications', hint: 'Needed for the ringing screen to appear', page: 'notifications' },
  { key: 'exactAlarms', label: 'Alarms & reminders', hint: 'Rings at the exact minute', page: 'exactAlarms' },
  { key: 'fullScreen', label: 'Full-screen alarm', hint: 'Opens over the lock screen by itself', page: 'fullScreen' },
  { key: 'batteryUnrestricted', label: 'Battery: Unrestricted', hint: 'App info → Battery → Unrestricted', page: 'app' },
];

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const { settings, updateSettings, resetSettings } = useSettings();
  const { alarm } = useWakeFlow();
  // TESTING-ONLY START
  const { scheduleTestRing, cancelTestRing } = useWakeFlow();
  // TESTING-ONLY END
  const { theme } = useTheme();
  const [modalVisible, setModalVisible] = useState(false);
  const [perms, setPerms] = useState<AlarmPermissions>(() => Alarm.getPermissions());

  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') setPerms(Alarm.getPermissions());
    });
    return () => sub.remove();
  }, []);

  const handleReset = () => {
    resetSettings();
    setModalVisible(false);
  };

  const styles = createStyles(theme);

  return (
    <View style={styles.container}>
      <LinearGradient colors={theme.ringingGradient} style={[styles.hero, { paddingTop: insets.top + 20 }]}>
        <Text style={styles.heroLabel}>RELIABILITY</Text>
        <Text style={styles.heroTitle}>Settings</Text>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
          <View style={[styles.leftBar, { backgroundColor: theme.accent }]} />
          <View style={styles.cardInner}>
            <View style={styles.cardHeaderRow}>
              <View style={[styles.iconBadge, { backgroundColor: `${theme.accent}26` }]}>
                <Ionicons name="shield-checkmark" size={18} color={theme.accent} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>Phone settings</Text>
                <Text style={styles.cardCaption}>All four must be on for a reliable alarm</Text>
              </View>
            </View>

            {PERMISSION_ROWS.map((row) => {
              const ok = perms[row.key];
              return (
                <Pressable
                  key={row.key}
                  style={({ pressed }) => [styles.settingRow, pressed && styles.pressed]}
                  onPress={() => Alarm.openSettings(row.page)}
                  accessibilityLabel={`${row.label}: ${ok ? 'on' : 'off'}. Open settings.`}
                >
                  <View style={{ flex: 1, paddingRight: 12 }}>
                    <Text style={styles.settingLabel}>{row.label}</Text>
                    <Text style={styles.cardCaption}>{row.hint}</Text>
                  </View>
                  <View
                    style={[
                      styles.settingValuePill,
                      { backgroundColor: `${ok ? SEMANTIC_COLORS.success : SEMANTIC_COLORS.error}26` },
                    ]}
                  >
                    <Text
                      style={[styles.settingValueText, { color: ok ? SEMANTIC_COLORS.success : SEMANTIC_COLORS.error }]}
                    >
                      {ok ? 'On' : 'Fix'}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.card}>
          <View style={[styles.leftBar, { backgroundColor: theme.accent }]} />
          <View style={styles.cardInner}>
            <View style={styles.cardHeaderRow}>
              <View style={[styles.iconBadge, { backgroundColor: `${theme.accent}26` }]}>
                <Ionicons name="volume-high" size={18} color={theme.accent} />
              </View>
              <Text style={styles.cardTitle}>Alarm volume</Text>
            </View>
            <View style={styles.settingRow}>
              <View style={{ flex: 1, paddingRight: 12 }}>
                <Text style={styles.settingLabel}>Raise low alarm volume to 60% when ringing starts</Text>
                <Text style={styles.cardCaption}>
                  Off by default. When on: if your alarm volume is below 60% when the alarm starts, ClockGuard
                  raises it once to 60%. It never forces the volume while ringing, and puts your previous alarm
                  volume back when you snooze or disarm (unless you changed it yourself meanwhile). Only the
                  alarm volume is touched, never media, ringtone or notification volume. Do Not Disturb settings
                  can block the change.
                </Text>
              </View>
              <Switch
                value={settings.volumeBoostEnabled}
                onValueChange={(v) => updateSettings({ volumeBoostEnabled: v })}
                trackColor={{ false: theme.border, true: theme.accent }}
                thumbColor="#ffffff"
                accessibilityLabel="Raise low alarm volume to 60% when ringing starts"
              />
            </View>
          </View>
        </View>

        {/* TESTING-ONLY START: remove this card when testing tools are no longer wanted */}
        <View style={styles.card}>
          <View style={[styles.leftBar, { backgroundColor: SEMANTIC_COLORS.warning }]} />
          <View style={styles.cardInner}>
            <View style={styles.cardHeaderRow}>
              <View style={[styles.iconBadge, { backgroundColor: `${SEMANTIC_COLORS.warning}26` }]}>
                <Ionicons name="flask" size={18} color={SEMANTIC_COLORS.warning} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>Test alarm (testing only)</Text>
                <Text style={styles.cardCaption}>
                  Rings through the real alarm engine 10 seconds after you tap. Lock the phone to test the lock
                  screen. Your saved alarm is never changed. A test ring has an Exit test button.
                </Text>
              </View>
            </View>
            {alarm.testRingAt > 0 ? (
              <Pressable
                style={({ pressed }) => [styles.resetButton, pressed && styles.pressed]}
                onPress={cancelTestRing}
                accessibilityLabel="Cancel pending test alarm"
              >
                <Ionicons name="close" size={16} color={SEMANTIC_COLORS.warning} />
                <Text style={[styles.resetButtonText, { color: SEMANTIC_COLORS.warning }]}>
                  Test pending at {new Date(alarm.testRingAt).toLocaleTimeString()}, tap to cancel
                </Text>
              </Pressable>
            ) : (
              <Pressable
                style={({ pressed }) => [styles.resetButton, pressed && styles.pressed]}
                onPress={() => {
                  const error = scheduleTestRing(10);
                  if (error) Alert.alert('Test not scheduled', error);
                }}
                accessibilityLabel="Ring a test alarm in 10 seconds"
              >
                <Ionicons name="alarm" size={16} color={SEMANTIC_COLORS.warning} />
                <Text style={[styles.resetButtonText, { color: SEMANTIC_COLORS.warning }]}>Ring test alarm in 10 s</Text>
              </Pressable>
            )}
          </View>
        </View>
        {/* TESTING-ONLY END */}

        <View style={styles.card}>
          <View style={[styles.leftBar, { backgroundColor: SEMANTIC_COLORS.error }]} />
          <View style={styles.cardInner}>
            <View style={styles.cardHeaderRow}>
              <View style={[styles.iconBadge, { backgroundColor: `${SEMANTIC_COLORS.error}26` }]}>
                <Ionicons name="warning" size={18} color={SEMANTIC_COLORS.error} />
              </View>
              <Text style={styles.cardTitle}>Danger zone</Text>
            </View>
            {alarm.armed && (
              <Text style={[styles.cardCaption, { marginBottom: 8 }]}>
                Cancel the alarm first. Resetting while armed would delete the item and PIN the alarm needs.
              </Text>
            )}
            <Pressable
              style={({ pressed }) => [styles.resetButton, alarm.armed && { opacity: 0.4 }, pressed && styles.pressed]}
              onPress={() => setModalVisible(true)}
              disabled={alarm.armed}
              accessibilityLabel="Reset all settings"
            >
              <Ionicons name="refresh" size={16} color={SEMANTIC_COLORS.error} />
              <Text style={styles.resetButtonText}>Reset all settings</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>

      <Modal animationType="fade" transparent={true} visible={modalVisible} onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Reset settings?</Text>
            <Text style={styles.modalBody}>
              This clears your registered item, PIN and mission settings. You will need to set them up again before arming.
            </Text>
            <View style={styles.modalActions}>
              <Pressable style={styles.modalButton} onPress={() => setModalVisible(false)} accessibilityLabel="Cancel reset">
                <Text style={styles.modalButtonText}>Cancel</Text>
              </Pressable>
              <Pressable style={[styles.modalButton, styles.modalButtonDanger]} onPress={handleReset} accessibilityLabel="Confirm reset">
                <Text style={styles.modalButtonTextDanger}>Reset</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function createStyles(theme: ThemeConfig) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.background },
    hero: { paddingHorizontal: 24, paddingBottom: 24, borderBottomLeftRadius: 32, borderBottomRightRadius: 32 },
    heroLabel: {
      fontSize: 12, fontWeight: '800', letterSpacing: 2, color: `${theme.text}CC`, marginBottom: 6,
      textShadowColor: 'rgba(0,0,0,0.35)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4,
    },
    heroTitle: {
      fontSize: 30, fontWeight: '800', color: theme.text, fontFamily: theme.fontFamily,
      textShadowColor: 'rgba(0,0,0,0.35)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 6,
    },

    scrollContent: { paddingHorizontal: 16, paddingTop: 20, paddingBottom: 40 },

    card: { flexDirection: 'row', backgroundColor: theme.card, borderRadius: SHAPE.xl, marginBottom: 16, overflow: 'hidden',
      shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 5, elevation: 3 },
    devCard: { borderStyle: 'dashed' },
    leftBar: { width: 5 },
    cardInner: { flex: 1, padding: 18 },
    cardHeaderRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
    iconBadge: { width: 34, height: 34, borderRadius: SHAPE.full, alignItems: 'center', justifyContent: 'center', marginRight: 10 },
    cardTitle: { fontSize: 17, fontWeight: '800', color: theme.text, fontFamily: theme.fontFamily },
    cardCaption: { fontSize: 12, color: theme.textSecondary, marginTop: 1 },

    themeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 14, justifyContent: 'flex-start' },
    themeItem: { width: '28%', alignItems: 'center' },
    themeSwatch: {
      width: 56, height: 56, borderRadius: SHAPE.full, borderWidth: 2.5, alignItems: 'center', justifyContent: 'center',
      marginBottom: 8, shadowOffset: { width: 0, height: 0 }, shadowRadius: 8, elevation: 3,
    },
    themeName: { fontSize: 13, fontWeight: '700', color: theme.textSecondary, textAlign: 'center' },
    themeTagline: { fontSize: 10, color: theme.textSecondary, textAlign: 'center', opacity: 0.7, marginTop: 1 },

    settingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    settingLabel: { color: theme.textSecondary, fontSize: 14, fontWeight: '600' },
    settingValuePill: { backgroundColor: theme.background, paddingHorizontal: 12, paddingVertical: 5, borderRadius: SHAPE.full },
    settingValueText: { color: theme.accent, fontSize: 13, fontWeight: '700' },

    devLabel: { fontSize: 14, fontWeight: '700', color: theme.text, marginBottom: 2 },

    resetButton: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
      backgroundColor: `${SEMANTIC_COLORS.error}1A`, paddingVertical: 14, borderRadius: SHAPE.full,
      borderWidth: 1, borderColor: SEMANTIC_COLORS.error,
    },
    resetButtonText: { color: SEMANTIC_COLORS.error, fontSize: 14, fontWeight: '800' },

    modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.7)', justifyContent: 'center', alignItems: 'center', padding: 24 },
    modalContent: { backgroundColor: theme.card, borderRadius: SHAPE.xl, padding: 24, width: '100%' },
    modalTitle: { fontSize: 22, fontWeight: '800', color: theme.text, marginBottom: 12, fontFamily: theme.fontFamily },
    modalBody: { fontSize: 15, color: theme.textSecondary, lineHeight: 22, marginBottom: 24 },
    modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12 },
    modalButton: { paddingVertical: 10, paddingHorizontal: 20, borderRadius: SHAPE.md, backgroundColor: theme.background },
    modalButtonDanger: { backgroundColor: SEMANTIC_COLORS.error },
    modalButtonText: { color: theme.text, fontSize: 15, fontWeight: '700' },
    modalButtonTextDanger: { color: '#ffffff', fontSize: 15, fontWeight: '700' },

    pressed: { opacity: 0.75 },
  });
}
