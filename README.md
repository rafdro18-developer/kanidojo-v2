# KaniDojo v2

KaniDojo v2 is an offline Japanese SRS with bundled audio for every kanji and vocabulary reading.

**Live site:** https://rafdro18-developer.github.io/kanidojo-v2/

![KaniDojo v2 item detail](screenshots/desktop-detail.png)

## What is included

- 10,353 kanji and vocabulary items
- 60 frequency-based levels and JLPT N5-N1 tracks
- 8,155 unique reading clips
- Native Ogg Opus audio, mono, 24 kbps, 48 kHz
- Japanese example sentences with furigana and English translations
- Tatoeba source links
- Local progress storage
- No account, analytics, server, or runtime text-to-speech

Example sentence audio is intentionally not included. The sentence text, furigana, translation, and Tatoeba link remain.

## Packages

### Standalone HTML

`standalone/KaniDojo-v2.html`

- 39.7 MB
- Everything embedded, including all reading audio
- Open directly in a browser
- No network required

### Windows installer

`windows/KaniDojo-Setup-2.0.0.exe`

- 139 MB
- 64-bit Windows installer
- Electron 45, bundled Chromium
- Installs KaniDojo and creates Start Menu and desktop shortcuts
- Unsigned; Windows SmartScreen may show a warning

### Windows portable ZIP

`windows/KaniDojo-2.0.0-win-x64-portable.zip`

- 180 MB
- Extract once, then run `KaniDojo-2.0.0-win-x64/KaniDojo.exe`
- No installation required
- First extraction takes a few seconds; later launches are fast
- Unsigned; Windows SmartScreen may show a warning

The old single-file portable EXE was removed because it had to extract 8,155 audio files to a temp folder on every launch, which caused 30-second cold starts. The ZIP folder avoids that entirely. The installer is still the fastest option.

### Linux single-file runner

`linux/KaniDojo-2.0.0-linux-x64.run`

- 140 MB
- Self-extracting
- Includes Electron, the app, and all audio
- Extracts to `$XDG_DATA_HOME/kanidojo-v2/2.0.0` or `~/.local/share/kanidojo-v2/2.0.0`
- Runs with `--no-sandbox` because setuid sandbox permissions are not preserved in a user-level archive

```bash
chmod +x KaniDojo-2.0.0-linux-x64.run
./KaniDojo-2.0.0-linux-x64.run
```

### Linux tar archive

`linux/KaniDojo-2.0.0-linux-x64.tar.gz`

```bash
tar -xzf KaniDojo-2.0.0-linux-x64.tar.gz
./KaniDojo-2.0.0-linux-x64/run.sh
```

The Linux package includes Electron/Chromium and the app, but still expects the usual desktop Linux libraries (GTK 3, NSS, ALSA, X11/Wayland, GBM). A normal desktop distribution normally already has these.

An AppImage was not produced because the build host is Windows and the AppImage toolchain requires Linux symlink support. The `.run` file is the single-file Linux option.

## Directory map

```text
KaniDojo-v2/
  README.md
  package.json
  electron-main.cjs
  app/                     Electron web app + audio/
  audio/                   8,155 opus files, index.json, voice.txt
  standalone/              standalone HTML with embedded audio
  docs/                    GitHub Pages site + browser app copy
  windows/                 Windows installer and portable ZIP
  linux/                   Linux .run and .tar.gz
  src/                     web source (data.js, main.js, styles.css, shell.html)
  tools/                   build, audio generation, and Linux packaging scripts
  screenshots/             review screenshots
  CHECKSUMS.txt
```

## Audio

- Voice: Deepgram Aura-2 `aura-2-izanami-ja`
- Model: Deepgram Aura-2
- Format: Ogg Opus
- Bitrate: 24,000 bps
- Channels: mono
- Sample rate: 48 kHz
- Clips: 8,155
- Audio size: 26.90 MB
- Source text: unique kana readings only, deduplicated

The voice is pinned to Deepgram `aura-2-izanami-ja` so every reading uses the same speaker. The app maps a reading string such as `いち` or `あいだ` to a local Opus file. No browser speech engine is used.

There is one voice pack in this build: 8,155 clips, all Izanami.


## Rebuilding

Install dependencies:

```bash
npm install
```

Regenerate the reading index after curriculum changes:

```bash
node tools/make-audio-list.mjs
```

Generate missing audio clips with Deepgram:

```bash
set DEEPGRAM_API_KEY=...
node tools/generate-deepgram-audio.mjs
```

On Linux/macOS:

```bash
DEEPGRAM_API_KEY=... node tools/generate-deepgram-audio.mjs
```

The generator pins Izanami, skips existing files, retries rate limits, and writes Opus 24 kbps mono files plus `audio/index.json`.

Rebuild the web app and standalone HTML:

```bash
node tools/build-web.mjs
```

Build the Windows installer:

```bash
npm run dist:win
```

Build the Linux tar archive:

```bash
npm run dist:linux
python tools/build-linux.py
```

`tools/build-linux.py` fixes executable permissions and creates the self-extracting `.run` file.

## GitHub publishing

The `.gitignore` keeps `node_modules`, `dist`, and the large installers out of Git. The installers belong in GitHub Releases.

1. Create an empty GitHub repository.
2. Initialize and push the source:

```bash
git init
git add .
git commit -m "KaniDojo v2"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/kanidojo-v2.git
git push -u origin main
```

3. Create a release tagged `v2.0.0`.
4. Upload these as release assets:
   - `windows/KaniDojo-Setup-2.0.0.exe`
   - `windows/KaniDojo-2.0.0-win-x64-portable.zip`
   - `linux/KaniDojo-2.0.0-linux-x64.run`
   - `linux/KaniDojo-2.0.0-linux-x64.tar.gz`
   - `standalone/KaniDojo-v2.html`
5. Paste the release link into the README.

The Windows and Linux files are over GitHub's 100 MB per-file Git limit, so upload them as release assets, not normal Git files.

### GitHub Pages

A project-specific landing page is already in `docs/`:

- `docs/index.html` — landing page
- `docs/KaniDojo-v2.html` — standalone app for the Launch in browser button
- `docs/config.js` — GitHub repository and sponsor links
- `docs/assets/` — screenshots

Enable Pages with `main` / `/docs`. On `USERNAME.github.io/REPO/`, the landing page auto-detects the repo and sponsor URL. For a custom domain, set `repo` and `sponsor` explicitly in `docs/config.js`.

## Licensing and attribution

- Curriculum data: OpenJLPT, CC BY-SA 4.0
- Adapted curriculum and frequency-based 60-level ordering: CC BY-SA 4.0
- The 60-level structure is not claimed as unique; WaniKani uses a 60-level system as well. KaniDojo is not affiliated with WaniKani.
- Example sentences: Tatoeba, CC BY 2.0 FR, with source links retained
- Reading audio: Deepgram Aura-2 `aura-2-izanami-ja`
- No API key is included in this directory

The code license is not set. Add a license before publishing the repository. The curriculum data must remain under CC BY-SA 4.0.

## Startup and data storage

The Electron app shows a small splash window immediately, loads the app hidden, enables V8 code caching, and reveals the main window as soon as it is ready. The reusable app data is still loaded from local files; startup is dominated by Electron itself, not the SRS calculations.

The desktop app stores progress in Electron's Chromium localStorage:

- Windows: `%APPDATA%\KaniDojo\Local Storage\leveldb`
- Linux: `${XDG_CONFIG_HOME:-~/.config}/KaniDojo/Local Storage/leveldb`
- Storage key: `kanidojo_state_v1`

The data survives reinstalling or upgrading in place, and uninstalling may leave it behind. Use Settings -> Data & settings to export or import a JSON backup.

The standalone HTML stores progress in the browser profile used to open it, under the same `kanidojo_state_v1` key.

## Known limitations

- Windows installer and portable ZIP are unsigned.
- The portable ZIP needs a few seconds to extract once; subsequent launches are fast.
- Linux `.run` uses `--no-sandbox`; it is a local-content app, but this is still a sandbox trade-off.
- The Linux package needs standard desktop libraries.
- Example sentences are text-only; sentence audio is not bundled.
