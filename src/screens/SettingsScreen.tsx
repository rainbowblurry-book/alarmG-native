import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Modal } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../theme/colors';
import { useSettings } from '../context/SettingsContext';

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const { resetSettings } = useSettings();
  const [modalVisible, setModalVisible] = useState(false);

  const handleReset = () => {
    resetSettings();
    setModalVisible(false);
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView>
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

        <Pressable 
          style={styles.resetButton}
          onPress={() => setModalVisible(true)}
          accessibilityLabel="Reset Alarm Settings"
        >
          <Text style={styles.resetButtonText}>Reset Alarm Settings</Text>
        </Pressable>
      </ScrollView>

      <Modal
        animationType="fade"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Reset Settings?</Text>
            <Text style={styles.modalBody}>
              This will return all settings to their defaults (07:00, Weekdays, Bathroom Toothpaste).
            </Text>
            
            <View style={styles.modalActions}>
              <Pressable 
                style={styles.modalButton}
                onPress={() => setModalVisible(false)}
                accessibilityLabel="Cancel Reset"
              >
                <Text style={styles.modalButtonText}>Cancel</Text>
              </Pressable>
              
              <Pressable 
                style={[styles.modalButton, styles.modalButtonDanger]}
                onPress={handleReset}
                accessibilityLabel="Confirm Reset"
              >
                <Text style={styles.modalButtonTextDanger}>Reset</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
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
  settingValue: { color: colors.blueAccent, fontSize: 16, fontWeight: 'bold' },
  resetButton: { marginTop: 24, backgroundColor: colors.card, paddingVertical: 18, borderRadius: 24, alignItems: 'center', borderWidth: 1, borderColor: '#ff4444' },
  resetButtonText: { color: '#ff4444', fontSize: 16, fontWeight: 'bold' },
  
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.7)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  modalContent: { backgroundColor: colors.card, borderRadius: 24, padding: 24, width: '100%' },
  modalTitle: { fontSize: 22, fontWeight: 'bold', color: colors.text, marginBottom: 12 },
  modalBody: { fontSize: 16, color: colors.textSecondary, lineHeight: 24, marginBottom: 24 },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12 },
  modalButton: { paddingVertical: 10, paddingHorizontal: 20, borderRadius: 12, backgroundColor: colors.background },
  modalButtonDanger: { backgroundColor: '#ff4444' },
  modalButtonText: { color: colors.text, fontSize: 16, fontWeight: 'bold' },
  modalButtonTextDanger: { color: '#ffffff', fontSize: 16, fontWeight: 'bold' }
});