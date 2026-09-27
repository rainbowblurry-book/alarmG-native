import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, Pressable, Modal, Linking } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useSettings } from '../context/SettingsContext';
import { useTheme } from '../context/ThemeContext';
import { ThemeConfig, SEMANTIC_COLORS } from '../theme/themes';

const SHAPE = { md: 12, lg: 16, xl: 28, full: 999 };

function validateSnoozePin(pin: string): { isValid: boolean; error?: string } {
  if (!/^\d{10}$/.test(pin)) {
    return { isValid: false, error: 'PIN must be exactly 10 digits.' };
  }
  if (/^(\d)\1{9}$/.test(pin)) {
    return { isValid: false, error: 'Avoid using the same digit repeated 10 times.' };
  }
  const sequentialAsc = '01234567890123456789';
  const sequentialDesc = '98765432109876543210';
  if (sequentialAsc.includes(pin) || sequentialDesc.includes(pin)) {
    return { isValid: false, error: 'Avoid simple sequential numbers.' };
  }
  const pattern2 = pin.slice(0, 2);
  if (pattern2.repeat(5) === pin) {
    return { isValid: false, error: 'Avoid simple repeating patterns.' };
  }
  const uniqueDigits = new Set(pin.split('')).size;
  if (uniqueDigits < 4) {
    return { isValid: false, error: `Use at least 4 different digits (currently ${uniqueDigits}).` };
  }
  return { isValid: true };
}

export default function SetupScreen() {
  const insets = useSafeAreaInsets();
  const { settings, updateSettings } = useSettings();
  const { theme } = useTheme();
  const styles = createStyles(theme);
  const isGlass = Boolean(theme.glassEffect);

  const [permission, requestPermission] = useCameraPermissions();
  const [isScanning, setIsScanning] = useState(false);
  const [scanned, setScanned] = useState(false);
  const scanLockRef = useRef(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [manualBarcode, setManualBarcode] = useState('');

  const [pinDraft, setPinDraft] = useState(settings.snoozePin);
  const [pinError, setPinError] = useState<string | null>(null);
  const [pinSaved, setPinSaved] = useState(false);

  useEffect(() => {
    setPinDraft(settings.snoozePin);
  }, [settings.snoozePin]);

  const isBarcodeConfigured = Boolean(settings.wakeBarcode && settings.wakeBarcode.length > 0);
  const lastFour = isBarcodeConfigured ? settings.wakeBarcode.slice(-4) : '';

  const handleOpenScanner = async () => {
    scanLockRef.current = false;
    setScanned(false);
    if (!permission?.granted) {
      const result = await requestPermission();
      if (!result.granted) {
        setIsScanning(true);
        return;
      }
    }
    setIsScanning(true);
  };

  const handleBarcodeDetected = (code: string) => {
    if (scanLockRef.current) return;
    const trimmed = code.trim();
    if (!trimmed) return;
    scanLockRef.current = true;
    setScanned(true);
    updateSettings({ wakeBarcode: trimmed });
    setIsScanning(false);
    triggerSuccess();
  };

  const handleManualSubmit = () => {
    if (!manualBarcode.trim()) return;
    handleBarcodeDetected(manualBarcode.trim());
    setManualBarcode('');
  };

  const triggerSuccess = () => {
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 4000);
  };

  const adjustMovement = (delta: number) => {
    let newTarget = settings.movementTarget + delta;
    if (newTarget < 5) newTarget = 5;
    if (newTarget > 50) newTarget = 50;
    updateSettings({ movementTarget: newTarget });
  };

  const handleSavePin = () => {
    const result = validateSnoozePin(pinDraft);
    if (!result.isValid) {
      setPinError(result.error || 'Invalid PIN.');
      return;
    }
    updateSettings({ snoozePin: pinDraft });
    setPinError(null);
    setPinSaved(true);
    setTimeout(() => setPinSaved(false), 3000);
  };

  const pinButtonDisabled = pinDraft.length !== 10;
  const manualBarcodeDisabled = !manualBarcode.trim();

  return (
    <View style={styles.container}>
      <LinearGradient colors={theme.ringingGradient} style={[styles.hero, { paddingTop: insets.top + 20 }]}>
        <Text style={styles.heroLabel}>MISSION SETUP</Text>
        <Text style={styles.heroTitle}>Three checks before you can disarm</Text>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
          <View style={[styles.leftBar, { backgroundColor: theme.accent }]} />
          <View style={styles.cardInner}>
            <View style={styles.cardHeaderRow}>
              <View style={[styles.iconBadge, { backgroundColor: `${theme.accent}26` }]}>
                <Ionicons name="qr-code" size={18} color={theme.accent} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>Barcode scan</Text>
                <Text style={styles.cardCaption}>Scan a real household item to disarm</Text>
              </View>
              {isBarcodeConfigured && (
                <View style={[styles.statusChip, { backgroundColor: `${SEMANTIC_COLORS.success}26` }]}>
                  <Ionicons name="checkmark-circle" size={12} color={SEMANTIC_COLORS.success} />
                  <Text style={[styles.statusChipText, { color: SEMANTIC_COLORS.success }]}>Set</Text>
                </View>
              )}
            </View>

            <Text style={styles.fieldLabel}>Item name</Text>
            <TextInput
              style={styles.input}
              value={settings.wakeItemName}
              onChangeText={(text) => updateSettings({ wakeItemName: text })}
              placeholder="e.g. Bathroom Toothpaste"
              placeholderTextColor={theme.textSecondary}
              accessibilityLabel="Wake-up item name"
            />

            {isBarcodeConfigured ? (
              <Text style={styles.statusDetail}>Saved barcode ending in ...{lastFour}</Text>
            ) : (
              <Text style={styles.statusMissing}>No barcode registered yet</Text>
            )}

            {showSuccess && (
              <View style={styles.successBadge}>
                <Ionicons name="checkmark-circle" size={14} color="#052e1a" />
                <Text style={styles.successText}>Barcode saved</Text>
              </View>
            )}

            <Pressable
              style={({ pressed }) => [
                styles.actionButton,
                !isGlass && { backgroundColor: theme.accent },
                pressed && styles.pressed,
              ]}
              onPress={handleOpenScanner}
              accessibilityLabel="Scan Wake-up Item Barcode"
            >
              {isGlass && (
                <LinearGradient colors={theme.buttonGradient} style={StyleSheet.absoluteFill} />
              )}
              <Ionicons name="scan-outline" size={16} color={theme.accentText} />
              <Text style={[styles.actionButtonText, { color: theme.accentText }]}>
                {isBarcodeConfigured ? 'Re-scan barcode' : 'Scan barcode'}
              </Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.card}>
          <View style={[styles.leftBar, { backgroundColor: theme.accent }]} />
          <View style={styles.cardInner}>
            <View style={styles.cardHeaderRow}>
              <View style={[styles.iconBadge, { backgroundColor: `${theme.accent}26` }]}>
                <Ionicons name="keypad" size={18} color={theme.accent} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>Snooze PIN</Text>
                <Text style={styles.cardCaption}>10 digits, required to snooze instead of scanning</Text>
              </View>
            </View>

            <TextInput
              style={styles.input}
              value={pinDraft}
              onChangeText={(text) => {
                const digitsOnly = text.replace(/\D/g, '').slice(0, 10);
                setPinDraft(digitsOnly);
                setPinError(null);
              }}
              placeholder="Enter 10-digit PIN"
              placeholderTextColor={theme.textSecondary}
              keyboardType="number-pad"
              maxLength={10}
              accessibilityLabel="Snooze PIN"
            />

            {pinError && <Text style={styles.statusMissing}>{pinError}</Text>}
            {pinSaved && (
              <View style={styles.successBadge}>
                <Ionicons name="checkmark-circle" size={14} color="#052e1a" />
                <Text style={styles.successText}>PIN saved</Text>
              </View>
            )}

            <Pressable
              style={({ pressed }) => [
                styles.actionButton,
                !isGlass && { backgroundColor: theme.accent },
                pinButtonDisabled && styles.actionButtonDisabled,
                pressed && !pinButtonDisabled && styles.pressed,
              ]}
              onPress={handleSavePin}
              disabled={pinButtonDisabled}
              accessibilityLabel="Save snooze PIN"
            >
              {isGlass && !pinButtonDisabled && (
                <LinearGradient colors={theme.buttonGradient} style={StyleSheet.absoluteFill} />
              )}
              <Ionicons name="save-outline" size={16} color={theme.accentText} />
              <Text style={[styles.actionButtonText, { color: theme.accentText }]}>Save PIN</Text>
            </Pressable>

            <View style={styles.divider} />
            <View style={styles.crueltyRow}>
              <View style={{ flex: 1, paddingRight: 10 }}>
                <Text style={styles.crueltyTitle}>Cruelty mode</Text>
                <Text style={styles.cardCaption}>Halves the snooze time every time you snooze</Text>
              </View>
              <Pressable
                style={[styles.crueltySwitch, settings.crueltyModeEnabled && styles.crueltySwitchOn]}
                onPress={() => updateSettings({ crueltyModeEnabled: !settings.crueltyModeEnabled })}
                accessibilityLabel={`Cruelty mode is ${settings.crueltyModeEnabled ? 'on' : 'off'}. Tap to toggle.`}
                accessibilityRole="switch"
                accessibilityState={{ checked: !!settings.crueltyModeEnabled }}
              >
                <View style={[styles.crueltyThumb, settings.crueltyModeEnabled && styles.crueltyThumbOn]} />
              </Pressable>
            </View>
          </View>
        </View>

        <View style={styles.card}>
          <View style={[styles.leftBar, { backgroundColor: theme.accent }]} />
          <View style={styles.cardInner}>
            <View style={styles.cardHeaderRow}>
              <View style={[styles.iconBadge, { backgroundColor: `${theme.accent}26` }]}>
                <Ionicons name="walk" size={18} color={theme.accent} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>Movement</Text>
                <Text style={styles.cardCaption}>Walk away from bed before you can scan</Text>
              </View>
              <Pressable
                style={[styles.miniSwitch, settings.movementEnabled && styles.miniSwitchOn]}
                onPress={() => updateSettings({ movementEnabled: !settings.movementEnabled })}
                accessibilityLabel={`Movement mission is ${settings.movementEnabled ? 'on' : 'off'}. Tap to toggle.`}
              >
                <View style={[styles.miniThumb, settings.movementEnabled && styles.miniThumbOn]} />
              </Pressable>
            </View>

            {settings.movementEnabled && (
              <View style={styles.targetRow}>
                <Pressable
                  style={({ pressed }) => [styles.adjustBtn, pressed && styles.pressed]}
                  onPress={() => adjustMovement(-5)}
                  accessibilityLabel="Decrease movement target"
                >
                  <Ionicons name="remove" size={20} color={theme.accent} />
                </Pressable>
                <View style={styles.targetValueBox}>
                  <Text style={styles.targetValue}>{settings.movementTarget}</Text>
                  <Text style={styles.targetUnit}>steps</Text>
                </View>
                <Pressable
                  style={({ pressed }) => [styles.adjustBtn, pressed && styles.pressed]}
                  onPress={() => adjustMovement(5)}
                  accessibilityLabel="Increase movement target"
                >
                  <Ionicons name="add" size={20} color={theme.accent} />
                </Pressable>
              </View>
            )}
          </View>
        </View>
      </ScrollView>

      <Modal visible={isScanning} animationType="slide" transparent={false} onRequestClose={() => setIsScanning(false)}>
        <View style={[styles.modalContainer, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
          {!permission?.granted ? (
            <View style={styles.permissionContainer}>
              <Text style={styles.permissionTitle}>Camera permission required</Text>
              <Text style={styles.permissionText}>Camera access is needed to scan your wake-up item.</Text>

              <Pressable
                style={[styles.actionButton, !isGlass && { backgroundColor: theme.accent }]}
                onPress={() => Linking.openSettings()}
                accessibilityLabel="Open app settings"
              >
                {isGlass && (
                  <LinearGradient colors={theme.buttonGradient} style={StyleSheet.absoluteFill} />
                )}
                <Text style={[styles.actionButtonText, { color: theme.accentText }]}>Open Settings</Text>
              </Pressable>

              <View style={styles.fallbackContainer}>
                <Text style={styles.fallbackTitle}>Accessibility fallback</Text>
                <Text style={styles.fallbackDesc}>
                  Use this only when camera access is unavailable. It should not be used to bypass the normal
                  physical scanning mission.
                </Text>
                <TextInput
                  style={styles.input}
                  value={manualBarcode}
                  onChangeText={setManualBarcode}
                  placeholder="Enter registered barcode"
                  placeholderTextColor={theme.textSecondary}
                  autoCapitalize="characters"
                  autoCorrect={false}
                  accessibilityLabel="Manual barcode input"
                />
                <Pressable
                  style={[
                    styles.actionButton,
                    !isGlass && { backgroundColor: theme.accent },
                    manualBarcodeDisabled && styles.actionButtonDisabled,
                  ]}
                  onPress={handleManualSubmit}
                  disabled={manualBarcodeDisabled}
                  accessibilityLabel="Save manual barcode"
                >
                  {isGlass && !manualBarcodeDisabled && (
                    <LinearGradient colors={theme.buttonGradient} style={StyleSheet.absoluteFill} />
                  )}
                  <Text style={[styles.actionButtonText, { color: theme.accentText }]}>Save Manual Barcode</Text>
                </Pressable>
              </View>

              <Pressable style={styles.cancelButton} onPress={() => setIsScanning(false)} accessibilityLabel="Cancel barcode scanning">
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.cameraWrapper}>
              <CameraView
                style={StyleSheet.absoluteFill}
                facing="back"
                barcodeScannerSettings={{ barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e', 'code128', 'code39', 'qr'] }}
                onBarcodeScanned={scanned ? undefined : (result) => handleBarcodeDetected(result.data)}
              />
              <View style={styles.cameraOverlay} pointerEvents="box-none">
                <View style={styles.cameraHeaderBox}>
                  <Text style={styles.cameraHeaderText}>Scan {settings.wakeItemName}</Text>
                  <Text style={styles.cameraSubHeaderText}>Position the barcode in the center</Text>
                </View>
                <View style={styles.cameraFooter}>
                  <Pressable style={styles.cancelButton} onPress={() => setIsScanning(false)} accessibilityLabel="Cancel barcode scanning">
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </Pressable>
                </View>
              </View>
            </View>
          )}
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
      fontSize: 22, fontWeight: '800', color: theme.text, fontFamily: theme.fontFamily, lineHeight: 28,
      textShadowColor: 'rgba(0,0,0,0.35)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 6,
    },

    scrollContent: { paddingHorizontal: 16, paddingTop: 20, paddingBottom: 40 },

    card: { flexDirection: 'row', backgroundColor: theme.card, borderRadius: SHAPE.xl, marginBottom: 16, overflow: 'hidden',
      shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 5, elevation: 3 },
    leftBar: { width: 5 },
    cardInner: { flex: 1, padding: 18 },
    cardHeaderRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
    iconBadge: { width: 34, height: 34, borderRadius: SHAPE.full, alignItems: 'center', justifyContent: 'center', marginRight: 10 },
    cardTitle: { fontSize: 17, fontWeight: '800', color: theme.text, fontFamily: theme.fontFamily },
    cardCaption: { fontSize: 12, color: theme.textSecondary, marginTop: 1 },

    statusChip: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 8, paddingVertical: 4, borderRadius: SHAPE.full },
    statusChipText: { fontSize: 11, fontWeight: '700' },

    fieldLabel: { fontSize: 11, fontWeight: '700', color: theme.textSecondary, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 },
    input: { backgroundColor: theme.background, color: theme.text, padding: 14, borderRadius: SHAPE.md, fontSize: 15, borderWidth: 1, borderColor: theme.border, marginBottom: 10 },

    statusDetail: { color: theme.textSecondary, fontSize: 13, marginBottom: 12 },
    statusMissing: { color: SEMANTIC_COLORS.error, fontSize: 13, fontWeight: '700', marginBottom: 12 },

    successBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: SEMANTIC_COLORS.success, padding: 10, borderRadius: SHAPE.md, marginBottom: 12, justifyContent: 'center' },
    successText: { color: '#052e1a', fontWeight: '700', fontSize: 13 },

    actionButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: SHAPE.full, paddingVertical: 13, marginTop: 4, overflow: 'hidden' },
    actionButtonDisabled: { backgroundColor: '#333333', opacity: 0.5 },
    actionButtonText: { fontSize: 14, fontWeight: '700' },

    divider: { height: 1, backgroundColor: theme.border, marginVertical: 16 },
    crueltyRow: { flexDirection: 'row', alignItems: 'center' },
    crueltyTitle: { fontSize: 14, fontWeight: '700', color: theme.text, marginBottom: 2 },

    crueltySwitch: { width: 46, height: 28, borderRadius: SHAPE.full, backgroundColor: theme.background, borderWidth: 1, borderColor: theme.border, padding: 2, justifyContent: 'center' },
    crueltySwitchOn: { backgroundColor: SEMANTIC_COLORS.error, borderColor: SEMANTIC_COLORS.error },
    crueltyThumb: { width: 22, height: 22, borderRadius: SHAPE.full, backgroundColor: theme.textSecondary },
    crueltyThumbOn: { backgroundColor: '#fff', alignSelf: 'flex-end' },

    miniSwitch: { width: 42, height: 26, borderRadius: SHAPE.full, backgroundColor: theme.background, borderWidth: 1, borderColor: theme.border, padding: 2, justifyContent: 'center' },
    miniSwitchOn: { backgroundColor: theme.accent, borderColor: theme.accent },
    miniThumb: { width: 20, height: 20, borderRadius: SHAPE.full, backgroundColor: theme.textSecondary },
    miniThumbOn: { backgroundColor: '#fff', alignSelf: 'flex-end' },

    targetRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 20, marginTop: 8 },
    adjustBtn: { width: 40, height: 40, borderRadius: SHAPE.full, backgroundColor: `${theme.accent}1A`, alignItems: 'center', justifyContent: 'center' },
    targetValueBox: { alignItems: 'center', minWidth: 60 },
    targetValue: { fontSize: 30, fontWeight: '800', color: theme.text, fontFamily: theme.fontFamily },
    targetUnit: { fontSize: 11, color: theme.textSecondary, fontWeight: '600' },

    modalContainer: { flex: 1, backgroundColor: theme.background },
    permissionContainer: { flex: 1, padding: 24, justifyContent: 'center' },
    permissionTitle: { fontSize: 22, fontWeight: '800', color: theme.text, marginBottom: 10, textAlign: 'center', fontFamily: theme.fontFamily },
    permissionText: { fontSize: 15, color: theme.textSecondary, textAlign: 'center', marginBottom: 28, lineHeight: 22 },

    fallbackContainer: { backgroundColor: theme.card, padding: 18, borderRadius: SHAPE.xl, marginTop: 24, marginBottom: 24 },
    fallbackTitle: { fontSize: 16, fontWeight: '800', color: theme.text, marginBottom: 4 },
    fallbackDesc: { fontSize: 13, color: theme.textSecondary, lineHeight: 19, marginBottom: 14 },

    cancelButton: { paddingVertical: 14, alignItems: 'center' },
    cancelButtonText: { color: theme.textSecondary, fontSize: 15, fontWeight: '700' },

    cameraWrapper: { flex: 1, backgroundColor: '#000' },
    cameraOverlay: { flex: 1, justifyContent: 'space-between', backgroundColor: 'rgba(0,0,0,0.3)' },
    cameraHeaderBox: { padding: 24, paddingTop: 60, alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.6)' },
    cameraHeaderText: { color: '#ffffff', fontSize: 20, fontWeight: '800', marginBottom: 8 },
    cameraSubHeaderText: { color: '#cbd5e1', fontSize: 14 },
    cameraFooter: { padding: 32, paddingBottom: 48, alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.6)' },

    pressed: { opacity: 0.7 },
  });
}
