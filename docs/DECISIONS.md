# ClockGuard: Decisions

Each entry lists the decision, the reason, its source and its status:
- **Active:** still holds.
- **Superseded → D-xx:** a later decision replaced it.
- **Changed today:** the user decided it on 2026-10-31.

Sources such as `3.md:906` mean `docs/chat-history/3.md`, line 906. "Code" means the decision is visible in the current source.

## Product

| ID | Decision | Reason | Source | Status |
|---|---|---|---|---|
| D-01 | **One alarm** with repeat days | Keep the flow simple until it is stable; multiple alarms maybe later or as a paid feature | 1.md:5, 74; 1.md:4483; 3.md:1180 | Active |
| D-02 | **The PIN only snoozes, it never dismisses.** It must be 10 digits: not one repeated digit, not sequential, not a 2-digit repeat, at least 4 distinct digits | Snoozing must take effort, but you can't escape the mission | 1.md:80; 3.md:12693-12719; code `SetupScreen.validateSnoozePin` | Active |
| D-03 | **Disarm by scanning a real household item.** Only the last 4 digits are shown. Manual entry is allowed only when registering in Setup, never at ring time | You have to physically get up and walk to the item | 1.md:4519; 3.md:334-378, 7918; code | Active. 3.md wanted manual entry only on camera failure; code allows it in Setup always (still not at ring time) |
| D-04 | The **movement mission gates the scanner** | You must actually move; tapping the card must not count | 3.md:284-332; code `RingingScreen.isMovementComplete` | Active |
| D-05 | **Cruelty mode** (optional): each next snooze is halved, floor 20 s | Differentiator, from the web prototype | 1.md:1123-1135; 5.md:1930-1948; code | Active |
| D-06 | **Honest monetization only:** core alarm free forever; no fake purchases, fake ads or bypass codes; real Play Billing later | User's ethics rule | 3.md:906, 1166-1176; issue #1 | Active |
| D-07 | Name **ClockGuard** (sorts next to the stock Clock app) | Branding | 4.md:623, 707 | Active |
| D-08 | Remove the notification's Dismiss/Snooze action buttons | They let you skip the mission | 8.md:176; code `alarmScheduler.setupAlarmChannel` | Active |
| D-09 | Lock the wheels, days, Setup and Settings tabs while armed | Can't weaken the alarm after arming | 7.md:1300-1358; code | Active |
| D-10 | Wheels show the current time when not armed | Faster to set | 8.md:2172 (user); code `useCurrentTimeWhenIdle` | Active |
| D-11 | Disarm sets the alarm to "not armed" (re-arm every night) | User request, 8.md:2172 | 8.md:2172; code `dismissWake` | **Superseded → D-21** |
| D-12 | Developer tools (Preview, Exit Preview, Simulate Pro) hidden behind code `Coderman880` | Friend testing without removing tools | 7.md:3830-3842, 4286; issue #1 (27 Sep) | **Superseded → D-22** |
| D-13 | Themes: 5 designer themes, then a 6th "Watch" | Visual identity experiments | 4.md:2363; 6.md:2263 | **Superseded → D-23** |
| D-14 | Wallpaper upload and custom alarm tone | Personalisation | 7.md:1218-1227; wallpaper paused 7.md:3725 | **Superseded → D-24** |
| D-15 | Don't block the power button in v1 | Seen as an aggressive paid feature in competitors | 1.md:4475-4507 | **Superseded → D-20** (react to power, not block it) |
| D-16 | Skia/Reanimated wheel (issue #4) and A6 dial (issue #2) are deferred; build only one of them | Current wheel feels good; big lift | 7.md:1025, 1095, 1102 | Active (UI phase) |

## Decided 2026-10-31 (this session)

| ID | Decision | Reason | Status |
|---|---|---|---|
| D-20 | **Power press while ringing:** sound keeps going **and** the ringing screen comes back on | Power was a free escape (bug B1) | Changed today |
| D-21 | **Disarm keeps the alarm armed** for the next repeat day; "Cancel alarm" turns it off | Repeat days must actually repeat (bug B7) | Changed today |
| D-22 | **Remove all developer tools** (Preview, Exit Preview, Simulate Pro, unlock code) | Barebones stable build | Changed today |
| D-23 | **Only the Minimal theme** (drop the others, the extra fonts and blur) | "Barebones working for a week"; redesign later | Changed today |
| D-24 | **Wallpaper and custom audio scrapped** for now; the bundled tone only | Wallpaper never rendered; tone adds silent-alarm risk | Changed today |
| D-25 | **Arming requires your own scanned item and your own PIN** (no built-in defaults) | Defaults made the mission meaningless (bug B6) | Changed today |
| D-26 | **Never use paid services, now or later** | User rule | Changed today |
| D-27 | **Build APKs with GitHub Actions** (free), signed with a fixed sideload keystore kept in the private repo. The current app is uninstalled once | Free; the assistant can run builds and read errors; EAS free builds are limited to 15 per month | Changed today |

## Technical

| ID | Decision | Reason | Source | Status |
|---|---|---|---|---|
| T-01 | React Native + Expo (not Capacitor or a web app) | User wanted a real native app | 3.md:698 → 904 | Active |
| T-02 | `alarmG2` (web prototype) is frozen, reference only | Keep the blueprint stable | 3.md:2508-2520; 4.md:79 | Active |
| T-03 | Android package `com.rainbowblurry.wakeupnative` and slug `alarmG-native` **never change** | Changing the slug broke an EAS build; package = app identity | 4.md:460, 674, 1355-1374 | Active |
| T-04 | Alarm v1: expo-notifications scheduled notification (Option A) over AlarmManager + foreground service (Option B) | Less native code | 4.md:1462-1468 | **Superseded → T-05** |
| T-05 | Native `AlarmManager.setAlarmClock` + full-screen-intent notification, written as Kotlin inside a config plugin | Auto-open without a tap | 8.md:96-105; commit `414c152` | **Superseded → T-07** (works on device, but sound and state live in JS) |
| T-06 | Static `showWhenLocked` removed → runtime LockScreenBypass module, ON only while ringing/snoozed | Static flags kept the app above the lock screen all the time | 5.md:2808; 6.md:5-26; `079f4b2`, `edfde06` | **Superseded → T-07** |
| T-07 | **Local Expo module `modules/clockguard-alarm`** owns scheduling, a foreground ring service (sound/vibration/wake lock/notification), persisted ring/snooze state, boot recovery and lock-screen flags (Activity lifecycle listener). JS only renders and calls arm/cancel/snooze/disarm | Fixes B1–B5 at the root; real Kotlin files instead of regex patching | Today | Changed today |
| T-08 | Remove the expo-notifications fallback path | Only the native path ever ran on device; two schedulers caused races | 8.md review #7; today | Changed today |
| T-09 | `expo-audio` replaced `expo-av` | expo-av deprecated | 1.md:5251; 3.md:1366 | Superseded → T-07 (native MediaPlayer plays the tone) |
| T-10 | EAS `preview` profile builds the sideload APK; `production` is AAB | Sideloading on the phone | 3.md:13117-13160; eas.json | Kept for reference; day-to-day builds → D-27 |
| T-11 | EAS Update (OTA) suggested to save builds | Free-tier build limit | 7.md:1135; 8.md:2820 | Never configured (no `expo-updates`); not needed with D-27 |

## Working agreements (from the chats)
- Give **full files** instead of fragments when more than ~2 places change (3.md:9035; 4.md:1498).
- Be decisive. Don't loop on confirmations. Push back when you disagree (1.md:11042; 3.md:10834; 5.md:2591).
- **Never claim a device test passed** unless the user reported it (1.md:11264).
- Explain before any `git reset` / `restore` / `stash` (1.md:11320).
- Native changes (plugins, `app.json` permissions, native packages, `modules/`) need a new APK. JS-only changes still need a new APK too, because there is no OTA.
