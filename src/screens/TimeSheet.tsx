import React, { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useSettings } from '../context/SettingsContext';
import { useWakeFlow } from '../context/WakeFlowContext';
import { useDesign } from '../context/DesignContext';
import { SignaturePicker } from '../components/TimePickers';
import { bevel, Btn, Sheet, space, Txt } from '../components/ui';
import { DAY_NAMES, DAY_SHORT } from '../logic/useReadiness';

/** Bottom sheet: the design's own time picker + repeat days. Never opened while armed (D-09). */
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

  // Draft while the sheet is open; saved when it closes (fewer storage writes while dragging).
  const [draft, setDraft] = useState({ h: settings.alarmHour, m: settings.alarmMinute });
  useEffect(() => {
    if (visible) setDraft({ h: settings.alarmHour, m: settings.alarmMinute });
  }, [visible]);
  const close = () => {
    if (!locked && (draft.h !== settings.alarmHour || draft.m !== settings.alarmMinute)) {
      updateSettings({ alarmHour: draft.h, alarmMinute: draft.m });
    }
    onClose();
  };

  return (
    <Sheet visible={visible} onClose={close} title="Alarm time">
      <SignaturePicker pack={pack} hour={draft.h} minute={draft.m} onChange={(h, m) => setDraft({ h, m })} />
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
                  : pack.chrome === 'sketch'
                  ? { borderWidth: on ? 2.5 : 1, borderColor: on ? c.accent : c.border, borderTopLeftRadius: 22, borderTopRightRadius: 17, borderBottomRightRadius: 23, borderBottomLeftRadius: 15, backgroundColor: pressed ? c.surfaceAlt : 'transparent' }
                  : {
                      borderRadius: pack.radius.chip === 999 ? 23 : pack.radius.chip,
                      backgroundColor: on ? c.accent : pressed ? c.border : c.surfaceAlt,
                    },
              ]}
            >
              <Text style={{ fontFamily: pack.fonts.medium, fontSize: retro ? 21 : pack.chrome === 'sketch' ? 22 : 15, color: retro ? (on ? '#F2F2E6' : '#000') : pack.chrome === 'sketch' ? (on ? c.text : c.textDim) : on ? c.onAccent : c.text }}>{d}</Text>
            </Pressable>
          );
        })}
      </View>
      {settings.repeatDays.length === 0 && (
        <Txt variant="caption" color={c.warn} style={{ textAlign: 'center' }}>
          Pick at least one day
        </Txt>
      )}
      <Btn title="Done" onPress={close} />
      <View style={{ height: space.xs }} />
    </Sheet>
  );
}
