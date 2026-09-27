import React from 'react';
import { View, ImageBackground, StyleSheet, ViewStyle } from 'react-native';
import { BlurView } from 'expo-blur';
import { useSettings } from '../context/SettingsContext';

interface WallpaperBackgroundProps {
  children: React.ReactNode;
  fallbackColor: string;
  style?: ViewStyle;
}

/**
 * Wraps a screen (or the whole app root) in the user's custom wallpaper
 * photo, if one is set. Falls back to a plain themed background when no
 * wallpaper is configured, so this is safe to drop in anywhere without
 * changing behavior for users who haven't picked a photo yet.
 *
 * wallpaperOpacity (0-1) controls how visible the photo is: we render a
 * dark scrim on top whose opacity is the inverse, so 1 = fully visible
 * photo, 0 = photo hidden entirely (looks like the old plain background).
 */
export default function WallpaperBackground({ children, fallbackColor, style }: WallpaperBackgroundProps) {
  const { settings } = useSettings();

  if (!settings.wallpaperUri) {
    return <View style={[styles.fill, { backgroundColor: fallbackColor }, style]}>{children}</View>;
  }

  return (
    <ImageBackground source={{ uri: settings.wallpaperUri }} style={[styles.fill, style]} resizeMode="cover">
      {settings.wallpaperBlur > 0 && (
        <BlurView
          intensity={settings.wallpaperBlur}
          tint="dark"
          style={StyleSheet.absoluteFill}
          experimentalBlurMethod="dimezisBlurView"
        />
      )}
      <View
        style={[
          StyleSheet.absoluteFill,
          { backgroundColor: fallbackColor, opacity: 1 - settings.wallpaperOpacity },
        ]}
      />
      <View style={styles.fill}>{children}</View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
});
