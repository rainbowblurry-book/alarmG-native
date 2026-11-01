import React from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useDesign } from '../context/DesignContext';
import { bevel, ProTag, space } from './ui';
import { pad2 } from '../logic/useReadiness';
import type { AlarmItem } from '../../modules/clockguard-alarm';

/**
 * Small row of alarm chips under the Home hero: tap to show that alarm in the hero,
 * long-press one that is off to delete it, "+" to add (max 5). On = filled dot.
 */
export default function AlarmStrip({
  alarms,
  selectedId,
  onSelect,
  onAdd,
  onDelete,
  canAdd,
}: {
  alarms: AlarmItem[];
  selectedId: string;
  onSelect: (id: string) => void;
  onAdd: () => void;
  onDelete: (a: AlarmItem) => void;
  canAdd: boolean;
}) {
  const { pack } = useDesign();
  const c = pack.colors;
  const retro = pack.chrome === 'bevel';
  const hand = pack.chrome === 'sketch';

  const chipStyle = (selected: boolean, pressed: boolean) =>
    retro
      ? { backgroundColor: c.surface, ...bevel(selected || pressed) }
      : hand
      ? { borderWidth: selected ? 2.5 : 1.2, borderColor: selected ? c.accent : c.border, borderTopLeftRadius: 16, borderTopRightRadius: 9, borderBottomRightRadius: 15, borderBottomLeftRadius: 8, backgroundColor: pressed ? c.surfaceAlt : c.surface }
      : { borderRadius: 18, backgroundColor: pressed ? c.border : c.surface, borderWidth: 1.5, borderColor: selected ? c.accent : 'transparent' };

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }} contentContainerStyle={{ gap: space.sm, paddingVertical: 2 }}>
      {alarms.map((a) => {
        const selected = a.id === selectedId;
        return (
          <Pressable
            key={a.id}
            onPress={() => onSelect(a.id)}
            onLongPress={() => onDelete(a)}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            accessibilityLabel={`Alarm ${pad2(a.hour)}:${pad2(a.minute)}, ${a.enabled ? 'on' : 'off'}${selected ? ', shown' : ''}. Long-press to delete when off.`}
            style={({ pressed }) => [{ height: 40, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 8 }, chipStyle(selected, pressed)]}
          >
            <View
              style={{
                width: 8,
                height: 8,
                borderRadius: retro ? 0 : 4,
                backgroundColor: a.enabled ? (retro ? '#0B4F4E' : c.accent) : 'transparent',
                borderWidth: a.enabled ? 0 : 1.5,
                borderColor: retro ? '#000' : c.textDim,
              }}
            />
            <Text style={{ fontFamily: hand || retro ? pack.fonts.strong : pack.fonts.medium, fontSize: retro ? 20 : hand ? 21 : 15, color: retro ? '#000' : c.text, fontVariant: ['tabular-nums'] }}>
              {pad2(a.hour)}:{pad2(a.minute)}
            </Text>
          </Pressable>
        );
      })}
      {canAdd && (
        <Pressable
          onPress={onAdd}
          accessibilityRole="button"
          accessibilityLabel="Add an alarm"
          style={({ pressed }) => [{ height: 40, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 6 }, chipStyle(false, pressed)]}
        >
          <Ionicons name="add" size={18} color={retro ? '#000' : c.text} />
          {alarms.length >= 1 && <ProTag />}
        </Pressable>
      )}
    </ScrollView>
  );
}
