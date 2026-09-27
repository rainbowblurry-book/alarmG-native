import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Animated, View, Text, StyleSheet, PanResponder } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';

/**
 * Full spring-physics rotary wheel. Stage 1-4 visual overhaul applied
 * per AI-Studio diagnosis: wider cylinder track + horizon gradients +
 * caliper ticks (depth), color-falloff numerals + gear notches
 * (typography), spring-based detent recoil (motion). The ambient glow
 * backdrop (Stage 2) now lives in AlarmScreen.tsx behind both wheels
 * instead of inside each track (avoids clipping + GPU ring artifacts).
 *
 * RN limitations vs. the original web version, unchanged from before:
 * no CSS blur()/true translateZ perspective (approximated via scale +
 * opacity), no Web Audio synthesis (haptics only via expo-haptics).
 *
 * Note: detentPulse intentionally stays JS-driven (useNativeDriver:
 * false) because it also drives borderColor/backgroundColor
 * interpolation on centerWindow, which isn't safe to mix with a
 * native-driven transform on the same Animated.Value across RN
 * versions. Spring feel is preserved via friction/tension tuning.
 */

const UNIT_PIXELS = 54;
const RENDER_WINDOW = 4;
const CULL_DIFF = 3.6;

const FRICTION_DECAY = 3.4;
const SPRING_K = 65;
const SPRING_D = 14;
const MOMENTUM_VEL_THRESHOLD = 2.0;
const LOCK_DIST_EPSILON = 0.003;
const LOCK_VEL_EPSILON = 0.06;
const FLICK_VEL_CLAMP = 42;
const STILLNESS_CUTOFF_MS = 70;
const HISTORY_MAX = 8;

const TRACK_WIDTH = 146;
const TRACK_HEIGHT = 256;
const RETICLE_HEIGHT = 62;

interface WatchRotaryWheelProps {
  value: number;
  min: number;
  max: number;
  onChange: (val: number) => void;
  side: 'left' | 'right';
  disabled?: boolean;
  accentColor: string;
  accentSecondaryColor?: string;
  textColor: string;
  textSecondaryColor: string;
  backgroundColor: string;
  cardColor: string;
}

export default function WatchRotaryWheel({
  value,
  min,
  max,
  onChange,
  side,
  disabled,
  accentColor,
  textColor,
  textSecondaryColor,
  cardColor,
}: WatchRotaryWheelProps) {
  const range = max - min + 1;

  const [offset, setOffset] = useState<number>(value - min);
  const [isLocked, setIsLocked] = useState<boolean>(true);

  const offsetRef = useRef<number>(value - min);
  const velocityRef = useRef<number>(0);
  const isDraggingRef = useRef<boolean>(false);
  const lastPointerYRef = useRef<number>(0);
  const lastPointerTimeRef = useRef<number>(0);
  const lastFrameTimeRef = useRef<number>(0);
  const animFrameIdRef = useRef<number | null>(null);
  const lastNotchRef = useRef<number>(Math.round(value - min));
  const historyRef = useRef<Array<{ y: number; time: number }>>([]);

  const detentPulse = useRef(new Animated.Value(0)).current;

  const normalizeIndex = useCallback(
    (raw: number): number => {
      let v = raw % range;
      if (v < 0) v += range;
      return Math.round(v);
    },
    [range]
  );

  useEffect(() => {
    if (!isDraggingRef.current && !animFrameIdRef.current) {
      const target = value - min;
      offsetRef.current = target;
      setOffset(target);
      lastNotchRef.current = Math.round(target);
      setIsLocked(true);
    }
  }, [value, min]);

  const fireTickHaptic = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  }, []);

  const fireLockHaptic = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
  }, []);

  // Stage 4: elastic overshoot spring recoil instead of linear timing.
  const triggerRecoil = useCallback(() => {
    detentPulse.setValue(1);
    Animated.spring(detentPulse, {
      toValue: 0,
      friction: 4,
      tension: 180,
      useNativeDriver: false,
    }).start();
  }, [detentPulse]);

  const checkTickCrossing = useCallback(
    (currentPos: number) => {
      const rounded = Math.round(currentPos);
      if (rounded !== lastNotchRef.current) {
        lastNotchRef.current = rounded;
        triggerRecoil();
        fireTickHaptic();
      }
    },
    [triggerRecoil, fireTickHaptic]
  );

  const updatePhysics = useCallback(() => {
    if (isDraggingRef.current) return;

    const now = Date.now();
    const dt = Math.min((now - (lastFrameTimeRef.current || now)) / 1000, 0.035);
    lastFrameTimeRef.current = now;

    let vel = velocityRef.current;
    let pos = offsetRef.current;

    if (Math.abs(vel) > MOMENTUM_VEL_THRESHOLD) {
      vel *= Math.exp(-FRICTION_DECAY * dt);
      pos += vel * dt;

      checkTickCrossing(pos);

      velocityRef.current = vel;
      offsetRef.current = pos;
      setOffset(pos);
      setIsLocked(false);

      animFrameIdRef.current = requestAnimationFrame(updatePhysics);
    } else {
      const target = Math.round(pos);
      const dist = target - pos;
      const springAcc = dist * SPRING_K - vel * SPRING_D;
      vel += springAcc * dt;
      pos += vel * dt;

      if (Math.abs(dist) < LOCK_DIST_EPSILON && Math.abs(vel) < LOCK_VEL_EPSILON) {
        pos = target;
        vel = 0;
        offsetRef.current = pos;
        velocityRef.current = 0;
        setOffset(pos);
        setIsLocked(true);
        animFrameIdRef.current = null;

        onChange(min + normalizeIndex(pos));
        fireLockHaptic();
      } else {
        checkTickCrossing(pos);

        velocityRef.current = vel;
        offsetRef.current = pos;
        setOffset(pos);
        setIsLocked(false);

        animFrameIdRef.current = requestAnimationFrame(updatePhysics);
      }
    }
  }, [checkTickCrossing, normalizeIndex, onChange, min, fireLockHaptic]);

  const disabledRef = useRef(disabled);

  useEffect(() => {
    disabledRef.current = disabled;
  }, [disabled]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => !disabledRef.current,
      onMoveShouldSetPanResponder: () => !disabledRef.current,
      onPanResponderGrant: (evt) => {
        if (animFrameIdRef.current) {
          cancelAnimationFrame(animFrameIdRef.current);
          animFrameIdRef.current = null;
        }
        isDraggingRef.current = true;
        setIsLocked(false);
        velocityRef.current = 0;

        const now = Date.now();
        lastPointerYRef.current = evt.nativeEvent.pageY;
        lastPointerTimeRef.current = now;
        historyRef.current = [{ y: evt.nativeEvent.pageY, time: now }];
      },
      onPanResponderMove: (evt) => {
        const currentY = evt.nativeEvent.pageY;
        const now = Date.now();
        const deltaY = currentY - lastPointerYRef.current;

        const history = historyRef.current;
        history.push({ y: currentY, time: now });
        if (history.length > HISTORY_MAX) history.shift();

        const deltaUnits = deltaY / UNIT_PIXELS;
        const newOffset = offsetRef.current - deltaUnits;

        const deltaTime = Math.max(now - lastPointerTimeRef.current, 8) / 1000;
        const instantVel = -deltaUnits / deltaTime;
        velocityRef.current = velocityRef.current * 0.35 + instantVel * 0.65;

        checkTickCrossing(newOffset);

        offsetRef.current = newOffset;
        lastPointerYRef.current = currentY;
        lastPointerTimeRef.current = now;

        setOffset(newOffset);
      },
      onPanResponderRelease: () => {
        isDraggingRef.current = false;

        const now = Date.now();
        if (now - lastPointerTimeRef.current > STILLNESS_CUTOFF_MS) {
          velocityRef.current = 0;
        } else {
          const history = historyRef.current;
          if (history.length >= 2) {
            const oldest = history[0];
            const newest = history[history.length - 1];
            const dt = (newest.time - oldest.time) / 1000;
            if (dt > 0.012) {
              const dy = newest.y - oldest.y;
              const dUnits = dy / UNIT_PIXELS;
              const calculatedVel = -dUnits / dt;
              velocityRef.current = Math.max(
                -FLICK_VEL_CLAMP,
                Math.min(FLICK_VEL_CLAMP, calculatedVel)
              );
            }
          }
        }

        lastFrameTimeRef.current = Date.now();
        animFrameIdRef.current = requestAnimationFrame(updatePhysics);
      },
    })
  ).current;

  useEffect(() => {
    return () => {
      if (animFrameIdRef.current) cancelAnimationFrame(animFrameIdRef.current);
    };
  }, []);

  const floorOffset = Math.floor(offset);
  const slots: number[] = [];
  for (let i = floorOffset - RENDER_WINDOW; i <= floorOffset + RENDER_WINDOW; i++) {
    slots.push(i);
  }

  const getCurve = (diff: number) => {
    const isLeft = side === 'left';
    const bowFactor = Math.pow(diff / 3.4, 2) * 36;
    const xOffset = isLeft ? -bowFactor : bowFactor;
    const tangentAngle = (isLeft ? -1 : 1) * (diff * 5.2);
    const translateZ =
      Math.cos(Math.min(Math.PI / 2, Math.abs(diff / 3.5) * (Math.PI / 2))) * 32;
    return { xOffset, tangentAngle, translateZ };
  };

  return (
    <View
      style={[
        styles.track,
        { backgroundColor: cardColor, borderColor: 'rgba(74, 90, 116, 0.35)' },
      ]}
    >
      {/* Stage 1: cylinder rim + gesture area */}
      <View {...panResponder.panHandlers} style={styles.gestureArea}>
        {slots.map((slotIndex) => {
          const diff = slotIndex - offset;
          if (Math.abs(diff) > CULL_DIFF) return null;

          const { xOffset, tangentAngle, translateZ } = getCurve(diff);
          const yOffset = diff * UNIT_PIXELS;

          // Stage 3: continuous exponential opacity falloff
          const distRatio = Math.min(Math.abs(diff) / 3.2, 1);
          const baseOpacity = Math.max(0.12, 1 - Math.pow(distRatio, 1.4) * 0.88);
          const isCenterSelected = Math.abs(diff) < 0.35 && isLocked;
          const depthScale = 0.84 + (translateZ / 32) * 0.16;
          const finalScale = depthScale * (isCenterSelected ? 1.08 : 1.0);

          const displayVal = normalizeIndex(slotIndex) + min;
          const label = String(displayVal).padStart(2, '0');

          // Stage 3: 3-tier color hierarchy
          let itemColor = textSecondaryColor;
          if (isCenterSelected) {
            itemColor = accentColor;
          } else if (Math.abs(diff) < 0.65) {
            itemColor = textColor;
          }

          return (
            <View
              key={`slot-${slotIndex}`}
              style={[
                styles.itemSlot,
                {
                  transform: [
                    { translateX: xOffset },
                    { translateY: yOffset },
                    { rotate: `${tangentAngle}deg` },
                    { scale: finalScale },
                  ],
                  opacity: baseOpacity,
                },
              ]}
            >
              {/* Stage 1/3: gear notch indicator on the cylinder rim */}
              <View
                style={[
                  styles.gearNotch,
                  side === 'left' ? { right: -42 } : { left: -42 },
                  {
                    backgroundColor: isCenterSelected ? accentColor : '#2A3750',
                    width: isCenterSelected ? 10 : 6,
                    opacity: isCenterSelected ? 1 : 0.6,
                  },
                ]}
              />

              <Text
                style={[
                  styles.itemText,
                  { color: itemColor },
                  isCenterSelected && {
                    textShadowColor: accentColor,
                    textShadowOffset: { width: 0, height: 0 },
                    textShadowRadius: 18,
                  },
                ]}
              >
                {label}
              </Text>
            </View>
          );
        })}
      </View>

      {/* Stage 1: center reticle window with caliper ticks */}
      <Animated.View
        pointerEvents="none"
        style={[
          styles.centerWindow,
          {
            borderColor: `${accentColor}A6`,
            backgroundColor: `${accentColor}0D`,
            shadowColor: accentColor,
            transform: [
              {
                scale: detentPulse.interpolate({
                  inputRange: [0, 1],
                  outputRange: [1.0, 1.038],
                }),
              },
            ],
          },
        ]}
      >
        <View style={[styles.caliperTick, { left: 4, backgroundColor: accentColor }]} />
        <View style={[styles.caliperTick, { right: 4, backgroundColor: accentColor }]} />
      </Animated.View>

      {/* Stage 1: top/bottom horizon fades + specular edge highlight */}
      <LinearGradient
        pointerEvents="none"
        colors={[cardColor, `${cardColor}D9`, 'transparent']}
        locations={[0, 0.55, 1]}
        style={styles.horizonTop}
      />
      <LinearGradient
        pointerEvents="none"
        colors={['transparent', `${cardColor}D9`, cardColor]}
        locations={[0, 0.45, 1]}
        style={styles.horizonBottom}
      />
      <LinearGradient
        pointerEvents="none"
        colors={['transparent', `${accentColor}40`, 'transparent']}
        locations={[0, 0.5, 1]}
        style={[styles.specularEdge, side === 'left' ? { right: 0 } : { left: 0 }]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    width: TRACK_WIDTH,
    height: TRACK_HEIGHT,
    borderRadius: 28,
    borderWidth: 1,
    overflow: 'hidden',
    position: 'relative',
  },
  gestureArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerWindow: {
    position: 'absolute',
    top: (TRACK_HEIGHT - RETICLE_HEIGHT) / 2,
    left: 8,
    right: 8,
    height: RETICLE_HEIGHT,
    borderRadius: 16,
    borderWidth: 1.5,
    zIndex: 10,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.75,
    shadowRadius: 18,
    elevation: 8,
    justifyContent: 'center',
  },
  caliperTick: {
    position: 'absolute',
    top: '50%',
    marginTop: -1.5,
    width: 6,
    height: 3,
    borderRadius: 2,
  },
  horizonTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 64,
    zIndex: 15,
  },
  horizonBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 64,
    zIndex: 15,
  },
  specularEdge: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 1,
    zIndex: 16,
  },
  itemSlot: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: UNIT_PIXELS,
  },
  itemText: {
    fontSize: 32,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
    letterSpacing: -1.2,
    textAlign: 'center',
  },
  gearNotch: {
    position: 'absolute',
    height: 2.5,
    borderRadius: 2,
  },
});
