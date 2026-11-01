import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, Modal, BackHandler, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCameraPermissions } from 'expo-camera';
import { Accelerometer } from 'expo-sensors';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { useSettings } from '../context/SettingsContext';
import { useWakeFlow, snoozeDurationSeconds } from '../context/WakeFlowContext';
import { useDesign } from '../context/DesignContext';
import { MoveProgress, RingBackdrop } from '../components/RingVisuals';
import ScannerModal from '../components/ScannerModal';

/**
 * Shown whenever the native engine is ringing or snoozed. Sound, vibration,
 * volume, wake-up and lock-screen display are all handled natively
 * (modules/clockguard-alarm), so closing or hiding this screen never silences
 * the alarm. This screen only runs the mission and then calls disarm()/snooze().
 *
 * UI redesign: only the presentation changed. The mission logic below (movement
 * gate, barcode check, PIN check, Back blocking) is the same as before.
 * Every design uses its dim `ring` palette here: no white, no red.
 */
export default function RingingScreen() {
  const insets = useSafeAreaInsets();
  const { settings } = useSettings();
  const { pack } = useDesign();
  const r = pack.ring;
  const f = pack.fonts;
  const retro = pack.chrome === 'bevel';
  const { alarm, movementProgress, incrementMovement, snooze, disarm, stopTestRing } = useWakeFlow();

  const isRinging = alarm.state === 'ringing';

  const [now, setNow] = useState(() => Date.now());
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
  const progressRef = useRef(movementProgress);
  progressRef.current = movementProgress;

  // Clock + snooze countdown tick.
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Back gesture must not escape a ringing alarm.
  useEffect(() => {
    if (!isRinging) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => true);
    return () => sub.remove();
  }, [isRinging]);

  // A ringing alarm can't be snoozed from an open keypad that was left over from before.
  useEffect(() => {
    if (!isRinging) {
      setIsKeypadOpen(false);
      setEnteredPin('');
    }
  }, [isRinging]);

  const isMovementComplete = !settings.movementEnabled || movementProgress >= settings.movementTarget;

  useEffect(() => {
    if (!isRinging || !settings.movementEnabled) return;
    let subscription: { remove: () => void } | null = null;
    let isActive = true;

    (async () => {
      const available = await Accelerometer.isAvailableAsync();
      if (!isActive) return;
      setSensorAvailable(available);
      if (!available) return;

      Accelerometer.setUpdateInterval(120);
      subscription = Accelerometer.addListener(({ x, y, z }) => {
        const last = lastAccelRef.current;
        if (last) {
          const delta = Math.abs(x - last.x) + Math.abs(y - last.y) + Math.abs(z - last.z);
          const t = Date.now();
          if (delta > 0.7 && t - lastMovementTimeRef.current > 200 && progressRef.current < settings.movementTarget) {
            lastMovementTimeRef.current = t;
            incrementMovement(settings.movementTarget);
          }
        }
        lastAccelRef.current = { x, y, z };
      });
    })();

    return () => {
      isActive = false;
      subscription?.remove();
    };
  }, [isRinging, settings.movementEnabled, settings.movementTarget]);

  const handleOpenDisarmScanner = async () => {
    if (isRinging && !isMovementComplete) return;
    scanLockRef.current = false;
    setWrongBarcodeMessage(null);
    if (!permission?.granted) {
      await requestPermission();
    }
    setIsScannerOpen(true);
  };

  const handleDisarmBarcodeScanned = (data: string) => {
    if (scanLockRef.current) return;
    const scanned = data.trim();
    if (!scanned) return;

    scanLockRef.current = true;
    if (settings.wakeBarcode && scanned === settings.wakeBarcode) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setIsScannerOpen(false);
      disarm();
      return;
    }

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

  const nextSnoozeSeconds = snoozeDurationSeconds(alarm.snoozeCount, settings.crueltyModeEnabled, settings.snoozeMinutes);

  const handleConfirmPin = () => {
    if (settings.snoozePin && enteredPin === settings.snoozePin) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setEnteredPin('');
      setPinError(false);
      setIsKeypadOpen(false);
      const error = snooze(nextSnoozeSeconds);
      if (error) Alert.alert('Not snoozed', error);
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setPinError(true);
      setEnteredPin('');
    }
  };

  const timeFormatted = new Date(now).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
  const snoozeLeft = Math.max(0, Math.round((alarm.snoozeUntil - now) / 1000));
  const snoozeTimeFormatted = `${String(Math.floor(snoozeLeft / 60)).padStart(2, '0')}:${String(snoozeLeft % 60).padStart(2, '0')}`;
  const snoozeLabel = nextSnoozeSeconds % 60 === 0 ? `${nextSnoozeSeconds / 60} min` : `${nextSnoozeSeconds}s`;
  const itemName = settings.wakeItemName || 'your item';
  const progress = settings.movementEnabled ? Math.min(1, movementProgress / settings.movementTarget) : 1;

  // Per-design text casing on the ringing screen (Signal speaks like a terminal).
  const say = (s: string) => (retro ? s.toUpperCase() : s);
  const hand = pack.chrome === 'sketch';
  const T = (size: number) => ({ fontFamily: retro ? f.display : f.body, fontSize: retro ? size * 1.35 : hand ? size * 1.25 : size });
  // Big clock size per design (wide Unbounded needs less, handwritten Caveat more).
  const clockSize = retro ? 128 : hand ? 132 : pack.id === 'lumen' ? 70 : 96;

  const mainButton = (label: string, onPress: () => void, a11y: string) => (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={a11y}
      style={({ pressed }) => [
        styles.mainButton,
        retro
          ? { borderWidth: 2, borderColor: r.accent, backgroundColor: pressed ? r.track : 'transparent', borderRadius: 0 }
          : { backgroundColor: r.accent, opacity: pressed ? 0.8 : 1, borderRadius: pack.radius.control === 999 ? 32 : Math.max(pack.radius.control, 6) },
      ]}
    >
      <Ionicons name={retro ? 'scan-sharp' : 'scan'} size={20} color={retro ? r.accent : r.onAccent} />
      <Text style={{ color: retro ? r.accent : r.onAccent, fontFamily: retro ? f.display : f.strong, fontSize: retro ? 26 : hand ? 28 : 17 }}>{label}</Text>
    </Pressable>
  );

  return (
    <View style={{ flex: 1, backgroundColor: r.bg }}>
      <RingBackdrop pack={pack} progress={isRinging ? progress : 0} />
      <View style={[styles.container, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 8 }]}>
        {/* TESTING-ONLY START: test ring banner + exit (only ever stops a TEST ring) */}
        {alarm.isTestRing && (
          <View style={[styles.testBanner, { borderColor: r.track, backgroundColor: `${r.track}CC` }]}>
            <Ionicons name="flask-outline" size={16} color={r.textDim} />
            <Text style={[{ flex: 1, color: r.text }, T(13)]}>{say('Test alarm. Real alarm not affected.')}</Text>
            <Pressable onPress={stopTestRing} accessibilityRole="button" accessibilityLabel="Exit test alarm" hitSlop={8} style={[styles.testExit, { borderColor: r.textDim }]}>
              <Text style={[{ color: r.text }, T(13)]}>{say('Exit test')}</Text>
            </Pressable>
          </View>
        )}
        {/* TESTING-ONLY END */}

        {isRinging ? (
          <>
            <View style={styles.top}>
              <Text style={[{ color: r.textDim, letterSpacing: 2 }, T(12)]}>{retro ? '> WAKE UP_' : pack.labelCaps ? 'WAKE UP' : 'Wake up'}</Text>
              <Text style={{ fontFamily: f.display, fontSize: clockSize, lineHeight: clockSize * (retro ? 0.94 : 1.08), color: r.text, fontVariant: ['tabular-nums'], letterSpacing: hand ? 0 : -1 }}>
                {timeFormatted}
              </Text>
            </View>

            <View style={styles.middle}>
              {!isMovementComplete ? (
                sensorAvailable ? (
                  <>
                    <MoveProgress pack={pack} count={movementProgress} target={settings.movementTarget} />
                    <Text style={[{ color: r.textDim, textAlign: 'center' }, T(15)]}>{say('Step 1 · Get up and move')}</Text>
                  </>
                ) : (
                  <>
                    <Text style={[{ color: r.textDim, textAlign: 'center' }, T(14)]}>{say('Motion sensor unavailable')}</Text>
                    <Pressable
                      style={({ pressed }) => [styles.fallback, { borderColor: r.textDim, opacity: pressed ? 0.6 : 1 }]}
                      onPress={() => incrementMovement(settings.movementTarget)}
                      accessibilityRole="button"
                      accessibilityLabel="Count movement, sensor unavailable"
                    >
                      <Text style={[{ color: r.text }, T(15)]}>
                        {say('Tap to count')} {movementProgress}/{settings.movementTarget}
                      </Text>
                    </Pressable>
                  </>
                )
              ) : (
                <View style={{ alignItems: 'center', gap: 8 }}>
                  <Ionicons name={retro ? 'barcode-sharp' : 'barcode-outline'} size={64} color={r.accent} />
                  <Text style={[{ color: r.text, textAlign: 'center' }, T(18)]}>
                    {say(settings.movementEnabled ? 'Step 2 · ' : '')}
                    {say(`Scan ${itemName}`)}
                  </Text>
                </View>
              )}

              {wrongBarcodeMessage && (
                <Text style={[{ color: r.accent, textAlign: 'center' }, T(14)]}>{say(wrongBarcodeMessage)}</Text>
              )}
            </View>

            <View style={styles.bottom}>
              {isMovementComplete && mainButton(say(`Scan ${itemName}`), handleOpenDisarmScanner, 'Scan to disarm')}
              {settings.snoozePin.length === 10 && (
                <Pressable onPress={() => setIsKeypadOpen(true)} accessibilityRole="button" accessibilityLabel="Snooze with PIN" hitSlop={8} style={styles.quietLink}>
                  <Ionicons name={retro ? 'moon-sharp' : 'moon-outline'} size={14} color={r.textDim} />
                  <Text style={[{ color: r.textDim }, T(14)]}>{say(`Snooze with PIN · ${snoozeLabel}`)}</Text>
                </Pressable>
              )}
              {settings.crueltyModeEnabled && <Text style={[{ color: r.textDim, textAlign: 'center', opacity: 0.8 }, T(12)]}>{say('Cruelty mode: each snooze is half as long')}</Text>}
            </View>
          </>
        ) : (
          <>
            <View style={styles.top}>
              <Text style={[{ color: r.textDim, letterSpacing: 2 }, T(12)]}>
                {say(`Snoozed · #${alarm.snoozeCount}`)}
              </Text>
            </View>
            <View style={styles.middle}>
              <Text style={{ fontFamily: f.display, fontSize: clockSize * 1.08, color: r.text, fontVariant: ['tabular-nums'] }}>{snoozeTimeFormatted}</Text>
              <Text style={[{ color: r.textDim }, T(15)]}>
                {say('Rings again at')} {new Date(alarm.snoozeUntil).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}
              </Text>
              {settings.crueltyModeEnabled && <Text style={[{ color: r.textDim }, T(12)]}>{say(`Next snooze: ${nextSnoozeSeconds}s`)}</Text>}
              {wrongBarcodeMessage && <Text style={[{ color: r.accent, textAlign: 'center' }, T(14)]}>{say(wrongBarcodeMessage)}</Text>}
            </View>
            <View style={styles.bottom}>{mainButton(say('Scan now'), handleOpenDisarmScanner, 'Scan to disarm now')}</View>
          </>
        )}

        <ScannerModal
          visible={isScannerOpen}
          onClose={() => setIsScannerOpen(false)}
          title={`Scan ${itemName}`}
          granted={!!permission?.granted}
          onScanned={handleDisarmBarcodeScanned}
          colors={{ bg: r.bg, text: r.text, textDim: r.textDim, accent: r.accent, onAccent: r.onAccent }}
          fontFamily={f.medium}
          permissionContent={
            <>
              <Text style={{ color: r.text, fontFamily: f.strong, fontSize: 22 }}>Camera needed</Text>
              <Text style={{ color: r.textDim, fontFamily: f.body, fontSize: 15 }}>The camera scans your wake-up item.</Text>
              <Pressable onPress={() => requestPermission()} accessibilityRole="button" accessibilityLabel="Allow camera" style={[styles.mainButton, { backgroundColor: r.accent, borderRadius: 30 }]}>
                <Text style={{ color: r.onAccent, fontFamily: f.strong, fontSize: 16 }}>Allow camera</Text>
              </Pressable>
              <Pressable onPress={() => setIsScannerOpen(false)} accessibilityRole="button" accessibilityLabel="Cancel barcode scanning" style={styles.quietLink}>
                <Text style={{ color: r.textDim, fontFamily: f.medium, fontSize: 15 }}>Cancel</Text>
              </Pressable>
            </>
          }
        />

        <Modal visible={isKeypadOpen && isRinging} animationType="fade" transparent onRequestClose={() => setIsKeypadOpen(false)}>
          <View style={[styles.keypadOverlay, { backgroundColor: `${r.bg}F2` }]}>
            <Text style={[{ color: r.textDim, letterSpacing: 2 }, T(12)]}>{say(`Snooze ${snoozeLabel}`)}</Text>
            <View style={styles.dots} accessibilityLabel={`${enteredPin.length} of 10 digits entered`}>
              {Array.from({ length: 10 }, (_, i) => (
                <View
                  key={i}
                  style={{
                    width: 12,
                    height: 12,
                    borderRadius: retro ? 0 : 6,
                    backgroundColor: i < enteredPin.length ? r.accent : 'transparent',
                    borderWidth: 1.5,
                    borderColor: pinError ? r.accent : r.textDim,
                  }}
                />
              ))}
            </View>
            <Text style={[{ color: r.accent, minHeight: 22 }, T(14)]}>{pinError ? say('Wrong PIN. Try again.') : ' '}</Text>

            <View style={styles.keypadGrid}>
              {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', 'OK'].map((k) => {
                const isOk = k === 'OK';
                const isClear = k === 'C';
                const okDisabled = isOk && enteredPin.length !== 10;
                return (
                  <Pressable
                    key={k}
                    onPress={isOk ? handleConfirmPin : isClear ? handleClearPin : () => handleKeyPress(k)}
                    disabled={okDisabled}
                    accessibilityRole="button"
                    accessibilityLabel={isOk ? 'Confirm PIN' : isClear ? 'Clear PIN' : `Digit ${k}`}
                    style={({ pressed }) => [
                      styles.key,
                      {
                        borderRadius: retro ? 0 : 36,
                        borderWidth: retro ? 1.5 : 0,
                        borderColor: r.track,
                        backgroundColor: isOk && !okDisabled ? r.accent : pressed ? r.track : retro ? 'transparent' : `${r.track}99`,
                        opacity: okDisabled ? 0.35 : 1,
                      },
                    ]}
                  >
                    {isClear ? (
                      <Ionicons name="close" size={24} color={r.textDim} />
                    ) : (
                      <Text style={{ color: isOk && !okDisabled ? r.onAccent : r.text, fontFamily: retro ? f.display : f.medium, fontSize: retro ? 34 : isOk ? 18 : 26 }}>{k}</Text>
                    )}
                  </Pressable>
                );
              })}
            </View>

            <Pressable
              onPress={() => {
                setIsKeypadOpen(false);
                setEnteredPin('');
                setPinError(false);
              }}
              accessibilityRole="button"
              accessibilityLabel="Cancel snooze"
              style={styles.quietLink}
            >
              <Text style={[{ color: r.textDim }, T(15)]}>{say('Cancel')}</Text>
            </Pressable>
          </View>
        </Modal>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 24 },
  top: { alignItems: 'center', paddingTop: 24, gap: 4 },
  middle: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 },
  bottom: { gap: 10, alignItems: 'stretch', paddingBottom: 8 },
  mainButton: { height: 64, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingHorizontal: 24 },
  quietLink: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, minHeight: 48 },
  fallback: { borderWidth: 1, borderRadius: 14, paddingHorizontal: 20, paddingVertical: 14 },
  testBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8 },
  testExit: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  keypadOverlay: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14, padding: 24 },
  dots: { flexDirection: 'row', gap: 10, marginTop: 8 },
  keypadGrid: { flexDirection: 'row', flexWrap: 'wrap', width: 3 * 72 + 2 * 18, gap: 18, justifyContent: 'center' },
  key: { width: 72, height: 72, alignItems: 'center', justifyContent: 'center' },
});
