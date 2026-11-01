import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { useSettings } from '../context/SettingsContext';
import { useWakeFlow } from '../context/WakeFlowContext';
import { useDesign } from '../context/DesignContext';
import WatchRotaryWheel from '../components/WatchRotaryWheel';
import { bevel, Btn, Sheet, space, Txt } from '../components/ui';
import { DAY_NAMES, DAY_SHORT } from '../logic/useReadiness';

/** Bottom sheet: time wheels + repeat days. Never opened while armed (D-09). */
export default function TimeSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { pack } = useDesign();
  const c = pack.colors;
  const { settings, updateSettings } = useSettings();
  const { alarm } = useWakeFlow();
  const locked = alarm.armed;
  const retro = pack.chrome === 'bevel';

  const toggleDay = (i: number) => {
    if (locked) return;
    const has = settings.repeatDays.includes(i);
    updateSettings({ repeatDays: has ? settings.repeatDays.filter((d) => d !== i) : [...settings.repeatDays, i].sort() });
  };

  const wheel = (side: 'left' | 'right') => (
    <WatchRotaryWheel
      value={side === 'left' ? settings.alarmHour : settings.alarmMinute}
      min={0}
      max={side === 'left' ? 23 : 59}
      onChange={(v) => updateSettings(side === 'left' ? { alarmHour: v } : { alarmMinute: v })}
      side={side}
      disabled={locked}
      accentColor={retro ? '#000000' : c.accent}
      textColor={c.text}
      textSecondaryColor={c.textDim}
      backgroundColor={c.surface}
      cardColor={retro ? '#FFFFFF' : c.surfaceAlt}
      borderColor={retro ? '#808080' : c.border}
      notchColor={c.border}
      fontFamily={pack.fonts.display}
      glow={pack.mode === 'dark'}
    />
  );

  return (
    <Sheet visible={visible} onClose={onClose} title="Alarm time">
      <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 10 }}>
        {wheel('left')}
        {wheel('right')}
      </View>
      <View style={{ flexDirection: 'row', gap: 6 }}>
        {DAY_SHORT.map((d, i) => {
          const on = settings.repeatDays.includes(i);
          return (
            <Pressable
              key={i}
              onPress={() => toggleDay(i)}
              accessibilityRole="checkbox"
              accessibilityLabel={DAY_NAMES[i]}
              accessibilityState={{ checked: on }}
              style={({ pressed }) => [
                { flex: 1, height: 46, alignItems: 'center', justifyContent: 'center' },
                retro
                  ? { backgroundColor: on ? '#0B4F4E' : c.surface, ...bevel(on || pressed) }
                  : {
                      borderRadius: pack.radius.chip === 999 ? 23 : pack.radius.chip,
                      backgroundColor: on ? c.accent : pressed ? c.border : c.surfaceAlt,
                    },
              ]}
            >
              <Text style={{ fontFamily: pack.fonts.medium, fontSize: retro ? 21 : 15, color: retro ? (on ? '#F2F2E6' : '#000') : on ? c.onAccent : c.text }}>{d}</Text>
            </Pressable>
          );
        })}
      </View>
      {settings.repeatDays.length === 0 && (
        <Txt variant="caption" color={c.warn} style={{ textAlign: 'center' }}>
          Pick at least one day
        </Txt>
      )}
      <Btn title="Done" onPress={onClose} />
      <View style={{ height: space.xs }} />
    </Sheet>
  );
}
