import React, { ReactNode, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Modal,
  Pressable,
  ScrollView,
  StyleProp,
  StyleSheet,
  Text,
  TextStyle,
  View,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';
import { useDesign } from '../context/DesignContext';
import { BEVEL, DesignPack } from '../theme/packs';

/**
 * Design-system primitives. Every screen is built from these, so the 4 design
 * packs only differ in tokens (src/theme/packs.ts) and a few per-pack branches here.
 */

export const space = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48 } as const;
export type IconName = keyof typeof Ionicons.glyphMap;

/** Text colour for text placed directly on the page background. */
export function onBg(pack: DesignPack): string {
  return pack.chrome === 'bevel' ? '#FFFFFF' : pack.colors.text;
}
export function onBgDim(pack: DesignPack): string {
  return pack.chrome === 'bevel' ? '#DDEFEF' : pack.colors.textDim;
}

/** 90s raised / sunken 3-D edge. */
export function bevel(sunken = false): ViewStyle {
  return {
    borderWidth: 2,
    borderTopColor: sunken ? BEVEL.shadow : BEVEL.light,
    borderLeftColor: sunken ? BEVEL.shadow : BEVEL.light,
    borderBottomColor: sunken ? BEVEL.light : BEVEL.dark,
    borderRightColor: sunken ? BEVEL.light : BEVEL.dark,
  };
}

/** Hand-drawn notebook edge: uneven corners make the box look drawn with a pen. */
export const SKETCH_RADII = { borderTopLeftRadius: 18, borderTopRightRadius: 6, borderBottomRightRadius: 16, borderBottomLeftRadius: 7 };
const INK = '#2A2926';

/** Left margin of the notebook page; content always starts right of it. */
export const NOTEBOOK_MARGIN = 34;
export const RULE = '#C9D6DF';

/**
 * Dot-grid notebook page (bullet-journal style) with a red margin line.
 * Dots never cut through letters the way free ruled lines do; the ruled lines
 * live inside cards, under each row, so text always sits on a line.
 */
export function NotebookPage({ dot = '#CDC3AE', margin = '#E3A49A', step = 22 }: { dot?: string; margin?: string; step?: number }) {
  const cols = Math.ceil(480 / step);
  const rows = Math.ceil(1000 / step);
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Svg width="100%" height="100%">
        {Array.from({ length: rows * cols }, (_, k) => (
          <Circle key={k} cx={(k % cols) * step + step / 2} cy={Math.floor(k / cols) * step + step / 2} r={1.1} fill={dot} />
        ))}
      </Svg>
      <View style={{ position: 'absolute', top: 0, bottom: 0, left: NOTEBOOK_MARGIN, width: 1.5, backgroundColor: margin }} />
    </View>
  );
}

// ───────────────────────── Text
type Variant = 'title' | 'headline' | 'body' | 'caption' | 'label';

export function Txt({
  variant = 'body',
  color,
  style,
  children,
  numberOfLines,
}: {
  variant?: Variant;
  color?: string;
  style?: StyleProp<TextStyle>;
  children: ReactNode;
  numberOfLines?: number;
}) {
  const { pack } = useDesign();
  const f = pack.fonts;
  const retro = pack.chrome === 'bevel';
  const hand = pack.chrome === 'sketch';
  const pick = (normal: number, r: number, h: number) => (retro ? r : hand ? h : normal);
  const base: Record<Variant, TextStyle> = {
    title: { fontFamily: f.strong, fontSize: pick(26, 32, 38), letterSpacing: retro || hand ? 0 : -0.4 },
    headline: { fontFamily: hand ? f.strong : f.medium, fontSize: pick(17, 23, 27) },
    body: { fontFamily: f.body, fontSize: pick(15, 21, 19), lineHeight: pick(21, 22, 24) },
    caption: { fontFamily: f.body, fontSize: pick(13, 18, 16), lineHeight: pick(18, 19, 20) },
    label: {
      fontFamily: hand ? f.strong : f.medium,
      fontSize: pick(11.5, 17, 20),
      letterSpacing: pack.labelCaps ? 1.4 : 0.4,
      textTransform: pack.labelCaps ? 'uppercase' : 'none',
    },
  };
  const defaultColor = variant === 'caption' || variant === 'label' ? pack.colors.textDim : pack.colors.text;
  return (
    <Text numberOfLines={numberOfLines} style={[base[variant], { color: color ?? defaultColor }, style]}>
      {children}
    </Text>
  );
}

// ───────────────────────── Screen + header
export function Screen({
  children,
  scroll = true,
  header,
  contentStyle,
}: {
  children: ReactNode;
  scroll?: boolean;
  header?: ReactNode;
  contentStyle?: StyleProp<ViewStyle>;
}) {
  const { pack } = useDesign();
  const insets = useSafeAreaInsets();
  const left = pack.chrome === 'sketch' ? { paddingLeft: NOTEBOOK_MARGIN + 12 } : null;
  const body = scroll ? (
    <ScrollView
      contentContainerStyle={[{ padding: space.md, paddingBottom: insets.bottom + space.xl, gap: space.md }, left, contentStyle]}
      showsVerticalScrollIndicator={false}
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[{ flex: 1, padding: space.md, paddingBottom: insets.bottom + space.md, gap: space.md }, left, contentStyle]}>
      {children}
    </View>
  );
  return (
    <View style={{ flex: 1, backgroundColor: pack.colors.bg, paddingTop: insets.top }}>
      {pack.chrome === 'sketch' && <NotebookPage />}
      {header}
      {body}
    </View>
  );
}

export function Header({ title, onBack, right }: { title: string; onBack?: () => void; right?: ReactNode }) {
  const { pack } = useDesign();
  if (pack.chrome === 'bevel') {
    // 90s window title bar
    return (
      <View style={{ marginHorizontal: space.md, marginTop: space.sm, ...bevel(), backgroundColor: pack.colors.surface, padding: 2 }}>
        <View style={{ backgroundColor: BEVEL.titleBar, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 6, height: 30, gap: 8 }}>
          {onBack && (
            <Pressable
              onPress={onBack}
              accessibilityRole="button"
              accessibilityLabel="Back"
              hitSlop={10}
              style={({ pressed }) => [{ width: 22, height: 20, backgroundColor: pack.colors.surface, alignItems: 'center', justifyContent: 'center' }, bevel(pressed)]}
            >
              <Ionicons name="caret-back-sharp" size={12} color="#000" />
            </Pressable>
          )}
          <Text style={{ flex: 1, color: BEVEL.titleText, fontFamily: pack.fonts.strong, fontSize: 21 }} numberOfLines={1}>
            {title}
          </Text>
          {right}
        </View>
      </View>
    );
  }
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: space.sm, paddingLeft: pack.chrome === 'sketch' ? NOTEBOOK_MARGIN + 4 : space.sm, height: 52, gap: space.xs }}>
      {onBack ? (
        <Pressable
          onPress={onBack}
          accessibilityRole="button"
          accessibilityLabel="Back"
          hitSlop={8}
          style={({ pressed }) => ({ width: 44, height: 44, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.5 : 1 })}
        >
          <Ionicons name={pack.chrome === 'sketch' ? 'arrow-back' : 'chevron-back'} size={24} color={pack.colors.text} />
        </Pressable>
      ) : (
        <View style={{ width: space.sm }} />
      )}
      <Txt variant={pack.chrome === 'sketch' ? 'title' : 'headline'} color={pack.colors.text} style={{ flex: 1 }}>
        {title}
      </Txt>
      {right}
    </View>
  );
}

// ───────────────────────── Surfaces
export function Surface({
  children,
  style,
  onPress,
  disabled,
  accessibilityLabel,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
  disabled?: boolean;
  accessibilityLabel?: string;
}) {
  const { pack } = useDesign();
  const c = pack.colors;
  const look = (pressed: boolean): ViewStyle => {
    if (pack.chrome === 'bevel') return { backgroundColor: c.surface, padding: space.md, ...bevel() };
    if (pack.chrome === 'sketch')
      // index card on the notebook
      return {
        backgroundColor: pressed ? c.surfaceAlt : c.surface,
        borderRadius: pack.radius.card,
        borderWidth: 1,
        borderColor: c.border,
        padding: space.md,
        boxShadow: '0 2px 0 rgba(42, 41, 38, 0.10)',
      };
    return {
      backgroundColor: pressed ? c.surfaceAlt : c.surface,
      borderRadius: pack.radius.card,
      borderCurve: 'continuous',
      padding: space.lg - 4,
    };
  };
  if (!onPress) return <View style={[look(false), style]}>{children}</View>;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => [look(pressed), style]}
    >
      {children}
    </Pressable>
  );
}

// ───────────────────────── Buttons
export function Btn({
  title,
  icon,
  onPress,
  variant = 'primary',
  disabled,
  style,
  accessibilityLabel,
}: {
  title: string;
  icon?: IconName;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'ghost';
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}) {
  const { pack } = useDesign();
  const c = pack.colors;
  const retro = pack.chrome === 'bevel';
  const hand = pack.chrome === 'sketch';
  const fg = retro || (hand && variant !== 'ghost') ? (retro ? '#000' : INK) : variant === 'primary' ? c.onAccent : variant === 'secondary' ? c.text : c.accent;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      accessibilityState={{ disabled: !!disabled }}
      style={({ pressed }) => [
        {
          minHeight: 50,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: space.sm,
          paddingHorizontal: space.lg,
          opacity: disabled ? 0.45 : 1,
        },
        retro
          ? { backgroundColor: c.surface, ...bevel(pressed), ...(variant === 'primary' ? { outlineWidth: 1, outlineColor: '#000', outlineStyle: 'solid' } : null) }
          : hand
          ? variant === 'ghost'
            ? { opacity: disabled ? 0.45 : pressed ? 0.6 : 1 }
            : {
                ...SKETCH_RADII,
                borderWidth: 2,
                borderColor: INK,
                backgroundColor: variant === 'primary' ? pack.marker : 'transparent',
                opacity: disabled ? 0.45 : pressed ? 0.7 : 1,
                transform: [{ rotate: '-0.6deg' }],
              }
          : {
              borderRadius: pack.radius.control,
              borderCurve: 'continuous',
              backgroundColor: variant === 'primary' ? c.accent : variant === 'secondary' ? c.surfaceAlt : 'transparent',
              opacity: disabled ? 0.45 : pressed ? 0.75 : 1,
            },
        style,
      ]}
    >
      {icon && <Ionicons name={icon} size={18} color={fg} />}
      <Text style={{ color: fg, fontFamily: pack.fonts.medium, fontSize: retro ? 22 : hand ? 20 : 15.5, letterSpacing: pack.labelCaps && !retro ? 0.6 : 0, textDecorationLine: hand && variant === 'ghost' ? 'underline' : 'none' }}>
        {title}
      </Text>
    </Pressable>
  );
}

/**
 * Hold-to-confirm: the action only fires after holding for `holdMs`, so a stray
 * tap can never arm the alarm. Screen readers get a direct "activate" action.
 */
export function HoldButton({
  title,
  holdingTitle,
  icon,
  onComplete,
  disabled,
  holdMs = 900,
  tone = 'accent',
}: {
  title: string;
  holdingTitle?: string;
  icon?: IconName;
  onComplete: () => void;
  disabled?: boolean;
  holdMs?: number;
  tone?: 'accent' | 'quiet';
}) {
  const { pack } = useDesign();
  const c = pack.colors;
  const retro = pack.chrome === 'bevel';
  const fill = useRef(new Animated.Value(0)).current;
  const [holding, setHolding] = useState(false);
  const anim = useRef<Animated.CompositeAnimation | null>(null);

  const start = () => {
    if (disabled) return;
    setHolding(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    anim.current = Animated.timing(fill, { toValue: 1, duration: holdMs, easing: Easing.linear, useNativeDriver: false });
    anim.current.start(({ finished }) => {
      if (finished) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
        setHolding(false);
        fill.setValue(0);
        onComplete();
      }
    });
  };
  const stop = () => {
    anim.current?.stop();
    setHolding(false);
    Animated.timing(fill, { toValue: 0, duration: 180, useNativeDriver: false }).start();
  };

  const width = fill.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });
  const quiet = tone === 'quiet';
  const hand = pack.chrome === 'sketch';
  const bg = retro ? c.surface : hand ? (quiet ? 'transparent' : pack.marker!) : quiet ? c.surfaceAlt : c.accent;
  const fg = retro ? '#000' : hand ? INK : quiet ? c.text : c.onAccent;
  // pencil shading fills the button while you hold (sketch)
  const fillColor = retro ? BEVEL.titleBar : hand ? 'rgba(42, 41, 38, 0.22)' : quiet ? c.border : `${c.onAccent}33`;

  return (
    <Pressable
      onPressIn={start}
      onPressOut={stop}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityHint="Press and hold"
      accessibilityState={{ disabled: !!disabled }}
      accessibilityActions={[{ name: 'activate' }]}
      onAccessibilityAction={(e) => {
        if (e.nativeEvent.actionName === 'activate' && !disabled) onComplete();
      }}
      style={[
        { height: 62, overflow: 'hidden', justifyContent: 'center', opacity: disabled ? 0.45 : 1, backgroundColor: bg },
        retro
          ? bevel(holding)
          : hand
          ? { ...SKETCH_RADII, borderWidth: 2.5, borderColor: INK, transform: [{ rotate: '-0.5deg' }] }
          : { borderRadius: pack.radius.control, borderCurve: 'continuous' },
      ]}
    >
      <Animated.View style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width, backgroundColor: fillColor }} />
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.sm }}>
        {icon && <Ionicons name={icon} size={20} color={retro && holding ? '#000' : fg} />}
        <Text style={{ color: fg, fontFamily: pack.fonts.strong, fontSize: retro ? 24 : hand ? 30 : 16.5, letterSpacing: pack.labelCaps && !retro ? 0.8 : 0 }}>
          {holding && holdingTitle ? holdingTitle : title}
        </Text>
      </View>
    </Pressable>
  );
}

// ───────────────────────── Chips, rows, toggles
export function Chip({
  icon,
  label,
  ok,
  onPress,
  disabled,
  accessibilityLabel,
  tint,
  tilt = 0,
}: {
  icon: IconName;
  label: string;
  ok: boolean;
  /** sticky-note colour and tilt (sketch only) */
  tint?: string;
  tilt?: number;
  onPress?: () => void;
  disabled?: boolean;
  accessibilityLabel?: string;
}) {
  const { pack } = useDesign();
  const c = pack.colors;
  const retro = pack.chrome === 'bevel';
  const stateColor = ok ? c.ok : c.warn;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? `${label}: ${ok ? 'ready' : 'needs setup'}`}
      style={({ pressed }) => [
        { flex: 1, minHeight: 64, alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: space.sm, opacity: disabled ? 0.5 : 1 },
        retro
          ? { backgroundColor: c.surface, ...bevel(pressed) }
          : pack.chrome === 'sketch'
          ? {
              backgroundColor: tint ?? '#FBE7A1',
              borderRadius: 2,
              transform: [{ rotate: `${tilt}deg` }, { translateY: pressed ? 2 : 0 }],
              boxShadow: '0 3px 4px rgba(42, 41, 38, 0.18)',
            }
          : { backgroundColor: pressed ? c.border : c.surfaceAlt, borderRadius: pack.id === 'field' ? 22 : 18, borderCurve: 'continuous' },
      ]}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <Ionicons name={icon} size={18} color={c.text} />
        <Ionicons name={ok ? 'checkmark-circle' : 'ellipse-outline'} size={14} color={stateColor} />
      </View>
      <Txt variant="caption" color={c.text} numberOfLines={1}>
        {label}
      </Txt>
    </Pressable>
  );
}

export function Row({
  icon,
  title,
  value,
  valueTone,
  onPress,
  right,
  disabled,
  last,
  accessibilityLabel,
}: {
  icon?: IconName;
  title: string;
  value?: string;
  valueTone?: 'ok' | 'warn' | 'danger' | 'dim';
  onPress?: () => void;
  right?: ReactNode;
  disabled?: boolean;
  last?: boolean;
  accessibilityLabel?: string;
}) {
  const { pack } = useDesign();
  const c = pack.colors;
  const toneColor = valueTone === 'ok' ? c.ok : valueTone === 'warn' ? c.warn : valueTone === 'danger' ? c.danger : c.textDim;
  const content = (pressed: boolean) => (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: space.md - 4,
        minHeight: 54,
        paddingVertical: space.sm,
        opacity: disabled ? 0.45 : pressed ? 0.6 : 1,
        borderBottomWidth: pack.chrome === 'sketch' ? 1.2 : last ? 0 : StyleSheet.hairlineWidth * (pack.chrome === 'bevel' ? 2 : 1),
        borderBottomColor: pack.chrome === 'bevel' ? BEVEL.shadow : pack.chrome === 'sketch' ? RULE : c.border,
      }}
    >
      {icon && <Ionicons name={icon} size={20} color={c.text} />}
      <Txt variant="body" color={c.text} style={{ flex: 1 }}>
        {title}
      </Txt>
      {value ? (
        <Txt variant="caption" color={toneColor}>
          {value}
        </Txt>
      ) : null}
      {right}
      {onPress && !right && <Ionicons name="chevron-forward" size={16} color={c.textDim} />}
    </View>
  );
  if (!onPress) return content(false);
  return (
    <Pressable onPress={onPress} disabled={disabled} accessibilityRole="button" accessibilityLabel={accessibilityLabel ?? title}>
      {({ pressed }) => content(pressed)}
    </Pressable>
  );
}

export function Toggle({ value, onChange, label, disabled }: { value: boolean; onChange: (v: boolean) => void; label: string; disabled?: boolean }) {
  const { pack } = useDesign();
  const c = pack.colors;
  const x = useRef(new Animated.Value(value ? 1 : 0)).current;
  useEffect(() => {
    Animated.timing(x, { toValue: value ? 1 : 0, duration: 160, useNativeDriver: true }).start();
  }, [value]);
  const a11y = {
    accessibilityRole: 'switch' as const,
    accessibilityLabel: label,
    accessibilityState: { checked: value, disabled: !!disabled },
  };
  if (pack.chrome === 'bevel') {
    return (
      <Pressable onPress={() => onChange(!value)} disabled={disabled} hitSlop={10} {...a11y} style={[{ width: 26, height: 26, backgroundColor: '#FFF', alignItems: 'center', justifyContent: 'center', opacity: disabled ? 0.5 : 1 }, bevel(true)]}>
        {value && <Ionicons name="checkmark-sharp" size={20} color="#000" />}
      </Pressable>
    );
  }
  if (pack.chrome === 'sketch') {
    return (
      <Pressable onPress={() => onChange(!value)} disabled={disabled} hitSlop={10} {...a11y} style={{ width: 30, height: 30, borderWidth: 2, borderColor: INK, borderTopLeftRadius: 6, borderTopRightRadius: 3, borderBottomRightRadius: 7, borderBottomLeftRadius: 2, alignItems: 'center', justifyContent: 'center', opacity: disabled ? 0.45 : 1, backgroundColor: c.surface }}>
        {value && <Ionicons name="checkmark" size={30} color={c.accent} style={{ marginTop: -6, marginLeft: 6 }} />}
      </Pressable>
    );
  }
  const W = 50;
  const H = 30;
  return (
    <Pressable
      onPress={() => onChange(!value)}
      disabled={disabled}
      hitSlop={8}
      {...a11y}
      style={{
        width: W,
        height: H,
        borderRadius: H / 2,
        backgroundColor: value ? c.accent : c.border,
        padding: 3,
        opacity: disabled ? 0.45 : 1,
      }}
    >
      <Animated.View
        style={{
          width: H - 6,
          height: H - 6,
          borderRadius: (H - 6) / 2,
          backgroundColor: value ? c.onAccent : c.surface,
          transform: [{ translateX: x.interpolate({ inputRange: [0, 1], outputRange: [0, W - H] }) }],
        }}
      />
    </Pressable>
  );
}

/** Small ⓘ that reveals one short explanation instead of a paragraph on screen. */
export function InfoTip({ text }: { text: string }) {
  const { pack } = useDesign();
  const [open, setOpen] = useState(false);
  return (
    <View>
      <Pressable onPress={() => setOpen((o) => !o)} hitSlop={10} accessibilityRole="button" accessibilityLabel={open ? 'Hide explanation' : 'Show explanation'}>
        <Ionicons name={open ? 'information-circle' : 'information-circle-outline'} size={20} color={pack.colors.textDim} />
      </Pressable>
      {open && (
        <View style={{ marginTop: space.sm }}>
          <Txt variant="caption">{text}</Txt>
        </View>
      )}
    </View>
  );
}

/** Row with an ⓘ that expands the explanation under the row. */
export function ExplainRow({ title, explain, right }: { title: string; explain: string; right?: ReactNode }) {
  const { pack } = useDesign();
  const [open, setOpen] = useState(false);
  return (
    <View style={{ paddingVertical: space.sm }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm, minHeight: 44 }}>
        <Txt variant="body" color={pack.colors.text} style={{ flex: 1 }}>
          {title}
        </Txt>
        <Pressable onPress={() => setOpen((o) => !o)} hitSlop={10} accessibilityRole="button" accessibilityLabel={open ? 'Hide explanation' : 'Show explanation'}>
          <Ionicons name={open ? 'information-circle' : 'information-circle-outline'} size={20} color={pack.colors.textDim} />
        </Pressable>
        {right}
      </View>
      {open && <Txt variant="caption">{explain}</Txt>}
    </View>
  );
}

export function SectionLabel({ children }: { children: string }) {
  const { pack } = useDesign();
  return (
    <Txt variant="label" color={onBgDim(pack)} style={{ marginTop: space.sm, marginLeft: pack.chrome === 'soft' ? space.xs : 0 }}>
      {children}
    </Txt>
  );
}

export function Stepper({ value, onChange, min, max, step, unit }: { value: number; onChange: (v: number) => void; min: number; max: number; step: number; unit: string }) {
  const { pack } = useDesign();
  const c = pack.colors;
  const retro = pack.chrome === 'bevel';
  const btn = (icon: IconName, delta: number, label: string) => (
    <Pressable
      onPress={() => onChange(Math.min(max, Math.max(min, value + delta)))}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [
        { width: 56, height: 56, alignItems: 'center', justifyContent: 'center' },
        retro ? { backgroundColor: c.surface, ...bevel(pressed) } : { borderRadius: pack.radius.control === 999 ? 28 : pack.radius.control, backgroundColor: pressed ? c.border : c.surfaceAlt },
      ]}
    >
      <Ionicons name={icon} size={22} color={c.text} />
    </Pressable>
  );
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
      {btn('remove', -step, `Decrease ${unit}`)}
      <View style={{ alignItems: 'center' }}>
        <Text style={{ fontFamily: pack.fonts.display, fontSize: 56, color: c.text, fontVariant: ['tabular-nums'] }}>{value}</Text>
        <Txt variant="label">{unit}</Txt>
      </View>
      {btn('add', step, `Increase ${unit}`)}
    </View>
  );
}

// ───────────────────────── Bottom sheet
export function Sheet({ visible, onClose, children, title }: { visible: boolean; onClose: () => void; children: ReactNode; title?: string }) {
  const { pack } = useDesign();
  const insets = useSafeAreaInsets();
  const y = useRef(new Animated.Value(600)).current;
  useEffect(() => {
    if (visible) {
      y.setValue(600);
      Animated.spring(y, { toValue: 0, damping: 22, stiffness: 220, mass: 0.9, useNativeDriver: true }).start();
    }
  }, [visible]);
  const retro = pack.chrome === 'bevel';
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.55)' }} onPress={onClose} accessibilityLabel="Close" />
      <Animated.View
        style={[
          {
            position: 'absolute',
            left: retro ? space.sm : 0,
            right: retro ? space.sm : 0,
            bottom: retro ? insets.bottom + space.sm : 0,
            backgroundColor: pack.colors.surface,
            paddingBottom: retro ? space.md : insets.bottom + space.md,
            transform: [{ translateY: y }],
          },
          retro ? bevel() : { borderTopLeftRadius: Math.min(pack.radius.card, 28), borderTopRightRadius: Math.min(pack.radius.card, 28), borderCurve: 'continuous' },
        ]}
      >
        {retro ? (
          title ? <Header title={title} onBack={onClose} /> : null
        ) : (
          <View style={{ alignItems: 'center', paddingTop: space.sm, paddingBottom: space.xs }}>
            <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: pack.colors.border }} />
          </View>
        )}
        <View style={{ paddingHorizontal: space.md, paddingTop: space.sm, gap: space.md }}>
          {!retro && title ? <Txt variant="headline">{title}</Txt> : null}
          {children}
        </View>
      </Animated.View>
    </Modal>
  );
}
