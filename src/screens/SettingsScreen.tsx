import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Modal, Switch } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useSettings } from '../context/SettingsContext';
import { useTheme } from '../context/ThemeContext';
import { ThemeConfig } from '../theme/themes';

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const { resetSettings } = useSettings();
  const { theme, themeId, themeList, setThemeId } = useTheme();
  const [modalVisible, setModalVisible] = useState(false);
  const [devSimulatePro, setDevSimulatePro] = useState(false);

  const handleReset = () => {
    resetSettings();
    setModalVisible(false);
  };

  const styles = createStyles(theme);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.header}>Settings</Text>

        <Text style={styles.sectionLabel}>Appearance</Text>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Theme</Text>
          <Text style={styles.cardDescription}>
            Choose the look of your alarm, setup, and ringing screens.
          </Text>
          <View style={styles.themeGrid}>
            {themeList.map((t) => {
              const isSelected = t.id === themeId;
              return (
                <Pressable
                  key={t.id}
                  onPress={() => setThemeId(t.id)}
                  style={styles.themeItem}
                  accessibilityLabel={`Select ${t.name} theme`}
                  accessibilityState={{ selected: isSelected }}
                >
                  <View
                    style={[
                      styles.themeSwatch,
                      {
                        backgroundColor: t.accent,
                        borderColor: isSelected ? t.accent : 'transparent',
                      },
                    ]}
                  >
                    {isSelected && <Ionicons name="checkmark" size={20} color={t.accentText} />}
                  </View>
                  <Text style={[styles.themeName, isSelected && { color: theme.text, fontWeight: '700' }]}>
                    {t.name}
                  </Text>
                  <Text style={styles.themeTagline}>{t.tagline}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <Text style={styles.sectionLabel}>Sound</Text>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Alarm Sound</Text>
          <Text style={styles.cardDescription}>
            Custom tones and sound profiles are coming in the next update.
          </Text>
          <View style={styles.settingRow}>
            <Text style={styles.settingLabel}>Current tone</Text>
            <Text style={styles.settingValue}>Default</Text>
          </View>
        </View>

        <Text style={[styles.sectionLabel, styles.devSectionLabel]}>
          Developer testing (remove before release)
        </Text>
        <View style={[styles.card, styles.devCard]}>
          <View style={styles.settingRow}>
            <View style={{ flex: 1, paddingRight: 12 }}>
              <Text style={styles.cardTitle}>Simulate Pro</Text>
              <Text style={styles.cardDescription}>
                Preview the full Pro experience locally. Not persisted, not real billing.
              </Text>
            </View>
            <Switch
              value={devSimulatePro}
              onValueChange={setDevSimulatePro}
              trackColor={{ false: theme.border, true: theme.accent }}
              thumbColor="#ffffff"
            />
          </View>
        </View>

        <Text style={styles.sectionLabel}>Danger zone</Text>
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

function createStyles(theme: ThemeConfig) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.background, paddingHorizontal: 16 },
    scrollContent: { paddingBottom: 40 },
    header: { fontSize: 32, fontWeight: 'bold', color: theme.text, marginVertical: 24, fontFamily: theme.fontFamily },
    sectionLabel: {
      fontSize: 12,
      fontWeight: '700',
      letterSpacing: 1,
      color: theme.textSecondary,
      marginBottom: 10,
      marginTop: 4,
      textTransform: 'uppercase',
      fontFamily: theme.fontFamily,
    },
    devSectionLabel: {
      color: theme.accentSecondary || theme.accent,
    },
    card: {
      backgroundColor: theme.card,
      borderRadius: 24,
      padding: 24,
      marginBottom: 28,
    },
    devCard: {
      borderWidth: 1,
      borderStyle: 'dashed',
      borderColor: theme.accentSecondary || theme.accent,
    },
    cardTitle: { fontSize: 20, fontWeight: 'bold', color: theme.text, marginBottom: 8, fontFamily: theme.fontFamily },
    cardDescription: { fontSize: 14, color: theme.textSecondary, marginBottom: 20, lineHeight: 20, fontFamily: theme.fontFamily },
    themeGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 16,
    },
    themeItem: {
      width: '28%',
      alignItems: 'center',
    },
    themeSwatch: {
      width: 52,
      height: 52,
      borderRadius: 26,
      borderWidth: 2,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 8,
    },
    themeName: {
      fontSize: 13,
      fontWeight: '600',
      color: theme.textSecondary,
      textAlign: 'center',
      fontFamily: theme.fontFamily,
    },
    themeTagline: {
      fontSize: 11,
      color: theme.textSecondary,
      textAlign: 'center',
      opacity: 0.7,
      marginTop: 2,
      fontFamily: theme.fontFamily,
    },
    settingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8 },
    settingLabel: { color: theme.textSecondary, fontSize: 16, fontFamily: theme.fontFamily },
    settingValue: { color: theme.accent, fontSize: 16, fontWeight: 'bold', fontFamily: theme.fontFamily },
    resetButton: {
      marginTop: 4,
      marginBottom: 16,
      backgroundColor: theme.card,
      paddingVertical: 18,
      borderRadius: 24,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: '#ff4444',
    },
    resetButtonText: { color: '#ff4444', fontSize: 16, fontWeight: 'bold', fontFamily: theme.fontFamily },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.7)', justifyContent: 'center', alignItems: 'center', padding: 24 },
    modalContent: { backgroundColor: theme.card, borderRadius: 24, padding: 24, width: '100%' },
    modalTitle: { fontSize: 22, fontWeight: 'bold', color: theme.text, marginBottom: 12, fontFamily: theme.fontFamily },
    modalBody: { fontSize: 16, color: theme.textSecondary, lineHeight: 24, marginBottom: 24, fontFamily: theme.fontFamily },
    modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12 },
    modalButton: { paddingVertical: 10, paddingHorizontal: 20, borderRadius: 12, backgroundColor: theme.background },
    modalButtonDanger: { backgroundColor: '#ff4444' },
    modalButtonText: { color: theme.text, fontSize: 16, fontWeight: 'bold', fontFamily: theme.fontFamily },
    modalButtonTextDanger: { color: '#ffffff', fontSize: 16, fontWeight: 'bold', fontFamily: theme.fontFamily },
  });
}
