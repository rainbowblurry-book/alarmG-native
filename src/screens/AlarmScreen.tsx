import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../theme/colors';
import { useSettings } from '../context/SettingsContext';

const DAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const FULL_DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function AlarmScreen() {
  const insets = useSafeAreaInsets();
  const { settings, updateSettings } = useSettings();
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
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
      ? settings.repeatDays.filter(d => d !== dayIndex)
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
    if (newMinute > 59) newMinute = 0;
    if (newMinute < 0) newMinute = 59;
    updateSettings({ alarmMinute: newMinute });
  };

  const toggleArmed = () => {
    if (settings.repeatDays.length === 0 && !settings.isArmed) return;
    updateSettings({ isArmed: !settings.isArmed });
  };

  const noDaysSelected = settings.repeatDays.length === 0;

  return (
    <ScrollView contentContainerStyle={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.clockContainer}>
        <Text style={styles.clockText}>
          {formatLiveTime(currentTime)}
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Wake-up Time</Text>
        <Text style={styles.cardSubtitle}>
          {settings.isArmed ? 'Alarm is armed and locked' : 'Adjust your wake-up time'}
        </Text>

        <View style={styles.timeControlsContainer}>
          <View style={styles.timeSection}>
            <Pressable
              style={styles.adjustButton}
              onPress={() => adjustHour(-1)}
              accessibilityLabel="Decrease hour"
              disabled={settings.isArmed}
            >
              <Text style={styles.adjustButtonText}>-</Text>
            </Pressable>
            <Text style={styles.alarmTimeText}>{String(settings.alarmHour).padStart(2, '0')}</Text>
            <Pressable
              style={styles.adjustButton}
              onPress={() => adjustHour(1)}
              accessibilityLabel="Increase hour"
              disabled={settings.isArmed}
            >
              <Text style={styles.adjustButtonText}>+</Text>
            </Pressable>
          </View>
          
          <Text style={styles.timeColon}>:</Text>

          <View style={styles.timeSection}>
            <Pressable
              style={styles.adjustButton}
              onPress={() => adjustMinute(-1)}
              accessibilityLabel="Decrease minute"
              disabled={settings.isArmed}
            >
              <Text style={styles.adjustButtonText}>-</Text>
            </Pressable>
            <Text style={styles.alarmTimeText}>{String(settings.alarmMinute).padStart(2, '0')}</Text>
            <Pressable
              style={styles.adjustButton}
              onPress={() => adjustMinute(1)}
              accessibilityLabel="Increase minute"
              disabled={settings.isArmed}
            >
              <Text style={styles.adjustButtonText}>+</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.chipContainer}>
          {DAYS.map((day, index) => {
            const isSelected = settings.repeatDays.includes(index);
            return (
              <Pressable
                key={index}
                style={[
                  styles.chip,
                  isSelected && styles.chipActive,
                  settings.isArmed && styles.chipDisabled
                ]}
                onPress={() => toggleDay(index)}
                accessibilityLabel={`Toggle ${FULL_DAY_NAMES[index]}`}
                accessibilityState={{ selected: isSelected }}
                disabled={settings.isArmed}
              >
                <Text style={[styles.chipText, isSelected && styles.chipTextActive]}>
                  {day}
                </Text>
              </Pressable>
            );
          })}
        </View>
        
        {noDaysSelected && (
          <Text style={styles.warningText}>No repeat days selected</Text>
        )}
      </View>

      <View style={styles.spacer} />

      <Pressable
        style={[
          styles.primaryButton,
          noDaysSelected && !settings.isArmed ? styles.primaryButtonDisabled : null,
          settings.isArmed ? styles.primaryButtonCancel : null
        ]}
        onPress={toggleArmed}
        disabled={noDaysSelected && !settings.isArmed}
        accessibilityLabel={settings.isArmed ? "Cancel Alarm" : "Arm Alarm"}
      >
        <Text style={styles.primaryButtonText}>
          {settings.isArmed ? 'Cancel Alarm' : 'Arm Alarm'}
        </Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, backgroundColor: colors.background, paddingHorizontal: 16 },
  clockContainer: { alignItems: 'center', marginVertical: 40, justifyContent: 'center' },
  clockText: { fontSize: 80, fontWeight: 'bold', color: colors.text, letterSpacing: -2 },
  card: { backgroundColor: colors.card, borderRadius: 24, padding: 24, marginBottom: 24 },
  cardTitle: { fontSize: 20, fontWeight: 'bold', color: colors.text, marginBottom: 4 },
  cardSubtitle: { fontSize: 14, color: colors.textSecondary, marginBottom: 24 },
  timeControlsContainer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginBottom: 24 },
  timeSection: { alignItems: 'center' },
  alarmTimeText: { fontSize: 48, fontWeight: 'bold', color: colors.text, marginVertical: 8 },
  adjustButton: { backgroundColor: colors.background, width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  adjustButtonText: { color: colors.blueAccent, fontSize: 24, fontWeight: 'bold' },
  timeColon: { fontSize: 48, fontWeight: 'bold', color: colors.text, marginHorizontal: 16 },
  chipContainer: { flexDirection: 'row', justifyContent: 'space-between' },
  chip: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' },
  chipActive: { backgroundColor: colors.blueAccent },
  chipDisabled: { opacity: 0.5 },
  chipText: { color: colors.textSecondary, fontWeight: '600', fontSize: 16 },
  chipTextActive: { color: colors.text },
  warningText: { color: colors.amberAccent, marginTop: 16, textAlign: 'center', fontWeight: 'bold' },
  spacer: { flex: 1 },
  primaryButton: { backgroundColor: colors.amberAccent, borderRadius: 24, paddingVertical: 18, alignItems: 'center', marginBottom: 24 },
  primaryButtonCancel: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.amberAccent },
  primaryButtonDisabled: { backgroundColor: '#333333', opacity: 0.7 },
  primaryButtonText: { color: '#ffffff', fontSize: 18, fontWeight: 'bold' }
});