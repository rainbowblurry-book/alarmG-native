# Handoff (2026-11-01)

Read CLAUDE.md, then docs/STATUS.md, docs/FEATURES-PLAN.md, docs/DECISIONS.md (D-37…D-50).

## Where things are
| Build | Branch / commit | Contains | Device-tested? |
|---|---|---|---|
| #9 | `restore/ui-build9` = `9a657bb` | 4 designs, pickers, intro (UI restore point) | user testing |
| #10 | `feature/streaks-alarms` @ `257e6ea` | + Streaks (JS only, engine untouched) | not yet |
| #11 | `feature/streaks-alarms` @ head | + Multiple alarms + Wake-up check (engine changes; check OFF by default) | not yet |

- Build #11 must be started only after #10 finished (same-branch runs cancel each other).
- Nothing is merged to `main`. Merge only when the user asks, after device tests pass.
- User tests 9 → 10 → 11 in order. Device-test lists are in docs/STATUS.md.

## If something breaks
- Phase 1 problem → fix on `feature/streaks-alarms` (JS only).
- Engine problem in #11 → fix forward or go back to `257e6ea` (ask the user before rewriting the branch).
- Web preview for screenshots: `EXPO_OFFLINE=1 npx expo export -p web`, serve the folder, open
  `/?design=lumen&screen=Home&state=idle|armed|ringing|snoozed|check&alarms=2&check=5&moves=500`.
- `npx expo install` fails here (api.expo.dev blocked): use versions from node_modules/expo/bundledNativeModules.json.
- Git tags don't reach GitHub through this proxy; use branches as restore points.

## Open questions for the user
- Payment route (Play $25 + 15% vs. GitHub Releases/F-Droid free) — not decided.
- Launch splash is white in Android builds (needs native config to make it dark) — user may want it.
