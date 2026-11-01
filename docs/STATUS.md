# ClockGuard: Status

_Last updated: 2026-11-01._

Legend:
- **[device]**: the user reported it from the phone (Samsung, Android 16).
- **[code]**: verified by reading the source or by local checks.
- **[CI]**: verified by a GitHub Actions run.
- **UNTESTED**: no phone test reported yet.

## Branches
| Branch | What | State |
|---|---|---|
| `main` | The app as on the phone (`c0aa39d` + the uploaded docs), plus the manual workflow file | The working old engine; untouched app code |
| `claude/optimistic-ride-10wu6r` | Docs consolidation only | Pushed |
| `feature/native-alarm-engine` | New native engine (Phases A–C) | Pushed; **merge decision is the user's** |

## Build on the phone
- The installed APK is built from `c0aa39d` (old engine) [device].
- The new engine needs a fresh install: the new signing key requires uninstalling the old app once (D-33).

## Old engine: what worked / what didn't (device history)
| Behaviour | Source |
|---|---|
| Rang by itself with the screen off (full-screen intent) | [device] chat-history/8.md:2172 |
| No re-ring after disarm on reopen | [device] 8.md:2172 |
| Wheels and tabs locked while armed | [device] 7.md:3105 |
| **Power button while ringing silenced the alarm**; Back gesture made it vanish | [device] 2026-10-31 |

Root cause: the sound played inside the screen (`expo-audio`), and ring state was React memory only.

## New engine (feature/native-alarm-engine): implemented, UNTESTED on device
- Native foreground ring service owns sound, vibration, wake lock and the full-screen notification. Power, Back, Home and Recents can't silence it [code].
- Persisted ring and snooze state. Snooze re-rings through an exact alarm even if the app process is gone [code].
- Exact alarms only. Arming is blocked (with a reason) without notifications, exact alarms or full-screen access [code].
- Disarm keeps the schedule for the next selected day; Cancel turns it off [code].
- Boot, update and clock-change recovery; Direct Boot storage [code].
- Bounded best-effort re-show after power: ≤3 per ring, ≥30 s apart [code].
- Optional volume boost (default off) with restore [code].
- TEST alarm with Exit test, fenced with `TESTING-ONLY` markers [code].
- Removed: old config-plugin engine, expo-notifications fallback, expo-audio, dev unlock code, extra themes/fonts/blur, wallpaper, custom tone, default barcode/PIN [code].

## Checks run
- `npx tsc --noEmit`: passes [code].
- `npx expo prebuild -p android --clean`: passes. Autolinking lists `ClockGuardEngineModule` + `ClockGuardEnginePackage`; the generated MainActivity/MainApplication have no regex patches; the release signing patch is applied [code].
- CI compile of Phase B (both engines present): see the bottom section.

## Known limitations / assumptions (not verified on a phone)
- **Force stop ≠ removing from Recents.** Force stop (App info → Force stop) cancels all alarms and stops the service until the app is reopened; no app can avoid that. Removing from Recents keeps the alarm and the ringing service.
- START_STICKY restart after a kill is requested, not guaranteed. Samsung battery management can interfere, so set Battery to Unrestricted.
- The foreground service type `systemExempted` (for alarm apps on Android 14+) is tried first, with `mediaPlayback` as fallback. Which one Android 16 accepts is unverified.
- The screen re-show after power depends on Samsung honouring a new full-screen notification while locked. Best effort only.
- The full-screen takeover only happens when the phone is locked or the screen is off; while in use, Android shows a heads-up notification.
- Home can't be blocked; the sound continues.
- Do Not Disturb policies may block the optional volume change (the alarm then rings at the current volume).

## One-time setup the user must do
See the final message on 2026-11-01 / CLAUDE.md. Create 4 GitHub Actions secrets (`ANDROID_KEYSTORE_BASE64`, `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`, `ANDROID_KEY_PASSWORD`) from a new key made in Codespaces; back the key up; then run the workflow.

## Device test checklist (new engine)
1. **Auto-open, locked:** arm 2 min ahead, lock the phone, wait. The ringing screen opens by itself.
2. **Power:** while ringing, press power. The sound must NOT stop, and it must NOT snooze or disarm. Note whether the screen comes back by itself (best effort).
3. **Background:** while ringing, press Home or open another app. Ringing continues; the notification brings you back. Back does nothing.
4. **Recents:** while ringing, swipe ClockGuard away from Recents. It keeps ringing. (Don't use Force stop.)
5. **Snooze PIN:** a wrong PIN → no snooze. The correct PIN → snoozed with a countdown.
6. **Snooze re-ring:** snooze, then Home, then swipe it from Recents. It rings again when the snooze ends.
7. **Disarm mission:** the scan button stays disabled until the movement count is reached. A wrong barcode → "Wrong item". The right barcode → silence.
8. **After disarm:** back to the normal screens, still armed for the next selected day (Cancel turns it off). Reopening the app does not ring again.
9. **Test alarm vs real alarm:** arm a real alarm for later, run Settings → Test alarm, tap Exit test. The real alarm is still armed and still rings on time.
10. **Volume:** with the option off, the volume is unchanged. With it on and alarm volume at 20%: it rises to about 60% at ring start, and goes back to 20% after snooze or disarm. If you change the volume during the ring, your choice is kept.
11. **Arming blocked:** with no item or PIN, or with "Alarms & reminders" / notifications / full-screen off, Arm is disabled with a reason.
12. **Reboot while armed:** it still rings.

## CI results
| Run | Commit | What | Result |
|---|---|---|---|
| [#1](https://github.com/rainbowblurry-book/alarmG-native/actions/runs/41296161793) | `73e5cb2` (Phase B; old + new engine) | Compile check, no signing secrets | **Success** in 11 min. `clockguard-alarm (1.0.0)` linked; `:clockguard-alarm:compileReleaseKotlin` ran with 0 errors and 0 warnings. The only Kotlin warnings were in the old engine files |
