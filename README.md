# KaniDojo v2

KaniDojo is an offline Japanese SRS with 10,353 kanji and vocabulary items and audio for every reading.

**Live site:** https://rafdro18-developer.github.io/kanidojo-v2/  
**Release:** https://github.com/rafdro18-developer/kanidojo-v2/releases/tag/v2.0.0

![KaniDojo v2 item detail](screenshots/desktop-detail.png)

## Download

| Build | Download | Size |
|---|---|---|
| Windows installer | [KaniDojo-Setup-2.0.0.exe](https://github.com/rafdro18-developer/kanidojo-v2/releases/latest/download/KaniDojo-Setup-2.0.0.exe) | 139 MB |
| Windows portable | [KaniDojo-2.0.0-win-x64-portable.zip](https://github.com/rafdro18-developer/kanidojo-v2/releases/latest/download/KaniDojo-2.0.0-win-x64-portable.zip) | 180 MB |
| Linux single file | [KaniDojo-2.0.0-linux-x64.run](https://github.com/rafdro18-developer/kanidojo-v2/releases/latest/download/KaniDojo-2.0.0-linux-x64.run) | 140 MB |
| Linux archive | [KaniDojo-2.0.0-linux-x64.tar.gz](https://github.com/rafdro18-developer/kanidojo-v2/releases/latest/download/KaniDojo-2.0.0-linux-x64.tar.gz) | 140 MB |
| Standalone HTML | [KaniDojo-v2.html](https://github.com/rafdro18-developer/kanidojo-v2/releases/latest/download/KaniDojo-v2.html) | 39.7 MB |

The standalone file contains the app and all audio in one HTML file. The Windows and Linux installers are unsigned, so SmartScreen may warn on Windows.

## Features

- 10,353 kanji and vocabulary items
- 60 frequency-based levels and JLPT N5–N1 tracks
- 8,155 unique reading clips
- One consistent voice: Deepgram Aura-2 `aura-2-izanami-ja`
- Native Ogg Opus audio, mono, 24 kbps, 48 kHz
- Japanese example sentences with furigana and English translations
- Tatoeba source links
- Lessons, reviews, extra study, browse, heatmap, and JSON backup/import
- Local progress storage
- No account, analytics, server, or runtime text-to-speech

Example sentence audio is intentionally not included. The sentence text, furigana, translation, and Tatoeba link remain.

## Run

- **Windows:** run the installer, or extract the portable ZIP and launch `KaniDojo.exe`.
- **Linux:** `chmod +x KaniDojo-2.0.0-linux-x64.run && ./KaniDojo-2.0.0-linux-x64.run`
- **Browser:** open `KaniDojo-v2.html`.

The app starts with a small splash window and stores progress locally.

## Progress and data

- Windows: `%APPDATA%\KaniDojo\Local Storage\leveldb`
- Linux: `${XDG_CONFIG_HOME:-~/.config}/KaniDojo/Local Storage/leveldb`
- Standalone HTML: the browser profile's localStorage
- Storage key: `kanidojo_state_v1`

Use **Settings → Data & settings** to export or import a JSON backup.

Reset all levels works as many times as you want. It clears lessons, reviews, stats, streak, and settings and returns to the welcome screen. Resetting one device does not reset another.

## Audio

- Voice: Deepgram Aura-2 `aura-2-izanami-ja`
- 8,155 clips, all one voice
- Format: Ogg Opus
- Bitrate: 24 kbps mono
- Sample rate: 48 kHz
- Total audio: 26.90 MB

## Data and licensing

- Curriculum: [OpenJLPT](https://github.com/evanclan/OpenJLPT), **CC BY-SA 4.0**
- Adapted curriculum and frequency-based 60-level ordering: **CC BY-SA 4.0**
- 60-level structure is not claimed as unique; WaniKani also uses 60 levels. KaniDojo is not affiliated with WaniKani.
- Example sentences: [Tatoeba](https://tatoeba.org/), **CC BY 2.0 FR**, with source links retained
- Reading audio: Deepgram Aura-2, AI-generated
- No API key is included in this repository

The code license is not set. Add a license before distributing the source. The curriculum data must remain under CC BY-SA 4.0.

## Known limitations

- The Windows installer and portable ZIP are unsigned.
- The Windows portable ZIP extracts once; later launches are fast.
- The Linux `.run` uses `--no-sandbox` because setuid permissions are not preserved in a user-level archive.
- The Linux build expects standard desktop libraries (GTK 3, NSS, ALSA, X11/Wayland, GBM).
- Example sentences are text-only; sentence audio is not bundled.

## Development

Build, release, audio regeneration, and GitHub Pages instructions are in [BUILDING.md](BUILDING.md).
