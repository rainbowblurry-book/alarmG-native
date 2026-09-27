import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { useSettings } from '../context/SettingsContext';
import { useTheme } from '../context/ThemeContext';
import { ThemeConfig, SEMANTIC_COLORS } from '../theme/themes';

/**
 * Self-contained Settings-screen card: custom alarm-tone picker.
 * Drop <AppearanceMediaCard /> anywhere inside SettingsScreen's ScrollView.
 *
 * NOTE: the wallpaper photo picker was built (SettingsContext fields +
 * WallpaperBackground.tsx component both still exist) but was never wired
 * to actually render behind any screen, so picking a photo appeared to do
 * nothing. Disabled here for a stable ship; revisit once WallpaperBackground
 * is actually mounted around a screen's content.
 */
export default function AppearanceMediaCard() {
  const { settings, updateSettings } = useSettings();
  const { theme } = useTheme();
  const styles = createStyles(theme);

  const pickTone = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: ['audio/mpeg', 'audio/wav', 'audio/x-wav', 'audio/mp3'],
      copyToCacheDirectory: true,
    });
    if (result.canceled) return;
    const asset = result.assets?.[0];
    if (!asset?.uri) return;
    updateSettings({ customToneUri: asset.uri, customToneName: asset.name ?? 'Custom tone' });
  };

  const clearTone = () => updateSettings({ customToneUri: null, customToneName: null });

  return (
    <View style={styles.card}>
      <View style={styles.cardInner}>
        <View style={styles.cardHeaderRow}>
          <View style={[styles.iconBadge, { backgroundColor: `${theme.accent}22` }]}>
            <Ionicons name="musical-notes" size={18} color={theme.accent} />
          </View>
          <View>
            <Text style={styles.cardTitle}>Alarm tone</Text>
            <Text style={styles.cardCaption}>Custom mp3 or wav</Text>
          </View>
        </View>

        <View style={styles.rowBetween}>
          <Text style={styles.settingLabel} numberOfLines={1}>
            {settings.customToneName ?? 'Default tone'}
          </Text>
          <Pressable
            style={({ pressed }) => [styles.pillButton, pressed && styles.pressed]}
            onPress={pickTone}
            accessibilityLabel="Choose custom alarm tone"
          >
            <Text style={[styles.pillButtonText, { color: theme.accent }]}>
              {settings.customToneUri ? 'Change' : 'Choose file'}
            </Text>
          </Pressable>
        </View>

        {settings.customToneUri && (
          <Pressable onPress={clearTone} accessibilityLabel="Remove custom alarm tone">
            <Text style={styles.clearLink}>Use default tone instead</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

function createStyles(theme: ThemeConfig) {
  return StyleSheet.create({
    card: {
      backgroundColor: theme.card,
      borderRadius: 28,
      marginBottom: 16,
      overflow: 'hidden',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 5,
      elevation: 3,
    },
    cardInner: { padding: 18 },
    cardHeaderRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 14, gap: 10 },
    iconBadge: { width: 34, height: 34, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
    cardTitle: { fontSize: 17, fontWeight: '800', color: theme.text, fontFamily: theme.fontFamily },
    cardCaption: { fontSize: 12, color: theme.textSecondary, marginTop: 1 },
    rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
    settingLabel: { color: theme.textSecondary, fontSize: 13, fontWeight: '600', flex: 1 },
    pillButton: { backgroundColor: theme.background, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999 },
    pillButtonText: { fontSize: 13, fontWeight: '700' },
    clearLink: { color: SEMANTIC_COLORS.error, fontSize: 12, fontWeight: '700', marginTop: 10 },
    pressed: { opacity: 0.75 },
  });
}
