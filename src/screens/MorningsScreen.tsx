import React from 'react';
import { Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useDesign } from '../context/DesignContext';
import { bevel, Header, ProTag, Row, Screen, SectionLabel, space, Surface, Txt } from '../components/ui';
import { useMornings } from '../logic/mornings';
import { DAY_SHORT } from '../logic/useReadiness';
import type { RootStack } from '../navigation/types';

/** Streak + last 4 weeks. Only real alarms count; test rings never do. */
export default function MorningsScreen({ navigation }: NativeStackScreenProps<RootStack, 'Mornings'>) {
  const { pack } = useDesign();
  const c = pack.colors;
  const retro = pack.chrome === 'bevel';
  const hand = pack.chrome === 'sketch';
  const { stats } = useMornings();

  const cell = (result: 'done' | 'missed' | null, isToday: boolean, key: string) => {
    const size = 34;
    if (hand) {
      return (
        <View key={key} style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center', borderBottomWidth: 1, borderColor: '#C9D6DF' }}>
          <Text style={{ fontFamily: pack.fonts.strong, fontSize: 26, color: result === 'missed' ? c.textDim : c.accent }}>{result === 'done' ? '✓' : result === 'missed' ? '✗' : isToday ? '·' : ''}</Text>
        </View>
      );
    }
    if (retro) {
      return (
        <View key={key} style={[{ width: size, height: size, alignItems: 'center', justifyContent: 'center', backgroundColor: result === 'done' ? '#0B4F4E' : '#FFFFFF' }, bevel(true)]}>
          {result === 'missed' && <Text style={{ fontFamily: pack.fonts.display, fontSize: 22, color: '#8E1F12' }}>X</Text>}
        </View>
      );
    }
    const round = pack.id === 'field';
    return (
      <View
        key={key}
        style={{
          width: size,
          height: size,
          borderRadius: round ? size / 2 : 10,
          backgroundColor: result === 'done' ? (round ? c.warn : c.accent) : result === 'missed' ? 'transparent' : c.surfaceAlt,
          borderWidth: result === 'missed' || isToday ? 1.5 : 0,
          borderColor: result === 'missed' ? c.danger : c.border,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {result === 'missed' && <Ionicons name="close" size={16} color={c.danger} />}
      </View>
    );
  };

  const today = stats.days[stats.days.length - 1]?.day;
  // Rows of 7 ending today; label row shows the weekday of each column.
  const firstDow = new Date(stats.days[0]?.day + 'T12:00:00').getDay();
  const rows = [0, 1, 2, 3].map((r) => stats.days.slice(r * 7, r * 7 + 7));

  return (
    <Screen header={<Header title="Mornings" onBack={navigation.goBack} right={<ProTag />} />}>
      <Surface style={{ alignItems: 'center', gap: 4, paddingVertical: space.xl }}>
        <Ionicons name={retro ? 'flame-sharp' : 'flame-outline'} size={28} color={retro ? '#000' : c.accent} />
        <Text style={{ fontFamily: pack.fonts.display, fontSize: retro ? 96 : hand ? 96 : 72, lineHeight: retro ? 90 : hand ? 100 : 80, color: c.text }}>{stats.current}</Text>
        <Txt variant="body" color={c.textDim}>
          {stats.current === 1 ? 'morning in a row' : 'mornings in a row'}
        </Txt>
      </Surface>

      <SectionLabel>Last 4 weeks</SectionLabel>
      <Surface style={{ gap: 8 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          {Array.from({ length: 7 }, (_, i) => (
            <Text key={i} style={{ width: 34, textAlign: 'center', fontFamily: pack.fonts.medium, fontSize: retro ? 17 : hand ? 18 : 12, color: c.textDim }}>
              {DAY_SHORT[(firstDow + i) % 7]}
            </Text>
          ))}
        </View>
        {rows.map((row, r) => (
          <View key={r} style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            {row.map((d) => cell(d.result, d.day === today, d.day))}
          </View>
        ))}
      </Surface>

      <Surface>
        <Row icon="trophy-outline" title="Best streak" value={`${stats.best}`} />
        <Row icon="time-outline" title="Ring → up (average)" value={stats.avgMinutesToUp === null ? '—' : `${stats.avgMinutesToUp} min`} />
        <Row icon="moon-outline" title="Snoozes this week" value={`${stats.snoozesThisWeek}`} />
        <Row icon="checkmark-done-outline" title="Mornings done" value={`${stats.total}`} last />
      </Surface>
      <Txt variant="caption" color={retro ? '#DDEFEF' : c.textDim} style={{ textAlign: 'center' }}>
        Days without an alarm don’t break the streak. Test alarms don’t count. Saved only on this phone.
      </Txt>
    </Screen>
  );
}
