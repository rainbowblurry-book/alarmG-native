import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Modal, Switch } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSettings } from '../context/SettingsContext';
import { useTheme } from '../context/ThemeContext';
import { ThemeConfig, SEMANTIC_COLORS } from '../theme/themes';
import AppearanceMediaCard from '../components/AppearanceMediaCard';

const SHAPE = { md: 12, lg: 16, xl: 28, full: 999 };

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
    <View style={styles.container}>
      <LinearGradient colors={theme.ringingGradient} style={[styles.hero, { paddingTop: insets.top + 20 }]}>
        <Text style={styles.heroLabel}>PERSONALIZE</Text>
        <Text style={styles.heroTitle}>Settings</Text>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* --- Appearance / theme picker --- */}
        <View style={styles.card}>
          <View style={[styles.leftBar, { backgroundColor: theme.accent }]} />
          <View style={styles.cardInner}>
            <View style={styles.cardHeaderRow}>
              <View style={[styles.iconBadge, { backgroundColor: `${theme.accent}26` }]}>
                <Ionicons name="color-palette" size={18} color={theme.accent} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>Theme</Text>
                <Text style={styles.cardCaption}>Pick the look of every screen</Text>
              </View>
            </View>

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
                          shadowColor: t.accent,
                          shadowOpacity: isSelected ? 0.6 : 0,
                        },
                      ]}
                    >
                      {isSelected && <Ionicons name="checkmark" size={22} color={t.accentText} />}
                    </View>
                    <Text style={[styles.themeName, isSelected && { color: theme.text, fontWeight: '800' }]}>
                      {t.name}
                    </Text>
                    <Text style={styles.themeTagline}>{t.tagline}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        </View>

        <AppearanceMediaCard />

        {/* --- Sound --- */}
        <View style={styles.card}>
          <View style={[styles.leftBar, { backgroundColor: theme.accentSecondary || theme.accent }]} />
          <View style={styles.cardInner}>
            <View style={styles.cardHeaderRow}>
              <View style={[styles.iconBadge, { backgroundColor: `${(theme.accentSecondary || theme.accent)}26` }]}>
                <Ionicons name="volume-high" size={18} color={theme.accentSecondary || theme.accent} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>Alarm sound</Text>
                <Text style={styles.cardCaption}>Custom tones coming in the next update</Text>
              </View>
            </View>

            <View style={styles.settingRow}>
              <Text style={styles.settingLabel}>Current tone</Text>
              <View style={styles.settingValuePill}>
                <Text style={styles.settingValueText}>Default</Text>
              </View>
            </View>
          </View>
        </View>

        {/* --- Developer testing --- */}
        <View style={[styles.card, styles.devCard]}>
          <View style={[styles.leftBar, { backgroundColor: SEMANTIC_COLORS.warning }]} />
          <View style={styles.cardInner}>
            <View style={styles.cardHeaderRow}>
              <View style={[styles.iconBadge, { backgroundColor: `${SEMANTIC_COLORS.warning}26` }]}>
                <Ionicons name="construct" size={18} color={SEMANTIC_COLORS.warning} />
              </View>
              <Text style={styles.cardTitle}>Developer testing</Text>
            </View>
            <Text style={[styles.cardCaption, { marginBottom: 12 }]}>Remove before release</Text>

            <View style={styles.settingRow}>
              <View style={{ flex: 1, paddingRight: 12 }}>
                <Text style={styles.devLabel}>Simulate Pro</Text>
                <Text style={styles.cardCaption}>Preview locally. Not persisted, not real billing.</Text>
              </View>
              <Switch
                value={devSimulatePro}
                onValueChange={setDevSimulatePro}
                trackColor={{ false: theme.border, true: theme.accent }}
                thumbColor="#ffffff"
              />
            </View>
          </View>
        </View>

        {/* --- Danger zone --- */}
        <View style={styles.card}>
          <View style={[styles.leftBar, { backgroundColor: SEMANTIC_COLORS.error }]} />
          <View style={styles.cardInner}>
            <View style={styles.cardHeaderRow}>
              <View style={[styles.iconBadge, { backgroundColor: `${SEMANTIC_COLORS.error}26` }]}>
                <Ionicons name="warning" size={18} color={SEMANTIC_COLORS.error} />
              </View>
              <Text style={styles.cardTitle}>Danger zone</Text>
            </View>
            <Pressable
              style={({ pressed }) => [styles.resetButton, pressed && styles.pressed]}
              onPress={() => setModalVisible(true)}
              accessibilityLabel="Reset Alarm Settings"
            >
              <Ionicons name="refresh" size={16} color={SEMANTIC_COLORS.error} />
              <Text style={styles.resetButtonText}>Reset all settings</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>

      <Modal
        animationType="fade"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Reset settings?</Text>
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
