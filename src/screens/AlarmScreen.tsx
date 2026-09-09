import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../theme/colors';

export default function AlarmScreen() {
  const insets = useSafeAreaInsets();
  const days = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

  return (
    <ScrollView contentContainerStyle={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.clockContainer}>
        <Text style={styles.clockText}>06:30</Text>
        <Text style={styles.amPmText}>AM</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Wake-up Time</Text>
        <Text style={styles.cardSubtitle}>Set a wake time and select the days you need it.</Text>

        <View style={styles.chipContainer}>
          {days.map((day, index) => (
            <View key={index} style={[styles.chip, index > 0 && index < 6 ? styles.chipActive : null]}>
              <Text style={[styles.chipText, index > 0 && index < 6 ? styles.chipTextActive : null]}>{day}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.spacer} />

      <TouchableOpacity style={styles.primaryButton}>
        <Text style={styles.primaryButtonText}>Arm Alarm</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, backgroundColor: colors.background, paddingHorizontal: 16 },
  clockContainer: { alignItems: 'center', marginVertical: 48, flexDirection: 'row', justifyContent: 'center' },
  clockText: { fontSize: 72, fontWeight: 'bold', color: colors.text, letterSpacing: -2 },
  amPmText: { fontSize: 24, fontWeight: 'bold', color: colors.blueAccent, marginLeft: 8, marginTop: 32 },
  card: { backgroundColor: colors.card, borderRadius: 24, padding: 24, marginBottom: 24 },
  cardTitle: { fontSize: 20, fontWeight: 'bold', color: colors.text, marginBottom: 4 },
  cardSubtitle: { fontSize: 14, color: colors.textSecondary, marginBottom: 24 },
  chipContainer: { flexDirection: 'row', justifyContent: 'space-between' },
  chip: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' },
  chipActive: { backgroundColor: colors.blueAccent },
  chipText: { color: colors.textSecondary, fontWeight: '600' },
  chipTextActive: { color: colors.text },
  spacer: { flex: 1 },
  primaryButton: { backgroundColor: colors.amberAccent, borderRadius: 24, paddingVertical: 18, alignItems: 'center', marginBottom: 24 },
  primaryButtonText: { color: '#000000', fontSize: 18, fontWeight: 'bold' }
});