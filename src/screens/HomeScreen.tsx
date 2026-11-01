import React, { useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSettings } from '../context/SettingsContext';
import { useWakeFlow } from '../context/WakeFlowContext';
import { useDesign } from '../context/DesignContext';
import { BEVEL, DesignPack } from '../theme/packs';
import { bevel, Chip, HoldButton, onBg, onBgDim, RULE, Screen, space, Surface, Txt } from '../components/ui';
import { FieldHill } from '../components/RingVisuals';
import Svg, { Path } from 'react-native-svg';
import TimeSheet from './TimeSheet';
import { DragTime, wasJustDragged } from '../components/TimePickers';
import { useMornings } from '../logic/mornings';
import AlarmStrip from '../components/AlarmStrip';
import { MAX_ALARMS } from '../../modules/clockguard-alarm';
import { armBlockers, DAY_SHORT, describeDays, formatIn, pad2, usePermissions } from '../logic/useReadiness';
import type { RootStack } from '../navigation/types';

/** Next local time matching hour:minute on one of `days` (preview only; native computes the real one). */
function nextOccurrence(hour: number, minute: number, days: number[], now: Date): number {
  if (days.length === 0) return 0;
  for (let add = 0; add <= 7; add++) {
    const d = new Date(now);
    d.setDate(now.getDate() + add);
    d.setHours(hour, minute, 0, 0);
    if (days.includes(d.getDay()) && d.getTime() > now.getTime()) return d.getTime();
  }
  return 0;
}

export default function HomeScreen({ navigation }: NativeStackScreenProps<RootStack, 'Home'>) {
  const { pack } = useDesign();
  const c = pack.colors;
  const { settings, updateSettings } = useSettings();
  const { alarm, saveAlarm, setAlarmEnabled, deleteAlarm } = useWakeFlow();
  const [perms, refreshPerms] = usePermissions();
  const { stats } = useMornings();
  const [now, setNow] = useState(() => new Date());
  // TESTING-ONLY START: the web preview can open the time sheet for screenshots
  const previewSheet = (globalThis as { __cgPreviewSheet?: boolean }).__cgPreviewSheet === true;
  // TESTING-ONLY END
  const [sheetOpen, setSheetOpen] = useState(previewSheet);

  // Multiple alarms: the hero shows one alarm (tap a chip to switch). Mission setup
  // stays locked while ANY alarm is on (D-09).
  const [selectedId, setSelectedId] = useState('');
  const list = alarm.alarms;
  const selected =
    list.find((a) => a.id === selectedId) ?? list.find((a) => a.id === alarm.nextAlarmId) ?? list.find((a) => a.enabled) ?? list[0];
  // Before the first alarm exists (fresh install), show the saved draft.
  const sel = selected ?? { id: '', hour: settings.alarmHour, minute: settings.alarmMinute, days: settings.repeatDays, enabled: false, nextTriggerAt: 0 };
  const armed = sel.enabled; // this alarm is on → its time/days are locked
  const anyArmed = alarm.armed;

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 15000);
    return () => clearInterval(t);
  }, []);

  const gate = armBlockers(settings, perms, sel.days);
  const armDisabled = !armed && gate.blocked;
  // Armed, but Android has no alarm scheduled (e.g. permission revoked): say so loudly.
  const armedButInactive = anyArmed && alarm.state === 'idle' && !alarm.nextTriggerAt;
  const phoneIssues = (['notifications', 'exactAlarms', 'fullScreen'] as const).filter((k) => !perms[k]).length;

  const nextAt = armed ? sel.nextTriggerAt : nextOccurrence(sel.hour, sel.minute, sel.days, now);
  const timeText = `${pad2(sel.hour)}:${pad2(sel.minute)}`;
  const daysText = describeDays(sel.days);
  const inText = nextAt ? formatIn(nextAt - now.getTime()) : '';

  /** Saves a change to the shown alarm (only while it is off). */
  const saveSel = (h: number, m: number, days: number[]) => {
    if (armed) return;
    if (!sel.id) {
      updateSettings({ alarmHour: h, alarmMinute: m, repeatDays: days });
      return;
    }
    const error = saveAlarm(sel.id, h, m, days);
    if (error) Alert.alert('Not saved', error);
  };

  const doArm = () => {
    let id = sel.id;
    if (!id) {
      // Very first alarm: create it from the draft, then turn it on.
      id = 'a1';
      const e = saveAlarm(id, sel.hour, sel.minute, sel.days);
      if (e) return Alert.alert('Alarm NOT armed', e);
    }
    const error = setAlarmEnabled(id, true);
    refreshPerms();
    if (error) Alert.alert('Alarm NOT armed', error);
  };

  const doCancel = () => {
    const error = setAlarmEnabled(sel.id, false);
    if (error) Alert.alert('Not changed', error);
  };

  const addAlarm = () => {
    const id = `a${Date.now().toString(36)}`;
    const t = new Date();
    const error = saveAlarm(id, t.getHours(), t.getMinutes(), sel.days.length ? sel.days : [1, 2, 3, 4, 5]);
    if (error) return Alert.alert('Not added', error);
    setSelectedId(id);
  };

  const askDelete = (a: { id: string; hour: number; minute: number; enabled: boolean }) => {
    if (a.enabled) return Alert.alert('Turn it off first', 'An alarm that is on can’t be deleted.');
    if (list.length <= 1) return;
    Alert.alert(`Delete ${pad2(a.hour)}:${pad2(a.minute)}?`, undefined, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          const e = deleteAlarm(a.id);
          if (e) Alert.alert('Not deleted', e);
          else if (a.id === selectedId) setSelectedId('');
        },
      },
    ]);
  };

  const goReason = (target: 'item' | 'pin' | 'days' | 'phone') => {
    if (target === 'item') navigation.navigate('Item');
    else if (target === 'pin') navigation.navigate('Pin');
    else if (target === 'phone') navigation.navigate('Readiness');
    else setSheetOpen(true);
  };

  // Tap the numbers → type the time; tap elsewhere on the card → the design's picker.
  const [typeFirst, setTypeFirst] = useState(false);
  const openTime = () => {
    if (!armed && !wasJustDragged()) {
      setTypeFirst(false);
      setSheetOpen(true);
    }
  };
  const openTyping = () => {
    if (!armed) {
      setTypeFirst(true);
      setSheetOpen(true);
    }
  };

  const retro = pack.chrome === 'bevel';

  return (
    <Screen scroll={false}>
      {/* Top bar */}
      <View style={styles.topBar}>
        <Text style={{ fontFamily: retro || pack.chrome === 'sketch' ? pack.fonts.strong : pack.fonts.medium, fontSize: retro ? 28 : pack.chrome === 'sketch' ? 32 : 15, color: onBg(pack), letterSpacing: pack.labelCaps && !retro ? 2 : 0 }}>
          {pack.labelCaps && !retro ? 'CLOCKGUARD' : 'ClockGuard'}
        </Text>
        <View style={{ flex: 1 }} />
        {/* Streak: shown once there is at least one finished morning */}
        {stats.total > 0 && (
          <Pressable
            onPress={() => navigation.navigate('Mornings')}
            accessibilityRole="button"
            accessibilityLabel={`${stats.current} mornings in a row. Open Mornings.`}
            hitSlop={6}
            style={({ pressed }) => [
              { flexDirection: 'row', alignItems: 'center', gap: 4, height: 34, paddingHorizontal: 10, marginRight: 6, opacity: pressed ? 0.7 : 1 },
              retro ? { backgroundColor: c.surface, ...bevel(pressed) } : { borderRadius: 17, backgroundColor: pack.chrome === 'sketch' ? 'transparent' : c.surface },
            ]}
          >
            <Ionicons name={retro ? 'flame-sharp' : 'flame'} size={16} color={retro ? '#000' : stats.current > 0 ? c.accent : c.textDim} />
            <Text style={{ fontFamily: pack.chrome === 'sketch' ? pack.fonts.strong : pack.fonts.medium, fontSize: retro ? 20 : pack.chrome === 'sketch' ? 22 : 14, color: retro ? '#000' : c.text }}>{stats.current}</Text>
          </Pressable>
        )}
        <Pressable
          onPress={() => navigation.navigate('Settings')}
          accessibilityRole="button"
          accessibilityLabel="Settings"
          hitSlop={8}
          style={({ pressed }) =>
            retro
              ? [{ width: 40, height: 36, backgroundColor: c.surface, alignItems: 'center', justifyContent: 'center' }, bevel(pressed)]
              : { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: pressed ? c.surfaceAlt : 'transparent' }
          }
        >
          <Ionicons name={retro ? 'settings-sharp' : 'settings-outline'} size={22} color={retro ? '#000' : c.text} />
          {phoneIssues > 0 && <View style={[styles.dot, { backgroundColor: c.warn }]} />}
        </Pressable>
      </View>

      <View style={{ flex: 1, justifyContent: 'center', minHeight: 260 }}>
        <Hero pack={pack} hour={sel.hour} minute={sel.minute} onTimeChange={(h, m) => saveSel(h, m, sel.days)} time={timeText} days={daysText} inText={inText} armed={armed} repeatDays={sel.days} onPress={openTime} onTapNumbers={openTyping} />
        {/* Alarms: shown once one exists */}
        {list.length > 0 && (
          <View style={{ marginTop: space.md }}>
            <AlarmStrip
              alarms={list}
              selectedId={sel.id}
              onSelect={setSelectedId}
              onAdd={addAlarm}
              onDelete={askDelete}
              canAdd={list.length < MAX_ALARMS}
            />
          </View>
        )}
      </View>


      {armedButInactive && (
        <Surface style={{ borderWidth: 1, borderColor: c.danger }}>
          <Txt variant="headline" color={c.danger}>
            Alarm NOT active
          </Txt>
          <Txt variant="caption" style={{ marginTop: 4 }}>
            Android has no alarm scheduled. Fix the phone settings, then cancel and arm again.
          </Txt>
        </Surface>
      )}

      {/* Mission */}
      <View style={{ gap: space.sm }}>
        <Txt variant="label" color={onBgDim(pack)}>
          Mission
        </Txt>
        <View style={{ flexDirection: 'row', gap: space.sm }}>
          <Chip
            icon={retro ? 'walk-sharp' : 'walk-outline'}
            label={settings.movementEnabled ? `Move ${settings.movementTarget}` : 'Move off'}
            ok
            disabled={anyArmed}
            onPress={() => navigation.navigate('Movement')}
            tint="#FBE7A1"
            tilt={-2}
          />
          <Chip icon={retro ? 'barcode-sharp' : 'barcode-outline'} label="Item" ok={gate.itemOk} disabled={anyArmed} onPress={() => navigation.navigate('Item')} tint="#F6CFC4" tilt={1.5} />
          <Chip icon={retro ? 'keypad-sharp' : 'keypad-outline'} label="PIN" ok={gate.pinOk} disabled={anyArmed} onPress={() => navigation.navigate('Pin')} tint="#D4E8C8" tilt={-1} />
          <Chip
            icon={retro ? 'checkmark-done-sharp' : 'checkmark-done-outline'}
            label={settings.wakeCheckMinutes ? `Check ${settings.wakeCheckMinutes}m` : 'Check off'}
            ok
            disabled={anyArmed}
            onPress={() => navigation.navigate('WakeCheck')}
            tint="#CFE0F0"
            tilt={1.5}
          />
        </View>
      </View>

      {/* One main action */}
      <View style={{ gap: space.sm, marginTop: space.md }}>
        {armed ? (
          <HoldButton key={`cancel-${sel.id}`} title={list.length > 1 ? `Hold to turn off ${timeText}` : 'Hold to cancel alarm'} holdingTitle="Keep holding…" icon="close" tone="quiet" onComplete={doCancel} />
        ) : (
          <HoldButton key={`arm-${sel.id}`} title={list.length > 1 ? `Hold to arm ${timeText}` : 'Hold to arm'} holdingTitle="Keep holding…" icon={retro ? 'shield-checkmark-sharp' : 'shield-checkmark-outline'} disabled={armDisabled} onComplete={doArm} />
        )}
        {!armed && gate.reasons.length > 0 && (
          <Pressable
            onPress={() => goReason(gate.reasons[0].target)}
            accessibilityRole="button"
            style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, minHeight: 40 }}
          >
            <Ionicons name="alert-circle-outline" size={16} color={retro ? '#FFFFFF' : c.warn} />
            <Txt variant="caption" color={retro ? '#FFFFFF' : c.text}>
              {gate.reasons[0].text}
              {gate.reasons.length > 1 ? `  +${gate.reasons.length - 1}` : ''}
            </Txt>
            <Ionicons name="chevron-forward" size={14} color={onBgDim(pack)} />
          </Pressable>
        )}
        {armed && phoneIssues > 0 && (
          <Pressable onPress={() => navigation.navigate('Readiness')} accessibilityRole="button" style={{ alignItems: 'center', minHeight: 40, justifyContent: 'center' }}>
            <Txt variant="caption" color={c.warn}>
              {phoneIssues} phone setting{phoneIssues > 1 ? 's' : ''} off. Tap to fix.
            </Txt>
          </Pressable>
        )}
      </View>

      <TimeSheet
        visible={sheetOpen}
        startTyping={typeFirst}
        hour={sel.hour}
        minute={sel.minute}
        days={sel.days}
        onSave={saveSel}
        onClose={() => setSheetOpen(false)}
      />
    </Screen>
  );
}

function Hero({
  pack,
  time,
  days,
  inText,
  armed,
  repeatDays,
  onPress,
  hour,
  minute,
  onTimeChange,
  onTapNumbers,
}: {
  onTapNumbers: () => void;
  pack: DesignPack;
  hour: number;
  minute: number;
  onTimeChange: (h: number, m: number) => void;
  time: string;
  days: string;
  inText: string;
  armed: boolean;
  repeatDays: number[];
  onPress: () => void;
}) {
  const c = pack.colors;
  const a11y = `Next alarm ${time}, ${days}${inText ? `, ${inText}` : ''}${armed ? ', armed, locked' : ', tap to change'}`;
  const status = (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      <Ionicons name={armed ? 'lock-closed' : 'time-outline'} size={13} color={armed ? c.accent : c.textDim} />
      <Txt variant="label" color={armed ? c.accent : c.textDim}>
        {armed ? 'Armed' : 'Not armed'}
      </Txt>
    </View>
  );
  // The big time: drag the hour or minutes up/down to change it (locked while armed).
  const big = (color: string, size = pack.heroSize) => (
    <DragTime
      hour={hour}
      minute={minute}
      locked={armed}
      onChange={onTimeChange}
      onTap={onTapNumbers}
      activeColor={pack.id === 'signal' ? '#FFD36A' : c.accent}
      style={{ fontFamily: pack.fonts.display, fontSize: size, lineHeight: size * 1.08, color, fontVariant: ['tabular-nums'], letterSpacing: pack.chrome === 'sketch' ? 0 : pack.id === 'lumen' ? -2 : -1 }}
    />
  );

  if (pack.id === 'paper') {
    // Notebook: an index card taped to the page, the time written in marker,
    // the chosen days circled in red pen.
    const hand = (size: number, color: string, text: string) => (
      <Text style={{ fontFamily: pack.fonts.display, fontSize: size, color }}>{text}</Text>
    );
    return (
      <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={a11y} style={({ pressed }) => ({ transform: [{ rotate: '-1.2deg' }], opacity: pressed ? 0.75 : 1 })}>
        <View style={{ backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, paddingHorizontal: space.lg, paddingTop: space.lg, paddingBottom: space.md, boxShadow: '0 3px 6px rgba(42, 41, 38, 0.12)' }}>
          {/* tape */}
          <View style={{ position: 'absolute', top: -12, alignSelf: 'center', left: '38%', width: 92, height: 24, backgroundColor: 'rgba(236, 222, 170, 0.75)', transform: [{ rotate: '3deg' }] }} />
          {/* index-card header rule: the label sits on it */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', borderBottomWidth: 1.5, borderBottomColor: '#E3A49A', marginHorizontal: -space.lg, paddingHorizontal: space.lg, paddingBottom: 2 }}>
            {hand(26, c.textDim, armed ? 'Set for' : 'Wake me at')}
            {armed && <Ionicons name="lock-closed" size={18} color={c.accent} style={{ marginBottom: 8 }} />}
          </View>
          {big(c.text)}
          <Svg width="70%" height={12} viewBox="0 0 200 12" preserveAspectRatio="none" style={{ marginTop: -14 }}>
            <Path d="M2 8 C 40 2, 80 11, 120 6 S 180 4, 198 7" stroke={c.accent} strokeWidth={3} fill="none" strokeLinecap="round" />
          </Svg>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: space.md, paddingBottom: 6, borderBottomWidth: 1.2, borderBottomColor: RULE, marginHorizontal: -space.lg, paddingHorizontal: space.lg }}>
            {DAY_SHORT.map((d, i) => {
              const on = repeatDays.includes(i);
              return (
                <View key={i} style={{ width: 34, height: 34, alignItems: 'center', justifyContent: 'center', borderWidth: on ? 2 : 0, borderColor: c.accent, borderTopLeftRadius: 18, borderTopRightRadius: 15, borderBottomRightRadius: 19, borderBottomLeftRadius: 14 }}>
                  <Text style={{ fontFamily: pack.fonts.strong, fontSize: 24, color: on ? c.text : c.border }}>{d}</Text>
                </View>
              );
            })}
          </View>
          {inText ? (
            <View style={{ alignItems: 'flex-end', borderBottomWidth: 1.2, borderBottomColor: RULE, marginHorizontal: -space.lg, paddingHorizontal: space.lg }}>
              {hand(26, armed ? c.accent : c.textDim, inText)}
            </View>
          ) : null}
        </View>
      </Pressable>
    );
  }

  if (pack.id === 'lumen') {
    // Bento: one big time tile, then two small tiles.
    const tile = { backgroundColor: c.surface, borderRadius: pack.radius.card, borderCurve: 'continuous' as const, padding: space.lg - 4 };
    return (
      <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={a11y} style={({ pressed }) => ({ gap: space.sm, opacity: pressed ? 0.85 : 1 })}>
        <View style={[tile, { paddingVertical: space.lg }]}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Txt variant="caption">Next alarm</Txt>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, height: 26, borderRadius: 13, backgroundColor: armed ? c.accent : c.surfaceAlt }}>
              <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: armed ? c.onAccent : c.textDim }} />
              <Text style={{ fontFamily: pack.fonts.medium, fontSize: 12, color: armed ? c.onAccent : c.textDim }}>{armed ? 'Armed' : 'Off'}</Text>
            </View>
          </View>
          <View style={{ marginTop: space.md }}>{big(c.text)}</View>
          <View style={{ flexDirection: 'row', gap: 6, marginTop: space.md }}>
            {DAY_SHORT.map((d, i) => {
              const on = repeatDays.includes(i);
              return (
                <View key={i} style={{ flex: 1, height: 30, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? `${c.accent}22` : 'transparent', borderWidth: on ? 0 : 1, borderColor: c.border }}>
                  <Text style={{ fontFamily: pack.fonts.medium, fontSize: 12, color: on ? c.accent : c.textDim }}>{d}</Text>
                </View>
              );
            })}
          </View>
        </View>
        <View style={{ flexDirection: 'row', gap: space.sm }}>
          <View style={[tile, { flex: 1 }]}>
            <Txt variant="caption">Rings</Txt>
            <Text style={{ fontFamily: pack.fonts.strong, fontSize: 20, color: armed ? c.accent : c.text, marginTop: 4 }}>{inText || '—'}</Text>
          </View>
          <View style={[tile, { flex: 1 }]}>
            <Txt variant="caption">Repeat</Txt>
            <Text style={{ fontFamily: pack.fonts.strong, fontSize: 20, color: c.text, marginTop: 4 }} numberOfLines={1}>{days}</Text>
          </View>
        </View>
      </Pressable>
    );
  }

  if (pack.id === 'signal') {
    // 90s window with a sunken LCD panel.
    return (
      <View style={{ ...bevel(), backgroundColor: c.surface, padding: 3 }}>
        <View style={{ backgroundColor: BEVEL.titleBar, height: 26, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 6 }}>
          <Text style={{ color: BEVEL.titleText, fontFamily: pack.fonts.strong, fontSize: 20, flex: 1 }}>Next alarm</Text>
          <Ionicons name={armed ? 'lock-closed-sharp' : 'time-sharp'} size={14} color={BEVEL.titleText} />
        </View>
        <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={a11y} style={{ padding: space.sm + 2, gap: space.sm }}>
          {({ pressed }) => (
            <>
              <View style={[{ backgroundColor: '#14100A', alignItems: 'center', paddingVertical: space.sm, opacity: pressed ? 0.8 : 1 }, bevel(true)]}>
                {big('#FFB000', 104)}
                <Text style={{ fontFamily: pack.fonts.display, fontSize: 22, color: '#9A6B00', marginTop: -6 }}>{armed ? 'ARMED' : 'NOT ARMED'}{inText ? ` · ${inText.toUpperCase()}` : ''}</Text>
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                {DAY_SHORT.map((d, i) => (
                  <View key={i} style={{ alignItems: 'center', gap: 2 }}>
                    <View style={[{ width: 20, height: 20, backgroundColor: '#FFF', alignItems: 'center', justifyContent: 'center' }, bevel(true)]}>
                      {repeatDays.includes(i) && <Ionicons name="checkmark-sharp" size={15} color="#000" />}
                    </View>
                    <Text style={{ fontFamily: pack.fonts.medium, fontSize: 18, color: '#000' }}>{d}</Text>
                  </View>
                ))}
              </View>
            </>
          )}
        </Pressable>
      </View>
    );
  }

  if (pack.id === 'field') {
    return (
      <Surface onPress={onPress} accessibilityLabel={a11y} style={{ paddingBottom: 0, overflow: 'hidden', alignItems: 'center', paddingTop: space.lg }}>
        {status}
        {big(c.text)}
        <Txt variant="body" color={c.textDim}>
          {days}
          {inText ? `  ·  ${inText}` : ''}
        </Txt>
        <View style={{ alignSelf: 'stretch', marginTop: space.md, marginHorizontal: -(space.lg - 4) }}>
          <FieldHill color={c.surfaceAlt} sun={armed ? c.warn : c.border} />
        </View>
      </Surface>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 44 },
  dot: { position: 'absolute', top: 8, right: 8, width: 8, height: 8, borderRadius: 4 },
});
