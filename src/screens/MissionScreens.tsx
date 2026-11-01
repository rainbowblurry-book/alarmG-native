import React, { useEffect, useRef, useState } from 'react';
import { Linking, StyleSheet, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useCameraPermissions } from 'expo-camera';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSettings } from '../context/SettingsContext';
import { useWakeFlow } from '../context/WakeFlowContext';
import { useDesign } from '../context/DesignContext';
import { bevel, Btn, ExplainRow, Header, Screen, space, Stepper, Surface, Toggle, Txt } from '../components/ui';
import ScannerModal from '../components/ScannerModal';
import { validateSnoozePin } from '../logic/pin';
import type { RootStack } from '../navigation/types';

/** Mission setup is locked while armed (D-09): leave the page if the alarm gets armed. */
function useLeaveWhenArmed(goBack: () => void) {
  const { alarm } = useWakeFlow();
  useEffect(() => {
    if (alarm.armed) goBack();
  }, [alarm.armed]);
}

function Input(props: React.ComponentProps<typeof TextInput>) {
  const { pack } = useDesign();
  const c = pack.colors;
  const retro = pack.chrome === 'bevel';
  return (
    <TextInput
      placeholderTextColor={c.textDim}
      {...props}
      style={[
        {
          minHeight: 52,
          paddingHorizontal: space.md,
          color: c.text,
          fontFamily: pack.fonts.medium,
          fontSize: retro ? 23 : 17,
        },
        retro
          ? { backgroundColor: '#FFFFFF', ...bevel(true) }
          : {
              backgroundColor: pack.mode === 'light' ? c.bg : c.surfaceAlt,
              borderRadius: Math.min(pack.radius.control, 16),
              borderWidth: pack.chrome === 'hairline' ? 1 : 0,
              borderColor: c.border,
            },
        props.style,
      ]}
    />
  );
}

function StatusLine({ ok, okText, missingText }: { ok: boolean; okText: string; missingText: string }) {
  const { pack } = useDesign();
  const c = pack.colors;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      <Ionicons name={ok ? 'checkmark-circle' : 'ellipse-outline'} size={18} color={ok ? c.ok : c.warn} />
      <Txt variant="body" color={c.text}>
        {ok ? okText : missingText}
      </Txt>
    </View>
  );
}

// ───────────────────────── Item
export function ItemScreen({ navigation }: NativeStackScreenProps<RootStack, 'Item'>) {
  const { pack } = useDesign();
  const c = pack.colors;
  const { settings, updateSettings } = useSettings();
  useLeaveWhenArmed(navigation.goBack);

  const [permission, requestPermission] = useCameraPermissions();
  const [isScanning, setIsScanning] = useState(false);
  const [scanned, setScanned] = useState(false);
  const scanLockRef = useRef(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [manualBarcode, setManualBarcode] = useState('');

  const isBarcodeConfigured = settings.wakeBarcode.length > 0;
  const lastFour = isBarcodeConfigured ? settings.wakeBarcode.slice(-4) : '';

  const handleOpenScanner = async () => {
    scanLockRef.current = false;
    setScanned(false);
    if (!permission?.granted) await requestPermission();
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
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 4000);
  };

  const handleManualSubmit = () => {
    if (!manualBarcode.trim()) return;
    handleBarcodeDetected(manualBarcode.trim());
    setManualBarcode('');
  };

  return (
    <Screen header={<Header title="Wake-up item" onBack={navigation.goBack} />}>
      <Surface style={{ gap: space.md }}>
        <View style={{ alignItems: 'center', paddingVertical: space.md, gap: space.sm }}>
          <Ionicons name={pack.chrome === 'bevel' ? 'barcode-sharp' : 'barcode-outline'} size={56} color={c.text} />
          <Txt variant="caption" style={{ textAlign: 'center' }}>
            Pick something in another room. You scan it to turn the alarm off.
          </Txt>
        </View>
        <Input
          value={settings.wakeItemName}
          onChangeText={(t) => updateSettings({ wakeItemName: t })}
          placeholder="Item name, e.g. Toothpaste"
          accessibilityLabel="Wake-up item name"
        />
        <StatusLine ok={isBarcodeConfigured} okText={`Saved · ends in ${lastFour}`} missingText="No barcode yet" />
        {showSuccess && (
          <Txt variant="caption" color={c.ok}>
            Barcode saved
          </Txt>
        )}
        <Btn title={isBarcodeConfigured ? 'Scan again' : 'Scan barcode'} icon="scan-outline" onPress={handleOpenScanner} accessibilityLabel="Scan Wake-up Item Barcode" />
      </Surface>

      <ScannerModal
        visible={isScanning}
        onClose={() => setIsScanning(false)}
        title={`Scan ${settings.wakeItemName || 'your item'}`}
        granted={!!permission?.granted}
        onScanned={scanned ? undefined : handleBarcodeDetected}
        colors={{ bg: c.bg, text: c.text, textDim: c.textDim, accent: c.accent, onAccent: c.onAccent }}
        fontFamily={pack.fonts.medium}
        permissionContent={
          <>
            <Txt variant="title">Camera is off</Txt>
            <Txt variant="body" color={c.textDim}>
              ClockGuard needs the camera to scan your item.
            </Txt>
            <Btn title="Open settings" icon="settings-outline" onPress={() => Linking.openSettings()} />
            <View style={{ height: 1, backgroundColor: c.border, marginVertical: space.sm }} />
            <Txt variant="label">Accessibility fallback</Txt>
            <Txt variant="caption">Only if the camera can't be used. At ring time you still have to scan.</Txt>
            <Input
              value={manualBarcode}
              onChangeText={setManualBarcode}
              placeholder="Type the barcode number"
              autoCapitalize="characters"
              autoCorrect={false}
              accessibilityLabel="Manual barcode input"
            />
            <Btn title="Save typed barcode" variant="secondary" onPress={handleManualSubmit} disabled={!manualBarcode.trim()} accessibilityLabel="Save manual barcode" />
            <Btn title="Cancel" variant="ghost" onPress={() => setIsScanning(false)} accessibilityLabel="Cancel barcode scanning" />
          </>
        }
      />
    </Screen>
  );
}

// ───────────────────────── PIN
export function PinScreen({ navigation }: NativeStackScreenProps<RootStack, 'Pin'>) {
  const { pack } = useDesign();
  const c = pack.colors;
  const { settings, updateSettings } = useSettings();
  useLeaveWhenArmed(navigation.goBack);

  // The box is only a draft for a NEW PIN. The saved PIN stays active until a
  // valid new one is saved, and is never shown in plain text.
  const [pinDraft, setPinDraft] = useState('');
  const [pinError, setPinError] = useState<string | null>(null);
  const [pinSaved, setPinSaved] = useState(false);
  const isPinSaved = /^\d{10}$/.test(settings.snoozePin);

  const handleSavePin = () => {
    const result = validateSnoozePin(pinDraft);
    if (!result.isValid) {
      setPinError(result.error || 'Invalid PIN.');
      return;
    }
    updateSettings({ snoozePin: pinDraft });
    setPinDraft('');
    setPinError(null);
    setPinSaved(true);
    setTimeout(() => setPinSaved(false), 3000);
  };

  return (
    <Screen header={<Header title="Snooze PIN" onBack={navigation.goBack} />}>
      <Surface style={{ gap: space.md }}>
        <StatusLine ok={isPinSaved} okText={`PIN set · ends in ••${settings.snoozePin.slice(-2)}`} missingText="No PIN yet" />
        <Txt variant="caption">10 digits. It only snoozes, it never turns the alarm off.</Txt>
        <Input
          value={pinDraft}
          onChangeText={(t) => {
            setPinDraft(t.replace(/\D/g, '').slice(0, 10));
            setPinError(null);
          }}
          placeholder={isPinSaved ? 'New 10-digit PIN' : '10-digit PIN'}
          keyboardType="number-pad"
          maxLength={10}
          accessibilityLabel="Snooze PIN"
          style={pinDraft ? { fontFamily: pack.fonts.display, fontSize: pack.chrome === 'bevel' ? 32 : 24, letterSpacing: 4 } : undefined}
        />
        <Txt variant="caption" color={c.textDim} style={{ textAlign: 'right', marginTop: -8 }}>
          {pinDraft.length}/10
        </Txt>
        {pinError && (
          <Txt variant="caption" color={c.danger}>
            {pinError}
          </Txt>
        )}
        {pinDraft.length > 0 && !pinError && isPinSaved && (
          <Txt variant="caption" color={c.warn}>
            Not saved yet. Your current PIN (••{settings.snoozePin.slice(-2)}) stays active until you tap Save.
          </Txt>
        )}
        {pinSaved && (
          <Txt variant="caption" color={c.ok}>
            PIN saved
          </Txt>
        )}
        <Btn title="Save PIN" icon="checkmark" onPress={handleSavePin} disabled={pinDraft.length !== 10} accessibilityLabel="Save snooze PIN" />
      </Surface>

      <Surface>
        <ExplainRow
          title="Cruelty mode"
          explain="Every snooze is half as long as the one before (5 min, 2.5 min, …, at least 20 s)."
          right={
            <Toggle
              label="Cruelty mode"
              value={settings.crueltyModeEnabled}
              onChange={(v) => updateSettings({ crueltyModeEnabled: v })}
            />
          }
        />
      </Surface>
    </Screen>
  );
}

// ───────────────────────── Movement
export function MovementScreen({ navigation }: NativeStackScreenProps<RootStack, 'Movement'>) {
  const { pack } = useDesign();
  const { settings, updateSettings } = useSettings();
  useLeaveWhenArmed(navigation.goBack);

  return (
    <Screen header={<Header title="Movement" onBack={navigation.goBack} />}>
      <Surface style={{ gap: space.md }}>
        <ExplainRow
          title="Move before you can scan"
          explain="The phone counts real movement first. The scan button only appears once you are done."
          right={<Toggle label="Movement mission" value={settings.movementEnabled} onChange={(v) => updateSettings({ movementEnabled: v })} />}
        />
        {settings.movementEnabled && (
          <View style={{ paddingVertical: space.md, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: pack.colors.border }}>
            <Stepper value={settings.movementTarget} onChange={(v) => updateSettings({ movementTarget: v })} min={5} max={50} step={5} unit="moves" />
          </View>
        )}
      </Surface>
    </Screen>
  );
}
