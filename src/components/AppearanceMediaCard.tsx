import React from 'react';
import { View, Text, StyleSheet, Pressable, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { useSettings } from '../context/SettingsContext';
import { useTheme } from '../context/ThemeContext';
import { ThemeConfig, SEMANTIC_COLORS } from '../theme/themes';

/**
 * Self-contained Settings-screen card: wallpaper photo picker (with
 * visibility + blur adjusters) and custom alarm-tone picker. Drop
 * <AppearanceMediaCard /> anywhere inside SettingsScreen's ScrollView.
 */
export default function AppearanceMediaCard() {
  const { settings, updateSettings } = useSettings();
  const { theme } = useTheme();
  const styles = createStyles(theme);

  const pickWallpaper = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission needed', 'Photo library access is needed to set a wallpaper.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });
    if (!result.canceled && result.assets?.[0]?.uri) {
      updateSettings({ wallpaperUri: result.assets[0].uri });
    }
  };

  const clearWallpaper = () => updateSettings({ wallpaperUri: null });

  const adjustOpacity = (delta: number) => {
    let next = Math.round((settings.wallpaperOpacity + delta) * 100) / 100;
    if (next < 0.05) next = 0.05;
    if (next > 0.9) next = 0.9;
    updateSettings({ wallpaperOpacity: next });
  };

  const adjustBlur = (delta: number) => {
    let next = settings.wallpaperBlur + delta;
    if (next < 0) next = 0;
    if (next > 100) next = 100;
    updateSettings({ wallpaperBlur: next });
  };

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
            <Ionicons name="image" size={18} color={theme.accent} />
          </View>
          <View>
            <Text style={styles.cardTitle}>Wallpaper</Text>
            <Text style={styles.cardCaption}>Custom photo behind every screen</Text>
          </View>
        </View>

        <View style={styles.rowBetween}>
          <Text style={styles.settingLabel}>
            {settings.wallpaperUri ? 'Custom photo set' : 'Using theme background'}
          </Text>
          <Pressable
            style={({ pressed }) => [styles.pillButton, pressed && styles.pressed]}
            onPress={pickWallpaper}
            accessibilityLabel="Choose wallpaper photo"
          >
            <Text style={[styles.pillButtonText, { color: theme.accent }]}>
              {settings.wallpaperUri ? 'Change' : 'Choose photo'}
            </Text>
          </Pressable>
        </View>

        {settings.wallpaperUri && (
          <>
            <Pressable onPress={clearWallpaper} accessibilityLabel="Remove wallpaper">
              <Text style={styles.clearLink}>Remove wallpaper</Text>
            </Pressable>

            <View style={styles.divider} />

            <Text style={styles.fieldLabel}>Wallpaper visibility</Text>
            <View style={styles.adjustRow}>
              <Pressable style={({ pressed }) => [styles.adjustBtn, pressed && styles.pressed]} onPress={() => adjustOpacity(-0.05)} accessibilityLabel="Decrease wallpaper visibility">
                <Ionicons name="remove" size={18} color={theme.accent} />
              </Pressable>
              <Text style={styles.adjustValue}>{Math.round(settings.wallpaperOpacity * 100)}%</Text>
              <Pressable style={({ pressed }) => [styles.adjustBtn, pressed && styles.pressed]} onPress={() => adjustOpacity(0.05)} accessibilityLabel="Increase wallpaper visibility">
                <Ionicons name="add" size={18} color={theme.accent} />
              </Pressable>
            </View>

            <Text style={styles.fieldLabel}>Blur</Text>
            <View style={styles.adjustRow}>
              <Pressable style={({ pressed }) => [styles.adjustBtn, pressed && styles.pressed]} onPress={() => adjustBlur(-10)} accessibilityLabel="Decrease blur">
                <Ionicons name="remove" size={18} color={theme.accent} />
              </Pressable>
              <Text style={styles.adjustValue}>{settings.wallpaperBlur}</Text>
              <Pressable style={({ pressed }) => [styles.adjustBtn, pressed && styles.pressed]} onPress={() => adjustBlur(10)} accessibilityLabel="Increase blur">
                <Ionicons name="add" size={18} color={theme.accent} />
              </Pressable>
            </View>
          </>
        )}
      </View>

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
    divider: { height: 1, backgroundColor: theme.border, marginVertical: 14 },
    fieldLabel: { fontSize: 11, fontWeight: '700', color: theme.textSecondary, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
    adjustRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 20, marginBottom: 14 },
    adjustBtn: { width: 36, height: 36, borderRadius: 999, backgroundColor: `${theme.accent}1A`, alignItems: 'center', justifyContent: 'center' },
    adjustValue: { fontSize: 18, fontWeight: '800', color: theme.text, minWidth: 50, textAlign: 'center' },
    pressed: { opacity: 0.75 },
  });
}
