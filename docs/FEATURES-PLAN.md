# Streaks, multiple alarms, wake-up check: plan

_Written 2026-11-01. Branch `feature/streaks-alarms`, created from build #9 (restore point `restore/ui-build9`)._

## Ground rules (unchanged)
- The main idea stays: movement + your own item to turn it off; PIN only snoozes.
- Every ring session still stops by itself after **90 minutes** with a "Missed alarm" notice (D-36).
- Arming gates stay: own item, own PIN, notifications, exact alarms, full-screen (D-25, D-29).
- Mission setup is locked while an alarm is on (D-09). Back/Home/Power never stop the sound (D-20).
- Built and tested **one phase at a time**: each phase = its own commit + CI build + device test.
  The next engine phase starts only after the previous one passed on the phone.

## Free vs premium (everything unlocked for now)
`src/logic/features.ts` lists each feature with a tier; `isFeatureUnlocked()` returns true for all.
Premium items get a small **PRO** tag so you can see what will be paid later. Lumen is free and the default.

| Feature | Proposed tier |
|---|---|
| 1 alarm, movement + scan, PIN snooze, all reliability features, Lumen | Free forever (D-06) |
| Streak count on Home | Free |
| Mornings page (history, best streak, averages) | PRO |
| More than 1 alarm (up to 5) | PRO |
| Wake-up check | PRO |
| Paper, Field, Signal designs | PRO |

Payments come later, separately (store choice still open).

## Phase 1: Streaks (JavaScript only, no engine change)
- Each finished real alarm (not test rings) is saved on the phone: day, ring time, get-up time, snoozes.
- "Missed": a ring that ended without the mission (90-min limit) breaks the streak.
  Detected when the app sees a ring end without a mission. (Phase 2 adds a native "last missed" mark
  so it is also caught when the app never opened.)
- Streak = days in a row where the alarm rang and you completed the mission. Days with no alarm don't break it.
- UI: a small streak line/tile on Home; a **Mornings** page (Settings → Mornings, or tap the streak):
  current + best streak, last 4 weeks, average time from ring to up, snoozes this week.
  Styled per design (Paper = habit-tracker ticks, Signal = terminal log, Field = small suns, Lumen = bento).
- Device test: complete a real alarm → streak 1; let one hit the 90-min limit → streak 0; test rings never count.

## Phase 2: Multiple alarms (engine change, highest care)
- Engine keeps a list of up to 5 alarms `{id, hour, minute, days, enabled}`. The old single alarm is
  migrated automatically into alarm 1 (same time, days, on/off).
- Still only **one** AlarmManager ring at a time: the soonest enabled alarm. When it rings, the next
  soonest is lined up. Two alarms at the same minute ring once.
- One mission for all alarms (same item, PIN, movement, snooze). Per-alarm missions maybe later.
- Each alarm is turned on with the same gates as today; an alarm's time/days are locked while it is on.
  Mission setup is locked while any alarm is on.
- D-10 changes: an alarm that is off keeps its own time (no jump to "now"); a new alarm starts at the current time.
- Snooze, 90-min limit, test alarm, volume boost: unchanged (one ring session at a time).
- UI: Home keeps one hero; a small row of alarm chips under it (`06:45 ●`, `08:30 ○`, `+`).
  Tap a chip to show it in the hero; hold-to-arm / hold-to-cancel act on the shown alarm.
  Delete: long-press a chip that is off.
- Device tests: migration keeps the old alarm; two alarms ring at their own times; turning one off
  doesn't affect the other; reboot keeps both; Force-stop caveat unchanged.

## Phase 3: Wake-up check (engine change)
- Setting (mission page, locked while armed): **Off** (default) / 3 / 5 / 10 minutes.
- After you finish the mission, the check fires that many minutes later: the phone vibrates and shows
  "Still up?" full-screen with one big **I'm up** button and a 60-second countdown.
- Tap in time → done. No tap → the alarm rings again and needs the full mission (movement + scan).
  That new ring has its own 90-minute limit and no second check (never a loop).
- A new scheduled alarm replaces a pending check. Reboot: a pending check is re-registered; a
  check that was on screen during the reboot rings.
- Test alarms can use the check too (so it can be tested); "Exit test" skips it.
- Device tests: check passes with a tap; check ignored → rings → mission → done; check off → nothing.

## Getting the APK to people (free)
- **GitHub Releases** (free): attach the signed APK to a release; people install it directly.
- **F-Droid** (free): only for fully open-source apps, built by F-Droid themselves; no store payments.
- **Samsung Galaxy Store**: needs a registered business (and often a DUNS number), takes 20%; not free.
- **Google Play**: one-time $25 account, 15% fee; its free trial works per Google account
  (by default one trial per person per app). Play Billing only works for installs from Play.
