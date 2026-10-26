import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dataSource = fs.readFileSync(path.join(root, "src", "data.js"), "utf8");
const context = {};
vm.createContext(context);
vm.runInContext(`${dataSource}\n;globalThis.__KANI_DATA = { ALL_ITEMS };`, context);
const items = context.__KANI_DATA.ALL_ITEMS;
const kanaPattern = /^[\u3040-\u30ff\u31f0-\u31ffー]+$/;

const readings = new Map();
for (const item of items) {
  const kana = [...new Set((item.readings || []).filter((value) => kanaPattern.test(value)))];
  for (const reading of kana) {
    if (!readings.has(reading)) readings.set(reading, new Set());
    readings.get(reading).add(item.id);
  }
}

const sorted = [...readings.entries()]
  .sort(([a], [b]) => a.localeCompare(b, "ja"))
  .map(([reading, ids], index) => ({
    id: String(index + 1).padStart(5, "0"),
    reading,
    file: `${String(index + 1).padStart(5, "0")}.opus`,
    chars: [...reading].length,
    bytes: Buffer.byteLength(reading, "utf8"),
    items: [...ids].sort()
  }));

const audioDir = path.join(root, "audio");
fs.mkdirSync(audioDir, { recursive: true });
const payload = {
  voice: "aura-2-izanami-ja",
  model: "aura-2",
  format: "opus",
  container: "ogg",
  bitrate: 24000,
  count: sorted.length,
  readings: sorted
};
fs.writeFileSync(path.join(audioDir, "index.json"), JSON.stringify(payload, null, 2));
fs.writeFileSync(path.join(root, "tools", "readings.json"), JSON.stringify(sorted, null, 2));
console.log(`readings: ${sorted.length}`);
console.log(`characters: ${sorted.reduce((sum, row) => sum + row.chars, 0)}`);
console.log(`utf8 bytes: ${sorted.reduce((sum, row) => sum + row.bytes, 0)}`);
console.log(`first: ${sorted[0].reading} ${sorted[0].file}`);
console.log(`last: ${sorted.at(-1).reading} ${sorted.at(-1).file}`);
