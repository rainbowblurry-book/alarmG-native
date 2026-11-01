import React, { useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSettings } from '../context/SettingsContext';
import { useWakeFlow } from '../context/WakeFlowContext';
import { useDesign } from '../context/DesignContext';
import * as Alarm from '../../modules/clockguard-alarm';
import { bevel, Btn, ExplainRow, Header, Row, Screen, SectionLabel, space, Surface, Toggle, Txt } from '../components/ui';
import { PERMISSION_ROWS, usePermissions } from '../logic/useReadiness';
import { PACK_ORDER, PACKS, isPackUnlocked } from '../theme/packs';
import type { RootStack } from '../navigation/types';

// ───────────────────────── Settings (grouped list)
export function SettingsScreen({ navigation }: NativeStackScreenProps<RootStack, 'Settings'>) {
  const { pack } = useDesign();
  const c = pack.colors;
  const { settings, updateSettings, resetSettings } = useSettings();
  const { alarm } = useWakeFlow();
  // TESTING-ONLY START
  const { scheduleTestRing, cancelTestRing } = useWakeFlow();
  // TESTING-ONLY END
  const [perms] = usePermissions();
  const off = PERMISSION_ROWS.filter((r) => !perms[r.key]).length;

  const confirmReset = () =>
    Alert.alert('Reset settings?', 'Clears your item, PIN and mission settings. You set them up again before arming.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Reset', style: 'destructive', onPress: resetSettings },
    ]);

  return (
    <Screen header={<Header title="Settings" onBack={navigation.goBack} />}>
      <SectionLabel>Reliability</SectionLabel>
      <Surface>
        <Row
          icon="shield-checkmark-outline"
          title="Phone readiness"
          value={off === 0 ? 'All on' : `${off} to fix`}
          valueTone={off === 0 ? 'ok' : 'warn'}
          onPress={() => navigation.navigate('Readiness')}
          last
        />
      </Surface>

      <SectionLabel>Sound</SectionLabel>
      <Surface>
        <ExplainRow
          title="Raise low alarm volume to 60%"
          explain="Off by default. If your alarm volume is below 60% when ringing starts, it is raised once, and put back when you snooze or disarm (unless you changed it yourself). Only the alarm volume. Do Not Disturb can block it."
          right={
            <Toggle
              label="Raise low alarm volume to 60% when ringing starts"
              value={settings.volumeBoostEnabled}
              onChange={(v) => updateSettings({ volumeBoostEnabled: v })}
            />
          }
        />
      </Surface>

      {/* TESTING-ONLY START: test alarm + design switcher */}
      <SectionLabel>Testing</SectionLabel>
      <Surface>
        {alarm.testRingAt > 0 ? (
          <Row
            icon="flask-outline"
            title={`Test at ${new Date(alarm.testRingAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`}
            value="Cancel"
            valueTone="warn"
            onPress={cancelTestRing}
            accessibilityLabel="Cancel pending test alarm"
          />
        ) : (
          <Row
            icon="flask-outline"
            title="Ring a test alarm in 10 s"
            onPress={() => {
              const error = scheduleTestRing(10);
              if (error) Alert.alert('Test not scheduled', error);
            }}
            accessibilityLabel="Ring a test alarm in 10 seconds"
          />
        )}
        <Row icon="color-palette-outline" title="Design" value={pack.name} onPress={() => navigation.navigate('Design')} last />
      </Surface>
      {/* TESTING-ONLY END */}

      <SectionLabel>Help</SectionLabel>
      <Surface>
        <Row icon="help-circle-outline" title="How it works" onPress={() => navigation.navigate('Intro', { replay: true })} last />
      </Surface>

      <SectionLabel>Reset</SectionLabel>
      <Surface>
        <Row
          icon="refresh-outline"
          title="Reset all settings"
          value={alarm.armed ? 'Cancel alarm first' : undefined}
          disabled={alarm.armed}
          onPress={confirmReset}
          accessibilityLabel="Reset all settings"
          last
        />
      </Surface>
      <Txt variant="caption" color={pack.chrome === 'bevel' ? '#DDEFEF' : c.textDim} style={{ textAlign: 'center', marginTop: space.md }}>
        ClockGuard · {pack.name}
      </Txt>
    </Screen>
  );
}

// ───────────────────────── Phone readiness
function PermissionList({ compact }: { compact?: boolean }) {
  const { pack } = useDesign();
  const c = pack.colors;
  const [perms] = usePermissions();
  return (
    <>
      {PERMISSION_ROWS.map((r, i) => {
        const ok = perms[r.key];
        return (
          <Pressable
            key={r.key}
            onPress={() => Alarm.openSettings(r.page)}
            accessibilityRole="button"
            accessibilityLabel={`${r.label}: ${ok ? 'on' : 'off'}. Open settings.`}
            style={({ pressed }) => ({
              flexDirection: 'row',
              alignItems: 'center',
              gap: 12,
              paddingVertical: 12,
              opacity: pressed ? 0.6 : 1,
              borderBottomWidth: i === PERMISSION_ROWS.length - 1 ? 0 : 1,
              borderBottomColor: pack.chrome === 'bevel' ? '#808080' : c.border,
            })}
          >
            <Ionicons name={ok ? 'checkmark-circle' : r.required ? 'alert-circle-outline' : 'ellipse-outline'} size={22} color={ok ? c.ok : r.required ? c.warn : c.textDim} />
            <View style={{ flex: 1 }}>
              <Txt variant="body" color={c.text}>
                {r.label}
              </Txt>
              {!compact && <Txt variant="caption">{r.hint}</Txt>}
            </View>
            <Txt variant="caption" color={ok ? c.ok : c.accent}>
              {ok ? 'On' : 'Fix'}
            </Txt>
          </Pressable>
        );
      })}
    </>
  );
}

export function ReadinessScreen({ navigation }: NativeStackScreenProps<RootStack, 'Readiness'>) {
  return (
    <Screen header={<Header title="Phone readiness" onBack={navigation.goBack} />}>
      <Surface>
        <PermissionList />
      </Surface>
    </Screen>
  );
}

// ───────────────────────── First launch checklist
export function WelcomeScreen({ navigation }: NativeStackScreenProps<RootStack, 'Welcome'>) {
  const { pack, setOnboarded } = useDesign();
  const c = pack.colors;
  const { settings } = useSettings();
  const retro = pack.chrome === 'bevel';
  const itemOk = settings.wakeBarcode.trim().length > 0;
  const pinOk = /^\d{10}$/.test(settings.snoozePin);
  const finish = () => {
    setOnboarded(true);
    navigation.replace('Home');
  };
  return (
    <Screen>
      <View style={{ paddingTop: space.xl, gap: space.sm }}>
        <Text style={{ fontFamily: pack.fonts.display, fontSize: retro ? 72 : 48, color: retro ? '#FFFFFF' : c.text, lineHeight: retro ? 64 : 54 }}>
          Get ready
        </Text>
        <Txt variant="body" color={retro ? '#DDEFEF' : c.textDim}>
          Six things, once. Then the alarm can't be skipped.
        </Txt>
      </View>
      <SectionLabel>Phone</SectionLabel>
      <Surface>
        <PermissionList compact />
      </Surface>
      <SectionLabel>Mission</SectionLabel>
      <Surface>
        <Row icon="barcode-outline" title="Wake-up item" value={itemOk ? 'Done' : 'Set up'} valueTone={itemOk ? 'ok' : 'warn'} onPress={() => navigation.navigate('Item')} />
        <Row icon="keypad-outline" title="Snooze PIN" value={pinOk ? 'Done' : 'Set up'} valueTone={pinOk ? 'ok' : 'warn'} onPress={() => navigation.navigate('Pin')} last />
      </Surface>
      <Btn title="Continue" onPress={finish} style={{ marginTop: space.md }} />
      <Btn title="Later" variant="ghost" onPress={finish} />
    </Screen>
  );
}

// TESTING-ONLY START
// ───────────────────────── Design switcher
export function DesignScreen({ navigation }: NativeStackScreenProps<RootStack, 'Design'>) {
  const { pack, setPack } = useDesign();
  return (
    <Screen header={<Header title="Design" onBack={navigation.goBack} />}>
      {PACK_ORDER.map((id) => {
        const p = PACKS[id];
        const active = p.id === pack.id;
        const unlocked = isPackUnlocked(id);
        return (
          <Pressable
            key={id}
            onPress={() => setPack(id)}
            disabled={!unlocked}
            accessibilityRole="radio"
            accessibilityState={{ selected: active }}
            accessibilityLabel={`${p.name} design`}
            style={({ pressed }) => [
              { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.md, opacity: pressed ? 0.8 : 1, backgroundColor: p.colors.bg },
              p.chrome === 'bevel' ? bevel(active) : { borderRadius: 18, borderWidth: active ? 2 : 1, borderColor: active ? pack.colors.accent : pack.colors.border },
            ]}
          >
            <View style={{ flexDirection: 'row' }}>
              {[p.colors.surface, p.colors.accent, p.ring.bg, p.ring.accent].map((col, i) => (
                <View key={i} style={{ width: 20, height: 40, backgroundColor: col, borderTopLeftRadius: i === 0 ? 6 : 0, borderBottomLeftRadius: i === 0 ? 6 : 0, borderTopRightRadius: i === 3 ? 6 : 0, borderBottomRightRadius: i === 3 ? 6 : 0 }} />
              ))}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: p.fonts.strong, fontSize: p.chrome === 'bevel' ? 25 : 18, color: p.chrome === 'bevel' ? '#FFFFFF' : p.colors.text }}>{p.name}</Text>
              <Text style={{ fontFamily: p.fonts.body, fontSize: p.chrome === 'bevel' ? 18 : 13, color: p.chrome === 'bevel' ? '#DDEFEF' : p.colors.textDim }}>{p.tagline}</Text>
            </View>
            {active && <Ionicons name="checkmark-circle" size={22} color={p.chrome === 'bevel' ? '#FFFFFF' : p.colors.accent} />}
          </Pressable>
        );
      })}
      <Txt variant="caption" color={pack.chrome === 'bevel' ? '#DDEFEF' : pack.colors.textDim} style={{ textAlign: 'center' }}>
        Testing only. Use Test alarm to see each ringing screen.
      </Txt>
      <Btn title="Done" variant="secondary" onPress={navigation.goBack} />
    </Screen>
  );
}
// TESTING-ONLY END
