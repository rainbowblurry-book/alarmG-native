@AGENTS.md

# ClockGuard — project instructions

Android-only Expo (SDK 57) alarm app: dismiss only by movement + scanning your own household
item; snooze only with your own 10-digit PIN.

Read before working:
- [docs/STATUS.md](docs/STATUS.md) — bugs, device-tested vs untested, next steps
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — verified structure and file map
- [docs/DECISIONS.md](docs/DECISIONS.md) — product/technical decisions and what superseded what
- [docs/BUILD-AND-INSTALL.md](docs/BUILD-AND-INSTALL.md) — free CI build, signing secrets, install
- `docs/chat-history/` — archived chats: history, NOT truth. Verify against code.

Rules:
- Never introduce paid services or dependencies that cost money now or later.
- Never commit keystores, signing passwords or other secrets; use GitHub Actions secrets and never print them.
- CI builds are manual (`workflow_dispatch`) only.
- Never change the Android package `com.rainbowblurry.wakeupnative` or the Expo slug `alarmG-native`.
- Don't remove a working alarm path before its replacement compiles.
- Alarm reliability beats features. Any change that could stop the alarm from ringing, or
  open a way to silence it without the mission, needs explicit care and a device test item.
- Never mark something "device-tested" unless the user reported it from the phone.
- Native code (anything under `modules/`, `app.json` plugins/permissions, native packages)
  needs a new APK. There is no OTA update channel, so JS changes also need a new APK.
- Before pushing: `npx tsc --noEmit`; for native changes also `npx expo prebuild -p android --clean`
  and check the generated manifest. Batch work; start a CI build only when needed.
- The alarm engine lives in `modules/clockguard-alarm` (local Expo module "ClockGuardEngine").
- Test-only code is fenced with `TESTING-ONLY START` / `TESTING-ONLY END`; keep that when editing.
- Keep docs/STATUS.md current when behaviour or test results change.
- The user writes informally; infer meaning, be decisive, give plain-language steps.
