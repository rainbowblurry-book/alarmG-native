import React, { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useDesign } from '../context/DesignContext';
import { parseTyped, SignaturePicker, TypeTime } from '../components/TimePickers';
import { bevel, Btn, Sheet, space, Txt } from '../components/ui';
import { DAY_NAMES, DAY_SHORT } from '../logic/useReadiness';

/**
 * Bottom sheet for the alarm shown on Home: the design's own time picker + repeat days.
 * Never opened while that alarm is on (D-09). Everything is saved when it closes.
 */
export default function TimeSheet({
  visible,
  onClose,
  startTyping = false,
  hour,
  minute,
  days,
  onSave,
}: {
  visible: boolean;
  onClose: () => void;
  startTyping?: boolean;
  hour: number;
  minute: number;
  days: number[];
  onSave: (h: number, m: number, days: number[]) => void;
}) {
  const { pack } = useDesign();
  const c = pack.colors;
  const retro = pack.chrome === 'bevel';

  const [draft, setDraft] = useState({ h: hour, m: minute });
  const [dayDraft, setDayDraft] = useState<number[]>(days);
  const toggleDay = (i: number) => setDayDraft((d) => (d.includes(i) ? d.filter((x) => x !== i) : [...d, i].sort()));
  // Typing mode: tap the time in any picker to type it.
  const [typing, setTyping] = useState(false);
  const [digits, setDigits] = useState('');
  useEffect(() => {
    if (visible) {
      setDraft({ h: hour, m: minute });
      setDayDraft(days);
      setTyping(startTyping);
      setDigits('');
    }
  }, [visible]);
  const finishTyping = () => {
    const t = parseTyped(digits);
    if (t) setDraft(t);
    setTyping(false);
    return t;
  };
  const close = () => {
    const final = (typing && parseTyped(digits)) || draft;
    const daysChanged = dayDraft.join(',') !== days.join(',');
    if (final.h !== hour || final.m !== minute || daysChanged) onSave(final.h, final.m, dayDraft);
    onClose();
  };

  return (
    <Sheet visible={visible} onClose={close} title="Alarm time">
      {typing ? (
        <TypeTime pack={pack} digits={digits} onDigits={setDigits} onSubmit={finishTyping} onUsePicker={finishTyping} />
      ) : (
        <SignaturePicker
          pack={pack}
          hour={draft.h}
          minute={draft.m}
          onChange={(h, m) => setDraft({ h, m })}
          onTapTime={() => {
            setDigits('');
            setTyping(true);
          }}
        />
      )}
      <View style={{ flexDirection: 'row', gap: 6 }}>
        {DAY_SHORT.map((d, i) => {
          const on = dayDraft.includes(i);
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
      {dayDraft.length === 0 && (
        <Txt variant="caption" color={c.warn} style={{ textAlign: 'center' }}>
          Pick at least one day
        </Txt>
      )}
      <Btn title="Done" onPress={close} />
      <View style={{ height: space.xs }} />
    </Sheet>
  );
}
