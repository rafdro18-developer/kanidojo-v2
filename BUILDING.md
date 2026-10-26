# Building KaniDojo v2

Maintainer notes for rebuilding and publishing the project.

## Directory map

```text
KaniDojo-v2/
  README.md
  BUILDING.md
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

## Install dependencies

```bash
npm install
```

## Regenerate the reading index

After curriculum changes:

```bash
node tools/make-audio-list.mjs
```

## Generate reading audio

The generator pins Deepgram Aura-2 `aura-2-izanami-ja`, skips existing files, retries rate limits, and writes Opus 24 kbps mono files plus `audio/index.json`.

Windows:

```bash
set DEEPGRAM_API_KEY=...
node tools/generate-deepgram-audio.mjs
```

Linux/macOS:

```bash
DEEPGRAM_API_KEY=... node tools/generate-deepgram-audio.mjs
```

## Rebuild the web app and standalone HTML

```bash
node tools/build-web.mjs
```

Then refresh the GitHub Pages app copy:

```bash
cp standalone/KaniDojo-v2.html docs/KaniDojo-v2.html
```

## Build packages

Windows installer and portable ZIP:

```bash
npm run dist:win
python tools/build-win-portable.py
```

Linux archive and self-extracting runner:

```bash
npm run dist:linux
python tools/build-linux.py
```

`tools/build-linux.py` fixes executable permissions and creates the `.run` file.

## Checksums

```bash
python tools/checksums.py
sha256sum -c CHECKSUMS.txt
```

## Release assets

Upload these as release assets for `v2.0.0`:

- `windows/KaniDojo-Setup-2.0.0.exe`
- `windows/KaniDojo-2.0.0-win-x64-portable.zip`
- `linux/KaniDojo-2.0.0-linux-x64.run`
- `linux/KaniDojo-2.0.0-linux-x64.tar.gz`
- `standalone/KaniDojo-v2.html`

GitHub's normal Git file limit is 100 MB. Keep the large installers in Releases, not in Git history.

## GitHub Pages

The `docs/` folder is ready:

- `docs/index.html` — landing page
- `docs/KaniDojo-v2.html` — standalone app for the Launch in browser button
- `docs/config.js` — optional repository/sponsor overrides
- `docs/assets/` — screenshots

In GitHub, enable **Settings → Pages → Deploy from a branch → main → /docs**.

On `https://USERNAME.github.io/REPO/`, the landing page auto-detects the repository. For a custom domain, set `repo` explicitly in `docs/config.js`.

## Current live URLs

- Repository: https://github.com/rafdro18-developer/kanidojo-v2
- Release: https://github.com/rafdro18-developer/kanidojo-v2/releases/tag/v2.0.0
- Pages: https://rafdro18-developer.github.io/kanidojo-v2/
