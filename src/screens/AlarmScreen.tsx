import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSettings } from '../context/SettingsContext';
import { useWakeFlow } from '../context/WakeFlowContext';
import { useTheme } from '../context/ThemeContext';
import { ThemeConfig, SEMANTIC_COLORS } from '../theme/themes';
import RotaryWheel from '../components/RotaryWheel';


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


  const toggleDay = (dayIndex: number) => {
    if (settings.isArmed) return;
    const isSelected = settings.repeatDays.includes(dayIndex);
    const newDays = isSelected
      ? settings.repeatDays.filter((d) => d !== dayIndex)
      : [...settings.repeatDays, dayIndex].sort();
    updateSettings({ repeatDays: newDays });
  };


  const toggleArmed = () => {
    if (settings.repeatDays.length === 0 && !settings.isArmed) return;
    updateSettings({ isArmed: !settings.isArmed });
  };


  const noDaysSelected = settings.repeatDays.length === 0;
  const isArmButtonDisabled = noDaysSelected && !settings.isArmed;


  return (
    <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
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
            {String(settings.alarmHour).padStart(2, '0')}:{String(settings.alarmMinute).padStart(2, '0')} - {' '}
            {settings.repeatDays.length === 7
              ? 'Every day'
              : settings.repeatDays.length === 0
              ? 'Once'
              : `${settings.repeatDays.length} day${settings.repeatDays.length > 1 ? 's' : ''}/week`}
          </Text>
        </View>
      </LinearGradient>


      <View style={styles.body}>
        <View style={styles.card}>
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


            <View style={styles.wheelRow}>
              <View style={styles.wheelColumn}>
                <RotaryWheel
                  value={settings.alarmHour}
                  min={0}
                  max={23}
                  onChange={(h) => updateSettings({ alarmHour: h })}
                  side="left"
                  disabled={settings.isArmed}
                  accentColor={theme.accent}
                  textColor={theme.text}
                  textSecondaryColor={theme.textSecondary}
                  backgroundColor={theme.background}
                  cardColor={theme.cardAlt}
                />
                <Text style={styles.wheelLabel}>HOUR</Text>
              </View>


              <Text style={styles.timeColon}>:</Text>


              <View style={styles.wheelColumn}>
                <RotaryWheel
                  value={settings.alarmMinute}
                  min={0}
                  max={59}
                  onChange={(m) => updateSettings({ alarmMinute: m })}
                  side="right"
                  disabled={settings.isArmed}
                  accentColor={theme.accent}
                  textColor={theme.text}
                  textSecondaryColor={theme.textSecondary}
                  backgroundColor={theme.background}
                  cardColor={theme.cardAlt}
                />
                <Text style={styles.wheelLabel}>MIN</Text>
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


        <Pressable
          style={({ pressed }) => [
            styles.fab,
            {
              backgroundColor: settings.isArmed
                ? SEMANTIC_COLORS.error
                : isArmButtonDisabled
                ? '#333333'
                : theme.accent,
            },
            isArmButtonDisabled && styles.fabDisabled,
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
            color="#FFFFFF"
          />
          <Text style={styles.fabText}>
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
    iconBadge: { width: 36, height: 36, borderRadius: SHAPE.full, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
    cardTitle: { fontSize: 19, fontWeight: '800', color: theme.text, fontFamily: theme.fontFamily },
    cardCaption: { fontSize: 12, color: theme.textSecondary, marginTop: 1 },


    wheelRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginBottom: 22, gap: 8 },
    wheelColumn: { alignItems: 'center', gap: 6 },
    wheelLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 1, color: theme.textSecondary },
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
      borderRadius: SHAPE.full, paddingVertical: 17, marginBottom: 12,
      shadowColor: theme.accent, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 10, elevation: 5,
    },
    fabDisabled: {
      opacity: 0.6,
      shadowOpacity: 0,
      elevation: 0,
    },
    fabPressed: { opacity: 0.85, transform: [{ scale: 0.99 }] },
    fabText: {
      color: '#FFFFFF',
      fontSize: 16,
      fontWeight: '800',
    },


    tonalButton: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
      backgroundColor: theme.card, borderWidth: 1, borderColor: theme.accent, borderRadius: SHAPE.full, paddingVertical: 12, marginBottom: 8,
    },
    tonalButtonText: { color: theme.accent, fontSize: 14, fontWeight: '700' },
    previewHint: { color: theme.textSecondary, fontSize: 12, textAlign: 'center', marginBottom: 24, lineHeight: 18 },


    pressed: { opacity: 0.7 },
  });
}
