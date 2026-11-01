import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { AlarmState } from '../../modules/clockguard-alarm';

/**
 * Mornings history for streaks. Stored only on this phone. Test rings never count.
 *
 * - "done": the mission was completed (recorded right before disarm()).
 * - "missed": a ring session ended without the mission (the 90-minute limit).
 *   Detected by remembering the last ring we saw; if it is idle later and no
 *   "done" was recorded for it, it was missed.
 */
export type Morning = {
  /** session id: when this ring session first started (ms) */
  session: number;
  /** local date of the ring, YYYY-MM-DD */
  day: string;
  upAt: number;
  snoozes: number;
  result: 'done' | 'missed';
};

const KEY = '@clockguard_mornings';
const LAST_RING_KEY = '@clockguard_last_ring';
const MAX_ENTRIES = 400;

let cache: Morning[] = [];
let loaded: Promise<void> | null = null;
const listeners = new Set<(m: Morning[]) => void>();

export function dayKey(ms: number): string {
  const d = new Date(ms);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function load(): Promise<void> {
  if (!loaded) {
    loaded = AsyncStorage.getItem(KEY)
      .then((raw) => {
        const data = raw ? (JSON.parse(raw) as Morning[]) : [];
        cache = Array.isArray(data) ? data.filter((m) => m && typeof m.session === 'number' && (m.result === 'done' || m.result === 'missed')) : [];
      })
      .catch(() => {
        cache = [];
      });
  }
  return loaded;
}

function save() {
  AsyncStorage.setItem(KEY, JSON.stringify(cache.slice(-MAX_ENTRIES))).catch(() => {});
  listeners.forEach((l) => l(cache));
}

function upsert(m: Morning) {
  cache = [...cache.filter((x) => x.session !== m.session), m].sort((a, b) => a.session - b.session);
  save();
}

/** Call right before disarm() after the mission succeeded. */
export function markMissionDone(a: AlarmState) {
  if (a.isTestRing || a.state === 'idle') return;
  const session = a.sessionStartedAt || a.ringStartedAt || Date.now();
  upsert({ session, day: dayKey(session), upAt: Date.now(), snoozes: a.snoozeCount, result: 'done' });
}

/**
 * Watches the engine state: remembers the current real ring, and when it is
 * over without a "done" record, saves it as missed.
 */
export function useMorningsRecorder(a: AlarmState) {
  useEffect(() => {
    let cancelled = false;
    (async () => {
      await load();
      if (cancelled) return;
      if (a.state !== 'idle') {
        if (a.isTestRing) return;
        const session = a.sessionStartedAt || a.ringStartedAt;
        if (session) AsyncStorage.setItem(LAST_RING_KEY, JSON.stringify({ session, snoozes: a.snoozeCount })).catch(() => {});
        return;
      }
      const raw = await AsyncStorage.getItem(LAST_RING_KEY).catch(() => null);
      if (!raw || cancelled) return;
      await AsyncStorage.removeItem(LAST_RING_KEY).catch(() => {});
      const last = JSON.parse(raw) as { session: number; snoozes: number };
      if (!cache.some((m) => m.session === last.session)) {
        upsert({ session: last.session, day: dayKey(last.session), upAt: 0, snoozes: last.snoozes, result: 'missed' });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [a.state, a.sessionStartedAt, a.isTestRing, a.snoozeCount]);
}

export type MorningStats = {
  current: number;
  best: number;
  /** last 28 days, oldest first */
  days: { day: string; result: 'done' | 'missed' | null }[];
  avgMinutesToUp: number | null;
  snoozesThisWeek: number;
  total: number;
};

/** Streak = days in a row (with an alarm) where the mission was done. Days without an alarm don't break it. */
export function computeStats(list: Morning[], now = Date.now()): MorningStats {
  const byDay = new Map<string, 'done' | 'missed'>();
  for (const m of [...list].sort((a, b) => a.session - b.session)) byDay.set(m.day, m.result); // last result of the day wins
  const ordered = [...byDay.entries()].sort(([a], [b]) => (a < b ? -1 : 1));
  let best = 0;
  let run = 0;
  for (const [, r] of ordered) {
    run = r === 'done' ? run + 1 : 0;
    best = Math.max(best, run);
  }
  let current = 0;
  for (let i = ordered.length - 1; i >= 0 && ordered[i][1] === 'done'; i--) current++;

  const days: MorningStats['days'] = [];
  for (let i = 27; i >= 0; i--) {
    const k = dayKey(now - i * 86400000);
    days.push({ day: k, result: byDay.get(k) ?? null });
  }
  const recentDone = list.filter((m) => m.result === 'done' && m.upAt > m.session).slice(-14);
  const avgMinutesToUp = recentDone.length ? Math.round(recentDone.reduce((s, m) => s + (m.upAt - m.session), 0) / recentDone.length / 60000) : null;
  const weekAgo = now - 7 * 86400000;
  const snoozesThisWeek = list.filter((m) => m.session >= weekAgo).reduce((s, m) => s + m.snoozes, 0);
  return { current, best, days, avgMinutesToUp, snoozesThisWeek, total: list.filter((m) => m.result === 'done').length };
}

export function useMornings(): { list: Morning[]; stats: MorningStats } {
  const [list, setList] = useState<Morning[]>(cache);
  useEffect(() => {
    load().then(() => setList(cache));
    listeners.add(setList);
    return () => {
      listeners.delete(setList);
    };
  }, []);
  return { list, stats: computeStats(list) };
}

export function clearMornings() {
  cache = [];
  save();
}

// TESTING-ONLY START: lets the web preview show a history
export function seedMorningsForPreview(entries: Morning[]) {
  cache = entries;
  loaded = Promise.resolve();
  listeners.forEach((l) => l(cache));
}
// TESTING-ONLY END
