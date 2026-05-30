import { COMMANDS, isNoOp, defaultSession } from './commands.js';
import { History } from './history.js';
import { loadState, saveState, requestPersistence } from './db.js';

const VALID_TABS = new Set(['byLocation', 'statuses', 'heroes']);

// Bump when the shape of `doc` changes. Add a matching `if (v < N)` step
// inside `migrate()` below so older persisted docs (IndexedDB) and older
// exported tomos (JSON files) upgrade on load / import.
export const CURRENT_SCHEMA_VERSION = 5;

const initialState = () => ({
  doc: {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    tab: 'byLocation',
    quests: [],
    sideQuests: [],
    notes: [],
    // Shared state — previously buried in `session`. Most entries are
    // `{ id, text, location }`. Exceptions: `locations` is
    // `{ id, location, fichas, polarity, guardian?, perditionKing? }`
    // (a revealed code plus its tally of time-tokens, polarity, and
    // optional named guardian / king of doom). `guideStones` is
    // `{ id, q1, q2, q3, q4 }` (4 quadrants), capped at 3 by the UI.
    partners: [],
    locations: [],
    guideStones: [],
    statuses: {},
    // Map of achievementKey → true for every sealed Recuerdo. Absence
    // means unsealed; we never store `false` so the object stays small
    // and JSON imports stay forward-compatible.
    achievements: {},
    chapterTime: Array.from({ length: 10 }, () => 0),
    selectedChapter: 0,
    session: defaultSession(),
  },
});

// Forward-only schema migrations. Pure & idempotent: takes a doc, returns
// a new doc at CURRENT_SCHEMA_VERSION. Docs missing `schemaVersion` are
// treated as v1 (the pre-versioned shape). Runs on every IndexedDB
// hydrate AND on every JSON import, so old persisted state and old tomos
// share one upgrade path.
const migrate = (rawDoc) => {
  if (!rawDoc || typeof rawDoc !== 'object') return rawDoc;
  let v = Number.isInteger(rawDoc.schemaVersion) ? rawDoc.schemaVersion : 1;
  const next = { ...rawDoc };
  if (v < 2) {
    // v1 → v2: introduce `locations` (list of revealed location codes).
    // Roca Guía is renamed to "Locaciones" in the UI but keeps the
    // `guideStones` storage key, so no data movement is needed here.
    if (!Array.isArray(next.locations)) next.locations = [];
    v = 2;
  }
  if (v < 3) {
    // v2 → v3: backfill `locations` from any non-empty quadrant codes on
    // existing Roca Guía cards. New behavior auto-adds a code to Conocidas
    // when a user fills a quadrant; this sweep applies the same intent to
    // codes already inscribed before the auto-add wiring existed.
    if (!Array.isArray(next.locations)) next.locations = [];
    const stones = Array.isArray(next.guideStones) ? next.guideStones : [];
    const seen = new Set(next.locations.map((l) => (l?.location || '').trim()).filter(Boolean));
    const added = [];
    for (const stone of stones) {
      for (const key of ['q1', 'q2', 'q3', 'q4']) {
        const code = (stone?.[key] || '').trim();
        if (!code || seen.has(code)) continue;
        seen.add(code);
        added.push({ id: `mig3-${code}-${added.length}`, location: code });
      }
    }
    if (added.length > 0) next.locations = [...next.locations, ...added];
    v = 3;
  }
  if (v < 4) {
    // v3 → v4: location cards absorb time-token count + polarity, plus an
    // optional named guardian / king of doom. The previous separate
    // ledgers (`timeTokens`, `guardians`, `perditionKings`) are removed
    // from the UI; we fold any entries that already point at a known
    // location into that location's new fields, and drop the loose
    // arrays. Entries that didn't reference a known location are lost
    // here — small price for a clean shape and the user has the export
    // file if recovery ever matters.
    const locations = Array.isArray(next.locations) ? next.locations : [];
    const locByCode = new Map();
    for (const loc of locations) {
      const code = (loc?.location || '').trim();
      if (code) locByCode.set(code, { ...loc });
    }
    const claim = (entries, field) => {
      for (const e of (Array.isArray(entries) ? entries : [])) {
        const code = (e?.location || '').trim();
        const name = (e?.text || '').trim();
        if (!code || !name) continue;
        const target = locByCode.get(code);
        if (!target || target[field]) continue;
        target[field] = name;
      }
    };
    claim(next.guardians, 'guardian');
    claim(next.perditionKings, 'perditionKing');
    next.locations = locations.map((loc) => {
      const code = (loc?.location || '').trim();
      const merged = code ? locByCode.get(code) : loc;
      return {
        ...loc,
        ...merged,
        fichas: Number.isInteger(merged?.fichas) ? merged.fichas : 0,
        polarity: merged?.polarity === 'rareza' ? 'rareza' : 'pureza',
      };
    });
    delete next.timeTokens;
    delete next.guardians;
    delete next.perditionKings;
    v = 4;
  }
  if (v < 5) {
    // v4 → v5: introduce the `achievements` map (key → true) for the
    // per-hero Recuerdos checklist on Andanzas. No data to migrate; we
    // just ensure the field exists so the renderer can trust its shape.
    if (!next.achievements || typeof next.achievements !== 'object') {
      next.achievements = {};
    }
    v = 5;
  }
  next.schemaVersion = CURRENT_SCHEMA_VERSION;
  return next;
};

const ensureAchievements = (raw) => {
  if (!raw || typeof raw !== 'object') return {};
  const out = {};
  for (const [k, v] of Object.entries(raw)) {
    if (v) out[k] = true;
  }
  return out;
};

// Defensive shape-filler for `session`. Not a migration — just ensures the
// object always has every field the UI assumes, with sane defaults, so old
// or partial persisted state can't crash render paths.
const ensureSession = (s) => {
  const base = defaultSession();
  if (!s || typeof s !== 'object') return base;
  return {
    ...base,
    ...s,
    selectedHeroes: Array.isArray(s.selectedHeroes)
      ? [...new Set(s.selectedHeroes.filter((i) => Number.isInteger(i) && i >= 0 && i < 4))]
      : [],
    players: Array.from({ length: 4 }, (_, i) => {
      const p = s.players?.[i] || {};
      return {
        ...base.players[0],
        ...p,
        items: Array.isArray(p.items) ? p.items : [],
      };
    }),
  };
};

// Sort each status's filled pips so the renderer can trust the ordering.
// Empty arrays are dropped — `statuses` only carries entries for statuses
// with at least one filled pip.
const ensureStatuses = (raw) => {
  const out = {};
  for (const [id, v] of Object.entries(raw || {})) {
    if (Array.isArray(v) && v.length > 0) {
      out[id] = [...v].sort((a, b) => a - b);
    }
  }
  return out;
};

// Tab / non-content commands aren't worth keeping in undo history.
const STRIPPED_TYPES = new Set(['SET_ACTIVE_TAB', 'SET_SELECTED_CHAPTER']);
const isLiveCommand = (cmd) =>
  cmd && !STRIPPED_TYPES.has(cmd.type) && cmd.type in COMMANDS;

// Clamp chapterTime[0..9] into integers 0..6 (each wheel has six wedges).
// Falls back to zero for any missing or malformed value so the renderer can
// always trust the array.
const ensureChapterTime = (raw) =>
  Array.from({ length: 10 }, (_, i) => {
    const v = Array.isArray(raw) ? raw[i] : 0;
    const n = Number(v);
    return Number.isFinite(n) ? Math.max(0, Math.min(6, Math.floor(n))) : 0;
  });

const ensureTab = (raw) => (VALID_TABS.has(raw) ? raw : 'byLocation');

class Store {
  constructor() {
    this.state = initialState();
    this.history = new History();
    this.listeners = new Set();
    this.ready = this.#hydrate();
  }

  async #hydrate() {
    const persisted = await loadState();
    if (persisted) {
      if (persisted.state) {
        const migrated = migrate(persisted.state.doc || {});
        const merged = { ...initialState().doc, ...migrated };
        this.state = {
          doc: {
            ...merged,
            tab: ensureTab(merged.tab),
            statuses: ensureStatuses(merged.statuses),
            achievements: ensureAchievements(merged.achievements),
            chapterTime: ensureChapterTime(merged.chapterTime),
            session: ensureSession(merged.session),
          },
        };
      }
      if (persisted.history) {
        const past   = (persisted.history.past   || []).filter(isLiveCommand);
        const future = (persisted.history.future || []).filter(isLiveCommand);
        this.history.hydrate({ past, future });
      }
    }
    requestPersistence();
  }

  subscribe(fn) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  #notify() { for (const fn of this.listeners) fn(this.state); }

  async #persist() {
    try {
      await saveState({ state: this.state, history: this.history.serialize() });
    } catch (err) {
      console.error('persist failed', err);
    }
  }

  reset() {
    this.state = initialState();
    this.history.clear();
    this.#persist();
    this.#notify();
  }

  // Replace the entire doc from a (validated) imported object. Reuses the
  // same shape-normalization as #hydrate so an import behaves like loading a
  // saved state from scratch. The in-memory undo/redo log is wiped and
  // replaced by whatever the imported file carried (or emptied if absent).
  importDoc(rawDoc, rawHistory) {
    const migrated = migrate(rawDoc || {});
    const merged = { ...initialState().doc, ...migrated };
    this.state = {
      doc: {
        ...merged,
        tab: ensureTab(merged.tab),
        statuses: ensureStatuses(merged.statuses),
        achievements: ensureAchievements(merged.achievements),
        chapterTime: ensureChapterTime(merged.chapterTime),
        session: ensureSession(merged.session),
      },
    };
    if (rawHistory && typeof rawHistory === 'object') {
      const past   = (rawHistory.past   || []).filter(isLiveCommand);
      const future = (rawHistory.future || []).filter(isLiveCommand);
      this.history.hydrate({ past, future });
    } else {
      this.history.clear();
    }
    this.#persist();
    this.#notify();
  }

  dispatch(cmd) {
    if (isNoOp(cmd)) return;
    const def = COMMANDS[cmd.type];
    if (!def) throw new Error(`Unknown command: ${cmd.type}`);
    const next = structuredClone(this.state);
    def.apply(next, cmd.payload);
    this.state = next;
    if (!def.transient) this.history.record(cmd);
    this.#persist();
    this.#notify();
  }

  undo() {
    const cmd = this.history.popUndo();
    if (!cmd) return null;
    const next = structuredClone(this.state);
    COMMANDS[cmd.type].revert(next, cmd.payload);
    this.state = next;
    this.history.pushFuture(cmd);
    this.#persist();
    this.#notify();
    return cmd;
  }

  redo() {
    const cmd = this.history.popRedo();
    if (!cmd) return null;
    const next = structuredClone(this.state);
    COMMANDS[cmd.type].apply(next, cmd.payload);
    this.state = next;
    this.history.pushPast(cmd);
    this.#persist();
    this.#notify();
    return cmd;
  }

  canUndo() { return this.history.canUndo(); }
  canRedo() { return this.history.canRedo(); }
}

export const store = new Store();
