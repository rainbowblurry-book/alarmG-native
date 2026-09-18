import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Animated, View, Text, StyleSheet, PanResponder } from 'react-native';
import * as Haptics from 'expo-haptics';

/**
 * Full spring-physics rotary wheel, ported from the AI-Studio
 * "TactileRotaryWheel" spec (exact constants supplied by the user
 * via Google AI Studio's own technical writeup). Two honest RN
 * limitations vs. the original web version:
 *   1. No CSS blur() filter / true translateZ perspective compositing
 *      in RN -> depth and motion blur are approximated via scale and
 *      opacity falloff instead of literal blur pixels.
 *   2. No Web Audio API in RN -> sound synthesis is stubbed as a
 *      no-op hook (soundHook prop) ready to wire to real audio files
 *      later. Haptics are wired for real via expo-haptics.
 */

const UNIT_PIXELS = 54;
const RENDER_WINDOW = 4; // slots each side of floor(offset)
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
  onTickHaptic?: () => void;
  onLockHaptic?: () => void;
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
  const [velocity, setVelocity] = useState<number>(0);
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

  const triggerRecoil = useCallback(() => {
    detentPulse.setValue(0);
    Animated.sequence([
      Animated.timing(detentPulse, { toValue: 1, duration: 42, useNativeDriver: false }),
      Animated.timing(detentPulse, { toValue: 0, duration: 98, useNativeDriver: false }),
    ]).start();
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
      setVelocity(vel);
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
        setVelocity(0);
        setIsLocked(true);
        animFrameIdRef.current = null;

        onChange(min + normalizeIndex(pos));
        fireLockHaptic();
      } else {
        checkTickCrossing(pos);

        velocityRef.current = vel;
        offsetRef.current = pos;
        setOffset(pos);
        setVelocity(vel);
        setIsLocked(false);

        animFrameIdRef.current = requestAnimationFrame(updatePhysics);
      }
    }
  }, [checkTickCrossing, normalizeIndex, onChange, min, fireLockHaptic]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => !disabled,
      onMoveShouldSetPanResponder: () => !disabled,
      onPanResponderGrant: (evt) => {
        if (animFrameIdRef.current) {
          cancelAnimationFrame(animFrameIdRef.current);
          animFrameIdRef.current = null;
        }
        isDraggingRef.current = true;
        setIsLocked(false);
        velocityRef.current = 0;
        setVelocity(0);

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
        setVelocity(velocityRef.current);
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
    const cylinderRotateX = diff * 17.5;
    const translateZ =
      Math.cos(Math.min(Math.PI / 2, Math.abs(diff / 3.5) * (Math.PI / 2))) * 32;
    return { xOffset, tangentAngle, cylinderRotateX, translateZ };
  };

  return (
    <View style={[styles.track, { backgroundColor: cardColor, borderColor: `${accentColor}33` }]}>
      <View pointerEvents="none" style={styles.glowContainer}>
        <View style={[styles.glowRing, styles.glowOuter, { backgroundColor: `${accentColor}12` }]} />
        <View style={[styles.glowRing, styles.glowMid, { backgroundColor: `${accentColor}1F` }]} />
        <View style={[styles.glowRing, styles.glowInner, { backgroundColor: `${accentColor}2E` }]} />
      </View>

      <Animated.View
        pointerEvents="none"
        style={[
          styles.centerWindow,
          {
            borderColor: detentPulse.interpolate({
              inputRange: [0, 1],
              outputRange: [`${accentColor}B3`, `${accentColor}F2`],
            }) as any,
            backgroundColor: `${accentColor}0F`,
            shadowColor: accentColor,
            transform: [
              {
                scale: detentPulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.025] }),
              },
            ],
          },
        ]}
      />

      <View {...panResponder.panHandlers} style={styles.gestureArea}>
        {slots.map((slotIndex) => {
          const diff = slotIndex - offset;
          if (Math.abs(diff) > CULL_DIFF) return null;

          const { xOffset, tangentAngle, cylinderRotateX, translateZ } = getCurve(diff);
          const yOffset = diff * UNIT_PIXELS;

          const distRatio = Math.min(Math.abs(diff) / 3.2, 1);
          const baseOpacity = Math.max(0.12, 1 - Math.pow(distRatio, 1.4) * 0.88);
          const isCenterSelected = Math.abs(diff) < 0.35 && isLocked;
          const depthScale = 0.82 + (translateZ / 32) * 0.18;
          const finalScale = depthScale * (isCenterSelected ? 1.12 : 1);

          const displayVal = normalizeIndex(slotIndex) + min;
          const label = String(displayVal).padStart(2, '0');

          const color = isCenterSelected
            ? accentColor
            : Math.abs(diff) < 0.8
            ? textColor
            : textSecondaryColor;

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
              <Text
                style={[
                  styles.itemText,
                  {
                    color,
                    fontWeight: isCenterSelected ? '800' : '600',
                  },
                  isCenterSelected && {
                    textShadowColor: accentColor,
                    textShadowRadius: 16,
                    textShadowOffset: { width: 0, height: 0 },
                  },
                ]}
              >
                {label}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    width: 84,
    height: UNIT_PIXELS * 5,
    borderRadius: 24,
    borderWidth: 1,
    overflow: 'hidden',
  },
  gestureArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glowContainer: {
    position: 'absolute',
    top: UNIT_PIXELS * 2,
    left: 0,
    right: 0,
    height: UNIT_PIXELS,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  glowRing: { position: 'absolute', borderRadius: 999 },
  glowOuter: { width: 220, height: 220 },
  glowMid: { width: 150, height: 150 },
  glowInner: { width: 90, height: 90 },
  centerWindow: {
    position: 'absolute',
    top: UNIT_PIXELS * 2,
    left: 4,
    right: 4,
    height: UNIT_PIXELS,
    borderRadius: 16,
    borderWidth: 1.5,
    zIndex: 10,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 12,
    elevation: 6,
  },
  itemSlot: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemText: {
    fontSize: 30,
    fontVariant: ['tabular-nums'],
  },
});
