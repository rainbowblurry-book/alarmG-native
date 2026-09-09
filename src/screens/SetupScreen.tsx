import React, { useRef, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, Pressable, Modal, Linking, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { colors } from '../theme/colors';
import { useSettings } from '../context/SettingsContext';

export default function SetupScreen() {
  const insets = useSafeAreaInsets();
  const { settings, updateSettings } = useSettings();
  
  const [permission, requestPermission] = useCameraPermissions();
  const [isScanning, setIsScanning] = useState(false);
  const [isRequestingPermission, setIsRequestingPermission] = useState(false);
  const [scanned, setScanned] = useState(false);
  const scanLockRef = useRef(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [manualBarcode, setManualBarcode] = useState('');

  const isBarcodeConfigured = Boolean(settings.wakeBarcode && settings.wakeBarcode.length > 0);
  const lastFour = isBarcodeConfigured ? settings.wakeBarcode.slice(-4) : '';

  const handleOpenScanner = async () => {
  scanLockRef.current = false;
  setScanned(false);
  setIsScanning(true);

  if (!permission?.granted) {
    setIsRequestingPermission(true);

    try {
      await requestPermission();
    } finally {
      setIsRequestingPermission(false);
    }
  }
};

  const handleBarcodeScanned = (scanningResult: {
  type: string;
  data: string;
}) => {
  if (scanLockRef.current) {
    return;
  }

  const barcode = scanningResult.data.trim();

  if (!barcode) {
    return;
  }

  scanLockRef.current = true;
  setScanned(true);
  updateSettings({ wakeBarcode: barcode });
  setIsScanning(false);
  triggerSuccess();
};

  const handleManualSubmit = () => {
    if (!manualBarcode.trim()) return;
    updateSettings({ wakeBarcode: manualBarcode.trim() });
    setManualBarcode('');
    setIsScanning(false);
    triggerSuccess();
  };

  const triggerSuccess = () => {
    setShowSuccess(true);
    setTimeout(() => {
      setShowSuccess(false);
    }, 4000);
  };

  const adjustMovement = (delta: number) => {
    let newTarget = settings.movementTarget + delta;
    if (newTarget < 5) newTarget = 5;
    if (newTarget > 50) newTarget = 50;
    updateSettings({ movementTarget: newTarget });
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
            placeholderTextColor={colors.textSecondary}
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
          {isRequestingPermission ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.blueAccent} />
              <Text style={styles.loadingText}>Requesting camera access…</Text>
            </View>
          ) : !permission?.granted ? (
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
                  <Text style={styles.fallbackDesc}>Use this only when camera access is unavailable. It should not be used to bypass the normal physical scanning mission.</Text>
                </View>
                <TextInput
                  style={styles.input}
                  value={manualBarcode}
                  onChangeText={setManualBarcode}
                  placeholder="Enter barcode number manually"
                  placeholderTextColor={colors.textSecondary}
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
                onBarcodeScanned={scanned ? undefined : handleBarcodeScanned}
              >
                <View style={styles.cameraOverlay}>
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
              </CameraView>
            </View>
          )}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scrollContent: { paddingHorizontal: 16, paddingBottom: 40 },
  header: { fontSize: 32, fontWeight: 'bold', color: colors.text, marginVertical: 24 },
  card: { backgroundColor: colors.card, borderRadius: 24, padding: 24, marginBottom: 16 },
  cardTitle: { fontSize: 20, fontWeight: 'bold', color: colors.text, marginBottom: 8 },
  cardDescription: { fontSize: 14, color: colors.textSecondary, marginBottom: 16, lineHeight: 20 },
  input: { backgroundColor: colors.background, color: colors.text, padding: 16, borderRadius: 12, fontSize: 16, borderWidth: 1, borderColor: '#333' },
  
  statusBox: { marginBottom: 16 },
  statusConfigured: { color: colors.blueAccent, fontSize: 16, fontWeight: 'bold', marginBottom: 4 },
  statusDetail: { color: colors.textSecondary, fontSize: 14 },
  statusMissing: { color: colors.roseAccent, fontSize: 16, fontWeight: 'bold', marginBottom: 16 },
  
  successBadge: { backgroundColor: colors.emeraldAccent, padding: 12, borderRadius: 12, marginBottom: 16, alignItems: 'center' },
  successText: { color: '#000000', fontWeight: 'bold', fontSize: 14 },
  
  scanButton: { backgroundColor: colors.amberAccent, borderRadius: 16, paddingVertical: 16, alignItems: 'center', marginTop: 8 },
  scanButtonDisabled: { opacity: 0.5 },
  scanButtonText: { color: '#000000', fontSize: 16, fontWeight: 'bold' },

  toggleButton: { alignSelf: 'flex-start', backgroundColor: colors.background, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20, borderWidth: 1, borderColor: '#333' },
  toggleButtonActive: { backgroundColor: colors.blueAccent, borderColor: colors.blueAccent },
  toggleText: { color: colors.textSecondary, fontSize: 16, fontWeight: 'bold' },
  toggleTextActive: { color: '#ffffff' },

  targetContainer: { marginTop: 24, padding: 16, backgroundColor: colors.background, borderRadius: 16 },
  targetLabel: { color: colors.textSecondary, fontSize: 14, marginBottom: 12, textAlign: 'center' },
  targetControls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  adjustBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center' },
  adjustBtnText: { color: colors.blueAccent, fontSize: 24, fontWeight: 'bold' },
  targetValue: { color: colors.text, fontSize: 28, fontWeight: 'bold', marginHorizontal: 24, width: 40, textAlign: 'center' },

  modalContainer: { flex: 1, backgroundColor: colors.background },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: colors.textSecondary, fontSize: 16, marginTop: 16 },
  permissionContainer: { flex: 1, padding: 24, justifyContent: 'center' },
  permissionTitle: { fontSize: 24, fontWeight: 'bold', color: colors.text, marginBottom: 12, textAlign: 'center' },
  permissionText: { fontSize: 16, color: colors.textSecondary, textAlign: 'center', marginBottom: 32, lineHeight: 24 },
  blueButton: { backgroundColor: colors.blueAccent, paddingVertical: 16, borderRadius: 16, alignItems: 'center', marginBottom: 40 },
  blueButtonText: { color: '#ffffff', fontSize: 16, fontWeight: 'bold' },

  fallbackContainer: { backgroundColor: colors.card, padding: 20, borderRadius: 20, marginBottom: 40 },
  fallbackHeader: { marginBottom: 16 },
  fallbackTitle: { fontSize: 18, fontWeight: 'bold', color: colors.text, marginBottom: 4 },
  fallbackDesc: { fontSize: 14, color: colors.textSecondary, lineHeight: 20 },
  
  modalFooter: { marginTop: 'auto' },
  cancelButton: { paddingVertical: 16, alignItems: 'center' },
  cancelButtonText: { color: colors.textSecondary, fontSize: 16, fontWeight: 'bold' },

  cameraWrapper: { flex: 1, backgroundColor: '#000' },
  cameraOverlay: { flex: 1, justifyContent: 'space-between', backgroundColor: 'rgba(0,0,0,0.3)' },
  cameraHeaderBox: { padding: 24, paddingTop: 60, alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.6)' },
  cameraHeaderText: { color: '#ffffff', fontSize: 20, fontWeight: 'bold', marginBottom: 8 },
  cameraSubHeaderText: { color: colors.textSecondary, fontSize: 14 },
  cameraFooter: { padding: 32, paddingBottom: 48, alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.6)' }
});