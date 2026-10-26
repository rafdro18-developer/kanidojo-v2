import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const source = path.join(root, "src");
const audioIndex = JSON.parse(fs.readFileSync(path.join(root, "audio", "index.json"), "utf8"));
const shell = fs.readFileSync(path.join(source, "shell.html"), "utf8");
const css = fs.readFileSync(path.join(source, "styles.css"), "utf8");
const data = fs.readFileSync(path.join(source, "data.js"), "utf8");
const main = fs.readFileSync(path.join(source, "main.js"), "utf8");
const faviconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#8c6bff"/><stop offset="0.58" stop-color="#5b34f3"/><stop offset="1" stop-color="#4020cf"/></linearGradient></defs><rect width="64" height="64" rx="16" fill="url(#g)"/><text x="32" y="48" text-anchor="middle" font-family="Yu Mincho, Hiragino Mincho ProN, Noto Serif JP, serif" font-size="42" font-weight="700" fill="#ffffff">力</text></svg>`;
const favicon = `data:image/svg+xml,${encodeURIComponent(faviconSvg)}`;

function render({ audioMap, output }) {
  const audioSource = `window.KANIDOJO_AUDIO = ${JSON.stringify(audioMap)};`;
  let html = shell
    .replace("__FAVICON__", favicon)
    .replace("__CSS__", css)
    .replace("__DATA__", data)
    .replace("__AUDIO__", audioSource)
    .replace("__MAIN__", main);
  fs.writeFileSync(output, html, "utf8");
  console.log(output, `${(Buffer.byteLength(html) / 1024 / 1024).toFixed(2)} MB`);
}

const relativeAudio = {};
for (const row of audioIndex.readings) relativeAudio[row.reading] = `audio/${row.file}`;
fs.mkdirSync(path.join(root, "app"), { recursive: true });
fs.cpSync(path.join(root, "audio"), path.join(root, "app", "audio"), { recursive: true, force: true });
render({ audioMap: relativeAudio, output: path.join(root, "app", "index.html") });

const embeddedAudio = {};
for (const row of audioIndex.readings) {
  const bytes = fs.readFileSync(path.join(root, "audio", row.file));
  embeddedAudio[row.reading] = `data:audio/ogg;base64,${bytes.toString("base64")}`;
}
fs.mkdirSync(path.join(root, "standalone"), { recursive: true });
render({ audioMap: embeddedAudio, output: path.join(root, "standalone", "KaniDojo-v2.html") });
