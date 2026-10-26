# KaniDojo GitHub Pages

This folder is ready for GitHub Pages.

## Set the repository links

Edit `config.js`:

```js
window.KANIDOJO_CONFIG = {
  repo: "YOUR_USERNAME/kanidojo-v2",
  sponsor: "",
  version: "2.0.0"
};
```

On `https://USERNAME.github.io/REPO/`, the page automatically detects the repository. The donation button is intentionally omitted until a proper sponsor or tip link is available.

## Enable Pages

1. Push the repository.
2. Open **Settings → Pages**.
3. Set **Source** to **Deploy from a branch**.
4. Choose `main` and `/docs`.
5. Save.

## Release assets

The download buttons point to:

```text
https://github.com/OWNER/REPO/releases/latest/download/<asset>
```

Upload these to the `v2.0.0` release:

- `KaniDojo-Setup-2.0.0.exe`
- `KaniDojo-2.0.0-win-x64-portable.zip`
- `KaniDojo-2.0.0-linux-x64.run`
- `KaniDojo-v2.html`

## App copy

`KaniDojo-v2.html` is the standalone app for the **Launch in browser** button. Replace it whenever `standalone/KaniDojo-v2.html` is rebuilt:

```bash
cp ../standalone/KaniDojo-v2.html ./KaniDojo-v2.html
```

## Images

- `assets/hero.webp` — dashboard hero
- `assets/detail.webp` — item detail
