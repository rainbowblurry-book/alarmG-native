# Build and install ClockGuard (free, no Expo cloud builds)

Builds run on GitHub Actions: a standard Linux runner in a public repo, started by hand only.
Never paste passwords, keys or tokens into a chat.

## 1. One time: create the release signing key (in your Codespace)
Open a terminal in your Codespace and run these one at a time.

```bash
mkdir -p ~/clockguard-key && cd ~/clockguard-key
```

```bash
openssl req -x509 -newkey rsa:3072 -nodes -keyout key.pem -out cert.pem -days 10000 -subj "/CN=ClockGuard sideload"
```

This next command asks for an **export password** twice, and the typing stays hidden. Choose a strong one (at least 8 characters) and save it in a password manager now.

```bash
openssl pkcs12 -export -inkey key.pem -in cert.pem -name clockguard -out clockguard-release.p12
```

```bash
base64 -w0 clockguard-release.p12 > clockguard-release.b64.txt
```

## 2. One time: add 4 GitHub secrets
On github.com, open the repo, then Settings → Secrets and variables → Actions → **New repository secret**. Add:

| Name | Value |
|---|---|
| `ANDROID_KEYSTORE_BASE64` | The whole content of `clockguard-release.b64.txt`. Open it in the Codespace editor, select all, copy, paste |
| `ANDROID_KEYSTORE_PASSWORD` | The export password you chose |
| `ANDROID_KEY_PASSWORD` | The **same** export password |
| `ANDROID_KEY_ALIAS` | `clockguard` |

GitHub hides secret values. Forks and pull requests can't read them, and the workflow never prints them.

## 3. One time: back up the key, then clean up
1. In the Codespace file explorer, right-click `~/clockguard-key/clockguard-release.p12` → **Download**. Keep it somewhere safe and private, with the password stored separately (password manager). Without this file and password, future versions can't install over the old one; you'd have to uninstall again.
2. Then delete the working files from the Codespace:

```bash
rm -f ~/clockguard-key/key.pem ~/clockguard-key/cert.pem ~/clockguard-key/clockguard-release.b64.txt ~/clockguard-key/clockguard-release.p12
```

Never commit any of these files to the repo.

## 4. Each build
1. Open github.com → the repo → **Actions** → **Android APK (manual)** → **Run workflow**.
2. Pick the branch (`feature/native-alarm-engine`) → **Run workflow**.
3. Wait about 12–15 minutes. Open the run; the summary shows the signing certificate's SHA-256 fingerprint (that's public, not secret).
4. Download **ClockGuard-apk** under *Artifacts*. It's kept for 3 days and downloads as a zip containing `ClockGuard-<commit>.apk`.

Without the secrets, the run is only a compile check and produces no APK.

## 5. Install on the phone (first time with the new key)
1. **Uninstall the old ClockGuard** (Settings → Apps → ClockGuard → Uninstall). Its local settings are lost; that was accepted.
2. Open the zip on the phone and tap the APK. Allow "install unknown apps" for your browser or file manager if asked.
3. Open ClockGuard, allow notifications and the camera, then go to the **Settings tab** and make every row show **On**: Notifications, Alarms & reminders, Full-screen alarm, Battery Unrestricted.
4. In **Setup**: scan your item and set your own PIN. Then arm.

## Cost notes
- Public repo, standard `ubuntu-latest` runner: GitHub doesn't bill Actions minutes for that.
- No payment method on file: GitHub can't charge you. Paid usage is blocked rather than billed.
- Check yourself in GitHub → Settings → Billing and licensing (Claude can't read billing pages).
