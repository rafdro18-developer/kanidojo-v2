const STORAGE_KEY = "kanidojo_state_v1";
const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const LESSON_BATCH = 5;
const REVIEW_CAP_MAX = 999;
const VOCAB_COUNT = ALL_ITEMS.filter((item) => item.type === "vocabulary").length;
const KANJI_COUNT = ALL_ITEMS.filter((item) => item.type === "kanji").length;
const KANA_VOCAB_COUNT = ALL_ITEMS.filter((item) => item.type === "vocabulary" && !/[㐀-鿿豈-﫿]/.test(item.characters)).length;
const RADICAL_CATALOG = (() => {
  const map = new Map();
  ALL_ITEMS.forEach((item) => {
    if (item.type !== "kanji") return;
    (item.parts || []).forEach((part) => {
      const name = String(part || "").trim();
      if (!name) return;
      if (!map.has(name)) map.set(name, { name, kanji: [], levels: new Set(), jlpt: new Set() });
      const radical = map.get(name);
      radical.kanji.push(item);
      radical.levels.add(item.level);
      radical.jlpt.add(item.jlpt);
    });
  });
  return [...map.values()].map((radical) => {
    const glyph = /^[⺀-鿿豈-﫿]+$/.test(radical.name) ? radical.name : "・";
    const search = [radical.name, ...radical.kanji.map((item) => item.characters), ...radical.kanji.flatMap((item) => item.meanings)].join(" ").toLowerCase();
    return {
      ...radical,
      glyph,
      count: radical.kanji.length,
      levels: [...radical.levels].sort((a, b) => a - b),
      jlpt: [...radical.jlpt],
      search
    };
  }).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
})();
const RADICAL_COUNT = RADICAL_CATALOG.length;
const STANDARD_INTERVALS = [4 * HOUR, 8 * HOUR, 23 * HOUR, 47 * HOUR, 7 * DAY, 14 * DAY, 30 * DAY, 120 * DAY];
const DEMO_INTERVALS = [10 * SECOND, 20 * SECOND, 40 * SECOND, 90 * SECOND, 3 * MINUTE, 6 * MINUTE, 12 * MINUTE, 24 * MINUTE];
const UI_SIZES = ["small", "compact", "standard", "large", "xlarge", "xxlarge"];
const UI_SIZE_LABELS = {
  small: ["Small", "84%"],
  compact: ["Compact", "92%"],
  standard: ["Standard", "100%"],
  large: ["Large", "108%"],
  xlarge: ["Extra large", "118%"],
  xxlarge: ["Huge", "128%"]
};
const STUDY_BATCH = 20;

const STAGES = [
  { name: "Apprentice 1", group: "Apprentice", color: "#ff5c8a" },
  { name: "Apprentice 2", group: "Apprentice", color: "#ff6d96" },
  { name: "Apprentice 3", group: "Apprentice", color: "#ff7ea2" },
  { name: "Apprentice 4", group: "Apprentice", color: "#ff90ae" },
  { name: "Guru 1", group: "Guru", color: "#7c5cff" },
  { name: "Guru 2", group: "Guru", color: "#9277ff" },
  { name: "Master", group: "Master", color: "#3b82f6" },
  { name: "Enlightened", group: "Enlightened", color: "#0db5a6" },
  { name: "Burned", group: "Burned", color: "#4b4560" }
];

const STAGE_GROUPS = [
  { name: "Apprentice", color: "#ff5c8a" },
  { name: "Guru", color: "#7c5cff" },
  { name: "Master", color: "#3b82f6" },
  { name: "Enlightened", color: "#0db5a6" },
  { name: "Burned", color: "#4b4560" }
];

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function typeLabel(type) {
  if (type === "radical") return "Radical";
  if (type === "kanji") return "Kanji";
  return "Vocabulary";
}

function characterCount(value) {
  return Array.from(value).length;
}

function charSizeClass(value) {
  const count = characterCount(value);
  if (count >= 7) return "multi7";
  if (count === 6) return "multi6";
  if (count === 5) return "multi5";
  if (count === 4) return "multi4";
  if (count === 3) return "multi3";
  if (count === 2) return "multi";
  return "";
}

function isKana(value) {
  return /[\u3040-\u30ff\u31f0-\u31ff]/.test(value);
}

const ROMAJI_SYLLABLES = [
  ["kya", "きゃ"], ["kyu", "きゅ"], ["kyo", "きょ"],
  ["sha", "しゃ"], ["shu", "しゅ"], ["sho", "しょ"], ["sya", "しゃ"], ["syu", "しゅ"], ["syo", "しょ"],
  ["cha", "ちゃ"], ["chu", "ちゅ"], ["cho", "ちょ"], ["tya", "ちゃ"], ["tyu", "ちゅ"], ["tyo", "ちょ"],
  ["nya", "にゃ"], ["nyu", "にゅ"], ["nyo", "にょ"],
  ["hya", "ひゃ"], ["hyu", "ひゅ"], ["hyo", "ひょ"],
  ["mya", "みゃ"], ["myu", "みゅ"], ["myo", "みょ"],
  ["rya", "りゃ"], ["ryu", "りゅ"], ["ryo", "りょ"],
  ["gya", "ぎゃ"], ["gyu", "ぎゅ"], ["gyo", "ぎょ"],
  ["ja", "じゃ"], ["ju", "じゅ"], ["jo", "じょ"], ["jya", "じゃ"], ["jyu", "じゅ"], ["jyo", "じょ"], ["zya", "じゃ"], ["zyu", "じゅ"], ["zyo", "じょ"],
  ["bya", "びゃ"], ["byu", "びゅ"], ["byo", "びょ"],
  ["pya", "ぴゃ"], ["pyu", "ぴゅ"], ["pyo", "ぴょ"],
  ["shi", "し"], ["si", "し"], ["chi", "ち"], ["ti", "ち"], ["tsu", "つ"], ["tu", "つ"],
  ["fu", "ふ"], ["hu", "ふ"], ["ji", "じ"], ["zi", "じ"], ["di", "ぢ"], ["du", "づ"],
  ["ka", "か"], ["ki", "き"], ["ku", "く"], ["ke", "け"], ["ko", "こ"],
  ["sa", "さ"], ["su", "す"], ["se", "せ"], ["so", "そ"],
  ["ta", "た"], ["te", "て"], ["to", "と"],
  ["na", "な"], ["ni", "に"], ["nu", "ぬ"], ["ne", "ね"], ["no", "の"],
  ["ha", "は"], ["hi", "ひ"], ["he", "へ"], ["ho", "ほ"],
  ["ma", "ま"], ["mi", "み"], ["mu", "む"], ["me", "め"], ["mo", "も"],
  ["ya", "や"], ["yu", "ゆ"], ["yo", "よ"],
  ["ra", "ら"], ["ri", "り"], ["ru", "る"], ["re", "れ"], ["ro", "ろ"],
  ["wa", "わ"], ["wo", "を"], ["wi", "うぃ"], ["we", "うぇ"],
  ["ga", "が"], ["gi", "ぎ"], ["gu", "ぐ"], ["ge", "げ"], ["go", "ご"],
  ["za", "ざ"], ["zu", "ず"], ["ze", "ぜ"], ["zo", "ぞ"],
  ["da", "だ"], ["de", "で"], ["do", "ど"],
  ["ba", "ば"], ["bi", "び"], ["bu", "ぶ"], ["be", "べ"], ["bo", "ぼ"],
  ["pa", "ぱ"], ["pi", "ぴ"], ["pu", "ぷ"], ["pe", "ぺ"], ["po", "ぽ"],
  ["vu", "ゔ"],
  ["a", "あ"], ["i", "い"], ["u", "う"], ["e", "え"], ["o", "お"]
];

function romajiToHiragana(value) {
  const input = String(value)
    .normalize("NFKC")
    .toLowerCase()
    .replace(/ā/g, "aa")
    .replace(/ī/g, "ii")
    .replace(/ū/g, "uu")
    .replace(/ē/g, "ee")
    .replace(/ō/g, "ou")
    .replace(/[^a-z']/g, "");
  let result = "";
  let index = 0;
  while (index < input.length) {
    const rest = input.slice(index);
    const next = input[index + 1] || "";
    if (rest[0] === "n" && (next === "" || (next !== "'" && !/[aeiouy]/.test(next)))) {
      result += "ん";
      index += 1;
      continue;
    }
    if (rest[0] === "n" && next === "'") {
      result += "ん";
      index += 2;
      continue;
    }
    if (rest[0] === rest[1] && /[bcdfghjklmpqrstvwxyz]/.test(rest[0])) {
      result += "っ";
      index += 1;
      continue;
    }
    const syllable = ROMAJI_SYLLABLES.find(([roman]) => rest.startsWith(roman));
    if (syllable) {
      result += syllable[1];
      index += syllable[0].length;
    } else {
      index += 1;
    }
  }
  return result;
}

function toHiragana(value) {
  return value.replace(/[\u30a1-\u30f6]/g, (char) => String.fromCharCode(char.charCodeAt(0) - 0x60));
}

function normalizeMeaning(value) {
  return String(value)
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[-_/]/g, " ")
    .replace(/[.,!?;:'"()[\]]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function meaningCandidates(item) {
  const values = new Set();
  item.meanings.forEach((meaning) => {
    const normalized = normalizeMeaning(meaning);
    values.add(normalized);
    ["to ", "a ", "an ", "the "].forEach((prefix) => {
      if (normalized.startsWith(prefix)) values.add(normalized.slice(prefix.length));
    });
  });
  return values;
}

function collapseRomaji(value) {
  return value
    .replace(/ā/g, "aa")
    .replace(/ī/g, "ii")
    .replace(/ū/g, "uu")
    .replace(/ē/g, "ee")
    .replace(/ō/g, "ou")
    .replace(/ou/g, "o")
    .replace(/oo/g, "o")
    .replace(/uu/g, "u")
    .replace(/aa/g, "a")
    .replace(/ii/g, "i")
    .replace(/ee/g, "e");
}

function normalizeReading(value) {
  const base = String(value).normalize("NFKC").trim().toLowerCase();
  if (isKana(base)) {
    return { type: "kana", value: toHiragana(base).replace(/[\s・、,.\-']/g, "") };
  }
  return {
    type: "romaji",
    value: collapseRomaji(base.replace(/[^a-zāīūēō]/g, "")),
    hiragana: romajiToHiragana(base)
  };
}

function readingMatches(item, value) {
  const input = normalizeReading(value);
  if (!input.value) return false;
  return item.readings.some((reading) => {
    const candidate = normalizeReading(reading);
    if (candidate.type === input.type && candidate.value === input.value) return true;
    return input.type === "romaji" && candidate.type === "kana" && input.hiragana === candidate.value;
  });
}

function checkAnswer(item, kind, value) {
  if (!String(value).trim()) return false;
  if (kind === "meaning") {
    return meaningCandidates(item).has(normalizeMeaning(value));
  }
  return readingMatches(item, value);
}

function kanaReadings(item) {
  return item.readings.filter((reading) => isKana(reading));
}

function romajiReadings(item) {
  return item.readings.filter((reading) => !isKana(reading));
}

function answerText(item, kind) {
  if (kind === "meaning") return escapeHtml(item.meanings.join(" / "));
  const romaji = romajiReadings(item).slice(0, 2).map(escapeHtml).join(", ");
  return `${pronunciationChips(item, "small")}${romaji ? ` <span class="romaji">(${romaji})</span>` : ""}`;
}

function meaningSummary(item, limit = 3) {
  if (item.meanings.length <= limit) return item.meanings.join(", ");
  return `${item.meanings.slice(0, limit).join(", ")} +${item.meanings.length - limit}`;
}

function stageGroup(stage) {
  if (stage <= 3) return "Apprentice";
  if (stage <= 5) return "Guru";
  if (stage === 6) return "Master";
  if (stage === 7) return "Enlightened";
  return "Burned";
}

function stageBadgeClass(stage) {
  return stageGroup(stage).toLowerCase();
}

function todayKey(timestamp = Date.now()) {
  const date = new Date(timestamp);
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

function formatDuration(milliseconds) {
  if (!Number.isFinite(milliseconds)) return "—";
  if (milliseconds <= 0) return "now";
  let seconds = Math.ceil(milliseconds / 1000);
  const days = Math.floor(seconds / 86400);
  seconds -= days * 86400;
  const hours = Math.floor(seconds / 3600);
  seconds -= hours * 3600;
  const minutes = Math.floor(seconds / 60);
  seconds -= minutes * 60;
  if (days > 0) return hours ? `${days}d ${hours}h` : `${days}d`;
  if (hours > 0) return minutes ? `${hours}h ${minutes}m` : `${hours}h`;
  if (minutes > 0) return seconds ? `${minutes}m ${seconds}s` : `${minutes}m`;
  return `${seconds}s`;
}

function formatDateTime(timestamp) {
  if (!Number.isFinite(timestamp)) return "—";
  return new Date(timestamp).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  });
}

function formatFullDateTime(timestamp) {
  if (!Number.isFinite(timestamp)) return "—";
  return new Date(timestamp).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  });
}

function getInterval(stage) {
  const intervals = state.settings.pace === "demo" ? DEMO_INTERVALS : STANDARD_INTERVALS;
  return intervals[stage];
}

function getPaceLabel() {
  return state.settings.pace === "demo" ? "Demo pace" : "Standard pace";
}

function defaultState() {
  return {
    schema: 5,
    createdAt: Date.now(),
    currentLevel: 1,
    currentJlpt: 5,
    settings: { pace: "standard", dailyGoal: 20, order: "level", gated: true, theme: "light", furigana: true, romaji: true, uiSize: "large", reviewCap: 0, heatmap: true, undoMistakes: false, skipKanaVocabulary: false },
    vacation: { active: false, startedAt: null, preserveStreak: false },
    items: {},
    stats: { lessons: 0, reviews: 0, correct: 0, incorrect: 0, days: {} },
    streak: { lastDate: null, count: 0, best: 0 },
    lastLevelUpAt: null,
    lastLevelUpTrack: null,
    lastLevelUpLabel: null,
    finalCleared: { level: null, jlpt: null }
  };
}

function normalizeNumber(value, fallback = 0) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function hydrateState(raw) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const next = defaultState();
  next.createdAt = normalizeNumber(raw.createdAt, Date.now());
  next.currentLevel = clamp(Math.round(normalizeNumber(raw.currentLevel, 1)), 1, MAX_LEVEL);
  next.currentJlpt = clamp(Math.round(normalizeNumber(raw.currentJlpt, 5)), 1, 5);
  next.settings.pace = raw.settings && raw.settings.pace === "demo" ? "demo" : "standard";
  next.settings.dailyGoal = clamp(Math.round(normalizeNumber(raw.settings && raw.settings.dailyGoal, 20)), 5, 200);
  next.settings.order = raw.settings && raw.settings.order === "jlpt" ? "jlpt" : "level";
  next.settings.gated = !raw.settings || raw.settings.gated !== false;
  next.settings.theme = raw.settings && raw.settings.theme === "dark" ? "dark" : "light";
  next.settings.furigana = !raw.settings || raw.settings.furigana !== false;
  next.settings.romaji = !raw.settings || raw.settings.romaji !== false;
  next.settings.uiSize = raw.settings && UI_SIZES.includes(raw.settings.uiSize) ? raw.settings.uiSize : "large";
  next.settings.reviewCap = clamp(Math.round(normalizeNumber(raw.settings && raw.settings.reviewCap, 0)), 0, REVIEW_CAP_MAX);
  next.settings.heatmap = !raw.settings || raw.settings.heatmap !== false;
  next.settings.undoMistakes = Boolean(raw.settings && raw.settings.undoMistakes === true);
  next.settings.skipKanaVocabulary = Boolean(raw.settings && raw.settings.skipKanaVocabulary === true);
  const vacation = raw.vacation && typeof raw.vacation === "object" ? raw.vacation : {};
  next.vacation.active = Boolean(vacation.active);
  next.vacation.startedAt = next.vacation.active ? normalizeNumber(vacation.startedAt, Date.now()) : null;
  next.vacation.preserveStreak = next.vacation.active ? Boolean(vacation.preserveStreak) : false;
  next.lastLevelUpAt = raw.lastLevelUpAt ? normalizeNumber(raw.lastLevelUpAt, null) : null;
  const rawTrack = raw.lastLevelUpTrack;
  next.lastLevelUpTrack = rawTrack === "jlpt" ? "jlpt" : (rawTrack === "level" || rawTrack === "wanikani" ? "level" : null);
  next.lastLevelUpLabel = typeof raw.lastLevelUpLabel === "string" ? raw.lastLevelUpLabel : null;
  const cleared = raw.finalCleared && typeof raw.finalCleared === "object" ? raw.finalCleared : {};
  next.finalCleared.level = cleared.level
    ? normalizeNumber(cleared.level, null)
    : (cleared.wanikani ? normalizeNumber(cleared.wanikani, null) : (raw.finalClearedAt ? normalizeNumber(raw.finalClearedAt, null) : null));
  next.finalCleared.jlpt = cleared.jlpt ? normalizeNumber(cleared.jlpt, null) : null;

  if (raw.items && typeof raw.items === "object" && !Array.isArray(raw.items)) {
    ALL_ITEMS.forEach((item) => {
      const entry = raw.items[item.id];
      if (!entry || typeof entry !== "object") return;
      const stage = clamp(Math.round(normalizeNumber(entry.stage, 0)), 0, 8);
      const nextReview = entry.nextReview === null ? null : normalizeNumber(entry.nextReview, Date.now());
      next.items[item.id] = {
        stage,
        nextReview: stage >= 8 ? null : nextReview,
        lessonAt: normalizeNumber(entry.lessonAt, Date.now()),
        correct: Math.max(0, Math.round(normalizeNumber(entry.correct, 0))),
        incorrect: Math.max(0, Math.round(normalizeNumber(entry.incorrect, 0))),
        reviews: Math.max(0, Math.round(normalizeNumber(entry.reviews, 0))),
        burnedAt: entry.burnedAt ? normalizeNumber(entry.burnedAt, null) : null,
        lastMistakeAt: entry.lastMistakeAt ? normalizeNumber(entry.lastMistakeAt, null) : null
      };
    });
  }

  if (raw.stats && typeof raw.stats === "object") {
    next.stats.lessons = Math.max(0, Math.round(normalizeNumber(raw.stats.lessons, 0)));
    next.stats.reviews = Math.max(0, Math.round(normalizeNumber(raw.stats.reviews, 0)));
    next.stats.correct = Math.max(0, Math.round(normalizeNumber(raw.stats.correct, 0)));
    next.stats.incorrect = Math.max(0, Math.round(normalizeNumber(raw.stats.incorrect, 0)));
    if (raw.stats.days && typeof raw.stats.days === "object") {
      Object.entries(raw.stats.days).forEach(([key, value]) => {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(key) || !value || typeof value !== "object") return;
        next.stats.days[key] = {
          lessons: Math.max(0, Math.round(normalizeNumber(value.lessons, 0))),
          reviews: Math.max(0, Math.round(normalizeNumber(value.reviews, 0))),
          correct: Math.max(0, Math.round(normalizeNumber(value.correct, 0))),
          incorrect: Math.max(0, Math.round(normalizeNumber(value.incorrect, 0)))
        };
      });
    }
  }

  if (raw.streak && typeof raw.streak === "object") {
    next.streak.lastDate = typeof raw.streak.lastDate === "string" ? raw.streak.lastDate : null;
    next.streak.count = Math.max(0, Math.round(normalizeNumber(raw.streak.count, 0)));
    next.streak.best = Math.max(next.streak.count, Math.round(normalizeNumber(raw.streak.best, 0)));
  }

  return next;
}

let storageOK = true;
let storageWarned = false;
let savedState = null;
try {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw) savedState = hydrateState(JSON.parse(raw));
} catch (error) {
  storageOK = false;
}

let state = savedState || defaultState();
let fresh = !savedState;

const ui = {
  route: "dashboard",
  welcome: fresh,
  welcomePace: "standard",
  session: null,
  browse: { q: "", type: "all", level: "all", jlpt: "all", stage: "all", limit: 120 },
  vocab: { q: "", level: "all", jlpt: "all", group: "level", stage: "all", limit: 120 },
  radicals: { q: "", level: "all", limit: 120 },
  lastDue: null,
  heatmapYear: new Date().getFullYear(),
  placement: null
};

function applyPreferences() {
  const root = document.documentElement;
  root.dataset.theme = state.settings.theme === "dark" ? "dark" : "light";
  root.dataset.furigana = state.settings.furigana === false ? "off" : "on";
  root.dataset.romaji = state.settings.romaji === false ? "off" : "on";
  root.dataset.uiSize = UI_SIZES.includes(state.settings.uiSize) ? state.settings.uiSize : "large";
}

function showToast(message, tone = "") {
  const root = document.getElementById("toastRoot");
  if (!root) return;
  const toast = document.createElement("div");
  toast.className = `toast ${tone}`.trim();
  toast.textContent = message;
  root.appendChild(toast);
  window.setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateY(8px)";
    window.setTimeout(() => toast.remove(), 190);
  }, 3100);
}

function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...state, savedAt: Date.now() }));
    storageOK = true;
  } catch (error) {
    storageOK = false;
    if (!storageWarned) {
      storageWarned = true;
      showToast("Local storage is unavailable. Progress will not persist after you close this page.", "error");
    }
  }
}

function ensureDay(timestamp = Date.now()) {
  const key = todayKey(timestamp);
  if (!state.stats.days[key]) {
    state.stats.days[key] = { lessons: 0, reviews: 0, correct: 0, incorrect: 0 };
  }
  return state.stats.days[key];
}

function touchActivity(timestamp = Date.now()) {
  const today = todayKey(timestamp);
  if (state.streak.lastDate === today) return;
  const yesterday = todayKey(timestamp - DAY);
  state.streak.count = state.streak.lastDate === yesterday ? state.streak.count + 1 : 1;
  state.streak.lastDate = today;
  state.streak.best = Math.max(state.streak.best || 0, state.streak.count);
}

function currentStreak() {
  if (isVacationActive()) return state.vacation.preserveStreak ? state.streak.count : 0;
  if (!state.streak.lastDate) return 0;
  const today = todayKey();
  const yesterday = todayKey(Date.now() - DAY);
  return state.streak.lastDate === today || state.streak.lastDate === yesterday ? state.streak.count : 0;
}

function dayLabel(count) {
  return `${count} ${count === 1 ? "day" : "days"}`;
}

function itemLearned(itemOrId) {
  const id = typeof itemOrId === "string" ? itemOrId : itemOrId.id;
  return Boolean(state.items[id]);
}

function prerequisitesMet(item) {
  return item.requires.every((id) => Boolean(state.items[id]));
}

function studyTrack() {
  return state.settings.order === "jlpt" ? "jlpt" : "level";
}

function currentJlptLabel() {
  return `N${state.currentJlpt}`;
}

function trackName() {
  return studyTrack() === "jlpt" ? "JLPT" : "Levels";
}

function trackShortLabel() {
  return studyTrack() === "jlpt" ? currentJlptLabel() : String(state.currentLevel);
}

function trackLevelLabel() {
  return studyTrack() === "jlpt" ? `JLPT ${currentJlptLabel()}` : `Level ${state.currentLevel}`;
}

function itemLevelLabel(item) {
  return `Level ${item.level} · ${item.jlpt}`;
}

function lessonGroupKey(item) {
  return studyTrack() === "jlpt" ? `JLPT ${item.jlpt}` : `Level ${item.level}`;
}

function isTrackLevelUnlocked(item) {
  if (!state.settings.gated) return true;
  return studyTrack() === "jlpt" ? JLPT_RANK[item.jlpt] >= state.currentJlpt : item.level <= state.currentLevel;
}

function isKanaOnlyVocabulary(item) {
  return item.type === "vocabulary" && !hasKanjiCharacter(item.characters);
}

function isLessonAvailable(item) {
  if (state.settings.skipKanaVocabulary && isKanaOnlyVocabulary(item)) return false;
  return isTrackLevelUnlocked(item) && !itemLearned(item) && prerequisitesMet(item);
}

function sortForTrack(a, b) {
  const track = studyTrack();
  const gated = state.settings.gated;
  if (track === "jlpt") {
    if (gated) {
      const current = state.currentJlpt;
      const distance = Math.abs(JLPT_RANK[a.jlpt] - current) - Math.abs(JLPT_RANK[b.jlpt] - current);
      if (distance) return distance;
      return (a.level - b.level) || TYPE_ORDER[a.type] - TYPE_ORDER[b.type] || a.order - b.order;
    }
    return (JLPT_RANK[b.jlpt] - JLPT_RANK[a.jlpt]) || a.level - b.level || TYPE_ORDER[a.type] - TYPE_ORDER[b.type] || a.order - b.order;
  }
  if (gated) {
    const distance = Math.abs(a.level - state.currentLevel) - Math.abs(b.level - state.currentLevel);
    if (distance) return distance;
  } else {
    const levelDiff = a.level - b.level;
    if (levelDiff) return levelDiff;
  }
  return TYPE_ORDER[a.type] - TYPE_ORDER[b.type] || a.order - b.order;
}

function isVacationActive() {
  return Boolean(state.vacation && state.vacation.active);
}

function getReviewCap() {
  return clamp(Math.round(normalizeNumber(state.settings.reviewCap, 0)), 0, REVIEW_CAP_MAX);
}

function getAvailableLessons() {
  if (isVacationActive()) return [];
  return ALL_ITEMS
    .filter(isLessonAvailable)
    .sort(sortForTrack);
}

function getWaitingLessons() {
  if (isVacationActive()) return [];
  return ALL_ITEMS
    .filter((item) => isTrackLevelUnlocked(item) && !itemLearned(item) && !prerequisitesMet(item))
    .filter((item) => !(state.settings.skipKanaVocabulary && isKanaOnlyVocabulary(item)))
    .sort(sortForTrack);
}

function getDueReviews(now = Date.now()) {
  if (isVacationActive()) return [];
  return ALL_ITEMS
    .filter((item) => {
      const entry = state.items[item.id];
      return entry && entry.stage < 8 && Number.isFinite(entry.nextReview) && entry.nextReview <= now;
    })
    .sort((a, b) => state.items[a.id].nextReview - state.items[b.id].nextReview || a.order - b.order);
}

function getUpcomingReviews(limit = 8, now = Date.now()) {
  if (isVacationActive()) return [];
  return ALL_ITEMS
    .filter((item) => {
      const entry = state.items[item.id];
      return entry && entry.stage < 8 && Number.isFinite(entry.nextReview) && entry.nextReview > now;
    })
    .sort((a, b) => state.items[a.id].nextReview - state.items[b.id].nextReview || a.order - b.order)
    .slice(0, limit);
}

function getNextReviewAt() {
  if (isVacationActive()) return null;
  let next = null;
  Object.entries(state.items).forEach(([id, entry]) => {
    if (!ITEM_BY_ID.has(id) || entry.stage >= 8 || !Number.isFinite(entry.nextReview)) return;
    if (next === null || entry.nextReview < next) next = entry.nextReview;
  });
  return next;
}

function getLevelProgress() {
  const track = studyTrack();
  const kanji = ALL_ITEMS.filter((item) => {
    if (item.type !== "kanji") return false;
    return track === "jlpt" ? item.jlpt === currentJlptLabel() : item.level === state.currentLevel;
  });
  const guru = kanji.filter((item) => (state.items[item.id] ? state.items[item.id].stage >= 4 : false)).length;
  const needed = kanji.length ? Math.ceil(kanji.length * 0.9) : 0;
  return { kanji, guru, needed, percent: needed ? Math.min(100, (guru / needed) * 100) : 100 };
}

function isFinalCleared() {
  return Boolean(state.finalCleared[studyTrack()]);
}

function maybeLevelUp() {
  const track = studyTrack();
  const now = Date.now();
  let label = null;
  if (track === "jlpt") {
    while (state.currentJlpt > 1) {
      const progress = getLevelProgress();
      if (progress.needed > 0 && progress.guru >= progress.needed) {
        state.currentJlpt -= 1;
        label = `JLPT ${currentJlptLabel()}`;
      } else {
        break;
      }
    }
    const finalProgress = getLevelProgress();
    if (state.currentJlpt === 1 && finalProgress.guru >= finalProgress.needed && !state.finalCleared.jlpt) {
      state.finalCleared.jlpt = now;
      label = "JLPT N1";
    }
  } else {
    while (state.currentLevel < MAX_LEVEL) {
      const progress = getLevelProgress();
      if (progress.needed > 0 && progress.guru >= progress.needed) {
        state.currentLevel += 1;
        label = `Level ${state.currentLevel}`;
      } else {
        break;
      }
    }
    const finalProgress = getLevelProgress();
    if (state.currentLevel === MAX_LEVEL && finalProgress.guru >= finalProgress.needed && !state.finalCleared.level) {
      state.finalCleared.level = now;
      label = `Level ${MAX_LEVEL}`;
    }
  }
  if (label) {
    state.lastLevelUpAt = now;
    state.lastLevelUpTrack = track;
    state.lastLevelUpLabel = label;
  }
  return label ? { label, track } : null;
}

function getSrsCounts() {
  const counts = { Apprentice: 0, Guru: 0, Master: 0, Enlightened: 0, Burned: 0 };
  Object.values(state.items).forEach((entry) => {
    counts[stageGroup(entry.stage)] += 1;
  });
  return counts;
}

function getForecastBuckets(now = Date.now()) {
  const buckets = [
    { label: "< 1h", max: HOUR, count: 0 },
    { label: "1–6h", max: 6 * HOUR, count: 0 },
    { label: "6–24h", max: DAY, count: 0 },
    { label: "1–7d", max: 7 * DAY, count: 0 }
  ];
  Object.values(state.items).forEach((entry) => {
    if (entry.stage >= 8 || !Number.isFinite(entry.nextReview)) return;
    const delta = entry.nextReview - now;
    if (delta <= HOUR) buckets[0].count += 1;
    else if (delta <= 6 * HOUR) buckets[1].count += 1;
    else if (delta <= DAY) buckets[2].count += 1;
    else if (delta <= 7 * DAY) buckets[3].count += 1;
  });
  return buckets;
}

function totalAccuracy() {
  const total = state.stats.correct + state.stats.incorrect;
  return total ? Math.round((state.stats.correct / total) * 100) : null;
}

function todayStats() {
  return ensureDay();
}

function getHeatmapYearRange() {
  const current = new Date().getFullYear();
  const years = [current, new Date(state.createdAt).getFullYear()];
  Object.keys(state.stats.days).forEach((key) => years.push(Number(key.slice(0, 4))));
  return { min: Math.min(...years), max: current };
}

function clampHeatmapYear(year) {
  const range = getHeatmapYearRange();
  return clamp(Math.round(normalizeNumber(year, range.max)), range.min, range.max);
}

function getActivityHeatmap(year = ui.heatmapYear) {
  const selectedYear = clampHeatmapYear(year);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const gridStart = new Date(selectedYear, 0, 1);
  gridStart.setDate(gridStart.getDate() - gridStart.getDay());
  const gridEnd = new Date(selectedYear, 11, 31);
  gridEnd.setDate(gridEnd.getDate() + (6 - gridEnd.getDay()));
  const days = [];
  let totalReviews = 0;
  let activeDays = 0;
  for (let cursor = new Date(gridStart); cursor <= gridEnd; cursor.setDate(cursor.getDate() + 1)) {
    const date = new Date(cursor);
    const inYear = date.getFullYear() === selectedYear;
    const future = date > today;
    const stats = inYear && !future ? state.stats.days[todayKey(date.getTime())] : null;
    const reviews = stats ? stats.reviews : 0;
    if (inYear && !future) {
      totalReviews += reviews;
      if (reviews > 0) activeDays += 1;
    }
    const level = reviews === 0 ? 0 : reviews < 6 ? 1 : reviews < 16 ? 2 : reviews < 31 ? 3 : 4;
    days.push({
      inYear,
      future,
      today: inYear && !future && date.getTime() === today.getTime(),
      reviews,
      level,
      label: date.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })
    });
  }
  const weeks = Math.round(days.length / 7);
  const monthLabels = Array.from({ length: weeks }, () => "");
  for (let month = 0; month < 12; month += 1) {
    const dayIndex = Math.round((Date.UTC(selectedYear, month, 1) - Date.UTC(gridStart.getFullYear(), gridStart.getMonth(), gridStart.getDate())) / DAY);
    const column = Math.floor(dayIndex / 7);
    if (column >= 0 && column < weeks) {
      monthLabels[column] = new Date(selectedYear, month, 1).toLocaleDateString(undefined, { month: "short" });
    }
  }
  const range = getHeatmapYearRange();
  return { year: selectedYear, days, monthLabels, totalReviews, activeDays, weeks, minYear: range.min, maxYear: range.max };
}

function renderActivityHeatmap() {
  if (state.settings.heatmap === false) return "";
  ui.heatmapYear = clampHeatmapYear(ui.heatmapYear);
  const heatmap = getActivityHeatmap(ui.heatmapYear);
  const months = heatmap.monthLabels.map((label) => `<span>${escapeHtml(label)}</span>`).join("");
  const monthButtons = Array.from({ length: 12 }, (_, month) => {
    const label = new Date(heatmap.year, month, 1).toLocaleDateString(undefined, { month: "short" });
    return `<button type="button" class="heatmap-month-btn" data-action="heatmap-month" data-year="${heatmap.year}" data-month="${month}" aria-label="Zoom into ${escapeHtml(label)} ${heatmap.year}">${escapeHtml(label)}</button>`;
  }).join("");
  const weekdays = ["", "Mon", "", "Wed", "", "Fri", ""];
  const weekdayLabels = weekdays.map((label) => `<span>${label}</span>`).join("");
  const cells = heatmap.days.map((day) => {
    const classes = ["heatmap-cell", `level-${day.level}`];
    if (!day.inYear) classes.push("outside");
    if (day.future) classes.push("future");
    if (day.today) classes.push("today");
    const label = !day.inYear ? "" : day.future ? "Future day" : day.reviews ? `${day.label}: ${day.reviews} review${day.reviews === 1 ? "" : "s"}` : `${day.label}: no reviews`;
    return `<span class="${classes.join(" ")}"${label ? ` title="${escapeHtml(label)}"` : ""} aria-hidden="true"></span>`;
  }).join("");
  const ariaLabel = `${heatmap.year} review activity: ${heatmap.totalReviews} reviews across ${heatmap.activeDays} active days.`;
  const gridWidth = Math.max(832, heatmap.weeks * 16 + 34);
  return `
    <section class="card heatmap-card" style="margin-top:20px">
      <div class="card-head heatmap-head">
        <div><h2>Review activity</h2><p>${heatmap.year} review calendar. Select a month to zoom in, or use the arrows to revisit another year.</p></div>
        <div class="heatmap-head-meta">
          <span class="stage-badge enlightened">${heatmap.activeDays} active ${heatmap.activeDays === 1 ? "day" : "days"}</span>
          <div class="heatmap-nav" role="group" aria-label="Heatmap year">
            <button type="button" class="heatmap-year-btn" data-action="heatmap-prev-year" aria-label="Previous year" ${heatmap.year <= heatmap.minYear ? "disabled" : ""}>‹</button>
            <strong>${heatmap.year}</strong>
            <button type="button" class="heatmap-year-btn" data-action="heatmap-next-year" aria-label="Next year" ${heatmap.year >= heatmap.maxYear ? "disabled" : ""}>›</button>
          </div>
        </div>
      </div>
      <div class="heatmap-month-strip" role="group" aria-label="Zoom into a month">${monthButtons}</div>
      <div class="heatmap-scroll">
        <div class="heatmap-inner" style="min-width:${gridWidth}px">
          <div class="heatmap-months" style="grid-template-columns:repeat(${heatmap.weeks}, 12px)" aria-hidden="true">${months}</div>
          <div class="heatmap-body">
            <div class="heatmap-weekdays" aria-hidden="true">${weekdayLabels}</div>
            <div class="heatmap-grid" role="img" aria-label="${escapeHtml(ariaLabel)}">${cells}</div>
          </div>
        </div>
      </div>
      <div class="heatmap-footer">
        <span>Less</span>
        ${[0, 1, 2, 3, 4].map((level) => `<i class="heatmap-cell level-${level}" aria-hidden="true"></i>`).join("")}
        <span>More</span>
        <strong>${heatmap.year} · ${heatmap.totalReviews.toLocaleString()} reviews</strong>
      </div>
    </section>
  `;
}

function heatmapLevel(reviews) {
  return reviews === 0 ? 0 : reviews < 6 ? 1 : reviews < 16 ? 2 : reviews < 31 ? 3 : 4;
}

function openHeatmapMonth(year, month) {
  const range = getHeatmapYearRange();
  const selectedYear = clamp(Math.round(normalizeNumber(year, ui.heatmapYear)), range.min, range.max);
  const selectedMonth = clamp(Math.round(normalizeNumber(month, 0)), 0, 11);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const first = new Date(selectedYear, selectedMonth, 1);
  const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
  const startPad = first.getDay();
  let totalReviews = 0;
  let activeDays = 0;
  const dayCells = [];
  for (let index = 0; index < startPad; index += 1) {
    dayCells.push(`<span class="month-day blank" aria-hidden="true"></span>`);
  }
  for (let day = 1; day <= daysInMonth; day += 1) {
    const date = new Date(selectedYear, selectedMonth, day);
    const key = todayKey(date.getTime());
    const future = date > today;
    const stats = future ? null : state.stats.days[key];
    const reviews = stats ? stats.reviews : 0;
    const isToday = date.getTime() === today.getTime();
    if (!future) {
      totalReviews += reviews;
      if (reviews > 0) activeDays += 1;
    }
    const classes = ["month-day", `level-${heatmapLevel(reviews)}`];
    if (future) classes.push("future");
    if (isToday) classes.push("today");
    const label = future ? "Future day" : reviews ? `${reviews} review${reviews === 1 ? "" : "s"}` : "No reviews";
    dayCells.push(`
      <div class="${classes.join(" ")}" title="${escapeHtml(`${key}: ${label}`)}" aria-label="${escapeHtml(`${key}: ${label}`)}">
        <span class="month-day-num">${day}</span>
        ${reviews ? `<strong>${reviews}</strong>` : ""}
      </div>
    `);
  }
  const monthLabel = first.toLocaleDateString(undefined, { month: "long", year: "numeric" });
  const prevDisabled = selectedYear <= range.min && selectedMonth === 0;
  const nextDisabled = selectedYear >= range.max && selectedMonth === 11;
  const html = `
    <div class="month-zoom-head">
      <div>
        <span class="eyebrow">Review activity</span>
        <h2>${escapeHtml(monthLabel)}</h2>
        <p>${totalReviews.toLocaleString()} reviews across ${activeDays} active ${activeDays === 1 ? "day" : "days"}.</p>
      </div>
      <div class="month-zoom-nav">
        <button type="button" class="btn btn-ghost btn-sm" data-action="heatmap-month" data-year="${selectedMonth === 0 ? selectedYear - 1 : selectedYear}" data-month="${selectedMonth === 0 ? 11 : selectedMonth - 1}" ${prevDisabled ? "disabled" : ""}>‹ Previous</button>
        <button type="button" class="btn btn-ghost btn-sm" data-action="heatmap-month" data-year="${selectedMonth === 11 ? selectedYear + 1 : selectedYear}" data-month="${selectedMonth === 11 ? 0 : selectedMonth + 1}" ${nextDisabled ? "disabled" : ""}>Next ›</button>
      </div>
    </div>
    <div class="month-calendar" role="group" aria-label="${escapeHtml(monthLabel)} review calendar">
      ${["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((label) => `<span class="month-weekday">${label}</span>`).join("")}
      ${dayCells.join("")}
    </div>
    <div class="month-zoom-legend">
      <span>Less</span>
      ${[0, 1, 2, 3, 4].map((level) => `<i class="heatmap-cell level-${level}" aria-hidden="true"></i>`).join("")}
      <span>More</span>
      <strong>${totalReviews.toLocaleString()} reviews</strong>
    </div>
  `;
  openModal(html, "heatmap-month-modal");
}

function charTile(item, sizeClass = "") {
  const long = characterCount(item.characters) > 1 ? "long" : "";
  return `<span class="char-tile ${item.type} ${long} ${sizeClass}">${escapeHtml(item.characters)}</span>`;
}

function typeBadge(item) {
  return `<span class="type-badge ${item.type}">${typeLabel(item.type)}</span>`;
}

function stageBadgeFor(entry) {
  if (!entry) return `<span class="stage-badge locked">Not started</span>`;
  return `<span class="stage-badge ${stageBadgeClass(entry.stage)}">${STAGES[entry.stage].name}</span>`;
}

function browseStatus(item) {
  const entry = state.items[item.id];
  if (entry) return { kind: "learned", entry };
  if (!isTrackLevelUnlocked(item)) return { kind: "locked", reason: studyTrack() === "jlpt" ? item.jlpt : `Level ${item.level}` };
  if (!prerequisitesMet(item)) return { kind: "locked", reason: "Needs kanji" };
  return { kind: "new", reason: "Available" };
}

function hasKanjiCharacter(value) {
  return /[\u3400-\u9fff\uf900-\ufaff]/.test(String(value));
}

function primaryKana(item) {
  return kanaReadings(item).find((reading) => reading !== item.characters) || "";
}

function renderRuby(word, reading) {
  const text = String(word);
  const kana = String(reading || "");
  if (!kana || !hasKanjiCharacter(text)) return escapeHtml(text);
  return `<ruby>${escapeHtml(text)}<rt>${escapeHtml(kana)}</rt></ruby>`;
}

function renderFuriganaMarkup(source) {
  const text = String(source || "");
  const pattern = /\{([^{}|]+)\|([^{}|]+)\}/g;
  let result = "";
  let lastIndex = 0;
  let match = pattern.exec(text);
  while (match) {
    result += escapeHtml(text.slice(lastIndex, match.index));
    result += `<ruby>${escapeHtml(match[1])}<rt>${escapeHtml(match[2])}</rt></ruby>`;
    lastIndex = match.index + match[0].length;
    match = pattern.exec(text);
  }
  return result + escapeHtml(text.slice(lastIndex));
}

function renderExample(item) {
  const example = item.examples && item.examples[0];
  if (!example) {
    return `
      <section class="example-box">
        <div class="example-head"><h3>Example sentence</h3></div>
        <p class="related-note">No example sentence is available for this rare item yet.</p>
      </section>
    `;
  }
  const japanese = example.furigana ? renderFuriganaMarkup(example.furigana) : escapeHtml(example.ja);
  const source = example.tatoeba
    ? `<a class="example-source" href="https://tatoeba.org/en/sentences/show/${encodeURIComponent(example.tatoeba)}" target="_blank" rel="noreferrer" title="Tatoeba sentence ${escapeHtml(example.tatoeba)}, CC BY 2.0 FR">Tatoeba #${escapeHtml(example.tatoeba)}</a>`
    : (example.source ? `<span class="example-source">${escapeHtml(example.source)}</span>` : "");
  return `
    <section class="example-box">
      <div class="example-head"><h3>${example.generated ? "Study sentence" : "Example sentence"}</h3><div class="example-tools">${source}</div></div>
      <p class="example-ja">${japanese}</p>
      ${example.en ? `<p class="example-en">${escapeHtml(example.en)}</p>` : ""}
    </section>
  `;
}

function mnemonicParts(item) {
  const seen = new Set();
  const parts = [];
  for (const raw of item.parts || []) {
    const value = String(raw).trim();
    if (!value) continue;
    const component = ITEM_BY_ID.get(`k-${value}`);
    if (component && component.id === item.id) continue;
    if (!hasKanjiCharacter(value)) {
      const label = `the ${value} radical`;
      if (seen.has(label)) continue;
      seen.add(label);
      parts.push(label);
      continue;
    }
    if (!component) {
      if (seen.has(value)) continue;
      seen.add(value);
      parts.push(value);
      continue;
    }
    const meaning = component.meanings[0];
    if (seen.has(value) || seen.has(meaning)) continue;
    seen.add(value);
    seen.add(meaning);
    parts.push(`${value} (${meaning})`);
  }
  return parts.slice(0, 4);
}

function listPhrase(values) {
  if (values.length <= 1) return values[0] || "";
  if (values.length === 2) return `${values[0]} and ${values[1]}`;
  return `${values.slice(0, -1).join(", ")}, and ${values[values.length - 1]}`;
}

const MNEMONIC_SCENES = [
  "on a moonlit train platform", "in a crowded ramen shop", "on a windy mountain trail", "in a neon-lit alley",
  "in a quiet library", "at a snowy shrine", "in a bustling fish market", "on a rooftop garden",
  "in a tiny Tokyo apartment", "on a festival street", "in an empty classroom", "at a rainy bus stop",
  "at a desert oasis", "in a deep cedar forest", "in a retro arcade", "on a seaside pier",
  "in a packed subway car", "in a castle courtyard", "at a coffee counter", "at a fireworks festival",
  "in a foggy harbor", "in a sunlit rice field", "in a cramped bookstore", "at a mountain hot spring",
  "in a sleepy fishing village", "on a basketball court", "in a glass greenhouse", "in a candlelit temple",
  "in a convenience store at midnight", "in a cherry blossom park", "at a snowy train station", "on a steep stone staircase",
  "in a noisy kitchen", "in a quiet art studio", "in a dusty attic", "in a mossy garden",
  "at a busy crosswalk", "at a floating lantern festival", "on a rooftop laundry line", "in a cave by the sea"
];
const MNEMONIC_ACTORS = [
  "a sleepy samurai", "a determined baker", "a curious cat", "a tiny robot",
  "a strict teacher", "a wandering monk", "a clumsy ninja", "a cheerful farmer",
  "a forgetful wizard", "a street musician", "a hungry student", "a retired sumo wrestler",
  "a nosy neighbor", "a brave child", "a friendly kappa", "a talking fox",
  "a grumpy chef", "a paper crane spirit", "a train conductor", "a village shopkeeper",
  "a tired office worker", "a fearless sailor", "a tea master", "a mischievous tanuki",
  "a traveling merchant", "a shrine maiden", "a local ramen cook", "a jazz pianist",
  "a mountain guide", "a curious librarian"
];
const MNEMONIC_ACTIONS = [
  "stacking", "painting", "juggling", "hiding", "carrying", "arranging",
  "balancing", "polishing", "wrapping", "measuring", "labeling", "planting",
  "tossing", "sketching", "guarding", "serving", "rescuing", "chasing",
  "cleaning", "folding", "drawing", "sorting", "lifting", "pushing",
  "pulling", "sweeping", "taping", "gluing", "packing", "catching"
];
const MNEMONIC_TWISTS = [
  "a paper lantern swings", "rain taps the roof", "someone drops a tray", "a bell rings once",
  "the floor creaks", "a cat knocks over a cup", "steam fogs the window", "the lights flicker",
  "a train rumbles past", "wind scatters leaves", "a phone buzzes", "a clock ticks loudly",
  "a kettle whistles", "a crow lands nearby", "music leaks from a radio", "a bicycle bell rings",
  "a door slides open", "an old fan squeaks", "a spoon clatters", "the tide rolls in",
  "a dog barks outside", "a neon sign buzzes", "a page turns", "a broom scrapes the floor"
];

function mnemonicHash(value) {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (Math.imul(hash, 31) + value.charCodeAt(index)) >>> 0;
  }
  return hash >>> 0;
}

function mnemonicPick(values, key) {
  return values[mnemonicHash(key) % values.length];
}

function sentenceCase(value) {
  const text = String(value || "");
  return text ? text[0].toUpperCase() + text.slice(1) : text;
}

function itemMnemonic(item) {
  const meaning = item.meanings[0] || "this meaning";
  const reading = primaryKana(item);
  let parts = [];
  if (item.type === "kanji") {
    parts = mnemonicParts(item);
  } else {
    parts = item.requires
      .map((id) => ITEM_BY_ID.get(id))
      .filter(Boolean)
      .map((component) => `${component.characters} (${component.meanings[0]})`);
  }
  const objectPhrase = parts.length ? listPhrase(parts) : `the shape of ${item.characters}`;
  const pronoun = parts.length === 1 || !parts.length ? "it" : "them";
  const base = `${item.id}|${item.characters}|${meaning}`;
  const scene = mnemonicPick(MNEMONIC_SCENES, `${base}|scene`);
  const actor = mnemonicPick(MNEMONIC_ACTORS, `${base}|actor`);
  const action = mnemonicPick(MNEMONIC_ACTIONS, `${base}|action`);
  const twist = mnemonicPick(MNEMONIC_TWISTS, `${base}|twist`);
  const twistCap = sentenceCase(twist);
  const actorCap = sentenceCase(actor);
  const sceneCap = sentenceCase(scene);
  const readingLine = reading ? ` Say “${reading}” as the scene settles.` : "";
  if (!parts.length) {
    const noPartTemplates = [
      `${sceneCap}, ${actor} is ${action} a sign that reads ${item.characters}. The sign means “${meaning}”. ${twistCap}.${readingLine}`,
      `A ${item.characters} sign hangs ${scene}. ${actorCap} is ${action} it and says “${meaning}”. ${twistCap}.${readingLine}`,
      `${actorCap} paints ${item.characters} on a banner ${scene}. It means “${meaning}”. ${twistCap}.${readingLine}`,
      `The word ${item.characters} floats ${scene}. ${actorCap} is ${action} it and shouts “${meaning}”. ${twistCap}.${readingLine}`,
      `Memory hook: ${actor} stamps ${item.characters} onto a ticket ${scene}. The ticket means “${meaning}”. ${twistCap}.${readingLine}`,
      `Picture ${item.characters} glowing ${scene}. ${actorCap} reads it as “${reading || item.characters}” and remembers “${meaning}”. ${twistCap}.`
    ];
    return noPartTemplates[mnemonicHash(`${base}|no-parts`) % noPartTemplates.length];
  }
  const templates = [
    `${sceneCap}, ${actor} is ${action} ${objectPhrase}. That scene becomes ${item.characters}, “${meaning}”. ${twistCap}.${readingLine}`,
    `Picture ${objectPhrase} ${scene}. ${actorCap} is ${action} ${pronoun} until ${item.characters} appears, “${meaning}”. ${twistCap}.${readingLine}`,
    `${sceneCap}, ${actor} turns ${objectPhrase} into ${item.characters}, “${meaning}”, while ${twist}.${readingLine}`,
    `${actorCap} is ${action} ${objectPhrase} ${scene} when ${twist}. The result is ${item.characters}, “${meaning}”.${readingLine}`,
    `Watch ${actor} ${action} ${objectPhrase} ${scene}. ${item.characters} appears, meaning “${meaning}”. ${twistCap}.${readingLine}`,
    `Memory hook: put ${objectPhrase} ${scene}, where ${actor} is ${action} ${pronoun}. ${item.characters} is the sign for “${meaning}”. ${twistCap}.${readingLine}`
  ];
  return templates[mnemonicHash(`${base}|template`) % templates.length];
}


function speakerIcon() {
  return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9H4z" fill="currentColor"></path><path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"></path></svg>';
}

function pronunciationReadings(item) {
  const readings = [...new Set(kanaReadings(item))];
  return readings.length ? readings : (item.characters ? [item.characters] : []);
}

function readingAudioButton(reading, size = "") {
  const label = `Play ${reading}`;
  return `<button type="button" class="reading-chip ${size}" data-action="speak" data-speak="${escapeHtml(reading)}" aria-label="${escapeHtml(label)}" title="${escapeHtml(label)}"><span>${escapeHtml(reading)}</span>${speakerIcon()}</button>`;
}

function pronunciationChips(item, size = "") {
  const readings = pronunciationReadings(item);
  if (!readings.length) return "";
  return `<span class="reading-chips">${readings.map((reading) => readingAudioButton(reading, size)).join("")}</span>`;
}

let currentAudio = null;

function stopAudio() {
  if (currentAudio) {
    currentAudio.pause();
    currentAudio.currentTime = 0;
    currentAudio = null;
  }
  document.querySelectorAll(".sound-btn.playing, .reading-chip.playing").forEach((element) => element.classList.remove("playing"));
}

function speakJapanese(text, button) {
  const value = String(text || "").trim();
  if (!value) return;
  const source = window.KANIDOJO_AUDIO && window.KANIDOJO_AUDIO[value];
  if (!source) {
    showToast("No audio is available for this reading.", "error");
    return;
  }
  stopAudio();
  const audio = new Audio(source);
  currentAudio = audio;
  const reset = () => {
    if (button) button.classList.remove("playing");
    if (currentAudio === audio) currentAudio = null;
  };
  if (button) button.classList.add("playing");
  audio.addEventListener("ended", reset, { once: true });
  audio.addEventListener("error", () => {
    reset();
    showToast("Audio could not be played.", "error");
  }, { once: true });
  audio.play().catch(() => {
    reset();
    showToast("Audio playback was blocked. Try again.", "error");
  });
}

function displayKana(item) {
  return [...new Set(kanaReadings(item))].filter((reading) => reading !== item.characters).join(" / ");
}

function itemMetaLine(item) {
  const kana = displayKana(item);
  return `${typeLabel(item.type)} · Level ${item.level} · ${item.jlpt}${kana ? ` · ${kana}` : ""}`;
}

function openModal(content, className = "") {
  const root = document.getElementById("modalRoot");
  root.innerHTML = `<div class="modal-overlay" data-modal-backdrop><div class="modal-card ${className}" role="dialog" aria-modal="true"><button class="modal-close" type="button" data-action="close-modal" aria-label="Close">&times;</button>${content}</div></div>`;
  document.body.classList.add("modal-open");
}

function closeModal() {
  const root = document.getElementById("modalRoot");
  if (!root) return;
  root.innerHTML = "";
  if (!ui.welcome) document.body.classList.remove("modal-open");
}

function openItemDetail(id) {
  const item = ITEM_BY_ID.get(id);
  if (!item) return;
  const entry = state.items[item.id];
  const status = browseStatus(item);
  const reading = kanaReadings(item).length ? kanaReadings(item).join(" / ") : "Meaning only";
  const rubyReading = primaryKana(item);
  const romaji = romajiReadings(item).slice(0, 4).join(", ");
  const burned = Boolean(entry && entry.stage >= 8);
  const burnedText = burned ? (Number.isFinite(entry.burnedAt) ? formatFullDateTime(entry.burnedAt) : "Date unavailable") : "";
  const nextText = entry && entry.stage < 8 ? `in ${formatDuration(entry.nextReview - Date.now())}` : burned ? burnedText : status.reason;
  const prereqText = item.requires.length
    ? item.requires.map((requiredId) => {
      const required = ITEM_BY_ID.get(requiredId);
      return required ? `${required.characters} ${required.meanings[0]}` : requiredId;
    }).join(", ")
    : "None";
  const dots = entry
    ? `<div class="stage-dots">${Array.from({ length: 8 }, (_, index) => `<span class="stage-dot ${index <= Math.min(7, entry.stage) ? "on" : ""}"></span>`).join("")}</div>`
    : "";
  const html = `
    <div class="detail-hero">
      <div class="detail-char ${charSizeClass(item.characters)}${burned ? " burned" : ""}">${renderRuby(item.characters, rubyReading)}</div>
      <div class="detail-copy">
        ${typeBadge(item)}
        <h2>${escapeHtml(item.meanings.join(", "))}</h2>
        <p>${escapeHtml(typeLabel(item.type))} · Level ${item.level} · ${item.jlpt}</p>
      </div>
    </div>
    <div class="detail-grid">
      <div class="detail-box"><span>Reading</span><div class="reading-line">${pronunciationChips(item, "small")}${romaji ? `<span class="romaji">(${escapeHtml(romaji)})</span>` : ""}</div></div>
      <div class="detail-box"><span>Stage</span><strong>${entry ? STAGES[entry.stage].name : status.reason}</strong>${dots}</div>
      <div class="detail-box"><span>${burned ? "Burned on" : "Next review"}</span><strong>${escapeHtml(nextText)}</strong></div>
      <div class="detail-box"><span>Built from</span><strong>${escapeHtml(prereqText)}</strong></div>
    </div>
    <div class="detail-mnemonic"><strong>Memory hook</strong>${escapeHtml(itemMnemonic(item))}</div>
    ${renderExample(item)}
    ${romaji ? `<p class="related-note romaji-note" style="margin-top:12px">Romaji accepted in reviews: ${escapeHtml(romaji)}</p>` : ""}
    ${burned ? `
      <div class="detail-unburn">
        <div><strong>Want to learn this again?</strong><span>Unburning removes the SRS entry and returns this item to Lessons when its prerequisites are met. Review history and stats stay intact.</span></div>
        <button type="button" class="btn btn-soft" data-action="unburn-item" data-id="${item.id}">Unburn and relearn</button>
      </div>
    ` : ""}
  `;
  openModal(html);
}

function unburnItem(id) {
  const item = ITEM_BY_ID.get(id);
  const entry = item ? state.items[id] : null;
  if (!item || !entry || entry.stage < 8) {
    showToast("That item is not burned.", "error");
    return;
  }
  const message = `Unburn ${item.characters} (${item.meanings[0]})? It will leave your burned list and return to Lessons if its prerequisites are met. Review history and stats are kept.`;
  if (!window.confirm(message)) return;
  delete state.items[id];
  saveState();
  closeModal();
  render();
  showToast(`${item.characters} can be learned again.`, "success");
}

function openRadicalDetail(name) {
  const radical = RADICAL_CATALOG.find((entry) => entry.name === name);
  if (!radical) return;
  const levels = radical.levels;
  const levelRange = levels.length === 1 ? `Level ${levels[0]}` : `Level ${levels[0]}–${levels[levels.length - 1]}`;
  const jlptLevels = JLPT_LEVELS.filter((level) => radical.jlpt.includes(level));
  const jlptText = jlptLevels.length ? jlptLevels.join(" · ") : "Unrated";
  const isImage = String(radical.glyph).startsWith("data:image/");
  const glyph = isImage ? `<img src="${radical.glyph}" alt="">` : escapeHtml(radical.glyph);
  const sample = radical.kanji.slice(0, 6).map((item) => item.characters).join(" ");
  const kanji = [...radical.kanji].sort((a, b) => a.level - b.level || a.order - b.order);
  const kanjiRows = kanji.map((item) => `
    <button type="button" class="radical-kanji-row" data-action="item-detail" data-id="${item.id}">
      <span class="radical-kanji-char">${escapeHtml(item.characters)}</span>
      <span class="radical-kanji-copy">
        <strong>${escapeHtml(item.meanings.join(", "))}</strong>
        <small>Level ${item.level} · ${item.jlpt}</small>
      </span>
      <span class="radical-kanji-arrow" aria-hidden="true">→</span>
    </button>
  `).join("");
  const html = `
    <div class="detail-hero">
      <div class="detail-char radical-detail-char${isImage ? " image" : ""}">${glyph}</div>
      <div class="detail-copy">
        <span class="eyebrow">Radical</span>
        <h2>${escapeHtml(radical.name)}</h2>
        <p>${radical.count.toLocaleString()} kanji use this component · ${levelRange}</p>
      </div>
    </div>
    <div class="detail-grid">
      <div class="detail-box"><span>Appears in</span><strong>${radical.count.toLocaleString()} kanji</strong></div>
      <div class="detail-box"><span>Levels</span><strong>${levelRange}</strong></div>
      <div class="detail-box"><span>JLPT</span><strong>${escapeHtml(jlptText)}</strong></div>
      <div class="detail-box"><span>Examples</span><strong>${escapeHtml(sample)}</strong></div>
    </div>
    <section class="radical-kanji-section">
      <div class="radical-kanji-head">
        <div><h3>Kanji using ${escapeHtml(radical.name)}</h3><p>Select a kanji to open its full details.</p></div>
        <span class="stage-badge">${kanji.length.toLocaleString()} items</span>
      </div>
      <div class="radical-kanji-list">${kanjiRows}</div>
    </section>
  `;
  openModal(html, "radical-modal");
}

function openWelcome() {
  if (ui.placement) {
    renderPlacementTest();
    document.body.classList.add("modal-open");
    return;
  }
  const root = document.getElementById("modalRoot");
  const demoSelected = ui.welcomePace === "demo";
  const storageMessage = storageOK
    ? "All progress is saved in this browser with localStorage. No account, no server."
    : "Local storage is blocked in this browser. You can still try the app, but progress will not persist.";
  root.innerHTML = `
    <div class="welcome-overlay">
      <div class="welcome-card" role="dialog" aria-modal="true" aria-labelledby="welcomeTitle">
        <div class="welcome-brand">
          <span class="brand-mark">力</span>
          <div><strong>KaniDojo</strong><span>Offline Japanese SRS</span></div>
        </div>
        <h1 id="welcomeTitle">Learn Japanese, one review at a time.</h1>
        <p>${KANJI_COUNT.toLocaleString()} kanji and ${VOCAB_COUNT.toLocaleString()} vocabulary on a spaced-repetition schedule. Study by level or JLPT, learn a batch, and review it when it comes back.</p>
        <div class="welcome-paces" role="group" aria-label="Choose review pace">
          <button type="button" class="welcome-pace ${demoSelected ? "selected" : ""}" data-action="select-welcome-pace" data-pace="demo" aria-pressed="${demoSelected}">
            <span class="welcome-pace-head"><strong>Demo pace</strong><i>✓</i></span>
            <p>10 seconds to 24 minutes. Recommended for trying the full lesson and review loop today.</p>
          </button>
          <button type="button" class="welcome-pace ${!demoSelected ? "selected" : ""}" data-action="select-welcome-pace" data-pace="standard" aria-pressed="${!demoSelected}">
            <span class="welcome-pace-head"><strong>Standard pace</strong><i>✓</i></span>
            <p>4 hours to 4 months, following a spaced-repetition schedule.</p>
          </button>
        </div>
        <div class="welcome-option">
          <div><strong>Skip kana-only vocabulary</strong><span>${KANA_VOCAB_COUNT.toLocaleString()} words written entirely in kana will stay out of new lessons. Everything is taught by default; learned words still review normally.</span></div>
          <button type="button" class="toggle-switch ${state.settings.skipKanaVocabulary ? "on" : ""}" data-action="toggle-skip-kana" aria-pressed="${state.settings.skipKanaVocabulary}" aria-label="Toggle kana-only vocabulary"><span></span></button>
        </div>
        <div class="welcome-actions">
          <div class="welcome-action-buttons">
            <button type="button" class="btn btn-primary btn-lg" data-action="begin">Begin level 1</button>
            <button type="button" class="btn btn-soft btn-lg" data-action="start-placement">Placement test <span class="count">20</span></button>
          </div>
          <small>${storageMessage} The placement test covers 20 kanji and can skip up to Level 20.</small>
        </div>
      </div>
    </div>
  `;
  document.body.classList.add("modal-open");
}

function buildPlacementQuestions() {
  const fallbackMeanings = ["water", "fire", "mountain", "friend", "time", "person", "hand", "school"];
  return Array.from({ length: 20 }, (_, index) => {
    const level = index + 1;
    const pool = ALL_ITEMS.filter((item) => item.type === "kanji" && item.level === level);
    const item = pool[Math.floor(Math.random() * pool.length)] || ALL_ITEMS.find((candidate) => candidate.type === "kanji");
    const correct = item.meanings[0];
    const choices = [correct];
    let guard = 0;
    while (choices.length < 4 && guard < 120) {
      guard += 1;
      const candidate = ALL_ITEMS[Math.floor(Math.random() * ALL_ITEMS.length)];
      if (candidate.type !== "kanji") continue;
      const meaning = candidate.meanings[0];
      if (!meaning || choices.some((choice) => choice.toLowerCase() === meaning.toLowerCase())) continue;
      choices.push(meaning);
    }
    fallbackMeanings.forEach((meaning) => {
      if (choices.length < 4 && !choices.includes(meaning)) choices.push(meaning);
    });
    for (let i = choices.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [choices[i], choices[j]] = [choices[j], choices[i]];
    }
    return { itemId: item.id, characters: item.characters, correct, choices };
  });
}

function placementLevelForScore(score, total) {
  const percent = total ? score / total : 0;
  if (percent >= 0.9) return 20;
  if (percent >= 0.75) return 15;
  if (percent >= 0.6) return 10;
  if (percent >= 0.45) return 7;
  if (percent >= 0.3) return 4;
  return 1;
}

function renderPlacementTest() {
  const root = document.getElementById("modalRoot");
  const placement = ui.placement;
  if (!root || !placement) return;
  if (placement.done) {
    const level = placementLevelForScore(placement.correct, placement.questions.length);
    const skipped = level > 1 ? ALL_ITEMS.filter((item) => item.level < level).length : 0;
    root.innerHTML = `
      <div class="welcome-overlay">
        <div class="welcome-card placement-card" role="dialog" aria-modal="true" aria-labelledby="placementTitle">
          <div class="welcome-brand">
            <span class="brand-mark">力</span>
            <div><strong>KaniDojo</strong><span>Placement result</span></div>
          </div>
          <span class="eyebrow">Placement test complete</span>
          <h1 id="placementTitle">Start at Level ${level}.</h1>
          <p>You answered <strong>${placement.correct} of ${placement.questions.length}</strong> correctly.${level > 1 ? ` Levels 1–${level - 1} (${skipped.toLocaleString()} items) will be marked burned so they stay out of lessons and reviews.` : " You will begin with the normal Level 1 lessons."}</p>
          <div class="placement-result-stats">
            <div><strong>${Math.round((placement.correct / placement.questions.length) * 100)}%</strong><span>score</span></div>
            <div><strong>Level ${level}</strong><span>placement</span></div>
            <div><strong>${skipped.toLocaleString()}</strong><span>items skipped</span></div>
          </div>
          <div class="welcome-actions">
            <div class="welcome-action-buttons">
              <button type="button" class="btn btn-primary btn-lg" data-action="placement-start" data-level="${level}">Start at Level ${level}</button>
              <button type="button" class="btn btn-soft btn-lg" data-action="start-placement">Retake test</button>
            </div>
            <button type="button" class="btn btn-ghost" data-action="placement-cancel">Back to setup</button>
          </div>
        </div>
      </div>
    `;
    return;
  }
  const question = placement.questions[placement.index];
  const total = placement.questions.length;
  const percent = Math.round((placement.index / total) * 100);
  const answered = placement.answered;
  const choices = question.choices.map((choice) => {
    const classes = ["placement-choice"];
    if (answered) {
      if (choice === question.correct) classes.push("correct");
      else if (choice === answered.choice) classes.push("wrong");
    }
    return `<button type="button" class="${classes.join(" ")}" data-action="placement-answer" data-choice="${escapeHtml(choice)}" ${answered ? "disabled" : ""}>${escapeHtml(choice)}</button>`;
  }).join("");
  const feedback = answered
    ? `<div class="placement-feedback ${answered.correct ? "correct" : "wrong"}">
        <strong>${answered.correct ? "Correct." : `Not quite — ${escapeHtml(question.correct)}.`}</strong>
        <button type="button" class="btn btn-primary" data-action="placement-next">${placement.index >= total - 1 ? "See result" : "Next question"}</button>
      </div>`
    : "";
  root.innerHTML = `
    <div class="welcome-overlay">
      <div class="welcome-card placement-card" role="dialog" aria-modal="true" aria-labelledby="placementTitle">
        <div class="placement-top">
          <button type="button" class="btn btn-ghost btn-sm" data-action="placement-cancel">← Back to setup</button>
          <span>Question ${placement.index + 1} of ${total}</span>
        </div>
        <div class="progress-track"><span style="width:${percent}%"></span></div>
        <span class="eyebrow" style="margin-top:22px">Kanji meaning</span>
        <h1 id="placementTitle" class="placement-kanji">${escapeHtml(question.characters)}</h1>
        <p>What does this kanji mean?</p>
        <div class="placement-choices">${choices}</div>
        ${feedback}
      </div>
    </div>
  `;
}

function startPlacementTest() {
  ui.placement = {
    questions: buildPlacementQuestions(),
    index: 0,
    correct: 0,
    answered: null,
    done: false
  };
  openWelcome();
}

function cancelPlacementTest() {
  ui.placement = null;
  openWelcome();
}

function answerPlacementQuestion(choice) {
  const placement = ui.placement;
  if (!placement || placement.done || placement.answered) return;
  const question = placement.questions[placement.index];
  const correct = choice === question.correct;
  placement.answered = { choice, correct };
  if (correct) placement.correct += 1;
  openWelcome();
}

function advancePlacementTest() {
  const placement = ui.placement;
  if (!placement || !placement.answered) return;
  if (placement.index >= placement.questions.length - 1) {
    placement.done = true;
  } else {
    placement.index += 1;
    placement.answered = null;
  }
  openWelcome();
}

function startAtPlacedLevel(level) {
  const target = clamp(Math.round(normalizeNumber(level, 1)), 1, MAX_LEVEL);
  const now = Date.now();
  if (target > 1) {
    ALL_ITEMS.forEach((item) => {
      if (item.level >= target) return;
      state.items[item.id] = {
        stage: 8,
        nextReview: null,
        lessonAt: now,
        correct: 0,
        incorrect: 0,
        reviews: 0,
        burnedAt: now,
        placedByTest: true
      };
    });
  }
  state.currentLevel = target;
  state.settings.pace = ui.welcomePace;
  state.createdAt = now;
  state.lastLevelUpAt = null;
  state.lastLevelUpTrack = null;
  state.lastLevelUpLabel = null;
  saveState();
  ui.welcome = false;
  ui.placement = null;
  closeModal();
  render();
  showToast(target > 1 ? `Placed at Level ${target}. Earlier items are marked burned.` : "Starting at Level 1.", "success");
}

function renderHeader() {
  const dueCount = getDueReviews().length;
  const lessonCount = getAvailableLessons().length;
  const catalogRoutes = ["browse", "kanji", "vocabulary", "radicals"];
  const navView = ui.route === "lesson" ? "lessons" : ui.route === "review" ? "reviews" : catalogRoutes.includes(ui.route) ? "browse" : ui.route;
  document.querySelectorAll("[data-nav]").forEach((button) => {
    button.classList.toggle("active", button.dataset.nav === navView);
  });
  const lessonsBadge = document.getElementById("navLessonsBadge");
  lessonsBadge.textContent = lessonCount > 999 ? "999+" : lessonCount > 0 ? String(lessonCount) : "";
  lessonsBadge.classList.toggle("show", lessonCount > 0);
  const reviewsBadge = document.getElementById("navReviewsBadge");
  reviewsBadge.textContent = dueCount > 999 ? "999+" : dueCount > 0 ? String(dueCount) : "";
  reviewsBadge.classList.toggle("show", dueCount > 0);
  const levelPillLabel = document.getElementById("levelPillLabel");
  if (levelPillLabel) levelPillLabel.textContent = studyTrack() === "jlpt" ? "JLPT" : "LV";
  document.getElementById("levelPill").textContent = trackShortLabel();
  document.getElementById("streakPill").textContent = String(currentStreak());
  ui.lastDue = dueCount;
}

function render() {
  renderHeader();
  const main = document.getElementById("main");
  let html = "";
  if (ui.welcome) {
    html = renderDashboard();
  } else if (ui.route === "dashboard") {
    html = renderDashboard();
  } else if (ui.route === "lessons") {
    html = renderLessons();
  } else if (ui.route === "reviews") {
    html = renderReviews();
  } else if (ui.route === "study") {
    html = ui.session && ui.session.type === "study" ? renderStudySession() : renderStudy();
  } else if (ui.route === "browse") {
    html = renderBrowse();
  } else if (ui.route === "kanji") {
    html = renderBrowse("kanji");
  } else if (ui.route === "vocabulary") {
    html = renderVocabulary();
  } else if (ui.route === "radicals") {
    html = renderRadicals();
  } else if (ui.route === "instructions") {
    html = renderInstructions();
  } else if (ui.route === "settings") {
    html = renderSettings();
  } else if (ui.route === "lesson") {
    html = ui.session && ui.session.type === "lesson" ? renderLessonSession() : renderLessons();
  } else if (ui.route === "review") {
    html = ui.session && ui.session.type === "review" ? renderReviewSession() : renderReviews();
  } else {
    html = renderDashboard();
  }
  main.innerHTML = `${ui.welcome ? "" : vacationBanner()}${html}`;
  if (ui.route === "browse" && !ui.welcome) renderBrowseResults();
  if (ui.route === "kanji" && !ui.welcome) renderBrowseResults("kanji");
  if (ui.route === "vocabulary" && !ui.welcome) renderVocabularyResults();
  if (ui.route === "radicals" && !ui.welcome) renderRadicalResults();
  if (ui.welcome) openWelcome();
  requestAnimationFrame(focusActiveInput);
}

function focusActiveInput() {
  if (ui.welcome || !ui.session || ui.session.phase === "done") return;
  if (document.getElementById("modalRoot").innerHTML) return;
  const continueButton = document.getElementById("quizContinue");
  if (continueButton) {
    continueButton.focus();
    return;
  }
  const input = document.getElementById("quizInput");
  if (input) {
    input.focus();
    input.select();
  }
}

function renderDashboard() {
  const dueCount = getDueReviews().length;
  const lessons = getAvailableLessons();
  const lessonCount = lessons.length;
  const nextLessonGroup = lessons.length ? (studyTrack() === "jlpt" ? `JLPT ${lessons[0].jlpt}` : `Level ${lessons[0].level}`) : trackLevelLabel();
  const learned = Object.keys(state.items).length;
  const progress = getLevelProgress();
  const nextAt = getNextReviewAt();
  const counts = getSrsCounts();
  const today = todayStats();
  const goal = state.settings.dailyGoal;
  const goalPercent = Math.min(100, (today.reviews / goal) * 100);
  const accuracy = totalAccuracy();
  const forecast = getForecastBuckets();
  const forecastMax = Math.max(1, ...forecast.map((bucket) => bucket.count));
  const upcoming = getUpcomingReviews(5);
  const streak = currentStreak();
  const finalCleared = isFinalCleared();
  const title = finalCleared
    ? "Final level cleared."
    : dueCount > 0
      ? "Reviews are ready."
      : lessonCount > 0
        ? "Learn something new."
        : learned > 0
          ? "You are all caught up."
          : "Plant your first kanji.";
  const subtitle = finalCleared
    ? "You cleared the last level in this track. Keep reviewing to burn the rest of the curriculum."
    : dueCount > 0
      ? `You have ${dueCount} ${dueCount === 1 ? "item" : "items"} waiting. Keep the SRS garden healthy.`
      : lessonCount > 0
        ? `You have ${lessonCount} ${lessonCount === 1 ? "lesson" : "lessons"} ready. The first review arrives shortly after you finish.`
        : learned > 0
          ? nextAt
            ? `Nothing is due right now. The next review appears ${formatDuration(nextAt - Date.now())}.`
            : "Nothing is due right now. Learn more items to keep the reviews flowing."
          : "Start with a small lesson batch. Everything is stored locally and stays on this device.";
  const nextLabel = dueCount > 0
    ? "Reviews ready now"
    : nextAt
      ? `Next review <b data-countdown-to="${nextAt}">${formatDuration(nextAt - Date.now())}</b>`
      : "No reviews scheduled";
  const lessonsPreview = lessons.slice(0, 5).map((item) => `
    <button type="button" class="lesson-row" data-action="item-detail" data-id="${item.id}">
      ${charTile(item)}
      <span class="lesson-copy"><strong>${escapeHtml(meaningSummary(item))}</strong><span>${escapeHtml(itemMetaLine(item))}</span></span>
      ${typeBadge(item)}
    </button>
  `).join("");
  const upcomingRows = upcoming.map((item) => {
    const entry = state.items[item.id];
    return `
      <button type="button" class="upcoming-item" data-action="item-detail" data-id="${item.id}">
        ${charTile(item)}
        <span class="upcoming-copy"><strong>${escapeHtml(item.meanings[0])}</strong><span>${escapeHtml(item.characters)} · ${STAGES[entry.stage].name}</span></span>
        <span class="upcoming-time" data-countdown-to="${entry.nextReview}">${formatDuration(entry.nextReview - Date.now())}</span>
      </button>
    `;
  }).join("");
  const srsSegments = STAGE_GROUPS.map((group) => {
    const count = counts[group.name];
    const width = learned ? (count / learned) * 100 : 0;
    return `<span class="srs-seg" style="width:${width}%;background:${group.color}" title="${group.name}: ${count}"></span>`;
  }).join("");
  const srsLegend = STAGE_GROUPS.map((group) => `
    <div class="legend-item"><span class="legend-dot" style="background:${group.color}"></span>${group.name}<strong>${counts[group.name]}</strong></div>
  `).join("");
  const forecastRows = forecast.map((bucket) => {
    const height = bucket.count ? Math.max(11, Math.round((bucket.count / forecastMax) * 74)) : 5;
    return `
      <div class="forecast-col">
        <span class="forecast-count">${bucket.count}</span>
        <span class="forecast-bar ${bucket.count ? "" : "empty"}" style="height:${height}px"></span>
        <span class="forecast-label">${bucket.label}</span>
      </div>
    `;
  }).join("");

  return `
    <section class="hero">
      <div class="hero-copy">
        <span class="eyebrow">${trackLevelLabel()} · ${Math.min(progress.guru, progress.needed)} of ${progress.needed} kanji to Guru</span>
        <h1>${title}</h1>
        <p>${subtitle}</p>
        <div class="hero-actions">
          <button type="button" class="btn btn-pink btn-lg" data-action="start-review" ${dueCount ? "" : "disabled"}>Reviews <span class="count">${dueCount}</span></button>
          <button type="button" class="btn btn-soft btn-lg" data-action="start-lesson" ${lessonCount ? "" : "disabled"}>Lessons <span class="count">${lessonCount}</span></button>
        </div>
      </div>
      <div class="hero-level">
        <div class="level-ring" style="background:conic-gradient(#ffd166 ${progress.percent}%, rgba(255,255,255,.14) 0)">
          <div class="level-ring-inner">
            <strong>${trackShortLabel()}</strong>
            <span>${studyTrack() === "jlpt" ? "JLPT" : "LEVEL"}</span>
            <small>${finalCleared ? "Cleared" : `${Math.min(progress.guru, progress.needed)}/${progress.needed} Guru`}</small>
          </div>
        </div>
        <div class="hero-next">${nextLabel}</div>
      </div>
    </section>

    <div class="dash-grid three-col">
      <article class="card">
        <div class="card-head">
          <div><h2>Today</h2><p>${today.reviews} reviews · ${today.lessons} lessons</p></div>
          <span class="stage-badge enlightened">${dayLabel(currentStreak())} streak</span>
        </div>
        <div class="metric-line"><span class="metric-big">${today.reviews}<small> / ${goal}</small></span><span class="metric-label">review goal</span></div>
        <div class="progress-track pink"><span style="width:${goalPercent}%"></span></div>
        <div class="mini-stats">
          <div class="mini-stat"><span>Accuracy</span><strong>${accuracy === null ? "—" : `${accuracy}%`}</strong></div>
          <div class="mini-stat"><span>Learned</span><strong>${learned}</strong></div>
        </div>
      </article>

      <article class="card">
        <div class="card-head">
          <div><h2>SRS garden</h2><p>${learned} items growing</p></div>
          <span class="stage-badge enlightened">${learned ? "In rotation" : "Empty"}</span>
        </div>
        <div class="srs-stack">${srsSegments}</div>
        <div class="srs-legend">${srsLegend}</div>
      </article>

      <article class="card">
        <div class="card-head">
          <div><h2>Next 7 days</h2><p>Upcoming review load</p></div>
          <span class="stage-badge">${forecast.reduce((sum, bucket) => sum + bucket.count, 0)} items</span>
        </div>
        <div class="forecast">${forecastRows}</div>
      </article>
    </div>

    <div class="dash-grid two-col">
      <article class="card">
        <div class="card-head">
          <div><h2>Ready to learn</h2><p>Next batch from ${nextLessonGroup}</p></div>
          <button type="button" class="card-link" data-action="navigate" data-view="lessons">View all</button>
        </div>
        <div class="queue-list">
          ${lessonsPreview || `<div class="empty-note">No lessons available right now. Finish the current kanji and reviews to unlock more.</div>`}
        </div>
        ${lessons.length ? `<div style="margin-top:15px"><button type="button" class="btn btn-primary" data-action="start-lesson">Start ${Math.min(LESSON_BATCH, lessons.length)}-item lesson</button></div>` : ""}
      </article>

      <article class="card">
        <div class="card-head">
          <div><h2>Coming up</h2><p>The next few reviews</p></div>
          <button type="button" class="card-link" data-action="navigate" data-view="reviews">Reviews</button>
        </div>
        <div class="upcoming-list">
          ${upcomingRows || `<div class="empty-note">${learned ? "Nothing is scheduled in the near future." : "Learn your first items and their reviews will appear here."}</div>`}
        </div>
      </article>
    </div>

    ${renderActivityHeatmap()}

    <div class="dash-grid">
      <div class="info-strip">
        <span><strong>How leveling works</strong></span>
        <span>Get ${progress.needed} of ${progress.kanji.length} ${studyTrack() === "jlpt" ? currentJlptLabel() : `level-${state.currentLevel}`} kanji to Guru to unlock the next level.</span>
        <span>${getPaceLabel()} · ${state.settings.gated ? "Level-gated" : "Open lessons"} · ${state.settings.pace === "demo" ? "10s–24m" : "4h–4mo"}</span>
      </div>
    </div>
  `;
}

function renderLessons() {
  const available = getAvailableLessons();
  const waiting = getWaitingLessons();
  const counts = { kanji: 0, vocabulary: 0 };
  available.forEach((item) => { counts[item.type] += 1; });
  const visible = available.slice(0, 120);
  const groups = new Map();
  available.forEach((item) => {
    const key = lessonGroupKey(item);
    if (!groups.has(key)) groups.set(key, { total: 0, items: [] });
    groups.get(key).total += 1;
  });
  visible.forEach((item) => {
    groups.get(lessonGroupKey(item)).items.push(item);
  });
  const rows = [...groups.entries()].map(([key, group]) => `
    <div class="lesson-group">
      <div class="lesson-group-head"><h3>${escapeHtml(key)}</h3><span>${group.total.toLocaleString()} available</span></div>
      ${group.items.map((item) => `
        <button type="button" class="lesson-row" data-action="item-detail" data-id="${item.id}">
          ${charTile(item)}
          <span class="lesson-copy">
            <strong>${escapeHtml(meaningSummary(item))}</strong>
            <span>${escapeHtml(itemMetaLine(item))}</span>
            <span class="lesson-meta">${typeBadge(item)}${item.requires.length ? `<span class="stage-badge locked">Unlocked</span>` : ""}</span>
          </span>
          <span class="btn btn-ghost btn-sm">Preview</span>
        </button>
      `).join("")}
    </div>
  `).join("");
  const waitingRows = waiting.slice(0, 8).map((item) => {
    const prereqs = item.requires.map((id) => ITEM_BY_ID.get(id)).filter(Boolean);
    const missing = prereqs.filter((required) => !state.items[required.id]);
    return `
      <div class="lesson-row locked">
        ${charTile(item)}
        <span class="lesson-copy">
          <strong>${escapeHtml(meaningSummary(item))}</strong>
          <span>Requires: ${escapeHtml(missing.map((required) => required.characters).join(" · ") || "more lessons")}</span>
        </span>
        <span class="lock-label">Locked</span>
      </div>
    `;
  }).join("");

  return `
    <div class="page-head">
      <div>
        <span class="eyebrow">Lessons</span>
        <h1>Learn the next five.</h1>
        <p>Study a small batch, then pass the lesson quiz. Finished items enter the SRS and come back for review later.</p>
      </div>
      <button type="button" class="btn btn-primary btn-lg" data-action="start-lesson" ${available.length ? "" : "disabled"}>Start lesson <span class="count">${Math.min(LESSON_BATCH, available.length)}</span></button>
    </div>

    <div class="info-strip" style="margin-bottom:16px">
      <span><strong>${available.length.toLocaleString()}</strong> available</span>
      <span><strong>${counts.kanji.toLocaleString()}</strong> kanji</span>
      <span><strong>${counts.vocabulary.toLocaleString()}</strong> vocabulary</span>
      <span>${trackName()} order · ${state.settings.gated ? "level-gated" : "open catalog"}</span>
      <span>Vocab unlocks after its kanji have been learned.</span>
    </div>

    <section class="panel">
      <div class="panel-head">
        <div><h2>Ready to learn</h2><p>Lessons are taken ${LESSON_BATCH} at a time${state.settings.gated ? ` from ${trackLevelLabel()}` : " in catalog order"}. Showing ${Math.min(120, available.length).toLocaleString()} of ${available.length.toLocaleString()}.</p></div>
        ${available.length ? `<button type="button" class="btn btn-primary btn-sm" data-action="start-lesson">Start batch</button>` : ""}
      </div>
      <div class="lesson-list">
        ${rows || `<div class="empty-note">No lessons are available. Clear your reviews or level up to unlock more.</div>`}
        ${available.length > 120 ? `<div class="load-more-wrap"><span>Showing the first 120 available lessons. Use Vocabulary or Browse to inspect the rest.</span></div>` : ""}
      </div>
    </section>

    ${waitingRows ? `
      <section class="panel">
        <div class="panel-head">
          <div><h2>Waiting to unlock</h2><p>These vocabulary items appear after their kanji lessons.</p></div>
        </div>
        <div class="lesson-list">${waitingRows}</div>
      </section>
    ` : ""}
  `;
}

function renderReviews() {
  const due = getDueReviews();
  const upcoming = getUpcomingReviews(8);
  const nextAt = getNextReviewAt();
  const today = todayStats();
  const counts = { kanji: 0, vocabulary: 0 };
  due.forEach((item) => { counts[item.type] += 1; });
  const upcomingRows = upcoming.map((item) => {
    const entry = state.items[item.id];
    return `
      <div class="schedule-row">
        ${charTile(item)}
        <div class="schedule-copy"><strong>${escapeHtml(item.meanings[0])}</strong><span>${escapeHtml(item.characters)} · ${STAGES[entry.stage].name}</span></div>
        <span class="schedule-time" data-countdown-to="${entry.nextReview}">${formatDuration(entry.nextReview - Date.now())}</span>
      </div>
    `;
  }).join("");
  const vacation = isVacationActive();
  const cap = getReviewCap();
  const sessionCount = cap > 0 ? Math.min(due.length, cap) : due.length;
  const capLabel = cap > 0 ? `Capped at ${cap} per session` : "All due reviews in one session";
  const heading = vacation ? "Vacation mode is on." : due.length ? `${due.length} reviews are due.` : "No reviews due.";
  const sub = vacation
    ? "Review timers and lessons are paused. Resume from the banner above or in Settings."
    : due.length
      ? `Answer the meaning and reading prompts. ${capLabel}.`
      : nextAt
        ? `The next review appears ${formatDuration(nextAt - Date.now())}.`
        : "Learn new items to schedule your first review.";
  return `
    <div class="page-head">
      <div><span class="eyebrow">Reviews</span><h1>${heading}</h1><p>${sub}</p></div>
      ${vacation
        ? `<span class="stage-badge">Paused</span>`
        : `<button type="button" class="btn btn-pink btn-lg" data-action="start-review" ${due.length ? "" : "disabled"}>Start reviews <span class="count">${sessionCount}</span></button>`}
    </div>

    <div class="big-cta">
      <div>
        <span class="eyebrow">Review queue</span>
        <h2>${vacation ? "Queue frozen" : due.length ? `${due.length} ${due.length === 1 ? "item" : "items"} ready` : "Queue clear"}</h2>
        <p>${vacation ? "Review timers will resume exactly where they stopped." : due.length ? `${counts.kanji} kanji · ${counts.vocabulary} vocabulary · ${capLabel}` : "You can always study more lessons while you wait."}</p>
      </div>
      ${vacation ? "" : `<div class="big-cta-actions">
        ${due.length
          ? `<button type="button" class="btn btn-pink" data-action="start-review">Review now</button>`
          : `<button type="button" class="btn btn-soft" data-action="navigate" data-view="lessons">Go to lessons</button>`}
      </div>`}
    </div>

    <div class="dash-grid two-col" style="margin-top:20px">
      <article class="card">
        <div class="card-head"><div><h2>Today</h2><p>${today.correct} correct · ${today.incorrect} incorrect</p></div><span class="stage-badge apprentice">${today.reviews} reviewed</span></div>
        <div class="mini-stats" style="margin-top:0">
          <div class="mini-stat"><span>Total accuracy</span><strong>${totalAccuracy() === null ? "—" : `${totalAccuracy()}%`}</strong></div>
          <div class="mini-stat"><span>Current streak</span><strong>${dayLabel(currentStreak())}</strong></div>
          <div class="mini-stat"><span>Next review</span><strong>${nextAt ? `<span data-countdown-to="${nextAt}">${formatDuration(nextAt - Date.now())}</span>` : "—"}</strong></div>
          <div class="mini-stat"><span>Due now</span><strong>${due.length}</strong></div>
        </div>
      </article>

      <article class="card">
        <div class="card-head"><div><h2>Why reviews matter</h2><p>The SRS decides when an item returns.</p></div></div>
        <ul class="rule-list">
          <li>A correct answer moves an item <strong>one stage up</strong>.</li>
          <li>A wrong answer drops it <strong>one Apprentice stage</strong>, or all the way to <strong>Apprentice 1</strong> from Guru and above.</li>
          <li>Reach <strong>Guru</strong> to count kanji toward the next level, and <strong>Burned</strong> to retire an item.</li>
        </ul>
      </article>
    </div>

    <section class="panel" style="margin-top:20px">
      <div class="panel-head"><div><h2>Coming up</h2><p>Review schedule after the current queue.</p></div></div>
      <div class="schedule-list">
        ${upcomingRows || `<div class="empty-note">Nothing is scheduled. Complete a lesson to start the timer.</div>`}
      </div>
    </section>
  `;
}

function getStudyCollections(now = Date.now()) {
  const mistakes = [];
  const lessons = [];
  const burned = [];
  ALL_ITEMS.forEach((item) => {
    const entry = state.items[item.id];
    if (!entry) return;
    if (Number.isFinite(entry.lastMistakeAt) && entry.lastMistakeAt >= now - DAY) {
      mistakes.push({ item, entry });
    }
    if (entry.stage < 4) {
      lessons.push({ item, entry });
    } else if (entry.stage >= 8) {
      burned.push({ item, entry });
    }
  });
  mistakes.sort((a, b) => b.entry.lastMistakeAt - a.entry.lastMistakeAt || a.item.order - b.item.order);
  lessons.sort((a, b) => b.entry.lessonAt - a.entry.lessonAt || a.item.order - b.item.order);
  burned.sort((a, b) => (b.entry.burnedAt || 0) - (a.entry.burnedAt || 0) || a.item.order - b.item.order);
  return { mistakes, lessons, burned };
}

function studyPreview(items) {
  if (!items.length) return `<span class="study-preview-empty">Nothing here yet</span>`;
  return items.slice(0, 7).map(({ item }) => `<span class="study-preview-char">${escapeHtml(item.characters)}</span>`).join("");
}

function studyCard(mode, title, countLabel, description, items, emptyNote) {
  return `
    <article class="card study-card ${mode}">
      <div class="study-card-top">
        <span class="study-card-kicker">Extra study</span>
        <span class="stage-badge ${mode === "mistakes" ? "apprentice" : mode === "lessons" ? "guru" : "burned"}">Practice</span>
      </div>
      <h2>${title}</h2>
      <p>${description}</p>
      <div class="study-count"><strong>${items.length.toLocaleString()}</strong><span>${countLabel}</span></div>
      <div class="study-preview">${studyPreview(items)}</div>
      <div class="study-card-foot">
        <span>${items.length ? `Up to ${Math.min(STUDY_BATCH, items.length)} per session` : emptyNote}</span>
        <button type="button" class="btn btn-primary btn-sm" data-action="start-study" data-mode="${mode}" ${items.length ? "" : "disabled"}>Study ${Math.min(STUDY_BATCH, items.length)}</button>
      </div>
    </article>
  `;
}

function renderStudy() {
  const collections = getStudyCollections();
  const total = collections.mistakes.length + collections.lessons.length + collections.burned.length;
  return `
    <div class="page-head">
      <div>
        <span class="eyebrow">Extra study</span>
        <h1>Practice without moving the needle.</h1>
        <p>Extra study is a safe place to revisit weak or retired items. Answers here never change SRS stages, review dates, streaks, heatmap activity, or stats.</p>
      </div>
      <span class="stage-badge enlightened">No SRS changes</span>
    </div>

    <div class="study-note">
      <div class="study-note-mark" aria-hidden="true">練</div>
      <div><strong>${total.toLocaleString()} items available for optional practice</strong><span>Choose a set below. Each session mixes meaning and reading questions, and you can end at any time.</span></div>
    </div>

    <div class="study-grid">
      ${studyCard(
        "mistakes",
        "Recent mistakes",
        "missed in the last 24 hours",
        "Items that dropped an SRS stage after a wrong answer during review. Practice them before the next scheduled review.",
        collections.mistakes,
        "No review mistakes in the last 24 hours."
      )}
      ${studyCard(
        "lessons",
        "Recent lessons",
        "still Apprentice",
        "Everything you have learned but not yet raised to Guru. Keep the newest material fresh without touching its review schedule.",
        collections.lessons,
        "No Apprentice lessons yet."
      )}
      ${studyCard(
        "burned",
        "Burned items",
        "retired from reviews",
        "Retired kanji and vocabulary do not appear in normal reviews. Revisit them here whenever you want a memory check.",
        collections.burned,
        "No burned items yet."
      )}
    </div>
  `;
}

function catalogTabs(active) {
  const tabs = [
    { view: "kanji", label: "Kanji", count: KANJI_COUNT },
    { view: "vocabulary", label: "Vocabulary", count: VOCAB_COUNT },
    { view: "radicals", label: "Radicals", count: RADICAL_COUNT }
  ];
  return `
    <div class="catalog-tabs" role="tablist" aria-label="Browse categories">
      ${tabs.map((tab) => `<button type="button" class="catalog-tab ${active === tab.view ? "active" : ""}" role="tab" aria-selected="${active === tab.view}" data-action="navigate" data-view="${tab.view}"><span>${tab.label}</span><strong>${tab.count.toLocaleString()}</strong></button>`).join("")}
    </div>
  `;
}

function renderBrowse(pageType = null) {
  const kanjiPage = pageType === "kanji";
  return `
    ${kanjiPage ? catalogTabs("kanji") : ""}
    <div class="page-head">
      <div><span class="eyebrow">${kanjiPage ? "Kanji" : "Browse"}</span><h1>${kanjiPage ? "Every kanji, in one place." : "Every item in the dojo."}</h1><p>${kanjiPage ? `Search all ${KANJI_COUNT.toLocaleString()} kanji by character, meaning, reading, level, or JLPT level.` : "Search the curriculum, inspect readings and mnemonics, and check where each item sits in your SRS."}</p></div>
      <span class="stage-badge" id="browseCount">${kanjiPage ? `${KANJI_COUNT.toLocaleString()} kanji` : `${ALL_ITEMS.length} items`}</span>
    </div>
    <section class="panel">
      <div class="browse-controls">
        <div class="search-wrap">
          <svg class="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="11" cy="11" r="7"></circle><path d="m20 20-4-4"></path></svg>
          <label class="sr-only" for="browseSearch">Search items</label>
          <input class="input" id="browseSearch" type="search" placeholder="Search kanji, meaning, reading..." value="${escapeHtml(ui.browse.q)}" autocomplete="off">
        </div>
        ${kanjiPage ? "" : `
        <label class="sr-only" for="browseType">Filter by type</label>
        <select class="select" id="browseType" data-browse-filter="type">
          <option value="all" ${ui.browse.type === "all" ? "selected" : ""}>All types</option>
          <option value="kanji" ${ui.browse.type === "kanji" ? "selected" : ""}>Kanji</option>
          <option value="vocabulary" ${ui.browse.type === "vocabulary" ? "selected" : ""}>Vocabulary</option>
        </select>`}
        <label class="sr-only" for="browseLevel">Filter by level</label>
        <select class="select" id="browseLevel" data-browse-filter="level">
          <option value="all" ${ui.browse.level === "all" ? "selected" : ""}>All levels</option>
          ${Array.from({ length: MAX_LEVEL }, (_, index) => index + 1).map((level) => `<option value="${level}" ${String(ui.browse.level) === String(level) ? "selected" : ""}>Level ${level}</option>`).join("")}
        </select>
        <label class="sr-only" for="browseJlpt">Filter by JLPT level</label>
        <select class="select" id="browseJlpt" data-browse-filter="jlpt">
          <option value="all" ${ui.browse.jlpt === "all" ? "selected" : ""}>All JLPT</option>
          ${JLPT_LEVELS.map((level) => `<option value="${level}" ${ui.browse.jlpt === level ? "selected" : ""}>${level}</option>`).join("")}
        </select>
        <label class="sr-only" for="browseStage">Filter by stage</label>
        <select class="select" id="browseStage" data-browse-filter="stage">
          <option value="all" ${ui.browse.stage === "all" ? "selected" : ""}>All stages</option>
          <option value="new" ${ui.browse.stage === "new" ? "selected" : ""}>Not started</option>
          <option value="due" ${ui.browse.stage === "due" ? "selected" : ""}>Due now</option>
          <option value="apprentice" ${ui.browse.stage === "apprentice" ? "selected" : ""}>Apprentice</option>
          <option value="guru" ${ui.browse.stage === "guru" ? "selected" : ""}>Guru</option>
          <option value="master" ${ui.browse.stage === "master" ? "selected" : ""}>Master</option>
          <option value="enlightened" ${ui.browse.stage === "enlightened" ? "selected" : ""}>Enlightened</option>
          <option value="burned" ${ui.browse.stage === "burned" ? "selected" : ""}>Burned</option>
          <option value="locked" ${ui.browse.stage === "locked" ? "selected" : ""}>Locked</option>
        </select>
        <button type="button" class="btn btn-ghost" data-action="clear-filters">Clear</button>
      </div>
      <div class="browse-list" id="browseResults"></div>
    </section>
  `;
}

function filteredBrowseItems(pageType = null) {
  const query = ui.browse.q.trim().toLowerCase();
  const type = pageType || ui.browse.type;
  return ALL_ITEMS.filter((item) => {
    if (type !== "all" && item.type !== type) return false;
    if (ui.browse.level !== "all" && item.level !== Number(ui.browse.level)) return false;
    if (ui.browse.jlpt !== "all" && item.jlpt !== ui.browse.jlpt) return false;
    const entry = state.items[item.id];
    const status = browseStatus(item);
    const stageFilter = ui.browse.stage;
    if (stageFilter === "new" && status.kind !== "new") return false;
    if (stageFilter === "locked" && status.kind !== "locked") return false;
    if (stageFilter === "due" && !(entry && entry.stage < 8 && entry.nextReview <= Date.now())) return false;
    if (["apprentice", "guru", "master", "enlightened", "burned"].includes(stageFilter)) {
      if (!entry || stageBadgeClass(entry.stage) !== stageFilter) return false;
    }
    if (query) {
      const haystack = [item.characters, item.type, item.jlpt, String(item.level), `level${item.level}`, ...item.meanings, ...item.readings].join(" ").toLowerCase();
      if (!haystack.includes(query)) return false;
    }
    return true;
  });
}

function renderBrowseResults(pageType = null) {
  const container = document.getElementById("browseResults");
  const count = document.getElementById("browseCount");
  if (!container || !count) return;
  const items = filteredBrowseItems(pageType);
  const total = pageType === "kanji" ? KANJI_COUNT : ALL_ITEMS.length;
  count.textContent = `${items.length.toLocaleString()} of ${total.toLocaleString()} ${pageType === "kanji" ? "kanji" : "items"}`;
  if (!items.length) {
    container.innerHTML = `<div class="browse-empty">No items match those filters.</div>`;
    return;
  }
  const visible = items.slice(0, ui.browse.limit);
  container.innerHTML = visible.map((item) => {
    const entry = state.items[item.id];
    const status = browseStatus(item);
    const kana = displayKana(item);
    return `
      <button type="button" class="browse-row ${status.kind === "locked" ? "locked" : ""}${entry && entry.stage >= 8 ? " burned-item" : ""}" data-action="item-detail" data-id="${item.id}">
        ${charTile(item)}
        <span class="browse-copy">
          <strong>${escapeHtml(meaningSummary(item))}</strong>
          <span>${escapeHtml(item.characters)}${kana ? ` · ${escapeHtml(kana)}` : ""} · ${typeLabel(item.type)}</span>
        </span>
        <span class="browse-side">
          <span class="browse-level">Level ${item.level} · ${item.jlpt}</span>
          ${entry ? stageBadgeFor(entry) : `<span class="stage-badge ${status.kind === "locked" ? "locked" : ""}">${escapeHtml(status.reason)}</span>`}
        </span>
      </button>
    `;
  }).join("") + (items.length > ui.browse.limit ? `<div class="load-more-wrap"><button type="button" class="btn btn-soft" data-action="load-more-browse">Show more <span class="count">${Math.min(120, items.length - ui.browse.limit)}</span></button></div>` : "");
}

function renderVocabulary() {
  return `
    ${catalogTabs("vocabulary")}
    <div class="page-head">
      <div><span class="eyebrow">Vocabulary</span><h1>Every word, by level.</h1><p>Search all ${VOCAB_COUNT.toLocaleString()} vocabulary items by kanji, kana, romaji, meaning, level, or JLPT level.</p></div>
      <span class="stage-badge" id="vocabCount">${VOCAB_COUNT.toLocaleString()} words</span>
    </div>
    <section class="panel">
      <div class="browse-controls vocab-controls">
        <div class="search-wrap">
          <svg class="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="11" cy="11" r="7"></circle><path d="m20 20-4-4"></path></svg>
          <label class="sr-only" for="vocabSearch">Search vocabulary</label>
          <input class="input" id="vocabSearch" type="search" placeholder="Search word, reading, romaji, meaning..." value="${escapeHtml(ui.vocab.q)}" autocomplete="off">
        </div>
        <label class="sr-only" for="vocabLevel">Filter by level</label>
        <select class="select" id="vocabLevel" data-vocab-filter="level">
          <option value="all" ${ui.vocab.level === "all" ? "selected" : ""}>All levels</option>
          ${Array.from({ length: MAX_LEVEL }, (_, index) => index + 1).map((level) => `<option value="${level}" ${String(ui.vocab.level) === String(level) ? "selected" : ""}>Level ${level}</option>`).join("")}
        </select>
        <label class="sr-only" for="vocabJlpt">Filter by JLPT level</label>
        <select class="select" id="vocabJlpt" data-vocab-filter="jlpt">
          <option value="all" ${ui.vocab.jlpt === "all" ? "selected" : ""}>All JLPT levels</option>
          ${JLPT_LEVELS.map((level) => `<option value="${level}" ${ui.vocab.jlpt === level ? "selected" : ""}>${level}</option>`).join("")}
        </select>
        <label class="sr-only" for="vocabGroup">Group vocabulary</label>
        <select class="select" id="vocabGroup" data-vocab-filter="group">
          <option value="level" ${ui.vocab.group === "level" ? "selected" : ""}>Group: Level</option>
          <option value="jlpt" ${ui.vocab.group === "jlpt" ? "selected" : ""}>Group: JLPT</option>
        </select>
        <label class="sr-only" for="vocabStage">Filter by stage</label>
        <select class="select" id="vocabStage" data-vocab-filter="stage">
          <option value="all" ${ui.vocab.stage === "all" ? "selected" : ""}>All stages</option>
          <option value="new" ${ui.vocab.stage === "new" ? "selected" : ""}>Not started</option>
          <option value="due" ${ui.vocab.stage === "due" ? "selected" : ""}>Due now</option>
          <option value="apprentice" ${ui.vocab.stage === "apprentice" ? "selected" : ""}>Apprentice</option>
          <option value="guru" ${ui.vocab.stage === "guru" ? "selected" : ""}>Guru</option>
          <option value="master" ${ui.vocab.stage === "master" ? "selected" : ""}>Master</option>
          <option value="enlightened" ${ui.vocab.stage === "enlightened" ? "selected" : ""}>Enlightened</option>
          <option value="burned" ${ui.vocab.stage === "burned" ? "selected" : ""}>Burned</option>
        </select>
        <button type="button" class="btn btn-ghost" data-action="clear-vocab-filters">Clear</button>
      </div>
      <div class="vocab-summary" id="vocabSummary"></div>
      <div class="browse-list" id="vocabResults"></div>
    </section>
  `;
}

function filteredVocabItems() {
  const query = ui.vocab.q.trim().toLowerCase();
  return ALL_ITEMS.filter((item) => {
    if (item.type !== "vocabulary") return false;
    if (ui.vocab.level !== "all" && item.level !== Number(ui.vocab.level)) return false;
    if (ui.vocab.jlpt !== "all" && item.jlpt !== ui.vocab.jlpt) return false;
    const entry = state.items[item.id];
    const status = browseStatus(item);
    if (ui.vocab.stage === "new" && status.kind !== "new") return false;
    if (ui.vocab.stage === "due" && !(entry && entry.stage < 8 && entry.nextReview <= Date.now())) return false;
    if (["apprentice", "guru", "master", "enlightened", "burned"].includes(ui.vocab.stage)) {
      if (!entry || stageBadgeClass(entry.stage) !== ui.vocab.stage) return false;
    }
    if (query) {
      const haystack = [item.characters, item.jlpt, `level${item.level}`, `level ${item.level}`, ...item.meanings, ...item.readings].join(" ").toLowerCase();
      if (!haystack.includes(query)) return false;
    }
    return true;
  }).sort((a, b) => {
    if (ui.vocab.group === "jlpt") {
      return JLPT_RANK[b.jlpt] - JLPT_RANK[a.jlpt] || a.level - b.level || a.order - b.order;
    }
    return a.level - b.level || JLPT_RANK[b.jlpt] - JLPT_RANK[a.jlpt] || a.order - b.order;
  });
}

function renderVocabularyResults() {
  const container = document.getElementById("vocabResults");
  const count = document.getElementById("vocabCount");
  const summary = document.getElementById("vocabSummary");
  if (!container || !count || !summary) return;
  const matches = filteredVocabItems();
  count.textContent = `${matches.length.toLocaleString()} words`;
  summary.textContent = `${matches.length.toLocaleString()} match${matches.length === 1 ? "" : "es"} · showing ${Math.min(ui.vocab.limit, matches.length).toLocaleString()} · grouped by ${ui.vocab.group === "jlpt" ? "JLPT level" : "level"}`;
  if (!matches.length) {
    container.innerHTML = `<div class="browse-empty">No vocabulary matches those filters.</div>`;
    return;
  }
  const visible = matches.slice(0, ui.vocab.limit);
  const groups = new Map();
  visible.forEach((item) => {
    const key = ui.vocab.group === "jlpt" ? item.jlpt : `Level ${item.level}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(item);
  });
  const groupHtml = [...groups.entries()].map(([key, items]) => {
    const total = matches.filter((item) => (ui.vocab.group === "jlpt" ? item.jlpt : `Level ${item.level}`) === key).length;
    return `
      <div class="vocab-group">
        <div class="vocab-group-head"><h3>${escapeHtml(key)}</h3><span>${total.toLocaleString()} words</span></div>
        ${items.map((item) => {
          const entry = state.items[item.id];
          const status = browseStatus(item);
          const kana = displayKana(item);
          return `
            <button type="button" class="browse-row ${status.kind === "locked" ? "locked" : ""}${entry && entry.stage >= 8 ? " burned-item" : ""}" data-action="item-detail" data-id="${item.id}">
              ${charTile(item)}
              <span class="browse-copy">
                <strong>${escapeHtml(meaningSummary(item))}</strong>
                <span>${escapeHtml(item.characters)}${kana ? ` · ${escapeHtml(kana)}` : ""} · Level ${item.level} · ${item.jlpt}</span>
              </span>
              <span class="browse-side">
                <span class="browse-level">Level ${item.level} · ${item.jlpt}</span>
                ${entry ? stageBadgeFor(entry) : `<span class="stage-badge ${status.kind === "locked" ? "locked" : ""}">${escapeHtml(status.reason)}</span>`}
              </span>
            </button>
          `;
        }).join("")}
      </div>
    `;
  }).join("");
  container.innerHTML = `${groupHtml}${matches.length > ui.vocab.limit ? `<div class="load-more-wrap"><button type="button" class="btn btn-soft" data-action="load-more-vocab">Show more <span class="count">${Math.min(120, matches.length - ui.vocab.limit)}</span></button></div>` : ""}`;
}

function filteredRadicals() {
  const query = ui.radicals.q.trim().toLowerCase();
  return RADICAL_CATALOG.filter((radical) => {
    if (ui.radicals.level !== "all" && !radical.levels.includes(Number(ui.radicals.level))) return false;
    return !query || radical.search.includes(query);
  });
}

function radicalGlyphMarkup(radical) {
  const isImage = String(radical.glyph).startsWith("data:image/");
  return `<span class="char-tile radical-tile${isImage ? " image" : ""}">${isImage ? `<img src="${radical.glyph}" alt="">` : escapeHtml(radical.glyph)}</span>`;
}

function renderRadicals() {
  return `
    ${catalogTabs("radicals")}
    <div class="page-head">
      <div><span class="eyebrow">Radicals</span><h1>The building blocks.</h1><p>Search ${RADICAL_COUNT.toLocaleString()} radical characters used by the kanji in this curriculum. Each entry shows the kanji that use it.</p></div>
      <span class="stage-badge" id="radicalCount">${RADICAL_COUNT.toLocaleString()} radicals</span>
    </div>
    <section class="panel">
      <div class="browse-controls">
        <div class="search-wrap">
          <svg class="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="11" cy="11" r="7"></circle><path d="m20 20-4-4"></path></svg>
          <label class="sr-only" for="radicalSearch">Search radicals</label>
          <input class="input" id="radicalSearch" type="search" placeholder="Search a radical or a kanji that uses it..." value="${escapeHtml(ui.radicals.q)}" autocomplete="off">
        </div>
        <label class="sr-only" for="radicalLevel">Filter by level</label>
        <select class="select" id="radicalLevel" data-radical-filter="level">
          <option value="all" ${ui.radicals.level === "all" ? "selected" : ""}>All levels</option>
          ${Array.from({ length: MAX_LEVEL }, (_, index) => index + 1).map((level) => `<option value="${level}" ${String(ui.radicals.level) === String(level) ? "selected" : ""}>Level ${level}</option>`).join("")}
        </select>
        <button type="button" class="btn btn-ghost" data-action="clear-radical-filters">Clear</button>
      </div>
      <div class="radical-summary" id="radicalSummary"></div>
      <div class="radical-list" id="radicalResults"></div>
    </section>
  `;
}

function renderRadicalResults() {
  const container = document.getElementById("radicalResults");
  const count = document.getElementById("radicalCount");
  const summary = document.getElementById("radicalSummary");
  if (!container || !count || !summary) return;
  const matches = filteredRadicals();
  count.textContent = `${matches.length.toLocaleString()} of ${RADICAL_COUNT.toLocaleString()} radicals`;
  const levelNote = ui.radicals.level === "all" ? "" : ` · Level ${ui.radicals.level} only`;
  summary.textContent = `${matches.length.toLocaleString()} match${matches.length === 1 ? "" : "es"} · showing ${Math.min(ui.radicals.limit, matches.length).toLocaleString()}${levelNote}`;
  if (!matches.length) {
    container.innerHTML = `<div class="browse-empty">No radicals match those filters.</div>`;
    return;
  }
  const visible = matches.slice(0, ui.radicals.limit);
  container.innerHTML = visible.map((radical) => {
    const sample = radical.kanji.slice(0, 10).map((item) => item.characters).join(" ");
    const levelRange = radical.levels.length === 1
      ? `Level ${radical.levels[0]}`
      : `Level ${radical.levels[0]}–${radical.levels[radical.levels.length - 1]}`;
    return `
      <button type="button" class="radical-row" data-action="radical-detail" data-name="${escapeHtml(radical.name)}" aria-label="View ${escapeHtml(radical.name)} radical details">
        ${radicalGlyphMarkup(radical)}
        <span class="browse-copy">
          <strong>${escapeHtml(radical.name)}</strong>
          <span>${radical.count.toLocaleString()} kanji · ${levelRange} · ${escapeHtml(sample)}</span>
        </span>
        <span class="radical-count">${radical.count.toLocaleString()}</span>
      </button>
    `;
  }).join("") + (matches.length > ui.radicals.limit ? `<div class="load-more-wrap"><button type="button" class="btn btn-soft" data-action="load-more-radicals">Show more <span class="count">${Math.min(120, matches.length - ui.radicals.limit)}</span></button></div>` : "");
}

const KANA_ROWS = [
  { roman: ["a", "i", "u", "e", "o"], hira: ["あ", "い", "う", "え", "お"], kata: ["ア", "イ", "ウ", "エ", "オ"] },
  { roman: ["ka", "ki", "ku", "ke", "ko"], hira: ["か", "き", "く", "け", "こ"], kata: ["カ", "キ", "ク", "ケ", "コ"] },
  { roman: ["sa", "shi", "su", "se", "so"], hira: ["さ", "し", "す", "せ", "そ"], kata: ["サ", "シ", "ス", "セ", "ソ"] },
  { roman: ["ta", "chi", "tsu", "te", "to"], hira: ["た", "ち", "つ", "て", "と"], kata: ["タ", "チ", "ツ", "テ", "ト"] },
  { roman: ["na", "ni", "nu", "ne", "no"], hira: ["な", "に", "ぬ", "ね", "の"], kata: ["ナ", "ニ", "ヌ", "ネ", "ノ"] },
  { roman: ["ha", "hi", "fu", "he", "ho"], hira: ["は", "ひ", "ふ", "へ", "ほ"], kata: ["ハ", "ヒ", "フ", "ヘ", "ホ"] },
  { roman: ["ma", "mi", "mu", "me", "mo"], hira: ["ま", "み", "む", "め", "も"], kata: ["マ", "ミ", "ム", "メ", "モ"] },
  { roman: ["ya", "", "yu", "", "yo"], hira: ["や", "", "ゆ", "", "よ"], kata: ["ヤ", "", "ユ", "", "ヨ"] },
  { roman: ["ra", "ri", "ru", "re", "ro"], hira: ["ら", "り", "る", "れ", "ろ"], kata: ["ラ", "リ", "ル", "レ", "ロ"] },
  { roman: ["wa", "", "", "", "wo"], hira: ["わ", "", "", "", "を"], kata: ["ワ", "", "", "", "ヲ"] },
  { roman: ["n", "", "", "", ""], hira: ["ん", "", "", "", ""], kata: ["ン", "", "", "", ""] },
  { roman: ["ga", "gi", "gu", "ge", "go"], hira: ["が", "ぎ", "ぐ", "げ", "ご"], kata: ["ガ", "ギ", "グ", "ゲ", "ゴ"] },
  { roman: ["za", "ji", "zu", "ze", "zo"], hira: ["ざ", "じ", "ず", "ぜ", "ぞ"], kata: ["ザ", "ジ", "ズ", "ゼ", "ゾ"] },
  { roman: ["da", "ji", "zu", "de", "do"], hira: ["だ", "ぢ", "づ", "で", "ど"], kata: ["ダ", "ヂ", "ヅ", "デ", "ド"] },
  { roman: ["ba", "bi", "bu", "be", "bo"], hira: ["ば", "び", "ぶ", "べ", "ぼ"], kata: ["バ", "ビ", "ブ", "ベ", "ボ"] },
  { roman: ["pa", "pi", "pu", "pe", "po"], hira: ["ぱ", "ぴ", "ぷ", "ぺ", "ぽ"], kata: ["パ", "ピ", "プ", "ペ", "ポ"] }
];

const YOON_ROWS = [
  { roman: ["kya", "kyu", "kyo"], hira: ["きゃ", "きゅ", "きょ"], kata: ["キャ", "キュ", "キョ"] },
  { roman: ["sha", "shu", "sho"], hira: ["しゃ", "しゅ", "しょ"], kata: ["シャ", "シュ", "ショ"] },
  { roman: ["cha", "chu", "cho"], hira: ["ちゃ", "ちゅ", "ちょ"], kata: ["チャ", "チュ", "チョ"] },
  { roman: ["nya", "nyu", "nyo"], hira: ["にゃ", "にゅ", "にょ"], kata: ["ニャ", "ニュ", "ニョ"] },
  { roman: ["hya", "hyu", "hyo"], hira: ["ひゃ", "ひゅ", "ひょ"], kata: ["ヒャ", "ヒュ", "ヒョ"] },
  { roman: ["mya", "myu", "myo"], hira: ["みゃ", "みゅ", "みょ"], kata: ["ミャ", "ミュ", "ミョ"] },
  { roman: ["rya", "ryu", "ryo"], hira: ["りゃ", "りゅ", "りょ"], kata: ["リャ", "リュ", "リョ"] },
  { roman: ["gya", "gyu", "gyo"], hira: ["ぎゃ", "ぎゅ", "ぎょ"], kata: ["ギャ", "ギュ", "ギョ"] },
  { roman: ["ja", "ju", "jo"], hira: ["じゃ", "じゅ", "じょ"], kata: ["ジャ", "ジュ", "ジョ"] },
  { roman: ["bya", "byu", "byo"], hira: ["びゃ", "びゅ", "びょ"], kata: ["ビャ", "ビュ", "ビョ"] },
  { roman: ["pya", "pyu", "pyo"], hira: ["ぴゃ", "ぴゅ", "ぴょ"], kata: ["ピャ", "ピュ", "ピョ"] }
];

function renderKanaRows(rows) {
  return rows.map((row) => `
    <tr>
      ${row.roman.map((roman, index) => `
        <td>
          <span class="kana-hira">${row.hira[index] || "—"}</span>
          <span class="kana-kata">${row.kata[index] || "—"}</span>
          <span class="kana-roman">${roman || "—"}</span>
        </td>
      `).join("")}
    </tr>
  `).join("");
}

function renderInstructions() {
  return `
    <div class="page-head">
      <div><span class="eyebrow">Instructions</span><h1>How to answer.</h1><p>Type what you remember. Kana and romaji both work for readings, and English works for meanings.</p></div>
    </div>
    <div class="instructions-grid">
      <section class="panel full">
        <div class="panel-head"><div><h2>Answer input</h2><p>No Japanese keyboard is required.</p></div></div>
        <div class="rule-list instructions-list">
          <li><strong>Meaning questions:</strong> type the English meaning. Capitalization, extra spaces, and punctuation are ignored. “to run” and “run” are both accepted when the item means “to run”.</li>
          <li><strong>Reading questions:</strong> type hiragana, katakana, or romaji. Katakana is converted to hiragana automatically.</li>
          <li><strong>Romaji spelling:</strong> common alternatives work: <code>shi/si</code>, <code>chi/ti</code>, <code>tsu/tu</code>, <code>fu/hu</code>, and <code>ji/zi</code>.</li>
          <li><strong>Live conversion:</strong> while you type a romaji reading, a <em>Hiragana:</em> preview appears below the box. The answer is checked against the converted spelling too.</li>
          <li><strong>Small tsu:</strong> double the consonant. <code>kitte</code> becomes <code>きって</code>; <code>gakkou</code> becomes <code>がっこう</code>.</li>
          <li><strong>Syllabic n:</strong> <code>shinbun</code> becomes <code>しんぶん</code>. Use an apostrophe to separate n from a vowel: <code>shin'you</code> becomes <code>しんよう</code>.</li>
          <li><strong>Long vowels:</strong> macrons and repeated vowels are accepted, so <code>tōkyō</code>, <code>toukyou</code>, and <code>tokyo</code> all normalize sensibly.</li>
        </div>
      </section>

      <section class="panel full">
        <div class="panel-head"><div><h2>Hiragana &amp; katakana chart</h2><p>Each cell shows hiragana, katakana, and the romaji answer.</p></div></div>
        <div class="kana-table-wrap">
          <table class="kana-table"><tbody>${renderKanaRows(KANA_ROWS)}</tbody></table>
        </div>
      </section>

      <section class="panel full">
        <div class="panel-head"><div><h2>Combined sounds (yōon)</h2><p>Small ゃ, ゅ, and ょ combine with the previous kana.</p></div></div>
        <div class="kana-table-wrap">
          <table class="kana-table"><tbody>${renderKanaRows(YOON_ROWS)}</tbody></table>
        </div>
      </section>

      <section class="panel">
        <div class="panel-head"><div><h2>Reading tips</h2><p>What the checker accepts.</p></div></div>
        <ul class="rule-list">
          <li>Kanji can have several readings; any reading listed for the item is accepted. Each reading has its own speaker chip.</li>
          <li>Vocabulary answers use the full word reading, not the reading of one kanji.</li>
          <li>Spaces, middle dots, commas, and hyphens are ignored in readings.</li>
          <li>Wrong answers reset the item's SRS stage, so answer carefully.</li>
        </ul>
      </section>

      <section class="panel">
        <div class="panel-head"><div><h2>Study loop</h2><p>Lessons introduce, reviews schedule.</p></div></div>
        <ul class="rule-list">
          <li>Lessons teach five items, then quiz every meaning and reading.</li>
          <li>Correct reviews move an item through Apprentice, Guru, Master, Enlightened, and Burned.</li>
          <li>Reach 90% of a level's kanji at Guru to unlock the next level.</li>
          <li>Use the Display settings to switch theme, furigana, romaji, and one of six interface scales.</li>
          <li>Every listed reading has its own speaker chip. Example sentences are text-only in this version, with furigana and English translations. Reading audio is bundled with the app; no browser voice is used.</li>
          <li>Browse has three tabs: Kanji, Vocabulary, and Radicals. Radicals are derived from the component names attached to each kanji.</li>
          <li>Review sessions start with every due item. Set a session cap in Settings to limit the queue; 0 means uncapped.</li>
          <li>Vacation mode freezes reviews, lessons, and the streak. On resume, review timers shift forward by the paused duration.</li>
        </ul>
      </section>
    </div>
  `;
}

function renderSettings() {
  const learned = Object.keys(state.items).length;
  const intervals = state.settings.pace === "demo" ? DEMO_INTERVALS : STANDARD_INTERVALS;
  const srsRows = STAGES.slice(0, 8).map((stage, index) => `
    <tr>
      <td><span class="stage-name" style="--stage-color:${stage.color}"><i></i>${stage.name}</span></td>
      <td class="stage-interval">${formatDuration(intervals[index])}</td>
      <td>${index < 4 ? "Apprentice" : index < 6 ? "Guru" : index === 6 ? "Master" : "Enlightened"}</td>
    </tr>
  `).join("") + `
    <tr>
      <td><span class="stage-name" style="--stage-color:${STAGES[8].color}"><i></i>${STAGES[8].name}</span></td>
      <td class="stage-interval">Retired</td>
      <td>Burned</td>
    </tr>
  `;
  return `
    <div class="page-head">
      <div><span class="eyebrow">Settings</span><h1>Make it yours.</h1><p>Choose a study order, control level gating, set your review pace, and back up the progress saved in this browser.</p></div>
    </div>
    <div class="settings-grid">
      <section class="panel">
        <div class="panel-head"><div><h2>Study order</h2><p>Organize lessons and level-ups by level or JLPT.</p></div></div>
        <div class="pace-options">
          <button type="button" class="pace-option ${state.settings.order === "level" ? "selected" : ""}" data-action="set-order" data-order="level">
            <strong>Levels 1–60 <span class="check">✓</span></strong>
            <span>60 levels ordered by kanji frequency, with vocabulary grouped near its component kanji.</span>
          </button>
          <button type="button" class="pace-option ${state.settings.order === "jlpt" ? "selected" : ""}" data-action="set-order" data-order="jlpt">
            <strong>JLPT levels <span class="check">✓</span></strong>
            <span>Five levels from N5 to N1. Switch anytime; your learned items and SRS stages stay intact.</span>
          </button>
        </div>
        <div class="form-row">
          <div class="form-row-copy"><strong>Level-gated lessons</strong><span>${state.settings.gated ? "Only your current level unlocks new lessons." : "Every kanji is available; vocabulary still needs its kanji."}</span></div>
          <button type="button" class="toggle-switch ${state.settings.gated ? "on" : ""}" data-action="toggle-gate" aria-pressed="${state.settings.gated}" aria-label="Toggle level-gated lessons"><span></span></button>
        </div>
        <div class="form-row">
          <div class="form-row-copy"><strong>Skip kana-only vocabulary</strong><span>${state.settings.skipKanaVocabulary ? `${KANA_VOCAB_COUNT.toLocaleString()} kana-only words are excluded from new lessons.` : `All ${KANA_VOCAB_COUNT.toLocaleString()} kana-only words are taught. This is the default.`}</span></div>
          <button type="button" class="toggle-switch ${state.settings.skipKanaVocabulary ? "on" : ""}" data-action="toggle-skip-kana" aria-pressed="${state.settings.skipKanaVocabulary}" aria-label="Toggle kana-only vocabulary"><span></span></button>
        </div>
        <div class="info-chip-row">
          <span class="stage-badge">${KANJI_COUNT.toLocaleString()} kanji</span>
          <span class="stage-badge">${VOCAB_COUNT.toLocaleString()} vocabulary</span>
          <span class="stage-badge">${trackName()} order</span>
        </div>
      </section>

      <section class="panel">
        <div class="panel-head"><div><h2>Review pace</h2><p>New intervals apply to future reviews.</p></div></div>
        <div class="pace-options">
          <button type="button" class="pace-option ${state.settings.pace === "demo" ? "selected" : ""}" data-action="set-pace" data-pace="demo">
            <strong>Demo pace <span class="check">✓</span></strong>
            <span>10 seconds to 24 minutes. Good for testing the whole loop.</span>
          </button>
          <button type="button" class="pace-option ${state.settings.pace === "standard" ? "selected" : ""}" data-action="set-pace" data-pace="standard">
            <strong>Standard pace <span class="check">✓</span></strong>
            <span>4 hours to 4 months, following a spaced-repetition schedule.</span>
          </button>
        </div>
        <div class="form-row">
          <div class="form-row-copy"><strong>Daily review goal</strong><span>Used for the dashboard goal bar.</span></div>
          <label class="sr-only" for="dailyGoal">Daily review goal</label>
          <input class="input" id="dailyGoal" type="number" min="5" max="200" step="5" value="${state.settings.dailyGoal}">
        </div>
        <div class="form-row">
          <div class="form-row-copy"><strong>Review session cap</strong><span>0 starts every due review in one session. Set a number to cap it.</span></div>
          <label class="sr-only" for="reviewCap">Review session cap</label>
          <input class="input" id="reviewCap" type="number" min="0" max="${REVIEW_CAP_MAX}" step="10" value="${getReviewCap()}">
        </div>
        <div class="form-row">
          <div class="form-row-copy"><strong>Undo review mistakes</strong><span>Show an Undo button after a wrong review answer. Undone answers do not count toward stats or SRS.</span></div>
          <button type="button" class="toggle-switch ${state.settings.undoMistakes ? "on" : ""}" data-action="toggle-review-undo" aria-pressed="${state.settings.undoMistakes}" aria-label="Toggle undo review mistakes"><span></span></button>
        </div>
        <div class="form-row">
          <div class="form-row-copy"><strong>Vacation mode</strong><span>Freeze review timers, lessons, and the streak until you resume. ${isVacationActive() ? `Started ${escapeHtml(formatDateTime(state.vacation.startedAt))}.` : "Nothing is paused right now."}</span></div>
          <button type="button" class="toggle-switch ${isVacationActive() ? "on" : ""}" data-action="toggle-vacation" aria-pressed="${isVacationActive()}" aria-label="Toggle vacation mode"><span></span></button>
        </div>
        <div class="data-actions" style="margin-top:14px">
          <button type="button" class="btn btn-soft btn-sm" data-action="reschedule">Reschedule from now</button>
          <button type="button" class="btn btn-soft btn-sm" data-action="make-due">Make reviews due</button>
        </div>
      </section>

      <section class="panel">
        <div class="panel-head"><div><h2>Display</h2><p>Adjust readability for this browser. Changes save automatically.</p></div></div>
        <div class="form-row">
          <div class="form-row-copy"><strong>Dark theme</strong><span>A low-glare palette for evening study.</span></div>
          <button type="button" class="toggle-switch ${state.settings.theme === "dark" ? "on" : ""}" data-action="set-display" data-setting="theme" data-value="${state.settings.theme === "dark" ? "light" : "dark"}" aria-pressed="${state.settings.theme === "dark"}" aria-label="Toggle dark theme"><span></span></button>
        </div>
        <div class="form-row">
          <div class="form-row-copy"><strong>Furigana</strong><span>Show kana above kanji in lessons, details, and examples.</span></div>
          <button type="button" class="toggle-switch ${state.settings.furigana !== false ? "on" : ""}" data-action="set-display" data-setting="furigana" data-value="${state.settings.furigana !== false ? "off" : "on"}" aria-pressed="${state.settings.furigana !== false}" aria-label="Toggle furigana"><span></span></button>
        </div>
        <div class="form-row">
          <div class="form-row-copy"><strong>Romaji</strong><span>Show romanized readings alongside Japanese text.</span></div>
          <button type="button" class="toggle-switch ${state.settings.romaji !== false ? "on" : ""}" data-action="set-display" data-setting="romaji" data-value="${state.settings.romaji !== false ? "off" : "on"}" aria-pressed="${state.settings.romaji !== false}" aria-label="Toggle romaji"><span></span></button>
        </div>
        <div class="form-row">
          <div class="form-row-copy"><strong>Activity heatmap</strong><span>Show a full-year review calendar on the dashboard with year navigation.</span></div>
          <button type="button" class="toggle-switch ${state.settings.heatmap !== false ? "on" : ""}" data-action="toggle-heatmap" aria-pressed="${state.settings.heatmap !== false}" aria-label="Toggle activity heatmap"><span></span></button>
        </div>
        <div class="form-row form-row-stack">
          <div class="form-row-copy"><strong>Interface scale</strong><span>Scale type, spacing, and controls together.</span></div>
          <div class="size-options" role="group" aria-label="Interface scale">
            ${UI_SIZES.map((size) => {
              const [label, amount] = UI_SIZE_LABELS[size];
              return `<button type="button" class="size-option ${state.settings.uiSize === size ? "selected" : ""}" data-action="set-display" data-setting="uiSize" data-value="${size}" aria-pressed="${state.settings.uiSize === size}"><strong>${label}</strong><span>${amount}</span></button>`;
            }).join("")}
          </div>
        </div>
      </section>

      <section class="panel">
        <div class="panel-head"><div><h2>Your data</h2><p>${learned} learned items · ${state.stats.reviews} item reviews logged</p></div><span class="stage-badge ${storageOK ? "enlightened" : "apprentice"}">${storageOK ? "Stored locally" : "Storage blocked"}</span></div>
        <div class="form-row">
          <div class="form-row-copy"><strong>Export progress</strong><span>Download a JSON backup of your items, stats, and settings.</span></div>
          <button type="button" class="btn btn-soft btn-sm" data-action="export-data">Export</button>
        </div>
        <div class="form-row">
          <div class="form-row-copy"><strong>Import progress</strong><span>Restore a backup file exported from KaniDojo.</span></div>
          <button type="button" class="btn btn-soft btn-sm" data-action="import-data">Import</button>
          <input id="importFile" type="file" accept="application/json,.json" hidden>
        </div>
        <div class="form-row">
          <div class="form-row-copy"><strong>Streak</strong><span>${currentStreak()} current · ${state.streak.best || 0} best</span></div>
          <span class="stage-badge">${dayLabel(currentStreak())}</span>
        </div>
      </section>

      <section class="panel full">
        <div class="panel-head"><div><h2>SRS schedule</h2><p>${getPaceLabel()} intervals. Wrong answers reset progress. Burned items retire permanently and record the date.</p></div></div>
        <div class="table-wrap">
          <table class="srs-table">
            <thead><tr><th>Stage</th><th>Interval</th><th>Group</th></tr></thead>
            <tbody>${srsRows}</tbody>
          </table>
        </div>
        <p class="related-note" style="margin-top:10px">A correct review from Enlightened burns the item immediately. Open the item to see its exact burn date.</p>
      </section>

      <section class="panel">
        <div class="panel-head"><div><h2>Rules of the dojo</h2><p>The short version.</p></div></div>
        <ul class="rule-list">
          <li>Lessons add items at <strong>Apprentice 1</strong> and schedule the first review.</li>
          <li>Correct reviews move an item up one stage until it is <strong>Burned</strong>. Its item page records the burn date, and burned rows appear grey in Browse.</li>
          <li>Vocab lessons unlock after their component kanji are learned.</li>
          <li>Reach <strong>90% of a level's kanji at Guru</strong> to unlock the next level.</li>
          <li>Level gating can be turned off to browse and learn any kanji in the full catalog.</li>
        </ul>
      </section>

      <section class="panel full">
        <div class="panel-head"><div><h2>Curriculum & data</h2><p>${KANJI_COUNT.toLocaleString()} kanji · ${VOCAB_COUNT.toLocaleString()} vocabulary · 60 frequency-based levels · JLPT N5–N1</p></div></div>
        <p class="related-note" style="margin-top:0">Vocabulary, readings, meanings, and JLPT levels come from <a href="https://github.com/evanclan/OpenJLPT" target="_blank" rel="noreferrer">OpenJLPT</a> under <a href="https://creativecommons.org/licenses/by-sa/4.0/" target="_blank" rel="noreferrer">CC BY-SA 4.0</a>, built from JMdict, KANJIDIC2, and Jonathan Waller's JLPT lists. The 60-level order is generated from kanji frequency data. Changes include compacting the source data, normalizing readings, generating a frequency-based level order, and adding original practice sentences for items without an example. The adapted curriculum data in this app is shared under CC BY-SA 4.0.</p>
        <p class="related-note">Example sentences from <a href="https://tatoeba.org/" target="_blank" rel="noreferrer">Tatoeba</a> are licensed under <a href="https://creativecommons.org/licenses/by/2.0/fr/" target="_blank" rel="noreferrer">CC BY 2.0 FR</a>. Each Tatoeba example links to its source sentence and contributor. Reading audio was generated with Deepgram Aura-2 voice Izanami and is bundled with this app. KaniDojo is an independent project and is not affiliated with Deepgram or any paid SRS or publisher.</p>
        <div class="license-actions">
          <button type="button" class="btn btn-soft btn-sm" data-action="export-curriculum">Download curriculum data</button>
          <a class="btn btn-ghost btn-sm" href="https://github.com/evanclan/OpenJLPT" target="_blank" rel="noreferrer">OpenJLPT source</a>
        </div>
      </section>

      <section class="panel danger-zone full">
        <div class="panel-head"><div><h2>Reset progress</h2><p>Reset from a chosen level or JLPT level, or clear every level.</p></div></div>
        <div class="reset-row">
          <div class="form-row-copy"><strong>Reset from a level</strong><span>Removes learned items at or above the chosen level and moves your level back when needed. Stats and streak are kept.</span></div>
          <div class="reset-actions">
            <label class="sr-only" for="resetLevel">Reset from level</label>
            <select class="select" id="resetLevel">
              ${Array.from({ length: MAX_LEVEL }, (_, index) => index + 1).map((level) => `<option value="${level}" ${state.currentLevel === level ? "selected" : ""}>Level ${level}</option>`).join("")}
            </select>
            <button type="button" class="btn btn-danger" data-action="reset-level">Reset from level</button>
          </div>
        </div>
        <div class="reset-row">
          <div class="form-row-copy"><strong>Reset from a JLPT level</strong><span>Removes learned items at the chosen JLPT level and every harder level, then moves your JLPT level back when needed. Stats and streak are kept.</span></div>
          <div class="reset-actions">
            <label class="sr-only" for="resetJlpt">Reset from JLPT level</label>
            <select class="select" id="resetJlpt">
              ${JLPT_LEVELS.map((level) => `<option value="${level}" ${currentJlptLabel() === level ? "selected" : ""}>${level}</option>`).join("")}
            </select>
            <button type="button" class="btn btn-danger" data-action="reset-jlpt">Reset from JLPT</button>
          </div>
        </div>
        <div class="reset-row reset-all-row">
          <div class="form-row-copy"><strong>Reset all levels</strong><span>Removes all lessons, reviews, stats, streak, and settings from this browser.</span></div>
          <button type="button" class="btn btn-danger" data-action="reset-data">Reset all levels</button>
        </div>
      </section>
    </div>
  `;
}

function buildQuestions(item) {
  return [{ kind: "meaning" }, { kind: "reading" }];
}

function startStudy(mode) {
  if (ui.session && ui.session.phase !== "done") return;
  if (!["mistakes", "lessons", "burned"].includes(mode)) return;
  const collections = getStudyCollections();
  const picked = collections[mode].slice(0, STUDY_BATCH);
  if (!picked.length) {
    showToast("There are no items in that extra study set yet.", "error");
    return;
  }
  ui.session = {
    type: "study",
    mode,
    phase: "quiz",
    items: picked.map(({ item }) => ({
      id: item.id,
      questions: buildQuestions(item),
      qIndex: 0,
      wrong: false
    })),
    index: 0,
    feedback: null,
    results: {
      correct: 0,
      incorrect: 0,
      questionTotal: 0,
      questionCorrect: 0
    },
    completedAt: null
  };
  ui.route = "study";
  closeModal();
  render();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

const STUDY_MODE_LABELS = {
  mistakes: "Recent mistakes",
  lessons: "Recent lessons",
  burned: "Burned items"
};

function activeStudyQuestion(session) {
  if (!session || session.type !== "study") return null;
  const entry = session.items[session.index];
  if (!entry) return null;
  const question = entry.questions[entry.qIndex];
  if (!question) return null;
  return { item: ITEM_BY_ID.get(entry.id), kind: question.kind, entry };
}

function renderStudySession() {
  const session = ui.session;
  if (!session) return renderStudy();
  if (session.phase === "done") return renderStudySummary();
  return renderStudyQuizCard();
}

function renderStudyQuizCard() {
  const session = ui.session;
  const active = activeStudyQuestion(session);
  if (!active) return renderStudySummary();
  const item = active.item;
  const kind = active.kind;
  const totalQuestions = session.items.length * 2;
  const answered = session.index * 2 + active.entry.qIndex;
  const percent = totalQuestions ? (answered / totalQuestions) * 100 : 0;
  const modeLabel = STUDY_MODE_LABELS[session.mode] || "Extra study";
  const prompt = kind === "meaning" ? "What is the meaning?" : "What is the reading?";
  const placeholder = kind === "meaning" ? "English meaning" : "Romaji or kana";
  const feedback = session.feedback;
  const feedbackHtml = feedback ? (() => {
    const answeredItem = ITEM_BY_ID.get(feedback.itemId);
    const note = feedback.ok
      ? "Correct. This practice answer does not change your SRS."
      : "Not quite. Review the answer, then continue. Your SRS is unchanged.";
    return `
      <div class="feedback ${feedback.ok ? "correct" : "incorrect"}" role="status" aria-live="polite">
        <div class="feedback-head"><span class="feedback-mark">${feedback.ok ? "✓" : "!"}</span><span class="feedback-title">${feedback.ok ? "Correct" : "Not quite"}</span></div>
        <div class="feedback-answer">${feedback.ok ? `You answered <b>${escapeHtml(feedback.value)}</b>.` : `Correct answer: <b>${answerText(answeredItem, feedback.kind)}</b>`}${feedback.kind === "meaning" ? pronunciationChips(answeredItem, "small") : ""}</div>
        <div class="feedback-actions">
          <span class="feedback-note">${note}</span>
          <div class="feedback-buttons">
            <button type="button" class="btn btn-dark" id="quizContinue" data-action="quiz-continue">Continue</button>
          </div>
        </div>
      </div>
    `;
  })() : "";
  return `
    <div class="session-page">
      ${sessionTopHtml(session, `Extra study · ${modeLabel}`, "Practice freely.", `Item ${session.index + 1} of ${session.items.length}`, `${session.results.questionCorrect} / ${session.results.questionTotal} correct`, percent)}
      <article class="quiz-card ${kind}">
        <div class="quiz-top">
          <div class="quiz-meta">${typeBadge(item)}<span class="quiz-level">Level ${item.level}</span></div>
          <span class="stage-badge ${kind === "reading" ? "guru" : "apprentice"}">${kind === "reading" ? "Reading" : "Meaning"}</span>
        </div>
        <div class="quiz-prompt">${prompt}</div>
        <div class="quiz-char ${charSizeClass(item.characters)}">${escapeHtml(item.characters)}</div>
        ${feedback ? feedbackHtml : `
          <form class="quiz-form" id="quizForm" autocomplete="off" data-kind="${kind}">
            <label class="sr-only" for="quizInput">${prompt}</label>
            <input class="quiz-input" id="quizInput" name="answer" type="text" placeholder="${placeholder}" autocapitalize="off" autocorrect="off" spellcheck="false" data-kind="${kind}">
            <button class="btn btn-primary" type="submit">Check answer</button>
          </form>
          ${kind === "reading" ? `<div class="ime-preview" id="imePreview" aria-live="polite"></div>` : ""}
          <p class="quiz-hint">Practice only. Answers never affect SRS stages, review dates, stats, or streaks.</p>
        `}
      </article>
    </div>
  `;
}

function renderStudySummary() {
  const session = ui.session;
  const results = session.results;
  const totalItems = session.items.length;
  const questionAccuracy = results.questionTotal ? Math.round((results.questionCorrect / results.questionTotal) * 100) : 100;
  return `
    <div class="session-page">
      <article class="summary-card study-summary">
        <div class="summary-hero">
          <div class="summary-mark">練</div>
          <span class="eyebrow">Extra study complete</span>
          <h1>${totalItems} ${totalItems === 1 ? "item" : "items"} practiced.</h1>
          <p>${results.correct} clean, ${results.incorrect} with a miss. Accuracy was ${questionAccuracy}% across ${results.questionTotal} answers. Your SRS schedule is untouched.</p>
        </div>
        <div class="summary-stats">
          <div class="summary-stat"><strong>${results.correct}</strong><span>Clean items</span></div>
          <div class="summary-stat"><strong>${results.incorrect}</strong><span>Items with a miss</span></div>
          <div class="summary-stat"><strong>${questionAccuracy}%</strong><span>Question accuracy</span></div>
        </div>
        <div class="summary-actions">
          <button type="button" class="btn btn-primary" data-action="navigate" data-view="study">Back to extra study</button>
          <button type="button" class="btn btn-soft" data-action="navigate" data-view="dashboard">Dashboard</button>
        </div>
      </article>
    </div>
  `;
}

function startLesson() {
  if (ui.session && ui.session.phase !== "done") return;
  if (isVacationActive()) {
    showToast("Vacation mode is on. Resume your schedule in Settings first.", "error");
    return;
  }
  const available = getAvailableLessons();
  if (!available.length) {
    showToast("No lessons are available right now.", "error");
    return;
  }
  const picked = available.slice(0, LESSON_BATCH);
  ui.session = {
    type: "lesson",
    phase: "learn",
    items: picked.map((item) => item.id),
    learnIndex: 0,
    queue: [],
    totalQuestions: 0,
    mastered: 0,
    mistakes: 0,
    feedback: null,
    nextReviewAt: null,
    completedAt: null
  };
  ui.route = "lesson";
  closeModal();
  render();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function startReview() {
  if (ui.session && ui.session.phase !== "done") return;
  if (isVacationActive()) {
    showToast("Vacation mode is on. Resume your schedule in Settings first.", "error");
    return;
  }
  const due = getDueReviews();
  if (!due.length) {
    showToast("No reviews are due yet.", "success");
    return;
  }
  const cap = getReviewCap();
  const picked = cap > 0 ? due.slice(0, cap) : due;
  ui.session = {
    type: "review",
    phase: "quiz",
    items: picked.map((item) => ({
      id: item.id,
      questions: buildQuestions(item),
      qIndex: 0,
      wrong: false
    })),
    index: 0,
    feedback: null,
    results: {
      correct: 0,
      incorrect: 0,
      burned: 0,
      questionTotal: 0,
      questionCorrect: 0
    },
    missed: [],
    oldLevel: trackLevelLabel(),
    newLevel: null,
    completedAt: null
  };
  ui.route = "review";
  closeModal();
  render();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function activeQuestion(session) {
  if (!session) return null;
  if (session.type === "lesson") {
    const next = session.queue[0];
    if (!next) return null;
    return { item: ITEM_BY_ID.get(next.itemId), kind: next.kind };
  }
  if (session.type === "study") return activeStudyQuestion(session);
  const entry = session.items[session.index];
  if (!entry) return null;
  const question = entry.questions[entry.qIndex];
  if (!question) return null;
  return { item: ITEM_BY_ID.get(entry.id), kind: question.kind, entry };
}

function sessionTopHtml(session, eyebrow, title, left, right, percent) {
  const mistakeCount = session.type === "lesson" ? session.mistakes : session.results.incorrect;
  return `
    <div class="session-head">
      <div class="session-head-copy"><span class="eyebrow">${eyebrow}</span><h1>${title}</h1></div>
      <div class="session-head-actions">
        ${mistakeCount ? `<span class="stage-badge apprentice">${mistakeCount} missed</span>` : ""}
        <button type="button" class="btn btn-ghost btn-sm" data-action="quit-session">End session</button>
      </div>
    </div>
    <div class="session-progress">
      <div class="session-progress-meta"><span>${left}</span><span>${right}</span></div>
      <div class="progress-track"><span style="width:${clamp(percent, 0, 100)}%"></span></div>
    </div>
  `;
}

function readingDisplay(item) {
  const romaji = romajiReadings(item).slice(0, 4).map(escapeHtml).join(", ");
  return `${pronunciationChips(item)}${romaji ? `<span class="reading-romaji romaji">${romaji}</span>` : ""}`;
}

function renderLessonSession() {
  const session = ui.session;
  if (!session) return renderLessons();
  if (session.phase === "done") return renderLessonSummary();
  if (session.phase === "learn") return renderLearnCard();
  return renderQuizCard();
}

function renderReviewSession() {
  const session = ui.session;
  if (!session) return renderReviews();
  if (session.phase === "done") return renderReviewSummary();
  return renderQuizCard();
}

function renderLearnCard() {
  const session = ui.session;
  const items = session.items.map((id) => ITEM_BY_ID.get(id));
  const item = items[session.learnIndex];
  if (!item) return renderLessonSummary();
  const progress = ((session.learnIndex + 1) / items.length) * 100;
  const related = item.requires.map((id) => ITEM_BY_ID.get(id)).filter(Boolean);
  const relatedHtml = related.length
    ? `<div class="related-chars">${related.map((required) => `<span class="related-char" title="${escapeHtml(required.meanings.join(", "))}">${escapeHtml(required.characters)}</span>`).join("")}</div><p class="related-note">These items are the building blocks for this word.</p>`
    : `<p class="related-note" style="margin-top:0">No component lessons are attached to this item. Focus on its shape, meaning, and mnemonic.</p>`;
  const footerNote = "Both meaning and reading will be quizzed.";
  const lastItem = session.learnIndex === items.length - 1;
  return `
    <div class="session-page">
      ${sessionTopHtml(session, "Lesson", `${items.length} new ${items.length === 1 ? "item" : "items"}`, `Item ${session.learnIndex + 1} of ${items.length}`, `${Math.round(progress)}%`, progress)}
      <article class="learn-card">
        <div class="learn-top">
          <div class="learn-top-meta">${typeBadge(item)}<span class="learn-level">Level ${item.level}</span></div>
          <span class="stage-badge">${session.learnIndex + 1} / ${items.length}</span>
        </div>
        <div class="learn-main">
          <div class="learn-char ${charSizeClass(item.characters)}">${renderRuby(item.characters, primaryKana(item))}</div>
          <div class="learn-meaning">${escapeHtml(item.meanings.join(", "))}</div>
          <div class="learn-reading">${readingDisplay(item)}</div>
        </div>
        <div class="learn-body">
          <div class="mnemonic-box"><h3>Memory hook</h3><p>${escapeHtml(itemMnemonic(item))}</p></div>
          <div class="related-box"><h3>Built from</h3>${relatedHtml}</div>
          <div class="learn-example">${renderExample(item)}</div>
        </div>
        <div class="learn-footer">
          <p>${footerNote}</p>
          <button type="button" class="btn btn-primary btn-lg" data-action="lesson-next">${lastItem ? "Start quiz" : "Next item"} <span aria-hidden="true">→</span></button>
        </div>
      </article>
    </div>
  `;
}

function updateImePreview(input) {
  const preview = document.getElementById("imePreview");
  if (!preview) return;
  const value = input.value.trim();
  const converted = /[a-z]/i.test(value) ? romajiToHiragana(value) : "";
  preview.textContent = converted ? `Hiragana: ${converted}` : "";
  preview.classList.toggle("visible", Boolean(converted));
}

function renderQuizCard() {
  const session = ui.session;
  const active = activeQuestion(session);
  if (!active) {
    if (session.type === "lesson") return renderLessonSummary();
    return renderReviewSummary();
  }
  const item = active.item;
  const kind = active.kind;
  const isReview = session.type === "review";
  const totalQuestions = isReview
    ? session.items.reduce((sum, entry) => sum + entry.questions.length, 0)
    : session.totalQuestions;
  const answered = isReview ? session.results.questionTotal : session.mastered;
  const percent = totalQuestions ? (answered / totalQuestions) * 100 : 0;
  const itemNumber = isReview ? session.index + 1 : session.learnIndex + 1;
  const itemTotal = isReview ? session.items.length : session.items.length;
  const eyebrow = isReview ? "Review" : "Lesson quiz";
  const title = isReview ? "Keep the streak alive." : "Prove it stuck.";
  const left = isReview ? `Item ${itemNumber} of ${itemTotal}` : `Question ${Math.min(totalQuestions, answered + 1)} of ${totalQuestions}`;
  const right = isReview
    ? `${session.results.questionCorrect} / ${session.results.questionTotal} correct`
    : `${session.mastered} / ${session.totalQuestions} passed`;
  const prompt = kind === "meaning" ? "What is the meaning?" : "What is the reading?";
  const placeholder = kind === "meaning" ? "English meaning" : "Romaji or kana";
  const hint = kind === "meaning" ? "Synonyms from the lesson are accepted." : "Romaji and kana both work.";
  const feedback = session.feedback;
  const feedbackHtml = feedback ? (() => {
    const answeredItem = ITEM_BY_ID.get(feedback.itemId);
    const note = feedback.ok
      ? "Nice work."
      : session.type === "lesson"
        ? "This question will come back before the lesson is complete."
        : "This item will drop an SRS stage.";
    return `
      <div class="feedback ${feedback.ok ? "correct" : "incorrect"}" role="status" aria-live="polite">
        <div class="feedback-head"><span class="feedback-mark">${feedback.ok ? "✓" : "!"}</span><span class="feedback-title">${feedback.ok ? "Correct" : "Not quite"}</span></div>
        <div class="feedback-answer">${feedback.ok ? `You answered <b>${escapeHtml(feedback.value)}</b>.` : `Correct answer: <b>${answerText(answeredItem, feedback.kind)}</b>`}${feedback.kind === "meaning" ? pronunciationChips(answeredItem, "small") : ""}</div>
        <div class="feedback-actions">
          <span class="feedback-note">${note}</span>
          <div class="feedback-buttons">
            ${isReview && !feedback.ok && feedback.canUndo ? `<button type="button" class="btn btn-soft" data-action="undo-mistake">Undo mistake</button>` : ""}
            <button type="button" class="btn btn-dark" id="quizContinue" data-action="quiz-continue">Continue</button>
          </div>
        </div>
      </div>
    `;
  })() : "";
  return `
    <div class="session-page">
      ${sessionTopHtml(session, eyebrow, title, left, right, percent)}
      <article class="quiz-card ${kind}">
        <div class="quiz-top">
          <div class="quiz-meta">${typeBadge(item)}<span class="quiz-level">Level ${item.level}</span></div>
          <span class="stage-badge ${kind === "reading" ? "guru" : "apprentice"}">${kind === "reading" ? "Reading" : "Meaning"}</span>
        </div>
        <div class="quiz-prompt">${prompt}</div>
        <div class="quiz-char ${charSizeClass(item.characters)}">${escapeHtml(item.characters)}</div>
        ${feedback ? feedbackHtml : `
          <form class="quiz-form" id="quizForm" autocomplete="off" data-kind="${kind}">
            <label class="sr-only" for="quizInput">${prompt}</label>
            <input class="quiz-input" id="quizInput" name="answer" type="text" placeholder="${placeholder}" autocapitalize="off" autocorrect="off" spellcheck="false" data-kind="${kind}">
            <button class="btn btn-primary" type="submit">Check answer</button>
          </form>
          ${kind === "reading" ? `<div class="ime-preview" id="imePreview" aria-live="polite"></div>` : ""}
          <p class="quiz-hint">${hint}</p>
        `}
      </article>
    </div>
  `;
}

function renderLessonSummary() {
  const session = ui.session;
  const learned = session.items.length;
  const accuracy = learned ? Math.max(0, Math.round((session.totalQuestions / Math.max(1, session.totalQuestions + session.mistakes)) * 100)) : 100;
  const nextAt = session.nextReviewAt;
  const nextLessonCount = getAvailableLessons().length;
  const dueCount = getDueReviews().length;
  return `
    <div class="session-page">
      <article class="summary-card">
        <div class="summary-hero">
          <div class="summary-mark">学</div>
          <span class="eyebrow">Lesson complete</span>
          <h1>${learned} new ${learned === 1 ? "item" : "items"} planted.</h1>
          <p>The first review is scheduled automatically. Come back when the timer reaches zero and prove it stuck.</p>
        </div>
        <div class="summary-stats">
          <div class="summary-stat"><strong>${learned}</strong><span>Items learned</span></div>
          <div class="summary-stat"><strong>${accuracy}%</strong><span>Quiz accuracy</span></div>
          <div class="summary-stat"><strong>${nextAt ? `<span data-countdown-to="${nextAt}">${formatDuration(nextAt - Date.now())}</span>` : "—"}</strong><span>First review</span></div>
        </div>
        <div class="summary-actions">
          <button type="button" class="btn btn-primary" data-action="navigate" data-view="dashboard">Back to dashboard</button>
          ${dueCount ? `<button type="button" class="btn btn-pink" data-action="start-review">Reviews <span class="count">${dueCount}</span></button>` : ""}
          ${nextLessonCount ? `<button type="button" class="btn btn-soft" data-action="start-lesson">Next lesson batch</button>` : ""}
        </div>
      </article>
    </div>
  `;
}

function renderReviewSummary() {
  const session = ui.session;
  const results = session.results;
  const totalItems = results.correct + results.incorrect;
  const questionAccuracy = results.questionTotal ? Math.round((results.questionCorrect / results.questionTotal) * 100) : 100;
  const dueCount = getDueReviews().length;
  const nextAt = getNextReviewAt();
  const missedItems = session.missed.map((id) => ITEM_BY_ID.get(id)).filter(Boolean);
  const missedHtml = missedItems.length ? `
    <div style="margin-top:18px">
      <div class="card-head" style="margin-bottom:8px"><div><h2>Worth another look</h2><p>These items lost an SRS stage this session.</p></div></div>
      <div class="missed-list">
        ${missedItems.map((item) => `
          <div class="missed-item">
            ${charTile(item)}
            <div class="missed-copy"><strong>${escapeHtml(meaningSummary(item))}</strong><span>${escapeHtml(item.characters)} · ${escapeHtml(item.type)}</span></div>
            <span class="stage-badge locked">SRS down</span>
          </div>
        `).join("")}
      </div>
    </div>
  ` : "";
  return `
    <div class="session-page">
      <article class="summary-card">
        <div class="summary-hero">
          <div class="summary-mark">了</div>
          <span class="eyebrow">Review complete</span>
          <h1>${totalItems} ${totalItems === 1 ? "item" : "items"} reviewed.</h1>
          <p>${results.correct} moved up, ${results.incorrect} slipped down. Accuracy was ${questionAccuracy}% across ${results.questionTotal} answers.</p>
        </div>
        <div class="summary-stats">
          <div class="summary-stat"><strong>${results.correct}</strong><span>Correct items</span></div>
          <div class="summary-stat"><strong>${results.incorrect}</strong><span>Incorrect items</span></div>
          <div class="summary-stat"><strong>${results.burned}</strong><span>Burned</span></div>
        </div>
        ${session.newLevel ? `
          <div class="level-up-banner">
            <span class="eyebrow">Level up</span>
            <h2>${escapeHtml(session.newLevel.label)} ${isFinalCleared() ? "cleared" : "unlocked"}.</h2>
            <p>${isFinalCleared() ? "You have cleared the final level of KaniDojo." : "New kanji and vocabulary are now waiting in Lessons."}</p>
          </div>
        ` : ""}
        <div class="summary-body">
          ${missedHtml}
          ${nextAt ? `<p class="related-note" style="margin:${missedItems.length ? "16px" : "0"} 0 0">Next review: <strong data-countdown-to="${nextAt}">${formatDuration(nextAt - Date.now())}</strong> (${formatDateTime(nextAt)})</p>` : ""}
        </div>
        <div class="summary-actions">
          <button type="button" class="btn btn-primary" data-action="navigate" data-view="dashboard">Dashboard</button>
          ${dueCount ? `<button type="button" class="btn btn-pink" data-action="start-review">Review more <span class="count">${dueCount}</span></button>` : ""}
          <button type="button" class="btn btn-soft" data-action="navigate" data-view="lessons">Lessons</button>
        </div>
      </article>
    </div>
  `;
}

function submitQuizAnswer(value) {
  const session = ui.session;
  if (!session || session.phase === "done" || session.feedback) return;
  const active = activeQuestion(session);
  if (!active) return;
  const correct = checkAnswer(active.item, active.kind, value);
  if (session.type === "lesson") {
    if (correct) session.mastered += 1;
    else session.mistakes += 1;
    session.feedback = {
      ok: correct,
      itemId: active.item.id,
      kind: active.kind,
      value: String(value).trim(),
      requeue: !correct
    };
  } else if (session.type === "study") {
    const entry = session.items[session.index];
    if (!correct) entry.wrong = true;
    session.results.questionTotal += 1;
    if (correct) session.results.questionCorrect += 1;
    session.feedback = {
      ok: correct,
      itemId: active.item.id,
      kind: active.kind,
      value: String(value).trim(),
      requeue: false,
      canUndo: false,
      previousWrong: entry.wrong
    };
  } else {
    const entry = session.items[session.index];
    const previousWrong = entry.wrong;
    if (!correct) entry.wrong = true;
    session.results.questionTotal += 1;
    if (correct) session.results.questionCorrect += 1;
    session.feedback = {
      ok: correct,
      itemId: active.item.id,
      kind: active.kind,
      value: String(value).trim(),
      requeue: false,
      canUndo: !correct && state.settings.undoMistakes === true,
      previousWrong
    };
  }
  render();
}

function undoReviewMistake() {
  const session = ui.session;
  const feedback = session && session.feedback;
  if (!session || session.type !== "review" || !feedback || feedback.ok || !feedback.canUndo) return;
  const entry = session.items[session.index];
  if (!entry) return;
  entry.wrong = feedback.previousWrong;
  session.results.questionTotal = Math.max(0, session.results.questionTotal - 1);
  session.feedback = null;
  render();
  showToast("Mistake undone. Try that answer again.", "success");
}

function continueQuiz() {
  const session = ui.session;
  if (!session || !session.feedback) return;
  const feedback = session.feedback;
  if (session.type === "lesson") {
    const question = session.queue.shift();
    if (feedback.requeue && question) session.queue.push(question);
    session.feedback = null;
    if (!session.queue.length) completeLessonSession();
  } else if (session.type === "study") {
    const entry = session.items[session.index];
    session.feedback = null;
    if (entry) entry.qIndex += 1;
    if (entry && entry.qIndex >= entry.questions.length) {
      if (entry.wrong) session.results.incorrect += 1;
      else session.results.correct += 1;
      session.index += 1;
      if (session.index >= session.items.length) {
        session.phase = "done";
        session.completedAt = Date.now();
      }
    }
  } else {
    const entry = session.items[session.index];
    session.feedback = null;
    if (entry) entry.qIndex += 1;
    if (entry && entry.qIndex >= entry.questions.length) finishReviewItem();
  }
  render();
}

function completeLessonSession() {
  const session = ui.session;
  if (!session || session.type !== "lesson") return;
  const now = Date.now();
  let learned = 0;
  session.items.forEach((id) => {
    if (state.items[id]) return;
    state.items[id] = {
      stage: 0,
      nextReview: now + getInterval(0),
      lessonAt: now,
      correct: 0,
      incorrect: 0,
      reviews: 0,
      burnedAt: null,
      lastMistakeAt: null
    };
    learned += 1;
  });
  if (learned) {
    state.stats.lessons += learned;
    const day = ensureDay(now);
    day.lessons += learned;
    touchActivity(now);
  }
  session.nextReviewAt = now + getInterval(0);
  session.completedAt = now;
  session.phase = "done";
  saveState();
}

function gradeReviewItem(itemId, wrong, timestamp) {
  const entry = state.items[itemId];
  if (!entry) return null;
  const day = ensureDay(timestamp);
  touchActivity(timestamp);
  let newStage;
  if (wrong) {
    newStage = entry.stage >= 4 ? 0 : Math.max(0, entry.stage - 1);
    entry.incorrect = (entry.incorrect || 0) + 1;
    entry.lastMistakeAt = timestamp;
    state.stats.incorrect += 1;
    day.incorrect += 1;
  } else {
    newStage = Math.min(8, entry.stage + 1);
    entry.correct = (entry.correct || 0) + 1;
    state.stats.correct += 1;
    day.correct += 1;
  }
  entry.reviews = (entry.reviews || 0) + 1;
  entry.stage = newStage;
  entry.burnedAt = newStage >= 8 ? timestamp : null;
  entry.nextReview = newStage >= 8 ? null : timestamp + getInterval(newStage);
  state.stats.reviews += 1;
  day.reviews += 1;
  return { newStage, burned: newStage >= 8, wrong };
}

function finishReviewItem() {
  const session = ui.session;
  if (!session || session.type !== "review") return;
  const entry = session.items[session.index];
  if (!entry) return;
  const item = ITEM_BY_ID.get(entry.id);
  const result = gradeReviewItem(entry.id, entry.wrong, Date.now());
  if (result) {
    if (entry.wrong) {
      session.results.incorrect += 1;
      session.missed.push(entry.id);
    } else {
      session.results.correct += 1;
      if (result.burned) session.results.burned += 1;
    }
  }
  session.index += 1;
  const newLevel = maybeLevelUp();
  if (newLevel) session.newLevel = newLevel;
  if (session.index >= session.items.length) {
    session.phase = "done";
    session.completedAt = Date.now();
  }
  saveState();
  if (item) {
    renderHeader();
  }
}

function finishReviewSession() {
  const session = ui.session;
  if (!session || session.type !== "review") return;
  session.phase = "done";
  session.completedAt = Date.now();
  saveState();
}

function quitSession() {
  if (!ui.session) {
    navigate(ui.route === "review" ? "reviews" : ui.route === "study" ? "study" : "lessons");
    return;
  }
  if (ui.session.phase !== "done") {
    const message = ui.session.type === "lesson"
      ? "Leave this lesson? The current batch will not be saved."
      : ui.session.type === "study"
        ? "Leave this extra study session? Nothing here affects your SRS."
        : "Leave this review? Finished items are already saved, but the current question will be skipped.";
    if (!window.confirm(message)) return;
  }
  const route = ui.session.type === "lesson" ? "lessons" : ui.session.type === "study" ? "study" : "reviews";
  ui.session = null;
  ui.route = route;
  render();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function navigate(view) {
  if (ui.welcome) return;
  if (ui.session && ui.session.phase !== "done") {
    const message = ui.session.type === "lesson"
      ? "Leave this lesson? The current batch will not be saved."
      : ui.session.type === "study"
        ? "Leave this extra study session? Nothing here affects your SRS."
        : "Leave this review? Finished items are already saved, but the current question will be skipped.";
    if (!window.confirm(message)) return;
  }
  ui.session = null;
  ui.route = view;
  closeModal();
  render();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function setStudyOrder(order, shouldRender = true) {
  if (order !== "level" && order !== "jlpt") return;
  state.settings.order = order;
  ui.vocab.group = order;
  saveState();
  if (shouldRender) {
    render();
    showToast(`${order === "jlpt" ? "JLPT N5–N1" : "60-level"} order selected. Progress is unchanged.`, "success");
  }
}

function setDisplayPreference(key, value) {
  if (key === "uiSize") state.settings.uiSize = UI_SIZES.includes(value) ? value : "large";
  else if (key === "theme") state.settings.theme = value === "dark" ? "dark" : "light";
  else if (key === "furigana" || key === "romaji") state.settings[key] = value === "on";
  else return;
  applyPreferences();
  saveState();
  render();
}

function toggleLevelGate() {
  state.settings.gated = !state.settings.gated;
  saveState();
  render();
  showToast(state.settings.gated ? "Level gating on. Finish your current level to unlock more." : "Level gating off. All kanji are available to learn.", "success");
}

function toggleHeatmap() {
  state.settings.heatmap = state.settings.heatmap === false;
  saveState();
  render();
  showToast(state.settings.heatmap ? "Activity heatmap shown on the dashboard." : "Activity heatmap hidden.", "success");
}

function toggleReviewUndo() {
  state.settings.undoMistakes = !state.settings.undoMistakes;
  saveState();
  render();
  showToast(state.settings.undoMistakes ? "Undo button enabled for review mistakes." : "Undo button disabled for review mistakes.", "success");
}

function toggleSkipKanaVocabulary() {
  state.settings.skipKanaVocabulary = !state.settings.skipKanaVocabulary;
  if (!ui.welcome) saveState();
  if (ui.welcome) openWelcome();
  else render();
  showToast(state.settings.skipKanaVocabulary ? "Kana-only vocabulary will be skipped in new lessons." : "Kana-only vocabulary will be taught normally.", "success");
}

function changeHeatmapYear(delta) {
  const range = getHeatmapYearRange();
  ui.heatmapYear = clamp(ui.heatmapYear + delta, range.min, range.max);
  render();
}

function setPace(pace, shouldRender = true) {
  if (pace !== "standard" && pace !== "demo") return;
  state.settings.pace = pace;
  saveState();
  if (shouldRender) {
    render();
    showToast(`${getPaceLabel()} selected. Future intervals use the new schedule.`, "success");
  }
}

function vacationBanner() {
  if (!isVacationActive()) return "";
  const started = normalizeNumber(state.vacation.startedAt, Date.now());
  return `
    <div class="vacation-banner" role="status">
      <div class="vacation-banner-copy">
        <span class="vacation-icon">休</span>
        <div><strong>Vacation mode is on</strong><span>Reviews, lessons, and every SRS timer are frozen. Started ${escapeHtml(formatDateTime(started))}.</span></div>
      </div>
      <button type="button" class="btn btn-soft btn-sm" data-action="toggle-vacation">Resume schedule</button>
    </div>
  `;
}

function toggleVacationMode() {
  if (ui.session && ui.session.phase !== "done") {
    showToast("Finish or leave the current session before changing vacation mode.", "error");
    return;
  }
  if (isVacationActive()) {
    const started = normalizeNumber(state.vacation.startedAt, Date.now());
    const elapsed = Math.max(0, Date.now() - started);
    if (elapsed > 0) {
      Object.values(state.items).forEach((entry) => {
        if (Number.isFinite(entry.nextReview)) entry.nextReview += elapsed;
        if (Number.isFinite(entry.lessonAt)) entry.lessonAt += elapsed;
      });
      if (state.vacation.preserveStreak && state.streak.lastDate) state.streak.lastDate = todayKey(Date.now() - DAY);
    }
    state.vacation = { active: false, startedAt: null, preserveStreak: false };
    saveState();
    render();
    showToast("Vacation mode off. Review timers resumed where they left off.", "success");
  } else {
    const lastDate = state.streak.lastDate;
    const preserveStreak = Boolean(lastDate) && (lastDate === todayKey() || lastDate === todayKey(Date.now() - DAY));
    state.vacation = { active: true, startedAt: Date.now(), preserveStreak };
    saveState();
    render();
    showToast("Vacation mode on. Reviews and lessons are paused.", "success");
  }
}

function exportData() {
  const payload = {
    app: "KaniDojo",
    version: 1,
    exportedAt: new Date().toISOString(),
    state
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `kanidojo-progress-${todayKey()}.json`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  showToast("Progress exported.", "success");
}

function exportCurriculum() {
  const payload = {
    app: "KaniDojo",
    license: "CC BY-SA 4.0",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0/",
    source: "https://github.com/evanclan/OpenJLPT",
    changes: "Compacted source data, normalized readings, generated a frequency-based 60-level order, and added furigana annotations and practice sentences.",
    excludes: "Tatoeba example sentences (CC BY 2.0 FR) and original practice sentences are not included in this export.",
    exportedAt: new Date().toISOString(),
    items: ALL_ITEMS.map((item) => ({
      id: item.id,
      type: item.type,
      level: item.level,
      jlpt: item.jlpt,
      characters: item.characters,
      meanings: item.meanings,
      readings: item.readings,
      parts: item.parts,
      requires: item.requires
    }))
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "kanidojo-curriculum-cc-by-sa.json";
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  showToast("Curriculum data exported.", "success");
}

async function importData(file) {
  try {
    const text = await file.text();
    const parsed = JSON.parse(text);
    const imported = hydrateState(parsed.state || parsed);
    if (!imported) throw new Error("invalid");
    if (!window.confirm("Replace your current KaniDojo progress with this backup?")) return;
    state = imported;
    ui.session = null;
    ui.route = "dashboard";
    ui.welcome = false;
    saveState();
    closeModal();
    render();
    showToast("Progress imported.", "success");
  } catch (error) {
    showToast("That file was not a valid KaniDojo backup.", "error");
  }
}

function resetFromLevel(value) {
  const target = clamp(Math.round(normalizeNumber(value, state.currentLevel)), 1, MAX_LEVEL);
  const affected = Object.keys(state.items).filter((id) => {
    const item = ITEM_BY_ID.get(id);
    return item && item.level >= target;
  });
  const movesLevelBack = state.currentLevel > target;
  if (!affected.length && !movesLevelBack) {
    showToast(`Nothing to reset from Level ${target}.`, "error");
    return;
  }
  const message = `Reset Level ${target} and above? This removes ${affected.length.toLocaleString()} learned item${affected.length === 1 ? "" : "s"}${movesLevelBack ? ` and moves you back to Level ${target}` : ""}. Stats and streak are kept.`;
  if (!window.confirm(message)) return;
  affected.forEach((id) => { delete state.items[id]; });
  if (movesLevelBack) state.currentLevel = target;
  state.finalCleared.level = null;
  if (state.lastLevelUpTrack === "level") {
    state.lastLevelUpAt = null;
    state.lastLevelUpTrack = null;
    state.lastLevelUpLabel = null;
  }
  ui.session = null;
  saveState();
  render();
  showToast(`Progress from Level ${target} onward was reset.`, "success");
}

function resetFromJlpt(value) {
  const target = JLPT_LEVELS.includes(value) ? value : currentJlptLabel();
  const targetRank = JLPT_RANK[target];
  const affected = Object.keys(state.items).filter((id) => {
    const item = ITEM_BY_ID.get(id);
    return item && JLPT_RANK[item.jlpt] <= targetRank;
  });
  const movesLevelBack = state.currentJlpt < targetRank;
  if (!affected.length && !movesLevelBack) {
    showToast(`Nothing to reset from JLPT ${target}.`, "error");
    return;
  }
  const message = `Reset JLPT ${target} and harder? This removes ${affected.length.toLocaleString()} learned item${affected.length === 1 ? "" : "s"}${movesLevelBack ? ` and moves you back to JLPT ${target}` : ""}. Stats and streak are kept.`;
  if (!window.confirm(message)) return;
  affected.forEach((id) => { delete state.items[id]; });
  if (movesLevelBack) state.currentJlpt = targetRank;
  state.finalCleared.jlpt = null;
  if (state.lastLevelUpTrack === "jlpt") {
    state.lastLevelUpAt = null;
    state.lastLevelUpTrack = null;
    state.lastLevelUpLabel = null;
  }
  ui.session = null;
  saveState();
  render();
  showToast(`JLPT progress from ${target} onward was reset.`, "success");
}

function resetData() {
  if (!window.confirm("Reset all levels? Lessons, reviews, stats, streak, and settings will be erased.")) return;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    storageOK = false;
  }
  state = defaultState();
  fresh = true;
  ui.session = null;
  ui.route = "dashboard";
  ui.welcome = true;
  ui.welcomePace = "standard";
  ui.placement = null;
  ui.heatmapYear = new Date().getFullYear();
  closeModal();
  render();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function makeEverythingDue() {
  const learned = Object.keys(state.items).length;
  if (!learned) {
    showToast("Learn some items first.", "error");
    return;
  }
  if (!window.confirm("Make every unburned review due now? This is a demo tool.")) return;
  const now = Date.now() - 1000;
  Object.values(state.items).forEach((entry) => {
    if (entry.stage < 8) entry.nextReview = now;
  });
  saveState();
  render();
  showToast("All unfinished reviews are due now.", "success");
}

function rescheduleReviews() {
  if (isVacationActive()) {
    showToast("Turn off vacation mode before changing the review schedule.", "error");
    return;
  }
  const learned = Object.keys(state.items).length;
  if (!learned) {
    showToast("There are no learned items to reschedule.", "error");
    return;
  }
  if (!window.confirm(`Reschedule future reviews from now using ${getPaceLabel().toLowerCase()}?`)) return;
  const now = Date.now();
  Object.values(state.items).forEach((entry) => {
    if (entry.stage < 8) entry.nextReview = now + getInterval(entry.stage);
  });
  saveState();
  render();
  showToast("Future reviews rescheduled.", "success");
}

function selectWelcomePace(pace) {
  ui.welcomePace = pace === "standard" ? "standard" : "demo";
  document.querySelectorAll("[data-action='select-welcome-pace']").forEach((button) => {
    const selected = button.dataset.pace === ui.welcomePace;
    button.classList.toggle("selected", selected);
    button.setAttribute("aria-pressed", String(selected));
  });
}

function beginJourney() {
  state.settings.pace = ui.welcomePace;
  state.createdAt = Date.now();
  saveState();
  ui.welcome = false;
  ui.placement = null;
  closeModal();
  render();
  showToast("Welcome to KaniDojo. Start your first lesson.", "success");
}

function handleAction(action, element) {
  if (action === "navigate") navigate(element.dataset.view);
  else if (action === "start-lesson") startLesson();
  else if (action === "start-review") startReview();
  else if (action === "lesson-next") {
    const session = ui.session;
    if (!session || session.type !== "lesson" || session.phase !== "learn") return;
    if (session.learnIndex >= session.items.length - 1) {
      const items = session.items.map((id) => ITEM_BY_ID.get(id));
      session.queue = items.flatMap((item) => buildQuestions(item).map((question) => ({ itemId: item.id, kind: question.kind })));
      session.totalQuestions = session.queue.length;
      session.mastered = 0;
      session.mistakes = 0;
      session.phase = "quiz";
    } else {
      session.learnIndex += 1;
    }
    render();
    window.scrollTo({ top: 0, behavior: "smooth" });
  } else if (action === "quiz-continue") continueQuiz();
  else if (action === "quit-session") quitSession();
  else if (action === "item-detail") openItemDetail(element.dataset.id);
  else if (action === "radical-detail") openRadicalDetail(element.dataset.name);
  else if (action === "close-modal") closeModal();
  else if (action === "select-welcome-pace") selectWelcomePace(element.dataset.pace);
  else if (action === "begin") beginJourney();
  else if (action === "start-placement") startPlacementTest();
  else if (action === "placement-cancel") cancelPlacementTest();
  else if (action === "placement-answer") answerPlacementQuestion(element.dataset.choice);
  else if (action === "placement-next") advancePlacementTest();
  else if (action === "placement-start") startAtPlacedLevel(element.dataset.level);
  else if (action === "toggle-skip-kana") toggleSkipKanaVocabulary();
  else if (action === "set-pace") setPace(element.dataset.pace);
  else if (action === "set-order") setStudyOrder(element.dataset.order);
  else if (action === "toggle-gate") toggleLevelGate();
  else if (action === "toggle-vacation") toggleVacationMode();
  else if (action === "set-display") setDisplayPreference(element.dataset.setting, element.dataset.value);
  else if (action === "toggle-heatmap") toggleHeatmap();
  else if (action === "heatmap-prev-year") changeHeatmapYear(-1);
  else if (action === "heatmap-next-year") changeHeatmapYear(1);
  else if (action === "heatmap-month") openHeatmapMonth(Number(element.dataset.year), Number(element.dataset.month));
  else if (action === "start-study") startStudy(element.dataset.mode);
  else if (action === "unburn-item") unburnItem(element.dataset.id);
  else if (action === "toggle-review-undo") toggleReviewUndo();
  else if (action === "undo-mistake") undoReviewMistake();
  else if (action === "speak") speakJapanese(element.dataset.speak, element);
  else if (action === "load-more-browse") { ui.browse.limit += 120; renderBrowseResults(ui.route === "kanji" ? "kanji" : null); }
  else if (action === "load-more-vocab") { ui.vocab.limit += 120; renderVocabularyResults(); }
  else if (action === "load-more-radicals") { ui.radicals.limit += 120; renderRadicalResults(); }
  else if (action === "clear-radical-filters") {
    ui.radicals = { q: "", level: "all", limit: 120 };
    render();
  }
  else if (action === "clear-vocab-filters") {
    ui.vocab = { q: "", level: "all", jlpt: "all", group: "level", stage: "all", limit: 120 };
    render();
  }
  else if (action === "export-data") exportData();
  else if (action === "export-curriculum") exportCurriculum();
  else if (action === "import-data") {
    const input = document.getElementById("importFile");
    if (input) input.click();
  } else if (action === "reset-level") resetFromLevel(document.getElementById("resetLevel")?.value);
  else if (action === "reset-jlpt") resetFromJlpt(document.getElementById("resetJlpt")?.value);
  else if (action === "reset-data") resetData();
  else if (action === "make-due") makeEverythingDue();
  else if (action === "reschedule") rescheduleReviews();
  else if (action === "clear-filters") {
    ui.browse = { q: "", type: ui.route === "kanji" ? "kanji" : "all", level: "all", jlpt: "all", stage: "all", limit: 120 };
    render();
  }
}

document.addEventListener("click", (event) => {
  if (event.target.classList && event.target.classList.contains("modal-overlay")) {
    closeModal();
    return;
  }
  const actionElement = event.target.closest("[data-action]");
  if (!actionElement) return;
  handleAction(actionElement.dataset.action, actionElement);
});

document.addEventListener("submit", (event) => {
  if (event.target.id !== "quizForm") return;
  event.preventDefault();
  const input = document.getElementById("quizInput");
  if (!input) return;
  submitQuizAnswer(input.value);
});

document.addEventListener("input", (event) => {
  if (event.target.id === "quizInput") {
    updateImePreview(event.target);
    return;
  }
  if (event.target.id === "browseSearch") {
    ui.browse.q = event.target.value;
    ui.browse.limit = 120;
    renderBrowseResults(ui.route === "kanji" ? "kanji" : null);
  }
  if (event.target.id === "vocabSearch") {
    ui.vocab.q = event.target.value;
    ui.vocab.limit = 120;
    renderVocabularyResults();
  }
  if (event.target.id === "radicalSearch") {
    ui.radicals.q = event.target.value;
    ui.radicals.limit = 120;
    renderRadicalResults();
  }
});

document.addEventListener("change", (event) => {
  const filter = event.target.dataset.browseFilter;
  if (filter) {
    ui.browse[filter] = event.target.value;
    ui.browse.limit = 120;
    renderBrowseResults(ui.route === "kanji" ? "kanji" : null);
    return;
  }
  const vocabFilter = event.target.dataset.vocabFilter;
  if (vocabFilter) {
    ui.vocab[vocabFilter] = event.target.value;
    ui.vocab.limit = 120;
    renderVocabularyResults();
    return;
  }
  const radicalFilter = event.target.dataset.radicalFilter;
  if (radicalFilter) {
    ui.radicals[radicalFilter] = event.target.value;
    ui.radicals.limit = 120;
    renderRadicalResults();
    return;
  }
  if (event.target.id === "dailyGoal") {
    const value = clamp(Math.round(normalizeNumber(event.target.value, 20)), 5, 200);
    state.settings.dailyGoal = value;
    event.target.value = String(value);
    saveState();
    showToast("Daily goal updated.", "success");
    return;
  }
  if (event.target.id === "reviewCap") {
    const value = clamp(Math.round(normalizeNumber(event.target.value, 0)), 0, REVIEW_CAP_MAX);
    state.settings.reviewCap = value;
    event.target.value = String(value);
    saveState();
    showToast(value ? `Reviews capped at ${value} per session.` : "Review sessions are uncapped.", "success");
    return;
  }
  if (event.target.id === "importFile" && event.target.files && event.target.files[0]) {
    const file = event.target.files[0];
    event.target.value = "";
    importData(file);
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    if (ui.welcome) return;
    const modal = document.getElementById("modalRoot");
    if (modal && modal.innerHTML) closeModal();
    return;
  }
  if (event.key === "Enter" && ui.session && ui.session.feedback) {
    const target = event.target;
    if (target && ["INPUT", "BUTTON", "SELECT", "TEXTAREA"].includes(target.tagName)) return;
    event.preventDefault();
    continueQuiz();
  }
});

function tick() {
  const now = Date.now();
  document.querySelectorAll("[data-countdown-to]").forEach((element) => {
    const target = Number(element.dataset.countdownTo);
    if (!Number.isFinite(target)) return;
    element.textContent = formatDuration(target - now);
  });
  const dueCount = getDueReviews(now).length;
  if (dueCount !== ui.lastDue) {
    ui.lastDue = dueCount;
    renderHeader();
    if (!ui.session && !ui.welcome && ["dashboard", "reviews", "lessons"].includes(ui.route)) {
      render();
    }
  }
}

applyPreferences();
render();
ui.lastDue = getDueReviews().length;
window.setInterval(tick, 1000);

window.__KANI__ = {
  getState: () => JSON.parse(JSON.stringify(state)),
  getItems: () => ALL_ITEMS.map((item) => ({ id: item.id, type: item.type, level: item.level, jlpt: item.jlpt, characters: item.characters, meanings: item.meanings, readings: item.readings, requires: item.requires })),
  getDue: () => getDueReviews().map((item) => item.id),
  getAvailableLessons: () => getAvailableLessons().map((item) => item.id),
  getSession: () => ui.session ? JSON.parse(JSON.stringify(ui.session)) : null,
  getCurrentQuestion: () => {
    const active = ui.session ? activeQuestion(ui.session) : null;
    return active ? { id: active.item.id, kind: active.kind } : null;
  },
  getRoute: () => ui.route
};
