# ClockGuard: Status

_Last updated: 2026-11-01._

Legend:
- **[device]**: the user reported it from the phone (Samsung, Android 16).
- **[code]**: verified in source or by local checks.
- **[CI]**: verified by a GitHub Actions run.
- **UNTESTED**: not yet reported from the phone.

## Current version
- `main` contains the native alarm engine (`modules/clockguard-alarm`), merged from `feature/native-alarm-engine`.
- The installed test APK was built from commit `f7e5688` (CI run #3, signed with the private sideload key).
- **The PIN fix below (`e430fb3`) is in the code but not in that APK yet** (needs the next build).

## Device test of the new engine (APK `f7e5688`, reported 2026-11-01)
| # | Test | Result |
|---|---|---|
| 1 | Auto-rings and opens with the screen locked | Pass [device] |
| 2 | Power button: sound continues, no snooze/disarm | Pass [device] |
| 3 | Back / Home: sound continues | Pass [device] |
| 4 | Swipe from Recents: sound continues | Pass [device] |
| 5 | Wrong PIN rejected, correct PIN snoozes | Pass [device] |
| 6 | Snooze survives swiping the app away | Pass [device] |
| 7 | Movement gate + wrong/correct barcode | Pass [device] |
| 8 | Disarm keeps the next-day schedule; no immediate re-ring | Pass [device] |
| 9 | Alarm survives reboot | **UNTESTED** |
| 10 | Cancel prevents the scheduled ring | Pass [device] |
| – | Guardrails: no weekdays / no barcode / no PIN / missing full-screen permission block arming | Pass [device] |
| – | Optional volume boost: raises low volume, restores it, OFF leaves it unchanged | Pass [device] |

## Fixed after that test (needs the next APK, UNTESTED)
- **PIN edit confusion:**
  - **Problem:** clearing or editing the PIN box never changed the saved PIN (that part was correct), but the screen didn't say so, and it showed no "Set" badge for the PIN.
  - **Fix (`e430fb3`):** a Set / Not set badge based on the *saved* PIN. The box starts empty, so the saved PIN is no longer shown in plain text. While you type, a hint says "not saved yet; your current PIN (••xx) stays active until you tap Save PIN" [code].

## Known limitations (honest)
- **Force stop** (App info → Force stop) cancels all alarms until the app is opened again. This is an Android rule. **Removing the app from Recents is fine**: the alarm and ringing survive it [device, test 4].
- The ringing-service restart after a system kill is requested, not guaranteed. Keep Battery set to Unrestricted.
- The screen coming back by itself after power is best effort (at most 3 times per ring, at least 30 s apart).
- The full-screen takeover happens only when the phone is locked or the screen is off; while you're using the phone it's a heads-up notification.
- Do Not Disturb may block the optional volume raise.

## Next steps
1. Build a new APK (Actions → Android APK (manual)) to get the PIN fix; test the PIN flow and test 9 (reboot).
2. UI/UX revamp on a new branch. The alarm engine is not touched.
3. When the UI is final: remove the code between the `TESTING-ONLY START`/`END` markers.

## CI runs
| Run | Commit | Result |
|---|---|---|
| [#1](https://github.com/rainbowblurry-book/alarmG-native/actions/runs/41296161793) | `73e5cb2` old + new engine | Compile OK [CI] |
| [#2](https://github.com/rainbowblurry-book/alarmG-native/actions/runs/41297448823) | `6677b78` new engine only | Compile OK, engine linked, 0 warnings in our code [CI] |
| [#3](https://github.com/rainbowblurry-book/alarmG-native/actions/runs/41301001456) | `f7e5688` | Signed APK produced; the one installed and device-tested [CI] |
