import React, { useRef, useCallback } from 'react';
import { Animated, View, Text, StyleSheet, NativeSyntheticEvent, NativeScrollEvent } from 'react-native';

const ITEM_HEIGHT = 56;
const VISIBLE_RANGE = 2; // items shown above/below center each direction

interface RotaryWheelProps {
  value: number;
  min: number;
  max: number;
  onChange: (val: number) => void;
  side: 'left' | 'right';
  disabled?: boolean;
  accentColor: string;
  textColor: string;
  textSecondaryColor: string;
  backgroundColor: string;
  cardColor: string;
}

/**
 * Simplified port of the AI-Studio "TactileRotaryWheel" design.
 * Uses native ScrollView snap-scrolling for momentum/deceleration
 * (free, OS-native) instead of the original's hand-rolled pointer
 * velocity + spring-physics loop. Curvature (bow toward center,
 * scale/opacity fade by distance) is approximated via Animated
 * interpolation driven by scroll position.
 *
 * v3: added a layered "poor man's radial glow" halo behind the
 * center reticle (RN has no native radial-gradient primitive, so
 * this stacks concentric semi-transparent circles of increasing
 * size/decreasing opacity) to match the ambient amber bloom seen
 * in the a8 reference image.
 */
export default function RotaryWheel({
  value,
  min,
  max,
  onChange,
  side,
  disabled,
  accentColor,
  textColor,
  textSecondaryColor,
  backgroundColor,
  cardColor,
}: RotaryWheelProps) {
  const scrollY = useRef(new Animated.Value((value - min) * ITEM_HEIGHT)).current;
  const scrollRef = useRef<Animated.ScrollView>(null);
  const values = Array.from({ length: max - min + 1 }, (_, i) => min + i);

  const handleScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { y: scrollY } } }],
    { useNativeDriver: false }
  );

  const commitFromOffset = useCallback(
    (offsetY: number) => {
      const index = Math.round(offsetY / ITEM_HEIGHT);
      const clamped = Math.max(0, Math.min(values.length - 1, index));
      onChange(min + clamped);
    },
    [min, values.length, onChange]
  );

  const handleMomentumEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    commitFromOffset(e.nativeEvent.contentOffset.y);
  };

  const handleScrollEndDrag = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    commitFromOffset(e.nativeEvent.contentOffset.y);
  };

  return (
    <View
      style={[
        styles.track,
        { backgroundColor: cardColor, borderColor: `${accentColor}33` },
      ]}
    >
      {/* Ambient radial glow halo behind the center reticle (layered circles) */}
      <View pointerEvents="none" style={styles.glowLayerContainer}>
        <View style={[styles.glowRing, styles.glowRingOuter, { backgroundColor: `${accentColor}12` }]} />
        <View style={[styles.glowRing, styles.glowRingMid, { backgroundColor: `${accentColor}1F` }]} />
        <View style={[styles.glowRing, styles.glowRingInner, { backgroundColor: `${accentColor}2E` }]} />
      </View>

      <View
        pointerEvents="none"
        style={[
          styles.centerWindow,
          {
            borderColor: `${accentColor}CC`,
            backgroundColor: `${accentColor}14`,
            shadowColor: accentColor,
          },
        ]}
      />

      <Animated.ScrollView
        ref={scrollRef}
        nestedScrollEnabled={true}
        showsVerticalScrollIndicator={false}
        snapToInterval={ITEM_HEIGHT}
        decelerationRate="fast"
        scrollEnabled={!disabled}
        onScroll={handleScroll}
        onMomentumScrollEnd={handleMomentumEnd}
        onScrollEndDrag={handleScrollEndDrag}
        scrollEventThrottle={16}
        contentContainerStyle={{
          paddingVertical: ITEM_HEIGHT * VISIBLE_RANGE,
        }}
        contentOffset={{ x: 0, y: (value - min) * ITEM_HEIGHT }}
      >
        {values.map((v, i) => {
          const itemCenter = i * ITEM_HEIGHT;

          const inputRange = [
            itemCenter - ITEM_HEIGHT * 2,
            itemCenter - ITEM_HEIGHT,
            itemCenter,
            itemCenter + ITEM_HEIGHT,
            itemCenter + ITEM_HEIGHT * 2,
          ];

          const translateX = scrollY.interpolate({
            inputRange,
            outputRange:
              side === 'left'
                ? [-14, -6, 0, -6, -14]
                : [14, 6, 0, 6, 14],
            extrapolate: 'clamp',
          });

          const scale = scrollY.interpolate({
            inputRange,
            outputRange: [0.72, 0.88, 1.18, 0.88, 0.72],
            extrapolate: 'clamp',
          });

          const opacity = scrollY.interpolate({
            inputRange,
            outputRange: [0.25, 0.55, 1, 0.55, 0.25],
            extrapolate: 'clamp',
          });

          const color = scrollY.interpolate({
            inputRange: [itemCenter - ITEM_HEIGHT, itemCenter, itemCenter + ITEM_HEIGHT],
            outputRange: [textSecondaryColor as any, accentColor as any, textSecondaryColor as any],
            extrapolate: 'clamp',
          });

          return (
            <View key={v} style={styles.itemSlot}>
              <Animated.Text
                style={[
                  styles.itemText,
                  {
                    color: color as any,
                    opacity,
                    transform: [{ translateX }, { scale }],
                  },
                ]}
              >
                {String(v).padStart(2, '0')}
              </Animated.Text>
            </View>
          );
        })}
      </Animated.ScrollView>

      <View pointerEvents="none" style={[styles.fadeTop, { backgroundColor }]} />
      <View pointerEvents="none" style={[styles.fadeBottom, { backgroundColor }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    width: 84,
    height: ITEM_HEIGHT * 5,
    borderRadius: 24,
    borderWidth: 1,
    overflow: 'hidden',
  },
  glowLayerContainer: {
    position: 'absolute',
    top: ITEM_HEIGHT * 2,
    left: 0,
    right: 0,
    height: ITEM_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  glowRing: {
    position: 'absolute',
    borderRadius: 999,
  },
  glowRingOuter: { width: 220, height: 220 },
  glowRingMid: { width: 150, height: 150 },
  glowRingInner: { width: 90, height: 90 },
  centerWindow: {
    position: 'absolute',
    top: ITEM_HEIGHT * 2,
    left: 4,
    right: 4,
    height: ITEM_HEIGHT,
    borderRadius: 16,
    borderWidth: 1.5,
    zIndex: 10,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 12,
    elevation: 6,
  },
  itemSlot: {
    height: ITEM_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemText: {
    fontSize: 30,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  fadeTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: ITEM_HEIGHT * 1.4,
    opacity: 0.9,
  },
  fadeBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: ITEM_HEIGHT * 1.4,
    opacity: 0.9,
  },
});
