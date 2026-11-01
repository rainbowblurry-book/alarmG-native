import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, Animated, AppState, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useSettings, isMissionReady } from '../context/SettingsContext';
import { useWakeFlow } from '../context/WakeFlowContext';
import { useTheme } from '../context/ThemeContext';
import { ThemeConfig, SEMANTIC_COLORS } from '../theme/themes';
import WatchRotaryWheel from '../components/WatchRotaryWheel';
import * as Alarm from '../../modules/clockguard-alarm';
import type { AlarmPermissions } from '../../modules/clockguard-alarm';


const DAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const FULL_DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];


const SHAPE = { md: 12, lg: 16, xl: 28, full: 999 };


export default function AlarmScreen() {
  const insets = useSafeAreaInsets();
  const { settings, updateSettings } = useSettings();
  const { alarm, arm, cancelAlarm } = useWakeFlow();
  const armed = alarm.armed;
  const [perms, setPerms] = useState<AlarmPermissions>(() => Alarm.getPermissions());
  const { theme } = useTheme();
  const [currentTime, setCurrentTime] = useState(new Date());
  const buttonScale = useRef(new Animated.Value(1)).current;


  const styles = createStyles(theme);


  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') setPerms(Alarm.getPermissions());
    });
    return () => {
      clearInterval(timer);
      sub.remove();
    };
  }, []);


  const formatLiveTime = (date: Date) => {
    const hh = String(date.getHours()).padStart(2, '0');
    const mm = String(date.getMinutes()).padStart(2, '0');
    return `${hh}:${mm}`;
  };


  const toggleDay = (dayIndex: number) => {
    if (armed) return;
    const isSelected = settings.repeatDays.includes(dayIndex);
    const newDays = isSelected
      ? settings.repeatDays.filter((d) => d !== dayIndex)
      : [...settings.repeatDays, dayIndex].sort();
    updateSettings({ repeatDays: newDays });
  };


  const noDaysSelected = settings.repeatDays.length === 0;
  const missionReady = isMissionReady(settings);
  // Required for a reliable alarm (D-29). Battery "Unrestricted" is advised but not required.
  const requiredAccessMissing = !perms.notifications || !perms.exactAlarms || !perms.fullScreen;
  const isArmButtonDisabled = !armed && (noDaysSelected || !missionReady || requiredAccessMissing);

  const toggleArmed = () => {
    if (armed) {
      cancelAlarm();
      return;
    }
    if (isArmButtonDisabled) return;
    const error = arm(settings.alarmHour, settings.alarmMinute, settings.repeatDays);
    setPerms(Alarm.getPermissions());
    if (error) Alert.alert('Alarm NOT armed', error);
  };

  // Armed, but Android has no alarm scheduled (e.g. permission revoked): say so loudly.
  const armedButInactive = armed && alarm.state === 'idle' && !alarm.nextTriggerAt;

  const missing: string[] = [];
  if (!settings.wakeBarcode.trim()) missing.push('Register your wake-up item (Setup tab)');
  if (!/^\d{10}$/.test(settings.snoozePin)) missing.push('Set your own 10-digit snooze PIN (Setup tab)');
  if (noDaysSelected) missing.push('Select at least one day');
  if (requiredAccessMissing) missing.push('Turn on the required phone settings listed below');

  const permIssues: { label: string; page: Alarm.SettingsPage }[] = [];
  if (!perms.notifications) permIssues.push({ label: 'Notifications are off', page: 'notifications' });
  if (!perms.exactAlarms) permIssues.push({ label: 'Alarms & reminders permission is off', page: 'exactAlarms' });
  if (!perms.fullScreen) permIssues.push({ label: 'Full-screen alarm permission is off', page: 'fullScreen' });
  if (!perms.batteryUnrestricted) permIssues.push({ label: 'Advised: Battery set to Unrestricted', page: 'app' });

  const ringsIn = (() => {
    if (!armed || !alarm.nextTriggerAt) return null;
    const mins = Math.max(0, Math.round((alarm.nextTriggerAt - currentTime.getTime()) / 60000));
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return h > 0 ? `Rings in ${h}h ${m}m` : `Rings in ${m}m`;
  })();


  const armGradientColors = armed
    ? [SEMANTIC_COLORS.error, SEMANTIC_COLORS.error]
    : isArmButtonDisabled
    ? ['#333333', '#333333']
    : [theme.accent, theme.accent];


  const armIconTextColor = '#FFFFFF';


  // Stage 4: tactile press feedback on the primary Arm button
  const handlePressIn = () => {
    if (isArmButtonDisabled) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    Animated.timing(buttonScale, { toValue: 0.96, duration: 80, useNativeDriver: true }).start();
  };

  const handlePressOut = () => {
    Animated.spring(buttonScale, { toValue: 1, friction: 5, tension: 200, useNativeDriver: true }).start();
  };


  return (
    <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
      <LinearGradient colors={theme.ringingGradient} style={[styles.hero, { paddingTop: insets.top + 20 }]}>
        <Text style={styles.heroLabel}>{armed ? 'ALARM ARMED' : `NOW ${formatLiveTime(currentTime)}`}</Text>
        <Text style={styles.heroClock}>
          {String(settings.alarmHour).padStart(2, '0')}:{String(settings.alarmMinute).padStart(2, '0')}
        </Text>
        <View style={styles.heroPill}>
          <Ionicons
            name={armed ? 'lock-closed' : 'time-outline'}
            size={13}
            color={theme.text}
          />
          <Text style={styles.heroPillText}>
            {ringsIn ? `${ringsIn} · ` : ''}
            {settings.repeatDays.length === 7
              ? 'Every day'
              : settings.repeatDays.length === 0
              ? 'No days selected'
              : settings.repeatDays.map((d) => FULL_DAY_NAMES[d].slice(0, 3)).join(' ')}
          </Text>
        </View>
      </LinearGradient>


      <View style={styles.body}>
        <View style={styles.card}>
          <View style={styles.cardInner}>
            <View style={styles.cardHeaderRow}>
              <View
                style={[
                  styles.iconBadge,
                  {
                    backgroundColor: `${theme.accent}26`,
                    shadowColor: theme.accent,
                  },
                ]}
              >
                <Ionicons name="alarm" size={18} color={theme.accent} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>Wake-up time</Text>
                {armed && <Text style={styles.cardCaption}>Locked while armed</Text>}
              </View>
            </View>


            {/* Stage 2: single ambient optical bloom behind both wheels */}
            <View style={styles.wheelArenaContainer}>
              <View
                pointerEvents="none"
                style={[styles.ambientGlowBackdrop, { shadowColor: theme.accent }]}
              >
                <LinearGradient
                  colors={[`${theme.accent}38`, `${theme.accent}14`, 'transparent']}
                  locations={[0, 0.45, 1]}
                  style={styles.ambientGlowGradient}
                />
              </View>

              <View style={styles.wheelRow}>
                <View style={styles.wheelColumn}>
                  <WatchRotaryWheel
                    value={settings.alarmHour}
                    min={0}
                    max={23}
                    onChange={(h) => updateSettings({ alarmHour: h })}
                    side="left"
                    disabled={armed}
                    accentColor={theme.accent}
                    accentSecondaryColor={theme.accent}
                    textColor={theme.text}
                    textSecondaryColor={theme.textSecondary}
                    backgroundColor={theme.background}
                    cardColor={theme.cardAlt}
                  />
                  <Text style={styles.wheelLabel}>HOUR</Text>
                </View>


                <View style={styles.bridgeSpacer} />


                <View style={styles.wheelColumn}>
                  <WatchRotaryWheel
                    value={settings.alarmMinute}
                    min={0}
                    max={59}
                    onChange={(m) => updateSettings({ alarmMinute: m })}
                    side="right"
                    disabled={armed}
                    accentColor={theme.accent}
                    accentSecondaryColor={theme.accent}
                    textColor={theme.text}
                    textSecondaryColor={theme.textSecondary}
                    backgroundColor={theme.background}
                    cardColor={theme.cardAlt}
                  />
                  <Text style={styles.wheelLabel}>MIN</Text>
                </View>
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
                      armed && styles.segmentDisabled,
                      pressed && !armed && styles.pressed,
                    ]}
                    onPress={() => toggleDay(index)}
                    accessibilityLabel={`Toggle ${FULL_DAY_NAMES[index]}`}
                    accessibilityState={{ selected: isSelected }}
                    disabled={armed}
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


        {/* Stage 4: tactile press-scale wrapper on the primary Arm button */}
        <Animated.View style={{ transform: [{ scale: buttonScale }] }}>
          <LinearGradient
            colors={armGradientColors as [string, string]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[styles.fabGradientWrap, isArmButtonDisabled && styles.fabDisabled]}
          >
            <Pressable
              style={styles.fab}
              onPressIn={handlePressIn}
              onPressOut={handlePressOut}
              onPress={toggleArmed}
              disabled={isArmButtonDisabled}
              accessibilityLabel={armed ? 'Cancel Alarm' : 'Arm Alarm'}
              accessibilityHint={
                isArmButtonDisabled ? 'Select at least one repeat day before arming the alarm.' : undefined
              }
            >
              <Ionicons
                name={armed ? 'close-circle' : 'shield-checkmark'}
                size={22}
                color={armIconTextColor}
              />
              <Text style={[styles.fabText, { color: armIconTextColor }]}>
                {armed ? 'Cancel alarm' : 'Arm alarm'}
              </Text>
            </Pressable>
          </LinearGradient>
        </Animated.View>


        {armedButInactive && (
          <View style={[styles.infoCard, { borderWidth: 1, borderColor: SEMANTIC_COLORS.error }]}>
            <Text style={[styles.infoTitle, { color: SEMANTIC_COLORS.error }]}>Alarm NOT active</Text>
            <Text style={styles.infoText}>
              Android has no alarm scheduled. Fix the phone settings below, then tap Cancel alarm and arm again.
            </Text>
          </View>
        )}

        {!armed && missing.length > 0 && (
          <View style={styles.infoCard}>
            <Text style={styles.infoTitle}>Before you can arm</Text>
            {missing.map((m) => (
              <View key={m} style={styles.infoRow}>
                <Ionicons name="ellipse-outline" size={12} color={SEMANTIC_COLORS.warning} />
                <Text style={styles.infoText}>{m}</Text>
              </View>
            ))}
          </View>
        )}

        {permIssues.length > 0 && (
          <View style={styles.infoCard}>
            <Text style={styles.infoTitle}>Phone settings (tap to fix)</Text>
            {permIssues.map((p) => (
              <Pressable
                key={p.label}
                style={({ pressed }) => [styles.infoRow, pressed && styles.pressed]}
                onPress={() => Alarm.openSettings(p.page)}
                accessibilityLabel={`Fix: ${p.label}`}
              >
                <Ionicons name="warning" size={14} color={SEMANTIC_COLORS.error} />
                <Text style={[styles.infoText, { flex: 1 }]}>{p.label}</Text>
                <Text style={styles.fixText}>Fix</Text>
              </Pressable>
            ))}
          </View>
        )}
      </View>
    </ScrollView>
  );
}


function createStyles(theme: ThemeConfig) {
  return StyleSheet.create({
    container: { flexGrow: 1, backgroundColor: theme.background },
    body: { paddingHorizontal: 16, paddingTop: 20 },


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


    card: { backgroundColor: theme.card, borderRadius: SHAPE.xl, marginBottom: 20, overflow: 'hidden',
      shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 5, elevation: 3 },
    cardInner: { flex: 1, padding: 20 },
    cardHeaderRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
    iconBadge: {
      width: 36, height: 36, borderRadius: SHAPE.full, alignItems: 'center', justifyContent: 'center', marginRight: 12,
      shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.5, shadowRadius: 8, elevation: 4,
    },
    cardTitle: { fontSize: 19, fontWeight: '800', color: theme.text, fontFamily: theme.fontFamily },
    cardCaption: { fontSize: 12, color: theme.textSecondary, marginTop: 1 },


    wheelArenaContainer: {
      position: 'relative',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 12,
      marginBottom: 16,
    },
    ambientGlowBackdrop: {
      position: 'absolute',
      top: '50%',
      left: '50%',
      width: 260,
      height: 140,
      marginLeft: -130,
      marginTop: -70,
      borderRadius: 70,
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.8,
      shadowRadius: 40,
      elevation: 12,
    },
    ambientGlowGradient: {
      width: '100%',
      height: '100%',
      borderRadius: 70,
    },
    wheelRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', zIndex: 2 },
    bridgeSpacer: { width: 10 },
    wheelColumn: { alignItems: 'center', gap: 6 },
    wheelLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 1, color: theme.textSecondary },


    segmentedContainer: { flexDirection: 'row', borderRadius: SHAPE.full, borderWidth: 1, borderColor: theme.border, overflow: 'hidden' },
    segment: { flex: 1, height: 42, alignItems: 'center', justifyContent: 'center', borderLeftWidth: 1, borderLeftColor: theme.border },
    segmentFirst: { borderLeftWidth: 0 },
    segmentSelected: { backgroundColor: theme.accent },
    segmentDisabled: { opacity: 0.4 },
    segmentText: { color: theme.textSecondary, fontWeight: '700', fontSize: 13 },
    segmentTextSelected: { color: theme.accentText },


    warningRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 14, justifyContent: 'center' },
    warningText: { color: SEMANTIC_COLORS.warning, fontWeight: '700', fontSize: 12 },


    fabGradientWrap: {
      borderRadius: SHAPE.full,
      marginBottom: 12,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.45,
      shadowRadius: 14,
      elevation: 6,
    },
    fab: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
      borderRadius: SHAPE.full, paddingVertical: 17,
    },
    fabDisabled: {
      shadowOpacity: 0,
      elevation: 0,
      opacity: 0.6,
    },
    fabText: {
      fontSize: 16,
      fontWeight: '800',
    },


    infoCard: { backgroundColor: theme.card, borderRadius: SHAPE.lg, padding: 16, marginBottom: 12, gap: 8 },
    infoTitle: { color: theme.text, fontWeight: '800', fontSize: 14 },
    infoRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 2 },
    infoText: { color: theme.textSecondary, fontSize: 13 },
    fixText: { color: theme.accent, fontWeight: '800', fontSize: 13 },
    tonalButton: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
      backgroundColor: theme.card, borderWidth: 1, borderColor: theme.accent, borderRadius: SHAPE.full, paddingVertical: 12, marginBottom: 8,
    },
    tonalButtonText: { color: theme.accent, fontSize: 14, fontWeight: '700' },
    previewHint: { color: theme.textSecondary, fontSize: 12, textAlign: 'center', marginBottom: 24, lineHeight: 18 },


    pressed: { opacity: 0.7 },
  });
}
