import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../theme/colors';

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();

  return (
    <ScrollView style={[styles.container, { paddingTop: insets.top }]}>
      <Text style={styles.header}>Settings</Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Theme Preview</Text>
        <Text style={styles.cardDescription}>Obsidian dark theme is currently active.</Text>
        <View style={styles.previewBox}>
          <View style={styles.colorSwatch} />
          <Text style={styles.previewText}>Obsidian</Text>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Sound Preview</Text>
        <Text style={styles.cardDescription}>Default alarm tone selected.</Text>
        <View style={styles.settingRow}>
          <Text style={styles.settingLabel}>Volume</Text>
          <Text style={styles.settingValue}>100%</Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, paddingHorizontal: 16 },
  header: { fontSize: 32, fontWeight: 'bold', color: colors.text, marginVertical: 24 },
  card: { backgroundColor: colors.card, borderRadius: 24, padding: 24, marginBottom: 16 },
  cardTitle: { fontSize: 20, fontWeight: 'bold', color: colors.text, marginBottom: 8 },
  cardDescription: { fontSize: 14, color: colors.textSecondary, marginBottom: 20 },
  previewBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.background, padding: 12, borderRadius: 12 },
  colorSwatch: { width: 24, height: 24, borderRadius: 12, backgroundColor: colors.background, borderWidth: 1, borderColor: colors.textSecondary, marginRight: 12 },
  previewText: { color: colors.text, fontWeight: 'bold' },
  settingRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8 },
  settingLabel: { color: colors.textSecondary, fontSize: 16 },
  settingValue: { color: colors.blueAccent, fontSize: 16, fontWeight: 'bold' }
});