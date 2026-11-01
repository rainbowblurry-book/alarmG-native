import React, { useEffect, useState } from 'react';
import { BackHandler, Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useDesign } from '../context/DesignContext';
import { useWakeFlow } from '../context/WakeFlowContext';
import { useSettings, WAKE_CHECK_OPTIONS } from '../context/SettingsContext';
import { RingBackdrop } from '../components/RingVisuals';
import { bevel, ExplainRow, Header, ProTag, Screen, space, Surface, Txt } from '../components/ui';
import type { RootStack } from '../navigation/types';

/**
 * "Still up?" — shown while the engine is in the 'check' state. One big button.
 * If nobody taps within the minute, the ENGINE starts the alarm again (needs the
 * full mission); this screen only calls confirmAwake().
 */
export function WakeCheckScreen() {
  const { pack } = useDesign();
  const r = pack.ring;
  const f = pack.fonts;
  const retro = pack.chrome === 'bevel';
  const hand = pack.chrome === 'sketch';
  const insets = useSafeAreaInsets();
  const { alarm, confirmAwake, stopTestRing } = useWakeFlow();
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 500);
    const sub = BackHandler.addEventListener('hardwareBackPress', () => true);
    return () => {
      clearInterval(t);
      sub.remove();
    };
  }, []);

  const left = Math.max(0, Math.ceil((alarm.checkDeadline - now) / 1000));
  const say = (s: string) => (retro ? s.toUpperCase() : s);

  return (
    <View style={{ flex: 1, backgroundColor: r.bg }}>
      <RingBackdrop pack={pack} progress={0.3} />
      <View style={{ flex: 1, paddingTop: insets.top + space.lg, paddingBottom: insets.bottom + space.lg, paddingHorizontal: space.lg, alignItems: 'center', justifyContent: 'center', gap: space.lg }}>
        {/* TESTING-ONLY START */}
        {alarm.isTestRing && (
          <Pressable onPress={stopTestRing} accessibilityRole="button" accessibilityLabel="Exit test" style={{ position: 'absolute', top: insets.top + space.md, right: space.md, borderWidth: 1, borderColor: r.textDim, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 }}>
            <Text style={{ color: r.text, fontFamily: f.body, fontSize: retro ? 18 : 13 }}>{say('Exit test')}</Text>
          </Pressable>
        )}
        {/* TESTING-ONLY END */}
        <Text style={{ fontFamily: retro || hand ? f.display : f.strong, fontSize: retro ? 64 : hand ? 64 : 40, color: r.text, textAlign: 'center' }}>{say('Still up?')}</Text>
        <Text style={{ fontFamily: f.display, fontSize: retro ? 120 : 96, color: r.accent, fontVariant: ['tabular-nums'] }}>{left}</Text>
        <Text style={{ fontFamily: f.body, fontSize: retro ? 20 : hand ? 19 : 15, color: r.textDim, textAlign: 'center' }}>
          {say('Tap within the minute, or the alarm rings again.')}
        </Text>
        <Pressable
          onPress={confirmAwake}
          accessibilityRole="button"
          accessibilityLabel="I'm up"
          style={({ pressed }) => [
            { alignSelf: 'stretch', height: 76, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, marginTop: space.lg },
            retro
              ? { borderWidth: 2, borderColor: r.accent, backgroundColor: pressed ? r.track : 'transparent' }
              : { backgroundColor: r.accent, borderRadius: hand ? 16 : 38, opacity: pressed ? 0.8 : 1 },
          ]}
        >
          <Ionicons name={retro ? 'checkmark-sharp' : 'checkmark'} size={26} color={retro ? r.accent : r.onAccent} />
          <Text style={{ fontFamily: retro ? f.display : f.strong, fontSize: retro ? 30 : hand ? 30 : 20, color: retro ? r.accent : r.onAccent }}>{say("I'm up")}</Text>
        </Pressable>
      </View>
    </View>
  );
}

/** Setting page (Mission → Check). Locked while any alarm is on, like the rest of the mission. */
export function WakeCheckSetupScreen({ navigation }: NativeStackScreenProps<RootStack, 'WakeCheck'>) {
  const { pack } = useDesign();
  const c = pack.colors;
  const retro = pack.chrome === 'bevel';
  const hand = pack.chrome === 'sketch';
  const { settings, updateSettings } = useSettings();
  const { alarm } = useWakeFlow();

  useEffect(() => {
    if (alarm.armed) navigation.goBack();
  }, [alarm.armed]);

  return (
    <Screen header={<Header title="Wake-up check" onBack={navigation.goBack} right={<ProTag />} />}>
      <Surface style={{ gap: space.md }}>
        <ExplainRow
          title="Check I'm still up"
          explain="A few minutes after the mission the phone vibrates and asks “Still up?”. Tap within a minute. If you don't, the alarm rings again and needs the full mission. It only checks once per alarm."
        />
        <View style={{ flexDirection: 'row', gap: space.sm }}>
          {WAKE_CHECK_OPTIONS.map((m) => {
            const on = settings.wakeCheckMinutes === m;
            return (
              <Pressable
                key={m}
                onPress={() => updateSettings({ wakeCheckMinutes: m })}
                accessibilityRole="radio"
                accessibilityState={{ selected: on }}
                accessibilityLabel={m === 0 ? 'Off' : `${m} minutes after`}
                style={({ pressed }) => [
                  { flex: 1, height: 56, alignItems: 'center', justifyContent: 'center' },
                  retro
                    ? { backgroundColor: on ? '#0B4F4E' : c.surface, ...bevel(on || pressed) }
                    : hand
                    ? { borderWidth: on ? 2.5 : 1, borderColor: on ? c.accent : c.border, borderTopLeftRadius: 16, borderTopRightRadius: 9, borderBottomRightRadius: 15, borderBottomLeftRadius: 8, backgroundColor: pressed ? c.surfaceAlt : 'transparent' }
                    : { borderRadius: 18, backgroundColor: on ? c.accent : pressed ? c.border : c.surfaceAlt },
                ]}
              >
                <Text style={{ fontFamily: retro || hand ? pack.fonts.strong : pack.fonts.medium, fontSize: retro ? 22 : hand ? 22 : 15, color: retro ? (on ? '#F2F2E6' : '#000') : hand ? c.text : on ? c.onAccent : c.text }}>
                  {m === 0 ? 'Off' : `${m} min`}
                </Text>
              </Pressable>
            );
          })}
        </View>
        <Txt variant="caption" style={{ textAlign: 'center' }}>
          {settings.wakeCheckMinutes === 0 ? 'Off. Nothing happens after the mission.' : `${settings.wakeCheckMinutes} minutes after the mission.`}
        </Txt>
      </Surface>
    </Screen>
  );
}
