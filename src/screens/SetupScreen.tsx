import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, Pressable, Modal, Linking } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useSettings } from '../context/SettingsContext';
import { useTheme } from '../context/ThemeContext';
import { ThemeConfig, SEMANTIC_COLORS } from '../theme/themes';

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

  const [permission, requestPermission] = useCameraPermissions();
  const [isScanning, setIsScanning] = useState(false);
  const [scanned, setScanned] = useState(false);
  const scanLockRef = useRef(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [manualBarcode, setManualBarcode] = useState('');
  const [retryCount, setRetryCount] = useState(0);

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
    if (scanLockRef.current) {
      return;
    }

    const trimmed = code.trim();

    if (!trimmed) {
      return;
    }

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
    setTimeout(() => {
      setShowSuccess(false);
    }, 4000);
  };

  const handleRetryCamera = () => {
    setRetryCount((prev) => prev + 1);
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

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.header}>Mission Setup</Text>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Wake-up Item</Text>
          <Text style={styles.cardDescription}>
            Name the physical item you will scan to turn off the alarm.
          </Text>
          <TextInput
            style={styles.input}
            value={settings.wakeItemName}
            onChangeText={(text) => updateSettings({ wakeItemName: text })}
            placeholder="e.g. Bathroom Toothpaste"
            placeholderTextColor={theme.textSecondary}
            accessibilityLabel="Wake-up item name"
          />
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Barcode Mission</Text>
          <Text style={styles.cardDescription}>
            Scan the barcode on your {settings.wakeItemName || 'item'} to wake up.
          </Text>

          {isBarcodeConfigured ? (
            <View style={styles.statusBox}>
              <Text style={styles.statusConfigured}>Barcode configured</Text>
              <Text style={styles.statusDetail}>Saved barcode ending in {lastFour}</Text>
            </View>
          ) : (
            <Text style={styles.statusMissing}>No barcode configured</Text>
          )}

          {showSuccess && (
            <View style={styles.successBadge}>
              <Text style={styles.successText}>Wake-up item barcode saved</Text>
            </View>
          )}

          <Pressable
            style={styles.scanButton}
            onPress={handleOpenScanner}
            accessibilityLabel="Scan Wake-up Item Barcode"
          >
            <Text style={styles.scanButtonText}>Scan Wake-up Item Barcode</Text>
          </Pressable>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Snooze PIN</Text>
          <Text style={styles.cardDescription}>
            Enter this 10-digit code during the alarm to snooze instead of scanning right away.
          </Text>

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
              <Text style={styles.successText}>Snooze PIN saved</Text>
            </View>
          )}

          <Pressable
            style={[styles.scanButton, pinDraft.length !== 10 && styles.scanButtonDisabled]}
            onPress={handleSavePin}
            disabled={pinDraft.length !== 10}
            accessibilityLabel="Save snooze PIN"
          >
            <Text style={styles.scanButtonText}>Save PIN</Text>
          </Pressable>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Movement Mission</Text>
          <Text style={styles.cardDescription}>
            Walk steps away from your bed to dismiss the alarm.
          </Text>

          <Pressable
            style={[styles.toggleButton, settings.movementEnabled && styles.toggleButtonActive]}
            onPress={() => updateSettings({ movementEnabled: !settings.movementEnabled })}
            accessibilityLabel={`Movement mission is ${settings.movementEnabled ? 'Enabled' : 'Disabled'}. Tap to toggle.`}
          >
            <Text style={[styles.toggleText, settings.movementEnabled && styles.toggleTextActive]}>
              {settings.movementEnabled ? 'Enabled' : 'Disabled'}
            </Text>
          </Pressable>

          {settings.movementEnabled && (
            <View style={styles.targetContainer}>
              <Text style={styles.targetLabel}>Movement target: {settings.movementTarget}</Text>
              <View style={styles.targetControls}>
                <Pressable
                  style={styles.adjustBtn}
                  onPress={() => adjustMovement(-1)}
                  accessibilityLabel="Decrease movement target"
                >
                  <Text style={styles.adjustBtnText}>-</Text>
                </Pressable>
                <Text style={styles.targetValue}>{settings.movementTarget}</Text>
                <Pressable
                  style={styles.adjustBtn}
                  onPress={() => adjustMovement(1)}
                  accessibilityLabel="Increase movement target"
                >
                  <Text style={styles.adjustBtnText}>+</Text>
                </Pressable>
              </View>
            </View>
          )}
        </View>
      </ScrollView>

      <Modal visible={isScanning} animationType="slide" transparent={false} onRequestClose={() => setIsScanning(false)}>
        <View style={[styles.modalContainer, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
          {!permission?.granted ? (
            <View style={styles.permissionContainer}>
              <Text style={styles.permissionTitle}>Camera Permission Required</Text>
              <Text style={styles.permissionText}>Camera access is needed to scan your wake-up item.</Text>

              <Pressable
                style={styles.blueButton}
                onPress={() => Linking.openSettings()}
                accessibilityLabel="Open app settings"
              >
                <Text style={styles.blueButtonText}>Open Settings</Text>
              </Pressable>

              <View style={styles.fallbackContainer}>
                <View style={styles.fallbackHeader}>
                  <Text style={styles.fallbackTitle}>Accessibility fallback</Text>
                  <Text style={styles.fallbackDesc}>
                    Use this only when camera access is unavailable. It should not be used to bypass the normal
                    physical scanning mission.
                  </Text>
                </View>
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
                  style={[styles.scanButton, !manualBarcode.trim() && styles.scanButtonDisabled]}
                  onPress={handleManualSubmit}
                  disabled={!manualBarcode.trim()}
                  accessibilityLabel="Save manual barcode"
                >
                  <Text style={styles.scanButtonText}>Save Manual Barcode</Text>
                </Pressable>
              </View>

              <View style={styles.modalFooter}>
                <Pressable
                  style={styles.cancelButton}
                  onPress={() => setIsScanning(false)}
                  accessibilityLabel="Cancel barcode scanning"
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </Pressable>
              </View>
            </View>
          ) : (
            <View style={styles.cameraWrapper}>
              <CameraView
                style={StyleSheet.absoluteFill}
                facing="back"
                barcodeScannerSettings={{
                  barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e', 'code128', 'code39', 'qr'],
                }}
                onBarcodeScanned={scanned ? undefined : (result) => handleBarcodeDetected(result.data)}
              />

              <View style={styles.cameraOverlay} pointerEvents="box-none">
                <View style={styles.cameraHeaderBox}>
                  <Text style={styles.cameraHeaderText}>Scan {settings.wakeItemName}</Text>
                  <Text style={styles.cameraSubHeaderText}>Position the barcode in the center</Text>
                </View>

                <View style={styles.cameraFooter}>
                  <Pressable
                    style={styles.cancelButton}
                    onPress={() => setIsScanning(false)}
                    accessibilityLabel="Cancel barcode scanning"
                  >
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
    scrollContent: { paddingHorizontal: 16, paddingBottom: 40 },
    header: { fontSize: 32, fontWeight: 'bold', color: theme.text, marginVertical: 24 },
    card: { backgroundColor: theme.card, borderRadius: 24, padding: 24, marginBottom: 16 },
    cardTitle: { fontSize: 20, fontWeight: 'bold', color: theme.text, marginBottom: 8 },
    cardDescription: { fontSize: 14, color: theme.textSecondary, marginBottom: 16, lineHeight: 20 },
    input: { backgroundColor: theme.background, color: theme.text, padding: 16, borderRadius: 12, fontSize: 16, borderWidth: 1, borderColor: theme.border },

    statusBox: { marginBottom: 16 },
    statusConfigured: { color: theme.accent, fontSize: 16, fontWeight: 'bold', marginBottom: 4 },
    statusDetail: { color: theme.textSecondary, fontSize: 14 },
    statusMissing: { color: SEMANTIC_COLORS.error, fontSize: 14, fontWeight: 'bold', marginBottom: 12 },

    successBadge: { backgroundColor: SEMANTIC_COLORS.success, padding: 12, borderRadius: 12, marginBottom: 16, alignItems: 'center' },
    successText: { color: '#000000', fontWeight: 'bold', fontSize: 14 },

    scanButton: { backgroundColor: theme.accent, borderRadius: 16, paddingVertical: 16, alignItems: 'center', marginTop: 8 },
    scanButtonDisabled: { opacity: 0.5 },
    scanButtonText: { color: theme.accentText, fontSize: 16, fontWeight: 'bold' },

    toggleButton: { alignSelf: 'flex-start', backgroundColor: theme.background, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20, borderWidth: 1, borderColor: theme.border },
    toggleButtonActive: { backgroundColor: theme.accent, borderColor: theme.accent },
    toggleText: { color: theme.textSecondary, fontSize: 16, fontWeight: 'bold' },
    toggleTextActive: { color: theme.accentText },

    targetContainer: { marginTop: 24, padding: 16, backgroundColor: theme.background, borderRadius: 16 },
    targetLabel: { color: theme.textSecondary, fontSize: 14, marginBottom: 12, textAlign: 'center' },
    targetControls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
    adjustBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: theme.card, alignItems: 'center', justifyContent: 'center' },
    adjustBtnText: { color: theme.accent, fontSize: 24, fontWeight: 'bold' },
    targetValue: { color: theme.text, fontSize: 28, fontWeight: 'bold', marginHorizontal: 24, width: 40, textAlign: 'center' },

    modalContainer: { flex: 1, backgroundColor: theme.background },
    permissionContainer: { flex: 1, padding: 24, justifyContent: 'center' },
    permissionTitle: { fontSize: 24, fontWeight: 'bold', color: theme.text, marginBottom: 12, textAlign: 'center' },
    permissionText: { fontSize: 16, color: theme.textSecondary, textAlign: 'center', marginBottom: 32, lineHeight: 24 },
    blueButton: { backgroundColor: theme.accent, paddingVertical: 16, borderRadius: 16, alignItems: 'center', marginBottom: 40 },
    blueButtonText: { color: theme.accentText, fontSize: 16, fontWeight: 'bold' },

    fallbackContainer: { backgroundColor: theme.card, padding: 20, borderRadius: 20, marginBottom: 40 },
    fallbackHeader: { marginBottom: 16 },
    fallbackTitle: { fontSize: 18, fontWeight: 'bold', color: theme.text, marginBottom: 4 },
    fallbackDesc: { fontSize: 14, color: theme.textSecondary, lineHeight: 20 },

    modalFooter: { marginTop: 'auto' },
    cancelButton: { paddingVertical: 16, alignItems: 'center' },
    cancelButtonText: { color: theme.textSecondary, fontSize: 16, fontWeight: 'bold' },

    cameraWrapper: { flex: 1, backgroundColor: '#000' },
    cameraOverlay: { flex: 1, justifyContent: 'space-between', backgroundColor: 'rgba(0,0,0,0.3)' },
    cameraHeaderBox: { padding: 24, paddingTop: 60, alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.6)' },
    cameraHeaderText: { color: '#ffffff', fontSize: 20, fontWeight: 'bold', marginBottom: 8 },
    cameraSubHeaderText: { color: theme.textSecondary, fontSize: 14 },
    cameraFooter: { padding: 32, paddingBottom: 48, alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.6)' },
  });
}
