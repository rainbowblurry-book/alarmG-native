import React, { useRef, useState } from 'react';
import { NativeScrollEvent, NativeSyntheticEvent, Pressable, ScrollView, Text, useWindowDimensions, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDesign } from '../context/DesignContext';
import { bevel, Btn, IconName, NotebookPage, NOTEBOOK_MARGIN, onBg, onBgDim, space } from '../components/ui';
import type { RootStack } from '../navigation/types';

/**
 * Short first-launch walkthrough (4 cards, skippable). Shown before the
 * "Get ready" checklist; can be replayed from Settings → How it works.
 * Wording is kept honest: it never promises more than the engine does.
 */
const CARDS: { icons: IconName[]; title: string; text: string }[] = [
  { icons: ['time-outline'], title: 'Set your time', text: 'Drag the big numbers up or down, or tap them to type.' },
  { icons: ['walk-outline', 'barcode-outline'], title: 'Get up to turn it off', text: 'When it rings: move first, then scan an item you keep in another room.' },
  { icons: ['keypad-outline'], title: 'Snooze needs your PIN', text: 'Your 10-digit PIN only snoozes. It never turns the alarm off.' },
  { icons: ['shield-checkmark-outline'], title: 'Hold to arm', text: 'Hold the button to arm. Back, Home and the power button don’t stop the sound.' },
];

export default function IntroScreen({ navigation, route }: NativeStackScreenProps<RootStack, 'Intro'>) {
  const { pack } = useDesign();
  const c = pack.colors;
  const retro = pack.chrome === 'bevel';
  const hand = pack.chrome === 'sketch';
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [page, setPage] = useState(0);
  const pager = useRef<ScrollView>(null);
  const replay = route.params?.replay === true;

  const done = () => (replay ? navigation.goBack() : navigation.replace('Welcome'));
  const go = (i: number) => pager.current?.scrollTo({ x: i * width, animated: true });
  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => setPage(Math.round(e.nativeEvent.contentOffset.x / width));
  const last = page === CARDS.length - 1;

  return (
    <View style={{ flex: 1, backgroundColor: c.bg, paddingTop: insets.top, paddingBottom: insets.bottom + space.md }}>
      {hand && <NotebookPage />}
      <View style={{ flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: space.md, height: 52, alignItems: 'center' }}>
        {!last && (
          <Pressable onPress={done} accessibilityRole="button" hitSlop={10} style={{ minHeight: 44, justifyContent: 'center', paddingHorizontal: space.sm }}>
            <Text style={{ fontFamily: pack.fonts.medium, fontSize: retro ? 21 : hand ? 19 : 15, color: onBgDim(pack) }}>Skip</Text>
          </Pressable>
        )}
      </View>

      <ScrollView ref={pager} horizontal pagingEnabled showsHorizontalScrollIndicator={false} onMomentumScrollEnd={onScroll} onScroll={onScroll} scrollEventThrottle={32}>
        {CARDS.map((card, i) => (
          <View key={i} style={{ width, paddingHorizontal: space.lg, paddingLeft: hand ? NOTEBOOK_MARGIN + space.md : space.lg, justifyContent: 'center', gap: space.lg }}>
            {/* illustration: the card's icons on a soft disc / sticky note / bevel window */}
            <View
              style={[
                { alignSelf: 'center', width: 180, height: 180, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 12 },
                retro
                  ? { backgroundColor: c.surface, ...bevel() }
                  : hand
                  ? { backgroundColor: ['#FBE7A1', '#F6CFC4', '#D4E8C8', '#FBE7A1'][i], borderRadius: 2, transform: [{ rotate: i % 2 ? '2deg' : '-2deg' }], boxShadow: '0 3px 6px rgba(42, 41, 38, 0.18)' }
                  : { backgroundColor: c.surface, borderRadius: 90 },
              ]}
            >
              {card.icons.map((ic) => (
                <Ionicons key={ic} name={ic} size={card.icons.length > 1 ? 56 : 72} color={retro ? '#000' : hand ? c.text : c.accent} />
              ))}
            </View>
            <View style={{ gap: space.sm }}>
              <Text style={{ fontFamily: hand || retro ? pack.fonts.strong : pack.fonts.display, fontSize: retro ? 40 : hand ? 40 : 30, color: onBg(pack), textAlign: 'center' }}>{card.title}</Text>
              <Text style={{ fontFamily: pack.fonts.body, fontSize: retro ? 22 : hand ? 20 : 16, lineHeight: retro ? 24 : hand ? 26 : 23, color: onBgDim(pack), textAlign: 'center' }}>{card.text}</Text>
            </View>
          </View>
        ))}
      </ScrollView>

      <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 8, marginVertical: space.md }} accessibilityLabel={`Card ${page + 1} of ${CARDS.length}`}>
        {CARDS.map((_, i) => (
          <View
            key={i}
            style={{
              width: i === page ? 22 : 8,
              height: 8,
              borderRadius: retro ? 0 : 4,
              backgroundColor: i === page ? (retro ? '#FFFFFF' : hand ? c.accent : c.accent) : retro ? '#5FAFAF' : c.border,
            }}
          />
        ))}
      </View>
      <View style={{ paddingHorizontal: space.md, paddingLeft: hand ? NOTEBOOK_MARGIN + 12 : space.md }}>
        <Btn title={last ? (replay ? 'Done' : 'Get started') : 'Next'} onPress={() => (last ? done() : go(page + 1))} />
      </View>
    </View>
  );
}
