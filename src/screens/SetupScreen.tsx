import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../theme/colors';

export default function SetupScreen() {
  const insets = useSafeAreaInsets();

  return (
    <ScrollView style={[styles.container, { paddingTop: insets.top }]}>
      <Text style={styles.header}>Mission Setup</Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Wake-up Item</Text>
        <Text style={styles.cardDescription}>Require scanning a specific household item to turn off the alarm.</Text>
        <View style={styles.statusBadge}>
          <Text style={styles.statusText}>Not Configured</Text>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Barcode Mission</Text>
        <Text style={styles.cardDescription}>Scan the barcode on your toothpaste or coffee bag to wake up.</Text>
        <View style={styles.statusBadge}>
          <Text style={styles.statusText}>Not Configured</Text>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Movement Mission</Text>
        <Text style={styles.cardDescription}>Complete your movement target before scanning to dismiss the alarm.</Text>
        <View style={[styles.statusBadge, styles.statusBadgeActive]}>
          <Text style={[styles.statusText, styles.statusTextActive]}>Active</Text>
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
  cardDescription: { fontSize: 14, color: colors.textSecondary, marginBottom: 20, lineHeight: 20 },
  statusBadge: { alignSelf: 'flex-start', backgroundColor: colors.background, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  statusBadgeActive: { backgroundColor: colors.blueAccent },
  statusText: { color: colors.textSecondary, fontSize: 12, fontWeight: 'bold' },
  statusTextActive: { color: colors.text }
});