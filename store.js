import { COMMANDS, isNoOp, defaultSession } from './commands.js';
import { History } from './history.js';
import { loadState, saveState, requestPersistence } from './db.js';

const VALID_TABS = new Set(['exploration', 'statuses', 'heroes']);

const initialState = () => ({
  doc: {
    tab: 'exploration',
    quests: [],
    sideQuests: [],
    notes: [],
    // Shared state — previously buried in `session`. Each entry is
    // `{ id, text, location }` except guideStones which has a special shape
    // (center + 4 quadrants). Capped at 4 guide stones by the UI.
    timeTokens: [],
    partners: [],
    guardians: [],
    perditionKings: [],
    guideStones: [],
    statuses: {},
    chapterTime: Array.from({ length: 10 }, () => 0),
    selectedChapter: 0,
    session: defaultSession(),
  },
});

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

const ensureTab = (raw) => (VALID_TABS.has(raw) ? raw : 'exploration');

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
        const merged = { ...initialState().doc, ...(persisted.state.doc || {}) };
        this.state = {
          doc: {
            ...merged,
            tab: ensureTab(merged.tab),
            statuses: ensureStatuses(merged.statuses),
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
  // saved state from scratch. History is dropped since it doesn't belong to
  // the imported doc.
  importDoc(rawDoc) {
    const merged = { ...initialState().doc, ...(rawDoc || {}) };
    this.state = {
      doc: {
        ...merged,
        tab: ensureTab(merged.tab),
        statuses: ensureStatuses(merged.statuses),
        chapterTime: ensureChapterTime(merged.chapterTime),
        session: ensureSession(merged.session),
      },
    };
    this.history.clear();
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
