import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, Modal } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Accelerometer } from 'expo-sensors';
import { useAudioPlayer } from 'expo-audio';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useSettings } from '../context/SettingsContext';
import { useWakeFlow } from '../context/WakeFlowContext';
import { useTheme } from '../context/ThemeContext';
import { ThemeConfig, SEMANTIC_COLORS } from '../theme/themes';

export default function RingingScreen() {
  const insets = useSafeAreaInsets();
  const { settings } = useSettings();
  const { theme } = useTheme();
  const {
    wakeFlow,
    incrementMovement,
    dismissWake,
    startSnooze,
    decrementSnooze,
    returnToRingingFromSnooze,
  } = useWakeFlow();

  const styles = createStyles(theme);

  const [currentTime, setCurrentTime] = useState(new Date());
  const [sensorAvailable, setSensorAvailable] = useState(true);

  const [permission, requestPermission] = useCameraPermissions();
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [wrongBarcodeMessage, setWrongBarcodeMessage] = useState<string | null>(null);
  const scanLockRef = useRef(false);

  const [isKeypadOpen, setIsKeypadOpen] = useState(false);
  const [enteredPin, setEnteredPin] = useState('');
  const [pinError, setPinError] = useState(false);

  const lastAccelRef = useRef<{ x: number; y: number; z: number } | null>(null);
  const lastMovementTimeRef = useRef<number>(0);
  const progressRef = useRef(wakeFlow.movementProgress);

  const player = useAudioPlayer(require('../../assets/alarm-tone.mp3'));

  useEffect(() => {
    progressRef.current = wakeFlow.movementProgress;
  }, [wakeFlow.movementProgress]);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    try {
      if (wakeFlow.status === 'ringing') {
        player.loop = true;
        player.seekTo(0);
        player.play();
      } else {
        player.pause();
      }
    } catch (error) {
      // Player may already be released if the screen is unmounting. Safe to ignore.
    }
  }, [wakeFlow.status]);

  useEffect(() => {
    if (wakeFlow.status !== 'ringing') return;

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);

    const interval = setInterval(() => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    }, 2800);

    return () => clearInterval(interval);
  }, [wakeFlow.status]);

  const isMovementComplete = !settings.movementEnabled || wakeFlow.movementProgress >= settings.movementTarget;

  useEffect(() => {
    let subscription: { remove: () => void } | null = null;
    let isActive = true;

    if (wakeFlow.status !== 'ringing' || !settings.movementEnabled) {
      return;
    }

    const setup = async () => {
      const available = await Accelerometer.isAvailableAsync();
      if (!isActive) return;
      setSensorAvailable(available);
      if (!available) return;

      Accelerometer.setUpdateInterval(120);
      subscription = Accelerometer.addListener((data: { x: number; y: number; z: number }) => {
        const { x, y, z } = data;
        const last = lastAccelRef.current;

        if (last) {
          const delta = Math.abs(x - last.x) + Math.abs(y - last.y) + Math.abs(z - last.z);
          const now = Date.now();

          if (delta > 0.7 && now - lastMovementTimeRef.current > 200 && progressRef.current < settings.movementTarget) {
            lastMovementTimeRef.current = now;
            incrementMovement(settings.movementTarget);
          }
        }

        lastAccelRef.current = { x, y, z };
      });
    };

    setup();

    return () => {
      isActive = false;
      if (subscription) {
        subscription.remove();
      }
    };
  }, [wakeFlow.status, settings.movementEnabled, settings.movementTarget]);

  useEffect(() => {
    if (wakeFlow.status !== 'snoozed') return;

    const timer = setInterval(() => {
      decrementSnooze();
    }, 1000);

    return () => clearInterval(timer);
  }, [wakeFlow.status]);

  useEffect(() => {
    if (wakeFlow.status === 'snoozed' && wakeFlow.snoozeSecondsRemaining === 0) {
      returnToRingingFromSnooze();
    }
  }, [wakeFlow.status, wakeFlow.snoozeSecondsRemaining]);

  const handleOpenDisarmScanner = async () => {
    if (wakeFlow.status === 'ringing' && !isMovementComplete) return;

    scanLockRef.current = false;
    setWrongBarcodeMessage(null);

    if (!permission?.granted) {
      const result = await requestPermission();
      if (!result.granted) {
        setIsScannerOpen(true);
        return;
      }
    }

    setIsScannerOpen(true);
  };

  const handleDisarmBarcodeScanned = (result: { data: string }) => {
    if (scanLockRef.current) return;

    const scanned = result.data.trim();
    if (!scanned) return;

    if (scanned === settings.wakeBarcode) {
      scanLockRef.current = true;
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setIsScannerOpen(false);
      dismissWake();
      return;
    }

    scanLockRef.current = true;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    setWrongBarcodeMessage(`Wrong item. Scan your ${settings.wakeItemName || 'registered wake-up item'}.`);
    setTimeout(() => {
      scanLockRef.current = false;
    }, 1500);
  };

  const handleKeyPress = (digit: string) => {
    if (enteredPin.length < 10) {
      setEnteredPin((prev) => prev + digit);
      setPinError(false);
    }
  };

  const handleClearPin = () => {
    setEnteredPin('');
    setPinError(false);
  };

  const handleConfirmPin = () => {
    if (enteredPin === settings.snoozePin) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setEnteredPin('');
      setPinError(false);
      setIsKeypadOpen(false);
      startSnooze();
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setPinError(true);
      setEnteredPin('');
    }
  };

  const timeFormatted = currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
  const minutes = Math.floor(wakeFlow.snoozeSecondsRemaining / 60);
  const seconds = wakeFlow.snoozeSecondsRemaining % 60;
  const snoozeTimeFormatted = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  return (
    <LinearGradient colors={theme.ringingGradient} style={styles.gradientContainer}>
      <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        {wakeFlow.status === 'ringing' ? (
          <>
            <View style={styles.topSection}>
              <View style={styles.statusPill}>
                <Text style={styles.statusPillText}>Alarm Active</Text>
              </View>
              <Text style={styles.clockText}>{timeFormatted}</Text>
              <Text style={styles.subText}>
                Scan <Text style={styles.subTextBold}>{settings.wakeItemName || 'your registered item'}</Text> to
                disarm
              </Text>
            </View>

            <View style={styles.middleSection}>
              {settings.movementEnabled && (
                <View style={styles.card}>
                  <Text style={styles.cardTitle}>Physical Movement</Text>

                  {sensorAvailable ? (
                    <>
                      <Text style={styles.cardSubtitle}>
                        {wakeFlow.movementProgress} / {settings.movementTarget}
                      </Text>
                      <View style={styles.progressTrack}>
                        <View
                          style={[
                            styles.progressFill,
                            { width: `${Math.min(100, (wakeFlow.movementProgress / settings.movementTarget) * 100)}%` },
                          ]}
                        />
                      </View>
                    </>
                  ) : (
                    <>
                      <Text style={styles.cardSubtitle}>Motion sensor unavailable. Use manual fallback.</Text>
                      <Pressable
                        style={styles.fallbackButton}
                        onPress={() => incrementMovement(settings.movementTarget)}
                        accessibilityLabel="Simulate movement, sensor unavailable"
                      >
                        <Text style={styles.fallbackButtonText}>
                          Tap to simulate movement ({wakeFlow.movementProgress}/{settings.movementTarget})
                        </Text>
                      </Pressable>
                    </>
                  )}
                </View>
              )}

              {wrongBarcodeMessage && (
                <View style={styles.errorBanner}>
                  <Text style={styles.errorBannerText}>{wrongBarcodeMessage}</Text>
                </View>
              )}
            </View>

            <View style={styles.bottomSection}>
              <Pressable
                style={[styles.scanButton, !isMovementComplete && styles.scanButtonDisabled]}
                onPress={handleOpenDisarmScanner}
                disabled={!isMovementComplete}
                accessibilityLabel="Scan to Disarm"
              >
                <Text style={styles.scanButtonText}>
                  {isMovementComplete ? 'Scan to Disarm' : 'Complete Movement First'}
                </Text>
              </Pressable>

              <Pressable
                style={styles.snoozeButton}
                onPress={() => setIsKeypadOpen(true)}
                accessibilityLabel="Snooze with PIN"
              >
                <Text style={styles.snoozeButtonText}>Snooze with PIN</Text>
              </Pressable>

              <Pressable
                style={styles.exitPreviewButton}
                onPress={dismissWake}
                accessibilityLabel="Exit preview, testing only"
              >
                <Text style={styles.exitPreviewButtonText}>Exit Preview (Testing Only)</Text>
              </Pressable>
            </View>
          </>
        ) : (
          <>
            <View style={styles.topSection}>
              <View style={[styles.statusPill, styles.statusPillSnooze]}>
                <Text style={styles.statusPillText}>Snoozed</Text>
              </View>
              <Text style={styles.snoozeCountdownText}>{snoozeTimeFormatted}</Text>
              <Text style={styles.subText}>Alarm will ring again in</Text>
            </View>

            <View style={styles.middleSection}>
              {wrongBarcodeMessage && (
                <View style={styles.errorBanner}>
                  <Text style={styles.errorBannerText}>{wrongBarcodeMessage}</Text>
                </View>
              )}
            </View>

            <View style={styles.bottomSection}>
              <Pressable
                style={styles.scanButton}
                onPress={handleOpenDisarmScanner}
                accessibilityLabel="Scan to Disarm Now"
              >
                <Text style={styles.scanButtonText}>Scan to Disarm Now</Text>
              </Pressable>
            </View>
          </>
        )}

        <Modal
          visible={isScannerOpen}
          animationType="slide"
          transparent={false}
          onRequestClose={() => setIsScannerOpen(false)}
        >
          <View style={[styles.modalContainer, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
            {!permission?.granted ? (
              <View style={styles.permissionContainer}>
                <Text style={styles.permissionTitle}>Camera Permission Required</Text>
                <Text style={styles.permissionText}>Camera access is needed to scan your wake-up item.</Text>

                <View style={styles.modalFooter}>
                  <Pressable
                    style={styles.cancelButton}
                    onPress={() => setIsScannerOpen(false)}
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
                  onBarcodeScanned={handleDisarmBarcodeScanned}
                />

                <View style={styles.cameraOverlay} pointerEvents="box-none">
                  <View style={styles.cameraHeaderBox}>
                    <Text style={styles.cameraHeaderText}>Scan {settings.wakeItemName}</Text>
                    <Text style={styles.cameraSubHeaderText}>Position the barcode in the center</Text>
                  </View>

                  <View style={styles.cameraFooter}>
                    <Pressable
                      style={styles.cancelButton}
                      onPress={() => setIsScannerOpen(false)}
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

        <Modal
          visible={isKeypadOpen}
          animationType="fade"
          transparent={true}
          onRequestClose={() => setIsKeypadOpen(false)}
        >
          <View style={styles.keypadOverlay}>
            <View style={styles.keypadContainer}>
              <Text style={styles.keypadTitle}>Snooze PIN</Text>

              <View style={[styles.pinDisplay, pinError && styles.pinDisplayError]}>
                <Text style={styles.pinDisplayText}>{enteredPin.padEnd(10, '·')}</Text>
              </View>

              {pinError && <Text style={styles.pinErrorText}>Incorrect PIN. Please try again.</Text>}

              <View style={styles.keypadGrid}>
                {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
                  <Pressable
                    key={digit}
                    style={styles.keypadKey}
                    onPress={() => handleKeyPress(digit)}
                    accessibilityLabel={`Digit ${digit}`}
                  >
                    <Text style={styles.keypadKeyText}>{digit}</Text>
                  </Pressable>
                ))}

                <Pressable style={styles.keypadKeyClear} onPress={handleClearPin} accessibilityLabel="Clear PIN">
                  <Text style={styles.keypadKeyClearText}>CLEAR</Text>
                </Pressable>

                <Pressable style={styles.keypadKey} onPress={() => handleKeyPress('0')} accessibilityLabel="Digit 0">
                  <Text style={styles.keypadKeyText}>0</Text>
                </Pressable>

                <Pressable
                  style={[styles.keypadKeyConfirm, enteredPin.length !== 10 && styles.keypadKeyConfirmDisabled]}
                  onPress={handleConfirmPin}
                  disabled={enteredPin.length !== 10}
                  accessibilityLabel="Confirm PIN"
                >
                  <Text style={styles.keypadKeyConfirmText}>OK</Text>
                </Pressable>
              </View>

              <Pressable
                style={styles.keypadCancel}
                onPress={() => {
                  setIsKeypadOpen(false);
                  setEnteredPin('');
                  setPinError(false);
                }}
                accessibilityLabel="Cancel snooze"
              >
                <Text style={styles.keypadCancelText}>Cancel</Text>
              </Pressable>
            </View>
          </View>
        </Modal>
      </View>
    </LinearGradient>
  );
}

function createStyles(theme: ThemeConfig) {
  const cardBg = `${theme.card}E6`;
  return StyleSheet.create({
    gradientContainer: { flex: 1 },
    container: { flex: 1, paddingHorizontal: 20 },
    topSection: { alignItems: 'center', paddingTop: 24 },
    statusPill: { backgroundColor: cardBg, paddingHorizontal: 16, paddingVertical: 6, borderRadius: 20, marginBottom: 16 },
    statusPillSnooze: { borderWidth: 1, borderColor: theme.accent },
    statusPillText: { color: theme.accent, fontWeight: 'bold', fontSize: 13 },
    clockText: { fontSize: 72, fontWeight: 'bold', color: theme.text, letterSpacing: -2 },
    snoozeCountdownText: { fontSize: 72, fontWeight: 'bold', color: theme.accent, letterSpacing: -2 },
    subText: { fontSize: 15, color: theme.textSecondary, marginTop: 8, textAlign: 'center' },
    subTextBold: { color: theme.accent, fontWeight: 'bold' },
    middleSection: { flex: 1, justifyContent: 'center', gap: 16 },
    card: { backgroundColor: cardBg, borderRadius: 24, padding: 20 },
    cardTitle: { color: theme.text, fontSize: 16, fontWeight: 'bold', marginBottom: 8 },
    cardSubtitle: { color: theme.textSecondary, fontSize: 14, marginBottom: 12 },
    progressTrack: { height: 10, backgroundColor: theme.background, borderRadius: 5, overflow: 'hidden' },
    progressFill: { height: 10, backgroundColor: theme.accent },
    fallbackButton: { backgroundColor: theme.background, borderRadius: 16, paddingVertical: 14, alignItems: 'center' },
    fallbackButtonText: { color: theme.accent, fontWeight: 'bold' },
    errorBanner: { backgroundColor: '#3a0f14', borderColor: SEMANTIC_COLORS.error, borderWidth: 1, borderRadius: 16, padding: 14 },
    errorBannerText: { color: SEMANTIC_COLORS.error, fontWeight: 'bold', textAlign: 'center' },
    bottomSection: { paddingBottom: 12, gap: 10 },
    scanButton: { backgroundColor: theme.accent, borderRadius: 20, paddingVertical: 18, alignItems: 'center' },
    scanButtonDisabled: { backgroundColor: '#333333', opacity: 0.7 },
    scanButtonText: { color: theme.accentText, fontSize: 16, fontWeight: 'bold' },
    snoozeButton: { backgroundColor: cardBg, borderRadius: 16, paddingVertical: 14, alignItems: 'center' },
    snoozeButtonText: { color: theme.accent, fontWeight: 'bold' },
    exitPreviewButton: { paddingVertical: 10, alignItems: 'center' },
    exitPreviewButtonText: { color: theme.textSecondary, fontSize: 12 },

    modalContainer: { flex: 1, backgroundColor: theme.background },
    permissionContainer: { flex: 1, padding: 24, justifyContent: 'center' },
    permissionTitle: { fontSize: 24, fontWeight: 'bold', color: theme.text, marginBottom: 12, textAlign: 'center' },
    permissionText: { fontSize: 16, color: theme.textSecondary, textAlign: 'center', marginBottom: 32, lineHeight: 24 },
    modalFooter: { marginTop: 'auto' },
    cancelButton: { paddingVertical: 16, alignItems: 'center' },
    cancelButtonText: { color: theme.textSecondary, fontSize: 16, fontWeight: 'bold' },

    cameraWrapper: { flex: 1, backgroundColor: '#000' },
    cameraOverlay: { flex: 1, justifyContent: 'space-between', backgroundColor: 'rgba(0,0,0,0.3)' },
    cameraHeaderBox: { padding: 24, paddingTop: 60, alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.6)' },
    cameraHeaderText: { color: '#ffffff', fontSize: 20, fontWeight: 'bold', marginBottom: 8 },
    cameraSubHeaderText: { color: theme.textSecondary, fontSize: 14 },
    cameraFooter: { padding: 32, paddingBottom: 48, alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.6)' },

    keypadOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'center', padding: 24 },
    keypadContainer: { backgroundColor: theme.card, borderRadius: 24, padding: 24 },
    keypadTitle: { color: theme.accent, fontWeight: 'bold', fontSize: 14, textAlign: 'center', marginBottom: 12, textTransform: 'uppercase' },
    pinDisplay: { backgroundColor: '#000', borderRadius: 14, paddingVertical: 12, marginBottom: 8 },
    pinDisplayError: { borderColor: SEMANTIC_COLORS.error, borderWidth: 1 },
    pinDisplayText: { color: theme.accent, textAlign: 'center', fontSize: 18, fontWeight: 'bold', letterSpacing: 4 },
    pinErrorText: { color: SEMANTIC_COLORS.error, textAlign: 'center', marginBottom: 8, fontSize: 12, fontWeight: 'bold' },
    keypadGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
    keypadKey: { width: '30%', height: 52, borderRadius: 14, backgroundColor: '#222', alignItems: 'center', justifyContent: 'center' },
    keypadKeyText: { color: theme.text, fontSize: 18, fontWeight: 'bold' },
    keypadKeyClear: { width: '30%', height: 52, borderRadius: 14, backgroundColor: '#1a1a1a', alignItems: 'center', justifyContent: 'center' },
    keypadKeyClearText: { color: theme.textSecondary, fontSize: 11, fontWeight: 'bold' },
    keypadKeyConfirm: { width: '30%', height: 52, borderRadius: 14, backgroundColor: theme.accent, alignItems: 'center', justifyContent: 'center' },
    keypadKeyConfirmDisabled: { opacity: 0.3 },
    keypadKeyConfirmText: { color: theme.accentText, fontSize: 14, fontWeight: 'bold' },
    keypadCancel: { marginTop: 16, alignItems: 'center' },
    keypadCancelText: { color: theme.textSecondary, fontSize: 14, fontWeight: 'bold' },
  });
}
