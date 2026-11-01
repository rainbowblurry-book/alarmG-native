# ClockGuard: Decisions

Each entry lists the decision, the reason, its source and its status:
- **Active:** still holds.
- **Superseded → D-xx:** a later decision replaced it.
- **Changed today:** the user decided it on 2026-10-31.

Sources such as `3.md:906` refer to the old chat exports (`docs/chat-history/`), deleted on 2026-11-01. They are still in git history, e.g. `git show e430fb3:docs/chat-history/3.md`. "Code" means the decision is visible in the current source.

## Product

| ID | Decision | Reason | Source | Status |
|---|---|---|---|---|
| D-01 | **One alarm** with repeat days (superseded by D-48: up to 5) | Keep the flow simple until it is stable; multiple alarms maybe later or as a paid feature | 1.md:5, 74; 1.md:4483; 3.md:1180 | Active |
| D-02 | **The PIN only snoozes, it never dismisses.** It must be 10 digits: not one repeated digit, not sequential, not a 2-digit repeat, at least 4 distinct digits | Snoozing must take effort, but you can't escape the mission | 1.md:80; 3.md:12693-12719; code `SetupScreen.validateSnoozePin` | Active |
| D-03 | **Disarm by scanning a real household item.** Only the last 4 digits are shown. Manual entry is allowed only when registering in Setup, never at ring time | You have to physically get up and walk to the item | 1.md:4519; 3.md:334-378, 7918; code | Active. 3.md wanted manual entry only on camera failure; code allows it in Setup always (still not at ring time) |
| D-04 | The **movement mission gates the scanner** | You must actually move; tapping the card must not count | 3.md:284-332; code `RingingScreen.isMovementComplete` | Active |
| D-05 | **Cruelty mode** (optional): each next snooze is halved (from the snooze length, D-43), floor 20 s | Differentiator, from the web prototype | 1.md:1123-1135; 5.md:1930-1948; code | Active |
| D-06 | **Honest monetization only:** core alarm free forever; no fake purchases, fake ads or bypass codes; real Play Billing later | User's ethics rule | 3.md:906, 1166-1176; issue #1 | Active |
| D-07 | Name **ClockGuard** (sorts next to the stock Clock app) | Branding | 4.md:623, 707 | Active |
| D-08 | Remove the notification's Dismiss/Snooze action buttons | They let you skip the mission | 8.md:176; code `alarmScheduler.setupAlarmChannel` | Active |
| D-09 | Lock the wheels, days, Setup and Settings tabs while armed | Can't weaken the alarm after arming | 7.md:1300-1358; code | Active |
| D-10 | Wheels show the current time when not armed | Faster to set | 8.md:2172 (user); code `useCurrentTimeWhenIdle` | Narrowed → D-49 |
| D-11 | Disarm sets the alarm to "not armed" (re-arm every night) | User request, 8.md:2172 | 8.md:2172; code `dismissWake` | **Superseded → D-21** |
| D-12 | Developer tools (Preview, Exit Preview, Simulate Pro) hidden behind a developer unlock code (removed; code no longer used) | Friend testing without removing tools | 7.md:3830-3842, 4286; issue #1 (27 Sep) | **Superseded → D-22** |
| D-13 | Themes: 5 designer themes, then a 6th "Watch" | Visual identity experiments | 4.md:2363; 6.md:2263 | **Superseded → D-23** |
| D-14 | Wallpaper upload and custom alarm tone | Personalisation | 7.md:1218-1227; wallpaper paused 7.md:3725 | **Superseded → D-24** |
| D-15 | Don't block the power button in v1 | Seen as an aggressive paid feature in competitors | 1.md:4475-4507 | **Superseded → D-20** (react to power, not block it) |
| D-16 | Skia/Reanimated wheel (issue #4) and A6 dial (issue #2) are deferred; build only one of them | Current wheel feels good; big lift | 7.md:1025, 1095, 1102 | Active (UI phase) |

## Decided 2026-10-31 (this session)

| ID | Decision | Reason | Status |
|---|---|---|---|
| D-20 | **Power, Back and Home while ringing must not snooze or disarm:** the alarm sound continues and the state stays RINGING (hard requirement). Bringing the ringing screen back after power is **best effort**, bounded (no unlimited screen-off → wake loop), and must be tested on the Samsung | Power was a free escape (bug B1) | Changed today (amended)|
| D-21 | **Disarm keeps the alarm armed** for the next repeat day; "Cancel alarm" turns it off | Repeat days must actually repeat (bug B7) | Changed today |
| D-22 | **Remove all developer tools** (Preview, Exit Preview, Simulate Pro, unlock code). Replaced by a visible, clearly labelled **TEST alarm** that rings through the real engine, plus an "Exit test" button that only stops test rings. All of it is fenced with `TESTING-ONLY START/END` markers for easy removal later | Barebones stable build; the user still needs a safe way to test (2026-11-01) | Implemented on `feature/native-alarm-engine` |
| D-23 | **Only the Minimal theme** (drop the others, the extra fonts and blur) | "Barebones working for a week"; redesign later | **Superseded → D-37** |
| D-24 | **Wallpaper and custom audio scrapped** for now; the bundled tone only | Wallpaper never rendered; tone adds silent-alarm risk | Changed today |
| D-25 | **Arming requires your own scanned item and your own PIN** (no built-in defaults) | Defaults made the mission meaningless (bug B6) | Changed today |
| D-26 | **Never use paid services, now or later** | User rule | Changed today |
| D-27 | **Build APKs with GitHub Actions** (free tier only). **No keystore or signing password is ever committed**, even to the private repo. First choice: reuse the current APK's signing key (likely EAS-managed, see STATUS) via GitHub Actions secrets, so no uninstall is needed. Fallback: a new fixed sideload keystore, also only in secrets (one-time uninstall). Secrets are never printed in logs | Free; EAS free builds are limited to 15/month | Changed today (amended) |
| D-28 | **CI cost control:** `workflow_dispatch` (manual) only, no push-triggered builds; standard Linux runner; concurrency cancellation; job timeout; short artifact retention. No paid services or chargeable overages (user verifies the Actions budget is $0 before the first run) | Private repos have limited free minutes and storage | Changed today |
| D-29 | **Arming requires exact alarms, notifications and full-screen access.** If any is unavailable, arming is blocked with a clear reason. No silent fallback to an inexact alarm that still reports "armed" | An inexact alarm may fire late or be unable to start the ringing service | Changed today |
| D-30 | **Optional volume boost**, labelled "Raise low alarm volume to 60% when ringing starts", **default OFF**. When on: if the ALARM volume is below 60% at ring start, it is raised once; no forcing during the ring. The previous volume is restored on snooze, disarm or test exit (only if the user didn't change it meanwhile; persisted so it survives a crash). Media, ringtone and notification volumes are never touched | Approved 2026-11-01 | Implemented on `feature/native-alarm-engine` |
| D-31 | **Disarm** stops the current ring and keeps the schedule armed for the next selected day; **Cancel** disables the schedule. Updating the wheels to the current time must never overwrite the saved time while armed | Restates D-21 together with D-10 | Changed today |
| D-32 | **Repository stays public** for now (Claude couldn't access it while private). Future commits must not add personal info, credentials, dev unlock codes or raw private chats | User decision 2026-11-01 | Active |
| D-33 | **Signing option B:** a new release key, kept only in GitHub Actions secrets (never committed or printed). The old app is uninstalled once. App ID `com.rainbowblurry.wakeupnative` is kept | Test app, not published; simplest secure path | Active |
| D-34 | **CI trigger:** the workflow file also lives on `main` (GitHub requires that for manual runs); app code never goes to `main` without the user's merge | User decision 2026-11-01 | Active |
| D-35 | **Settings tab stays reachable while armed** (test alarm, permissions, volume); "Reset all settings" is disabled while armed (it would delete the item/PIN a ringing alarm needs). Setup stays locked while armed | Needed to test the test alarm next to a real alarm | Active |
| D-36 | **Ring time limit:** a ring session rings nonstop (no quiet gaps) until the mission or a PIN snooze. **90 minutes** after it first started ringing (snoozes included) it stops by itself, posts a **"Missed alarm"** notification, and stays armed for the next day. A ring that starts after the limit (a late snooze ending) still rings at least 5 minutes. Not user-configurable | Avoid endless ringing and battery drain if nobody responds; best effort (user decision 2026-11-01) | Implemented on `feature/ring-time-limit` |
| D-37 | **UI redesign: 4 design packs in one APK** (Lumen, Paper, Field, Signal; Ember replaced by Lumen, D-40) with a TESTING-ONLY Design switcher. Home has no tabs: next-alarm card (tap → time/days sheet), Mission chips, one hold-to-arm button. Pack registry with `tier` + `isPackUnlocked()` (all unlocked, no billing yet, D-06). Supersedes the single Minimal theme (D-23) | Approved plan docs/UI-PLAN.md (2026-11-01) | Implemented on `feature/ui-variants` |
| D-38 | **Signal is the retro 90s design:** teal desktop, grey 3-D chrome, VT323 terminal font; it rings as a dim amber CRT. Original styling only (no OS logos, names or proprietary fonts) | User decision 2026-11-01 | Implemented on `feature/ui-variants` |
| D-40 | **Ember replaced by Lumen** (graphite, volt-lime accent, Unbounded numerals, bento tiles; ringing = segmented ring). **Paper redone as a handwritten notebook** (Caveat + Patrick Hand, ruled paper, red margin, sticky-note chips, highlighter button; ringing = dark notebook with tally marks) | User: Ember looked like Claude's colours; Paper should look handwritten (2026-11-01) | Implemented on `feature/ui-variants` |
| D-41 | **Time picking without the scroll wheel:** drag the big hour/minutes on Home up/down (tap opens the sheet); in the sheet each design has its own picker (Lumen arc sliders, Paper tape rulers, Field drag-the-sun + minute slider, Signal LCD with hold-to-repeat ▲▼). No presets or ±5 chips (keep it simple). Locked while armed. The old WatchRotaryWheel is removed. Supersedes the wheel part of D-16 | User 2026-11-01: "A plus B", no extra chips | Implemented on `feature/ui-variants` |
| D-42 | **Type the time:** tapping the big numbers on Home opens the sheet ready to type (number keyboard, e.g. 0645); tapping the time inside any picker also switches to typing; a link switches back to the design's picker | User 2026-11-01 | Implemented on `feature/ui-variants` |
| D-43 | **Snooze length is a setting:** 1–20 min, default 5 (PIN page). Cruelty mode halves from that length, floor 20 s. The engine already accepts 10 s–60 min, so no native change | User 2026-11-01 | Implemented on `feature/ui-variants` |
| D-44 | **Movement target 10–500, default 15** (was 5–50). Stored values under 10 fall back to 15. Stepper: hold to run (speeds up) or tap the number to type. Ringing visuals cap at 50 marks/segments and scale | User 2026-11-01 | Implemented on `feature/ui-variants` |
| D-45 | **First-launch intro:** 4 short skippable cards (set time · move + scan · PIN only snoozes · hold to arm), then the "Get ready" checklist. Replay from Settings → How it works. Wording never promises more than the engine does | User 2026-11-01 asked for a walkthrough like normal apps | Implemented on `feature/ui-variants` |
| D-46 | **Streaks:** days in a row where the alarm rang and the mission was completed; days without an alarm don't break it; a ring ending without the mission (90-min limit) breaks it; test rings never count; history only on the phone | User 2026-11-01 | Implemented on `feature/streaks-alarms` (Phase 1) |
| D-47 | **Premium preview:** a feature registry with tiers (`src/logic/features.ts`); all unlocked; PRO tags on Mornings, extra alarms, wake-up check and the Paper/Field/Signal designs. Lumen stays the free default | User 2026-11-01 | Implemented on `feature/streaks-alarms` |
| D-48 | **Multiple alarms (up to 5)**, one shared mission. The engine stores a list and registers only ONE exact ring (the soonest alarm that is on); same-minute alarms ring once. The old single alarm migrates into alarm 1 with the same on/off state. Each alarm turns on through the same gates; an alarm that is on is locked; mission setup is locked while any alarm is on. Old `arm`/`cancel` kept (arm = first alarm, cancel = all off) | User 2026-11-01 | Implemented on `feature/streaks-alarms` (Phase 2) |
| D-49 | **D-10 narrowed:** with several alarms, an alarm that is off keeps its own time (no jump to "now"). A new alarm starts at the current time. The "now" draft only applies before the first alarm exists | Needed for multiple alarms | Implemented on `feature/streaks-alarms` |
| D-39 | **Arming and cancelling are hold-to-confirm** (~0.9 s). Screen readers get a direct "activate" action. Arming gates unchanged (D-25, D-29) | Prevent accidental arming/cancelling | Implemented on `feature/ui-variants` |

## Technical

| ID | Decision | Reason | Source | Status |
|---|---|---|---|---|
| T-01 | React Native + Expo (not Capacitor or a web app) | User wanted a real native app | 3.md:698 → 904 | Active |
| T-02 | `alarmG2` (web prototype) is frozen, reference only | Keep the blueprint stable | 3.md:2508-2520; 4.md:79 | Active |
| T-03 | Android package `com.rainbowblurry.wakeupnative` and slug `alarmG-native` **never change** | Changing the slug broke an EAS build; package = app identity | 4.md:460, 674, 1355-1374 | Active |
| T-04 | Alarm v1: expo-notifications scheduled notification (Option A) over AlarmManager + foreground service (Option B) | Less native code | 4.md:1462-1468 | **Superseded → T-05** |
| T-05 | Native `AlarmManager.setAlarmClock` + full-screen-intent notification, written as Kotlin inside a config plugin | Auto-open without a tap | 8.md:96-105; commit `414c152` | **Superseded → T-07** (works on device, but sound and state live in JS) |
| T-06 | Static `showWhenLocked` removed → runtime LockScreenBypass module, ON only while ringing/snoozed | Static flags kept the app above the lock screen all the time | 5.md:2808; 6.md:5-26; `079f4b2`, `edfde06` | **Superseded → T-07** |
| T-07 | **Local Expo module `modules/clockguard-alarm`** owns scheduling, a foreground ring service (sound/vibration/wake lock/notification), persisted ring/snooze state, boot recovery and lock-screen flags (Activity lifecycle listener). JS only renders and calls arm/cancel/snooze/disarm. **Migration order:** build the module, verify autolinking and native compilation, wire JS, and only then remove the superseded plugins and dependencies. Work stays on `claude/optimistic-ride-10wu6r`; no merge to `main` | Fixes B1–B5 at the root; real Kotlin files instead of regex patching; the working engine stays until the new one compiles | Today | Implemented on `feature/native-alarm-engine` (module named `ClockGuardEngine`) |
| T-08 | Remove the expo-notifications fallback path (after T-07 compiles) | Only the native path ever ran on device; two schedulers caused races | 8.md review #7; today | Implemented (Phase C) |
| T-12 | Service survival is **not guaranteed**: Android force-stop clears all alarms and stops services; START_STICKY doesn't cover every kill; OEM battery managers (Samsung) can interfere | Honest limits | Today | Active |
| T-09 | `expo-audio` replaced `expo-av` | expo-av deprecated | 1.md:5251; 3.md:1366 | Superseded → T-07 (native MediaPlayer plays the tone) |
| T-10 | EAS `preview` profile builds the sideload APK; `production` is AAB | Sideloading on the phone | 3.md:13117-13160; eas.json | Kept for reference; day-to-day builds → D-27 |
| T-11 | EAS Update (OTA) suggested to save builds | Free-tier build limit | 7.md:1135; 8.md:2820 | Never configured (no `expo-updates`); not needed with D-27 |

## Working agreements (from the chats)
- Give **full files** instead of fragments when more than ~2 places change (3.md:9035; 4.md:1498).
- Be decisive. Don't loop on confirmations. Push back when you disagree (1.md:11042; 3.md:10834; 5.md:2591).
- **Never claim a device test passed** unless the user reported it (1.md:11264). Code findings may be marked "verified in code"; runtime behaviour stays UNTESTED until the user reports a phone test.
- Don't promise CI runs or log reading until the tools are confirmed to work.
- Explain before any `git reset` / `restore` / `stash` (1.md:11320).
- Native changes (plugins, `app.json` permissions, native packages, `modules/`) need a new APK. JS-only changes still need a new APK too, because there is no OTA.
