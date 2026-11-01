# ClockGuard: Status

_Last updated: 2026-11-01. Code baseline: `bb4bff1` (= `c0aa39d` + docs)._

Legend:
- **[device]**: the user reported it from their phone (Samsung, Android 16).
- **[code]**: verified by reading the current source.
- **[history]**: claimed in `docs/chat-history/`, not re-verified.

## Build on the phone
- The installed APK is built from **`c0aa39d`** on branch `fullscreen-alarm` (`preview` profile, EAS) [device, chat-history/README.md and 8.md:3113].
- `fullscreen-alarm` is fully contained in `main`; `main` only adds docs [code: `git merge-base`].

## Works on device
| Behaviour | Source |
|---|---|
| Native alarm rings **by itself with the screen off** (full-screen intent), no tap needed | [device] 8.md:2172 (build with `414c152`) |
| No re-ring after disarm when reopening within 15 min | [device] 8.md:2172 |
| Wheels lock while armed; Setup/Settings tabs blocked while armed | [device] 7.md:3105 |
| Rotary wheel feel, icon, Watch theme look | [device] 7.md:1109-1112 |
| Custom tone upload played | [device] 7.md:3725 (feature now scrapped) |

## Current bugs
| # | Bug | Evidence | Root cause |
|---|---|---|---|
| B1 | **Power button while ringing silences the alarm.** Screen on again → ringing screen + sound return | [device] 2026-10-31 | Sound is `expo-audio` inside `RingingScreen`; it stops when the Activity is stopped [code] |
| B2 | **Back gesture while ringing makes the alarm vanish.** Phone fully usable; reopening the app resumes ringing | [device] 2026-10-31 | No `BackHandler`; same sound-in-screen cause [code] |
| B3 | Swipe app from recents / process death while ringing or snoozed = alarm lost | [code] | Ring/snooze state is React state only; JS cancels the native notification when ringing starts |
| B4 | Snooze timer dies with the app | [code], also flagged 8.md:294 | JS `setInterval` |
| B5 | Volume-down can mute the alarm | [code] (no volume handling) | — |
| B6 | Can arm without registering anything: default barcode `012345678905` and default PIN `8492017356` shown in Setup | [code] `SettingsContext.tsx` | Defaults |
| B7 | Repeat days never repeat: disarm sets `isArmed=false` | [code] `WakeFlowContext.dismissWake` | Deliberate (8.md:2172), superseded 2026-10-31 (see DECISIONS D-15) |
| B8 | Settings shows a working tone picker **and** a "Custom tones coming in the next update" card | [code] `SettingsScreen.tsx` | Leftover |
| B9 | Wheel "caliper tick" dark box not centred | [device] 7.md:3172, 3725 | Unfixed; low priority |
| B10 | Wallpaper upload says "set" but never shows | [device] 7.md:3725 | Never wired; feature scrapped |

## In the code but never test-reported from the device
- `e542d67`: wheels default to the current time; disarm returns to "Arm alarm". Built into the `c0aa39d` APK, but no explicit test result was reported.
- `0b211c4`: receiver crash-safety (reschedule in `finally`).
- `c0aa39d`: Exit Preview doesn't disarm.
- `924b842` / issue #1 27-Sep: dismissing a stale notification no longer opens ringing; Exit Preview gated behind dev unlock.
- App-icon crop fix (`41c12a2`, `c6c9e2d`) [history; no confirmation found].

## Decided today (2026-10-31), not yet implemented
See DECISIONS D-20…D-31 and T-07, T-08, T-12. In short:
- Power, Back and Home must not silence, snooze or disarm (hard requirement). Screen re-open after power is best effort.
- Disarm keeps the schedule armed for the next selected day; Cancel turns it off.
- Remove all dev tools; keep only the Minimal theme; scrap wallpaper and custom audio.
- Arming requires your own item, your own PIN, and the exact-alarm, notification and full-screen permissions.
- Free GitHub Actions builds, manual trigger only; no keystore or password in the repo (secrets only).
- Volume behaviour: proposal pending your approval.

## Open blockers (environment)
- **Pushing to GitHub fails (HTTP 403):** "Claude doesn't have GitHub access to rainbowblurry-book/alarmG-native". Reading via the GitHub tools works. Fix: install or reconnect the Claude GitHub App for this repo. Until then, commits are local only.
- **`docs.expo.dev` and `dl.google.com` are blocked** in this cloud environment, so the v57 docs and local Kotlin compilation are unavailable here. The npm registry works.
- **GitHub Actions tools:** listing workflows works (read). Starting runs and reading job logs are unconfirmed until write access works.
- **Signing:** the APK on the phone was most likely signed with an EAS-managed key [history 4.md:11, "keystore made once"]. It can be downloaded once with `eas credentials` (free, uses no build) and stored as GitHub secrets. Not yet verified.

## Where the history conflicts with the code
| History says | Code / git says |
|---|---|
| Issue #1 (latest 27 Sep) and 7.md: "full-screen auto-launch is still open" | Implemented in `414c152`; worked on device (8.md:2172) |
| `docs/chat-history/README.md`: handoffs are in this folder | They were in `docs/`; moved here 2026-10-31 |
| 8.md review: `src/theme/colors.ts` was "removed" | Still exists, imported by nothing |
| 7.md:3774: wallpaper/audio "paused" | Wallpaper hidden, but the custom-tone picker is live in Settings next to a "coming soon" card |
| Issue #1: "Simulate Pro must be removed before release" | Still present, behind the dev code |
| 6.md:3509: "every build so far used the `development` profile" | Early builds were `preview` (4.md:395-415) |
| GitHub API: PRs #3 and #5 `merged: false` | Their merge commits `f54cb3f` and `a58a331` are in `main` |
| User thought `fullscreen-alarm` was a separate unfinished branch | It is fully merged into `main` |

Referenced in the chats but **not in the repo**, so I could not read them: `ClockGuard-Handoff-*.md`, `WakeUp-Native-Project-Handoff1.md`, `alarmG-native-devgate-status5-4.md`, `2-ARCHITECTURE.md`, `CODE-BUNDLE.md` (git-ignored), `alarm-redesign.txt`, `design/a8.png`.

## Prioritized next steps
1. **Native alarm engine** (targets B1–B4; B5 volume is pending a decision). Local Expo module `modules/clockguard-alarm`:
   - foreground ring service owning sound, vibration, wake lock and the full-screen notification;
   - persisted ring/snooze state and native snooze via AlarmManager;
   - boot recovery and lock-screen flags via an Activity lifecycle listener;
   - this replaces the 3 config plugins.
2. **Barebones cleanup:** dev tools, extra themes/fonts/blur, wallpaper/audio, expo-notifications fallback, defaults (B6, B8, B10).
3. **JS rewire:** ringing UI reads native state, Back blocked while ringing, disarm stays armed (B7).
4. **Free CI APK build** (GitHub Actions, manual trigger, secrets-based signing) and the device test checklist below.
5. Later: UI/UX redesign (issue #2 dial idea vs issue #4 Skia wheel), multiple alarms, Play Store prep.

## Device test checklist (for the next APK)
1. Arm +2 min, screen off: rings and opens by itself.
2. While ringing, press power: sound continues and the state stays ringing (screen re-open is best effort).
3. Back gesture / Home while ringing: sound continues; the notification brings it back.
4. Swipe the app from recents while ringing: still rings.
5. PIN snooze, then swipe the app away: rings again when the snooze ends.
6. Volume-down while ringing: behaviour depends on the volume decision (D-30).
7. Scan the correct item: silence; still armed for the next repeat day.
8. Reboot while armed: still fires.
9. Cannot arm without your item and PIN.
