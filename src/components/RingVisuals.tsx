import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Defs, Ellipse, Line, Path, RadialGradient, Rect, Stop, LinearGradient as SvgLinear } from 'react-native-svg';
import { DesignPack } from '../theme/packs';
import { NotebookPage } from './ui';

const SCANLINES = Array.from({ length: 260 }, (_, i) => i);

/**
 * Dim, calm visuals for the ringing / snoozed screens (one per design pack).
 * `progress` is the movement mission, 0..1. Purely decorative: no logic here.
 */

/** Full-screen background layer, drawn behind everything. */
export function RingBackdrop({ pack, progress }: { pack: DesignPack; progress: number }) {
  const r = pack.ring;
  const p = Math.max(0, Math.min(1, progress));
  switch (pack.id) {
    case 'lumen':
      // A soft volt glow behind the progress ring that brightens as you move.
      return (
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          <Svg width="100%" height="100%" viewBox="0 0 100 200" preserveAspectRatio="none">
            <Defs>
              <RadialGradient id="cgLumenGlow">
                <Stop offset="0" stopColor={r.glow} stopOpacity={0.08 + p * 0.16} />
                <Stop offset="1" stopColor={r.glow} stopOpacity={0} />
              </RadialGradient>
            </Defs>
            <Ellipse cx="50" cy="100" rx={45 + p * 25} ry={32 + p * 18} fill="url(#cgLumenGlow)" />
          </Svg>
        </View>
      );
    case 'paper':
      // The notebook at night: dark dot-grid page and a dim margin.
      return <NotebookPage dot="#2E2A25" margin="#3A2C27" />;
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
      return null;
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
    // Hand-drawn tally marks: four strokes and a slash per group of five.
    const groups = Math.ceil(target / 5);
    const jitter = (i: number) => Math.sin(i * 12.9898) * 1.6;
    return (
      <View style={{ alignItems: 'center', gap: 6 }}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', maxWidth: 300, gap: 10 }}>
          {Array.from({ length: groups }, (_, g) => (
            <Svg key={g} width={52} height={58} viewBox="0 0 52 58">
              {[0, 1, 2, 3].map((k) => {
                const i = g * 5 + k;
                if (i >= target) return null;
                const x = 8 + k * 11;
                return (
                  <Line key={k} x1={x + jitter(i)} y1={6 + jitter(i + 3)} x2={x - jitter(i + 1)} y2={52 + jitter(i + 5)} stroke={i < count ? r.accent : r.track} strokeWidth={3} strokeLinecap="round" />
                );
              })}
              {g * 5 + 4 < target && (
                <Line x1={2} y1={44 + jitter(g)} x2={50} y2={12 + jitter(g + 2)} stroke={g * 5 + 4 < count ? r.accent : r.track} strokeWidth={3} strokeLinecap="round" />
              )}
            </Svg>
          ))}
        </View>
        <Text style={{ fontFamily: pack.fonts.display, fontSize: 34, color: r.text }}>
          {count} of {target}
        </Text>
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

  // Lumen: segmented ring, one segment per move.
  const size = 210;
  const n = Math.max(1, Math.min(target, 50));
  const lit = Math.round(p * n);
  const cx = size / 2;
  const rad = size / 2 - 8;
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size}>
        {Array.from({ length: n }, (_, i) => {
          const gapA = Math.min(0.08, (Math.PI * 2) / n / 3);
          const a1 = (i / n) * Math.PI * 2 - Math.PI / 2 + gapA / 2;
          const a2 = ((i + 1) / n) * Math.PI * 2 - Math.PI / 2 - gapA / 2;
          const d = `M ${cx + rad * Math.cos(a1)} ${cx + rad * Math.sin(a1)} A ${rad} ${rad} 0 0 1 ${cx + rad * Math.cos(a2)} ${cx + rad * Math.sin(a2)}`;
          return <Path key={i} d={d} stroke={i < lit ? r.accent : r.track} strokeWidth={8} strokeLinecap="round" fill="none" />;
        })}
      </Svg>
      <View style={{ position: 'absolute', alignItems: 'center' }}>
        <Text style={{ fontFamily: pack.fonts.display, fontSize: 48, color: r.text, fontVariant: ['tabular-nums'] }}>{count}</Text>
        <Text style={{ fontFamily: pack.fonts.body, fontSize: 13, color: r.textDim }}>of {target} moves</Text>
      </View>
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
