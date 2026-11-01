import React, { useEffect, useMemo, useRef, useState } from 'react';
import { PanResponder, Pressable, ScrollView, StyleSheet, Text, TextStyle, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { DesignPack } from '../theme/packs';
import { bevel, space } from './ui';
import { pad2 } from '../logic/useReadiness';

/**
 * Time pickers. They only produce hour/minute numbers; arming is unchanged.
 * - DragTime: drag the big hour or minutes up/down right on Home (all designs).
 * - SignaturePicker: one picker per design for the time sheet.
 */

const tick = () => Haptics.selectionAsync().catch(() => {});
const wrap = (v: number, max: number) => ((v % (max + 1)) + max + 1) % (max + 1);

// ───────────────────────── A: drag the big numbers on Home
let lastDragEnd = 0;
/** True right after a number drag, so a parent tap handler can ignore that touch. */
export function wasJustDragged(): boolean {
  return Date.now() - lastDragEnd < 400;
}

function DragPart({
  value,
  max,
  pxPerStep,
  locked,
  label,
  style,
  activeColor,
  onCommit,
  onTap,
}: {
  onTap?: () => void;
  value: number;
  max: number;
  pxPerStep: number;
  locked: boolean;
  label: string;
  style: TextStyle;
  activeColor: string;
  onCommit: (v: number) => void;
}) {
  const [live, setLive] = useState<number | null>(null);
  const base = useRef(value);
  const last = useRef(value);
  const moved = useRef(false);
  const latest = useRef({ value, locked, onCommit, onTap });
  latest.current = { value, locked, onCommit, onTap };

  const pan = useMemo(
    () =>
      PanResponder.create({
        // Claim the touch at start (a parent Pressable would otherwise keep it);
        // a plain tap is passed on as onTap.
        onStartShouldSetPanResponder: () => true,
        onPanResponderGrant: () => {
          base.current = latest.current.value;
          last.current = latest.current.value;
          moved.current = false;
        },
        onPanResponderMove: (_, g) => {
          if (latest.current.locked) return;
          if (!moved.current) {
            if (Math.abs(g.dy) < 6) return;
            moved.current = true;
            setLive(latest.current.value);
            tick();
          }
          const v = wrap(base.current + Math.round(-g.dy / pxPerStep), max);
          if (v !== last.current) {
            last.current = v;
            setLive(v);
            tick();
          }
        },
        onPanResponderRelease: () => {
          if (moved.current) lastDragEnd = Date.now();
          if (moved.current) latest.current.onCommit(last.current);
          else latest.current.onTap?.();
          setLive(null);
        },
        onPanResponderTerminate: () => {
          if (moved.current) lastDragEnd = Date.now();
          if (moved.current) latest.current.onCommit(last.current);
          setLive(null);
        },
        onPanResponderTerminationRequest: () => false,
      }),
    [max, pxPerStep]
  );

  const shown = live ?? value;
  return (
    <View
      {...pan.panHandlers}
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel={label}
      accessibilityValue={{ text: pad2(shown) }}
      accessibilityActions={locked ? [] : [{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={(e) => onCommit(wrap(value + (e.nativeEvent.actionName === 'increment' ? 1 : -1), max))}
    >
      <Text style={[style, live !== null && { color: activeColor }]}>{pad2(shown)}</Text>
    </View>
  );
}

/** The big time; hour and minutes can be dragged up/down (unless locked). */
export function DragTime({
  hour,
  minute,
  locked,
  style,
  activeColor,
  onChange,
  onTap,
}: {
  onTap?: () => void;
  hour: number;
  minute: number;
  locked: boolean;
  style: TextStyle;
  activeColor: string;
  onChange: (h: number, m: number) => void;
}) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      <DragPart value={hour} max={23} pxPerStep={16} locked={locked} label="Alarm hour" style={style} activeColor={activeColor} onCommit={(h) => onChange(h, minute)} onTap={onTap} />
      <Text style={style}>:</Text>
      <DragPart value={minute} max={59} pxPerStep={8} locked={locked} label="Alarm minutes" style={style} activeColor={activeColor} onCommit={(m) => onChange(hour, m)} onTap={onTap} />
    </View>
  );
}

// ───────────────────────── geometry helpers
const rad = (deg: number) => ((deg - 90) * Math.PI) / 180; // 0° = top, clockwise
const pt = (cx: number, cy: number, r: number, deg: number) => ({ x: cx + r * Math.cos(rad(deg)), y: cy + r * Math.sin(rad(deg)) });
function arc(cx: number, cy: number, r: number, from: number, to: number) {
  const a = pt(cx, cy, r, from);
  const b = pt(cx, cy, r, to);
  const large = to - from > 180 ? 1 : 0;
  return `M ${a.x} ${a.y} A ${r} ${r} 0 ${large} 1 ${b.x} ${b.y}`;
}
/** Angle of a point around a centre, 0° = top, -180..180, clockwise positive. */
const angleOf = (dx: number, dy: number) => (Math.atan2(dx, -dy) * 180) / Math.PI;

type PickerProps = { pack: DesignPack; hour: number; minute: number; onChange: (h: number, m: number) => void };

/**
 * Tracks a drag inside a box using the touch-start position + gesture delta, so it
 * works no matter which child was touched. `onPoint` gets box coordinates.
 */
function useBoxDrag(onPoint: (x: number, y: number, first: boolean) => void) {
  const start = useRef({ x: 0, y: 0 });
  const cb = useRef(onPoint);
  cb.current = onPoint;
  return useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderTerminationRequest: () => false,
        onPanResponderGrant: (e) => {
          start.current = { x: e.nativeEvent.locationX, y: e.nativeEvent.locationY };
          cb.current(start.current.x, start.current.y, true);
        },
        onPanResponderMove: (_, g) => cb.current(start.current.x + g.dx, start.current.y + g.dy, false),
      }),
    []
  );
}

// ───────────────────────── Lumen: two arc sliders (outer = hours, inner = minutes)
function LumenDial({ pack, hour, minute, onChange }: PickerProps) {
  const c = pack.colors;
  const S = 280;
  const C = S / 2;
  const R1 = 124;
  const R2 = 92;
  const SWEEP = 135;
  const ring = useRef<'h' | 'm'>('h');
  const now = useRef({ hour, minute });
  now.current = { hour, minute };

  const pan = useBoxDrag((x, y, first) => {
    const dx = x - C;
    const dy = y - C;
    if (first) ring.current = Math.abs(Math.hypot(dx, dy) - R1) < Math.abs(Math.hypot(dx, dy) - R2) ? 'h' : 'm';
    const a = angleOf(dx, dy);
    if (Math.abs(a) > SWEEP) return; // in the gap at the bottom: keep the value
    const t = (a + SWEEP) / (SWEEP * 2);
    const max = ring.current === 'h' ? 23 : 59;
    const v = Math.round(t * max);
    const cur = ring.current === 'h' ? now.current.hour : now.current.minute;
    if (v !== cur) {
      tick();
      ring.current === 'h' ? onChange(v, now.current.minute) : onChange(now.current.hour, v);
    }
  });

  const deg = (v: number, max: number) => -SWEEP + (v / max) * SWEEP * 2;
  const hDeg = deg(hour, 23);
  const mDeg = deg(minute, 59);
  const knob = (r: number, d: number, fill: string) => {
    const p = pt(C, C, r, d);
    return <Circle cx={p.x} cy={p.y} r={13} fill={fill} stroke={c.bg} strokeWidth={4} />;
  };

  return (
    <View style={{ alignSelf: 'center', width: S, height: S }} {...pan.panHandlers} accessible={false}>
      <Svg width={S} height={S} pointerEvents="none">
        <Path d={arc(C, C, R1, -SWEEP, SWEEP)} stroke={c.surfaceAlt} strokeWidth={14} strokeLinecap="round" fill="none" />
        <Path d={arc(C, C, R1, -SWEEP, Math.max(hDeg, -SWEEP + 0.01))} stroke={c.accent} strokeWidth={14} strokeLinecap="round" fill="none" />
        <Path d={arc(C, C, R2, -SWEEP, SWEEP)} stroke={c.surfaceAlt} strokeWidth={10} strokeLinecap="round" fill="none" />
        <Path d={arc(C, C, R2, -SWEEP, Math.max(mDeg, -SWEEP + 0.01))} stroke={c.text} strokeOpacity={0.75} strokeWidth={10} strokeLinecap="round" fill="none" />
        {knob(R1, hDeg, c.accent)}
        {knob(R2, mDeg, c.text)}
      </Svg>
      <View style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center' }]} pointerEvents="none">
        <Text style={{ fontFamily: pack.fonts.display, fontSize: 44, color: c.text, fontVariant: ['tabular-nums'] }}>
          {pad2(hour)}:{pad2(minute)}
        </Text>
        <Text style={{ fontFamily: pack.fonts.body, fontSize: 12, color: c.textDim, marginTop: 2 }}>outer hour · inner minutes</Text>
      </View>
    </View>
  );
}

// ───────────────────────── Paper: hand-drawn tape-measure rulers
function Tape({ pack, value, max, unit, labelEvery, title, onChange }: { pack: DesignPack; value: number; max: number; unit: number; labelEvery: number; title: string; onChange: (v: number) => void }) {
  const c = pack.colors;
  const [w, setW] = useState(0);
  const ref = useRef<ScrollView>(null);
  const last = useRef(value);
  const dragging = useRef(false);

  useEffect(() => {
    if (w && !dragging.current) ref.current?.scrollTo({ x: value * unit, animated: false });
  }, [w]);

  return (
    <View onLayout={(e) => setW(e.nativeEvent.layout.width)} style={{ height: 86 }}>
      <Text style={{ fontFamily: pack.fonts.strong, fontSize: 20, color: c.textDim, marginBottom: 2 }}>{title}</Text>
      {w > 0 && (
        <ScrollView
          ref={ref}
          horizontal
          showsHorizontalScrollIndicator={false}
          snapToInterval={unit}
          decelerationRate="fast"
          scrollEventThrottle={16}
          onScrollBeginDrag={() => (dragging.current = true)}
          onMomentumScrollEnd={() => (dragging.current = false)}
          onScroll={(e) => {
            const v = Math.max(0, Math.min(max, Math.round(e.nativeEvent.contentOffset.x / unit)));
            if (v !== last.current) {
              last.current = v;
              tick();
              onChange(v);
            }
          }}
          contentContainerStyle={{ paddingHorizontal: w / 2 }}
          accessibilityLabel={`${title} ruler`}
        >
          <View style={{ width: max * unit + 1, height: 56 }}>
            {Array.from({ length: max + 1 }, (_, i) => {
              const big = i % labelEvery === 0;
              const h = big ? 26 : labelEvery % 2 === 0 && i % (labelEvery / 2) === 0 ? 18 : 11;
              return (
                <View key={i} style={{ position: 'absolute', left: i * unit, top: 0, alignItems: 'center', width: 1 }}>
                  <View style={{ width: big ? 2 : 1.4, height: h + (i % 3) * 0.8, backgroundColor: c.text, opacity: big ? 0.9 : 0.55 }} />
                  {big && (
                    <Text style={{ position: 'absolute', top: 28, left: -20, width: 40, textAlign: 'center', fontFamily: pack.fonts.strong, fontSize: 20, color: c.text }}>{pad2(i)}</Text>
                  )}
                </View>
              );
            })}
          </View>
        </ScrollView>
      )}
      {/* red pencil marker */}
      <View pointerEvents="none" style={{ position: 'absolute', left: w / 2 - 1.5, top: 22, width: 3, height: 34, borderRadius: 2, backgroundColor: c.accent }} />
    </View>
  );
}

function PaperTapes({ pack, hour, minute, onChange }: PickerProps) {
  const c = pack.colors;
  return (
    <View style={{ gap: space.sm }}>
      <Text style={{ alignSelf: 'center', fontFamily: pack.fonts.display, fontSize: 64, color: c.text }}>
        {pad2(hour)}:{pad2(minute)}
      </Text>
      <Tape pack={pack} title="hour" value={hour} max={23} unit={28} labelEvery={3} onChange={(h) => onChange(h, minute)} />
      <Tape pack={pack} title="minutes" value={minute} max={59} unit={12} labelEvery={10} onChange={(m) => onChange(hour, m)} />
    </View>
  );
}

// ───────────────────────── Field: drag the sun over the hill (hours) + a horizon slider (minutes)
function FieldSun({ pack, hour, minute, onChange }: PickerProps) {
  const c = pack.colors;
  const W = 300;
  const H = 170;
  const CX = W / 2;
  const CY = 150;
  const R = 120;
  const now = useRef({ hour, minute });
  now.current = { hour, minute };

  const sunPan = useBoxDrag((x, y) => {
    let a = angleOf(x - CX, y - CY);
    if (Math.abs(a) > 90) a = a > 0 ? 90 : -90; // below the horizon: stick to the nearest end
    const v = Math.round(((a + 90) / 180) * 23);
    if (v !== now.current.hour) {
      tick();
      onChange(v, now.current.minute);
    }
  });

  const [mw, setMw] = useState(0);
  const minPan = useBoxDrag((x) => {
    if (!mw) return;
    const v = Math.max(0, Math.min(59, Math.round((x / mw) * 59)));
    if (v !== now.current.minute) {
      tick();
      onChange(now.current.hour, v);
    }
  });

  const sunDeg = -90 + (hour / 23) * 180;
  const sun = pt(CX, CY, R, sunDeg);
  const daylight = hour >= 6 && hour <= 20;

  return (
    <View style={{ alignItems: 'center', gap: space.md }}>
      <Text style={{ fontFamily: pack.fonts.display, fontSize: 56, color: c.text, fontVariant: ['tabular-nums'] }}>
        {pad2(hour)}:{pad2(minute)}
      </Text>
      <View style={{ width: W, height: H }} {...sunPan.panHandlers} accessibilityLabel="Drag the sun to set the hour">
        <Svg width={W} height={H} pointerEvents="none">
          <Path d={arc(CX, CY, R, -90, 90)} stroke={c.border} strokeWidth={2} strokeDasharray="4 7" fill="none" />
          <Circle cx={sun.x} cy={sun.y} r={30} fill={c.warn} opacity={0.14} />
          <Circle cx={sun.x} cy={sun.y} r={17} fill={daylight ? c.warn : c.textDim} />
          <Path d={`M0 ${CY} C 60 ${CY - 26}, 120 ${CY - 18}, 170 ${CY - 6} S 260 ${CY + 4}, ${W} ${CY - 14} L ${W} ${H} L 0 ${H} Z`} fill={c.surfaceAlt} />
        </Svg>
      </View>
      <View style={{ width: W, height: 44, justifyContent: 'center' }} onLayout={(e) => setMw(e.nativeEvent.layout.width)} {...minPan.panHandlers} accessibilityLabel="Slide to set the minutes">
        <View pointerEvents="none" style={{ height: 6, borderRadius: 3, backgroundColor: c.surfaceAlt }} />
        <View pointerEvents="none" style={{ position: 'absolute', left: 0, width: `${(minute / 59) * 100}%`, height: 6, borderRadius: 3, backgroundColor: c.accent }} />
        <View pointerEvents="none" style={{ position: 'absolute', left: (minute / 59) * (W - 28), width: 28, height: 28, borderRadius: 14, backgroundColor: c.accent, borderWidth: 4, borderColor: c.surface }} />
      </View>
      <Text style={{ fontFamily: pack.fonts.body, fontSize: 13, color: c.textDim, marginTop: -8 }}>sun = hour · slider = minutes</Text>
    </View>
  );
}

// ───────────────────────── Signal: 90s clock-radio LCD with ▲▼ buttons (hold to repeat)
function RepeatButton({ icon, label, onStep }: { icon: 'caret-up-sharp' | 'caret-down-sharp'; label: string; onStep: () => void }) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const step = useRef(onStep);
  step.current = onStep;
  const stop = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  };
  useEffect(() => stop, []);
  const run = (delay: number) => {
    timer.current = setTimeout(() => {
      step.current();
      run(Math.max(45, delay * 0.8));
    }, delay);
  };
  return (
    <Pressable
      onPressIn={() => {
        step.current();
        run(380);
      }}
      onPressOut={stop}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [{ width: 64, height: 44, backgroundColor: '#C0C0C0', alignItems: 'center', justifyContent: 'center' }, bevel(pressed)]}
    >
      <Ionicons name={icon} size={20} color="#000" />
    </Pressable>
  );
}

function SignalClock({ pack, hour, minute, onChange }: PickerProps) {
  const now = useRef({ hour, minute });
  now.current = { hour, minute };
  const bump = (part: 'h' | 'm', d: number) => {
    tick();
    const { hour: h, minute: m } = now.current;
    part === 'h' ? onChange(wrap(h + d, 23), m) : onChange(h, wrap(m + d, 59));
  };
  const col = (part: 'h' | 'm', label: string) => (
    <View style={{ alignItems: 'center', gap: 6 }}>
      <RepeatButton icon="caret-up-sharp" label={`${label} up`} onStep={() => bump(part, 1)} />
      <RepeatButton icon="caret-down-sharp" label={`${label} down`} onStep={() => bump(part, -1)} />
    </View>
  );
  return (
    <View style={{ gap: space.sm }}>
      <View style={[{ backgroundColor: '#14100A', alignItems: 'center', paddingVertical: 4 }, bevel(true)]}>
        <Text style={{ fontFamily: pack.fonts.display, fontSize: 104, color: '#FFB000', lineHeight: 104 }}>
          {pad2(hour)}:{pad2(minute)}
        </Text>
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-around' }}>
        {col('h', 'Hour')}
        {col('m', 'Minutes')}
      </View>
      <Text style={{ fontFamily: pack.fonts.body, fontSize: 18, color: '#3F3F3F', textAlign: 'center' }}>Hold a button to run fast</Text>
    </View>
  );
}

export function SignaturePicker(props: PickerProps) {
  switch (props.pack.id) {
    case 'lumen':
      return <LumenDial {...props} />;
    case 'paper':
      return <PaperTapes {...props} />;
    case 'field':
      return <FieldSun {...props} />;
    case 'signal':
      return <SignalClock {...props} />;
  }
}

