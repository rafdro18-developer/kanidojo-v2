import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const audioDir = path.join(root, "audio");
const index = JSON.parse(fs.readFileSync(path.join(audioDir, "index.json"), "utf8"));
const keyFile = process.env.DEEPGRAM_KEY_FILE || path.join(os.homedir(), "Desktop", "OpencodeDeepgram.txt");
const apiKey = (process.env.DEEPGRAM_API_KEY || fs.readFileSync(keyFile, "utf8")).trim();
const voice = "aura-2-izanami-ja";
const concurrency = Number(process.env.CONCURRENCY || 32);
const rows = index.readings;
let cursor = 0;
let completed = 0;
let skipped = 0;
let failed = 0;
let bytes = 0;
const started = Date.now();

async function requestClip(row) {
  const file = path.join(audioDir, row.file);
  if (fs.existsSync(file) && fs.statSync(file).size > 500) {
    skipped += 1;
    bytes += fs.statSync(file).size;
    return;
  }
  const url = new URL("https://api.deepgram.com/v1/speak");
  url.searchParams.set("model", voice);
  url.searchParams.set("encoding", "opus");
  url.searchParams.set("container", "ogg");
  url.searchParams.set("bit_rate", "24000");
  for (let attempt = 0; attempt < 6; attempt += 1) {
    let response;
    try {
      response = await fetch(url, {
        method: "POST",
        headers: { Authorization: `Token ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ text: row.reading })
      });
    } catch (error) {
      if (attempt === 5) throw error;
      await new Promise((resolve) => setTimeout(resolve, 800 * (attempt + 1)));
      continue;
    }
    if (response.ok) {
      const data = Buffer.from(await response.arrayBuffer());
      if (data.length < 500 || data.subarray(0, 4).toString("ascii") !== "OggS") {
        if (attempt === 5) throw new Error(`Invalid audio for ${row.reading}`);
        await new Promise((resolve) => setTimeout(resolve, 800 * (attempt + 1)));
        continue;
      }
      fs.writeFileSync(file, data);
      completed += 1;
      bytes += data.length;
      return;
    }
    if (response.status === 429 || response.status >= 500) {
      if (attempt === 5) throw new Error(`${row.reading} HTTP ${response.status}`);
      await new Promise((resolve) => setTimeout(resolve, 1000 * (attempt + 1)));
      continue;
    }
    throw new Error(`${row.reading} HTTP ${response.status}: ${(await response.text()).slice(0, 300)}`);
  }
}

async function worker() {
  while (true) {
    const row = rows[cursor++];
    if (!row) return;
    try {
      await requestClip(row);
    } catch (error) {
      failed += 1;
      console.error(`FAILED ${row.id} ${row.reading}: ${error.message}`);
    }
    const done = completed + skipped + failed;
    if (done % 100 === 0 || done === rows.length) {
      const elapsed = ((Date.now() - started) / 1000).toFixed(1);
      const mb = (bytes / 1024 / 1024).toFixed(1);
      console.log(`${done}/${rows.length} completed=${completed} skipped=${skipped} failed=${failed} ${mb}MB ${elapsed}s`);
    }
  }
}

await Promise.all(Array.from({ length: concurrency }, () => worker()));
const meta = {
  voice,
  model: "Deepgram Aura-2",
  format: "opus",
  container: "ogg",
  bitrate: 24000,
  count: rows.length,
  readings: rows
};
fs.writeFileSync(path.join(audioDir, "index.json"), JSON.stringify(meta, null, 2));
fs.writeFileSync(path.join(audioDir, "voice.txt"), `${voice}\n${new Date().toISOString()}\n`, "utf8");
console.log(JSON.stringify({ voice, total: rows.length, completed, skipped, failed, bytes, seconds: ((Date.now() - started) / 1000).toFixed(1) }, null, 2));
if (failed) process.exitCode = 1;
