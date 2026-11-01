# UI/UX variants: approved plan (start here in a new chat)

_Written 2026-11-01 at the end of the engine session. The user approved this plan and must say **"go"** before any code is written. Read CLAUDE.md, docs/STATUS.md, docs/DECISIONS.md and docs/ARCHITECTURE.md first._

## Ground rule (user): the alarm is the MVP; the UI only helps
- Do **not** touch `modules/clockguard-alarm` or its behaviour.
- Arming gates, mission rules, Back blocking, the 90-minute limit and the volume boost must keep working exactly as today. Re-run the device checklist in STATUS.md after the UI change.
- Keep the existing logic hooks and contexts (`WakeFlowContext`, `SettingsContext`, `isMissionReady`, `snoozeDurationSeconds`, `describeEngineError`). New UI = new presentation over the same logic.

## Where things stand (verified)
- `main` @ `ed2941f`: native engine (#6) plus the 90-minute ring limit (#7).
- APK from CI run #4 has: engine, PIN-status fix, 90-minute limit.
  - Device-tested from APK `f7e5688`: everything except reboot.
  - UNTESTED: PIN fix, 90-minute limit, reboot.
- Builds: GitHub Actions, manual only (`Android APK (manual)`, pick a branch). Signing secrets already exist; the APK installs over the current app.
- Work branch for this: `feature/ui-variants` (created from `main`). Never push app code straight to `main`; open a PR, and merge when the user asks.
- The old branches can't be deleted by Claude; the user deletes them on GitHub.

## User decisions for the UI work
1. **One APK with a Design switcher** (Settings → Design, fenced `TESTING-ONLY`) to flip between the 4 designs live.
2. **Different layout + style per design.** Setup/Settings share one well-organised structure, styled per design.
3. **Themes must be sellable later:** a design "pack" registry (`id`, `name`, `tier: 'free' | 'premium'`) and `isPackUnlocked(id)`, which returns true for everything for now. **No fake purchases, no paywall, no billing yet** (honest monetization, D-06). Real Play Billing comes later.
4. **Libraries allowed (all free):** react-native-reanimated, react-native-gesture-handler, react-native-svg, @react-navigation/native-stack, free @expo-google-fonts. No Skia. Nothing paid. Use only free skills: `expo:expo-design-system`, `expo:expo-animation`, `expo:expo-ui`, `expo:expo-native-ui`. The `eas-*` skills are paid services: don't use them.
5. **Light/dark mix:** 1 light design and 3 dark. **The ringing and snooze screens are dim and calm in all of them** (no bright white, no red, no harsh contrast for someone just waking up).
6. **No "AI slop":** no purple/blue gradients or generic look. Each design should feel human-designed, inspired by real well-designed products. Fewer words, more icons, nesting, and one main action per screen.

## Shared structure (all 4 designs)
- **Home, with no bottom tabs:**
  - big "Next alarm" card (time, days, "in 7h 20m"); tap it → bottom sheet with the time wheel and days;
  - one **hold-to-arm** button (prevents accidental arming); Cancel when armed;
  - "Mission" row with 3 chips: `Move 15 · Item ✓ · PIN ✓`; tap one → its own page (Item scan, PIN, Movement);
  - gear → Settings.
- **Settings:** grouped list with sub-pages: Phone readiness (4 permissions), Volume boost, Test alarm (TESTING-ONLY), Design (TESTING-ONLY switcher), Reset (disabled while armed).
- **First launch:** a readiness checklist (the 4 phone settings + item + PIN), ticked off once.
- **Ringing:** dim, huge time, one step at a time.
  - Step 1 "Move": a progress ring fills with movement.
  - Step 2 "Scan": the button appears when movement is done.
  - "Snooze with PIN" is a small, quiet link.
  - Test-ring banner and Exit test stay (fenced).
- **Snoozed:** a dim countdown plus "Scan now".
- **Explanations** go behind a small ⓘ, not paragraphs. Keep Setup locked while armed; Settings stays reachable (D-35).

## The 4 designs (no purple/blue)
| # | Name | Mode | Mood / palette | Inspired by | Ringing screen |
|---|---|---|---|---|---|
| 1 | **Lumen** (replaced Ember, user 2026-11-01: "looks like Claude colours") | dark | graphite #0E0F11, off-white, one volt-lime #D4F25C; Unbounded numerals, Manrope text; bento tiles | modern sport/fintech dashboards | segmented ring (one segment per move) + soft dim volt glow |
| 2 | Paper (**redone as a handwritten notebook**) | light | dot-grid (bullet-journal) cream page, red margin that content never crosses, ruled lines only under rows inside cards (text always sits on a line), graphite ink, red pen, yellow highlighter; Caveat numerals, Patrick Hand text; sticky-note chips, taped index card | paper notebooks | dark notebook page, chalky handwriting, tally marks fill as you move |
| 3 | Field | dark | moss green + bone, rounded soft shapes | Headspace calm, but grown-up | progress drawn as a sun rising over a hill (SVG) |
| 4 | Signal | **retro 90s** (user, 2026-11-01) | teal desktop #008080, grey 3-D chrome #C0C0C0/#808080, VT323 terminal font | 90s desktops, amber CRT terminals | dim amber CRT: scanlines, block progress bar `[████░░]`, terminal text |

## Self-checks before giving the user an APK
- `npx tsc --noEmit`; `npx expo prebuild -p android --clean` (check the manifest). New native libs → confirm autolinking.
- **Visual self-review:** render every screen of all 4 designs on web (react-native-web, dev-only) with the engine mocked to idle, ringing and snoozed. Screenshot them with the pre-installed Playwright/Chromium, review spacing and contrast, and send the user the screenshots.
- **Crash safety:** add an error boundary that shows the error text with a **Copy** button instead of crashing, so the user can paste errors into chat.
- Then one CI build on `feature/ui-variants` (manual trigger) and send the run link.

## What the user does to test
1. Open the run link → Artifacts → ClockGuard-apk → install. It installs over the current app and keeps the alarm and settings.
2. Settings → Design: switch between the 4 designs; use each, including Test alarm, to see each ringing screen.
3. Reply with short notes per design and screen.

No dev client or Metro (the old tunnel/ngrok trouble). If the app breaks: reinstall the previous APK and paste the copied error text.

## Known open items (not UI)
- The reboot test is untested.
- The PIN fix and the 90-minute limit are untested.
- Force stop kills alarms (Android rule); Recents is fine. Keep Battery on Unrestricted.
- Remove the `TESTING-ONLY` code when the UI is final.
- Ideas for later: multiple alarms, mission difficulty, first-run guide (now in plan), low-battery warning.

## Build notes (2026-11-01, after "go")
- Mix is now 1 light (Paper), 2 dark (Lumen, Field), 1 retro (Signal). All ringing/snooze screens are dim.
- Libraries added (all free): react-native-svg, @react-navigation/native-stack, expo-clipboard, Google Fonts (Manrope, Unbounded, Caveat, Patrick Hand, Nunito, VT323; all OFL). Reanimated/gesture-handler were **not** needed (RN Animated is enough), so less native risk.
- Web preview (dev-only): `npx expo export -p web`, then open `/?design=lumen&screen=Home&state=idle|armed|blocked|ringing|scan|snoozed&perms=ok|missing&sheet=1`.

### Colour notes (sources checked on the web)
- Dark designs use warm/tinted near-black instead of #000 and off-white text instead of #FFF (Material dark-theme guidance: https://m2.material.io/design/color/dark-theme).
- Signal: Windows-95-era desktop teal #008080 and 3-D greys #C0C0C0 / #808080 (Wine system-colour table, colorswall); amber CRT phosphor ≈ #FFB000, dimmed for ringing.
- Field: forest/moss + cream direction (moss ≈ #52796F/#8A9A5B, cream #F0EAD6), tuned for contrast.
- Contrast checked with a WCAG script: body text ≥ 4.5:1 on its surface in every pack; ringing text kept ~8–10:1 (readable, not harsh).
