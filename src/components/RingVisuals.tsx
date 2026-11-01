import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Defs, Ellipse, Line, Path, RadialGradient, Rect, Stop, LinearGradient as SvgLinear } from 'react-native-svg';

const SCANLINES = Array.from({ length: 260 }, (_, i) => i);
import { DesignPack } from '../theme/packs';

/**
 * Dim, calm visuals for the ringing / snoozed screens (one per design pack).
 * `progress` is the movement mission, 0..1. Purely decorative: no logic here.
 */

/** Full-screen background layer, drawn behind everything. */
export function RingBackdrop({ pack, progress }: { pack: DesignPack; progress: number }) {
  const r = pack.ring;
  const p = Math.max(0, Math.min(1, progress));
  switch (pack.id) {
    case 'ember':
      // A slow "sunrise lamp": the warm glow grows from the bottom as you move.
      return (
        <View style={StyleSheet.absoluteFill} pointerEvents="none"><Svg width="100%" height="100%" viewBox="0 0 100 200" preserveAspectRatio="none">
          <Defs>
            <RadialGradient id="cgEmberGlow">
              <Stop offset="0" stopColor={r.glow} stopOpacity={0.2 + p * 0.3} />
              <Stop offset="0.5" stopColor={r.glow} stopOpacity={0.06 + p * 0.12} />
              <Stop offset="1" stopColor={r.glow} stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Ellipse cx="50" cy="205" rx={75 + p * 45} ry={55 + p * 75} fill="url(#cgEmberGlow)" />
        </Svg></View>
      );
    case 'field': {
      // A sun rising over a hill. The sun climbs with movement.
      const sunCy = 186 - p * 42; // viewBox units (0-200)
      return (
        <View style={StyleSheet.absoluteFill} pointerEvents="none"><Svg width="100%" height="100%" viewBox="0 0 100 200" preserveAspectRatio="xMidYMax slice">
          <Defs>
            <SvgLinear id="cgFieldSky" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={r.bg} />
              <Stop offset="1" stopColor={r.glow} stopOpacity={0.06 + p * 0.16} />
            </SvgLinear>
            <RadialGradient id="cgFieldHalo" cx="50%" cy="50%" r="50%">
              <Stop offset="0" stopColor={r.glow} stopOpacity={0.35 * (0.4 + p)} />
              <Stop offset="1" stopColor={r.glow} stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Rect x="0" y="0" width="100" height="200" fill="url(#cgFieldSky)" />
          <Circle cx="62" cy={sunCy} r="26" fill="url(#cgFieldHalo)" />
          <Circle cx="62" cy={sunCy} r="9" fill={r.accent} opacity={0.5 + p * 0.3} />
          <Path d="M0 168 C 22 150, 40 152, 58 162 S 88 170, 100 158 L100 200 L0 200 Z" fill="#162019" />
          <Path d="M0 182 C 26 170, 52 176, 70 184 S 92 188, 100 182 L100 200 L0 200 Z" fill="#101812" />
        </Svg></View>
      );
    }
    case 'signal':
      // Amber CRT: a soft phosphor bloom plus faint scanlines.
      return (
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          <Svg width="100%" height="100%" style={StyleSheet.absoluteFill} viewBox="0 0 100 200" preserveAspectRatio="none">
            <Defs>
              <RadialGradient id="cgCrtBloom">
                <Stop offset="0" stopColor={r.glow} stopOpacity={0.07 + p * 0.06} />
                <Stop offset="1" stopColor={r.glow} stopOpacity={0} />
              </RadialGradient>
            </Defs>
            <Ellipse cx="50" cy="80" rx="80" ry="95" fill="url(#cgCrtBloom)" />
          </Svg>
          {SCANLINES.map((i) => (
            <View key={i} style={{ position: 'absolute', left: 0, right: 0, top: i * 4, height: 1.5, backgroundColor: '#000000', opacity: 0.35 }} />
          ))}
        </View>
      );
    default:
      return null; // Paper: flat sepia
  }
}

/** The movement progress element in the middle of the ringing screen. */
export function MoveProgress({ pack, count, target }: { pack: DesignPack; count: number; target: number }) {
  const r = pack.ring;
  const p = target > 0 ? Math.min(1, count / target) : 1;
  const label = (
    <View style={{ position: 'absolute', alignItems: 'center' }}>
      <Text style={{ fontFamily: pack.fonts.display, fontSize: 44, color: r.text, fontVariant: ['tabular-nums'] }}>{count}</Text>
      <Text style={{ fontFamily: pack.fonts.body, fontSize: 13, color: r.textDim }}>of {target}</Text>
    </View>
  );

  if (pack.id === 'signal') {
    const cells = 12;
    const lit = Math.round(p * cells);
    return (
      <View style={{ alignItems: 'center', gap: 6 }}>
        <Text style={{ fontFamily: pack.fonts.display, fontSize: 34, color: r.text, letterSpacing: 1 }}>
          {'['}
          <Text style={{ color: r.accent }}>{'█'.repeat(lit)}</Text>
          <Text style={{ color: r.track }}>{'█'.repeat(cells - lit)}</Text>
          {']'}
        </Text>
        <Text style={{ fontFamily: pack.fonts.display, fontSize: 26, color: r.textDim }}>
          MOVES {String(count).padStart(2, '0')}/{String(target).padStart(2, '0')}
        </Text>
      </View>
    );
  }

  if (pack.id === 'paper') {
    // Printed dial: 60 ticks, lit ones show progress.
    const N = 60;
    const lit = Math.round(p * N);
    const size = 200;
    const c = size / 2;
    return (
      <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
        <Svg width={size} height={size}>
          {Array.from({ length: N }, (_, i) => {
            const a = (i / N) * Math.PI * 2 - Math.PI / 2;
            const long = i % 5 === 0;
            const r1 = c - 4;
            const r2 = c - (long ? 18 : 11);
            return (
              <Line
                key={i}
                x1={c + r1 * Math.cos(a)}
                y1={c + r1 * Math.sin(a)}
                x2={c + r2 * Math.cos(a)}
                y2={c + r2 * Math.sin(a)}
                stroke={i < lit ? r.accent : r.track}
                strokeWidth={long ? 2.4 : 1.4}
                strokeLinecap="butt"
              />
            );
          })}
        </Svg>
        {label}
      </View>
    );
  }

  if (pack.id === 'field') {
    // The hill backdrop carries the progress; keep the centre simple and round.
    return (
      <View style={{ width: 150, height: 150, borderRadius: 75, borderWidth: 1.5, borderColor: r.track, alignItems: 'center', justifyContent: 'center' }}>
        {label}
      </View>
    );
  }

  // Ember: thin arc ring
  const size = 190;
  const stroke = 3;
  const rad = (size - stroke * 2) / 2;
  const circ = 2 * Math.PI * rad;
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={{ transform: [{ rotate: '-90deg' }] }}>
        <Circle cx={size / 2} cy={size / 2} r={rad} stroke={r.track} strokeWidth={stroke} fill="none" />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={rad}
          stroke={r.accent}
          strokeWidth={stroke}
          fill="none"
          strokeDasharray={`${circ} ${circ}`}
          strokeDashoffset={circ * (1 - p)}
          strokeLinecap="round"
        />
      </Svg>
      {label}
    </View>
  );
}

/** Small decorative hill for Field's Home card. */
export function FieldHill({ color, sun }: { color: string; sun: string }) {
  return (
    <Svg width="100%" height={70} viewBox="0 0 300 70" preserveAspectRatio="none" pointerEvents="none">
      <Circle cx="210" cy="40" r="14" fill={sun} opacity={0.85} />
      <Path d="M0 50 C 60 26, 120 30, 170 44 S 260 58, 300 40 L300 70 L0 70 Z" fill={color} />
    </Svg>
  );
}

/** Soft glow behind Ember's Home clock when armed. */
export function EmberHalo({ color, strength }: { color: string; strength: number }) {
  return (
    <Svg style={StyleSheet.absoluteFill} viewBox="0 0 100 100" preserveAspectRatio="none" pointerEvents="none">
      <Defs>
        <RadialGradient id="cgEmberHalo">
          <Stop offset="0" stopColor={color} stopOpacity={0.22 * strength} />
          <Stop offset="1" stopColor={color} stopOpacity={0} />
        </RadialGradient>
      </Defs>
      <Ellipse cx="50" cy="55" rx="60" ry="55" fill="url(#cgEmberHalo)" />
    </Svg>
  );
}
