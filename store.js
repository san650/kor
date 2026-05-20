import { COMMANDS, isNoOp, defaultSession } from './commands.js';
import { History } from './history.js';
import { loadState, saveState, requestPersistence } from './db.js';

const initialState = () => ({
  doc: {
    day: 1,
    timeOfDay: 'dawn',
    tab: 'exploration',
    menhirs: [],
    quests: [],
    sideQuests: [],
    characters: [],
    locations: [],
    notes: [],
    secrets: [],
    factions: [],
    statuses: {},
    session: defaultSession(),
  },
});

// Hydration helper: fills missing keys in persisted `session` so existing
// users get a full-shape object even if they last saved before a field existed.
const ensureSession = (s) => {
  const base = defaultSession();
  if (!s || typeof s !== 'object') return base;
  return {
    ...base,
    ...s,
    companion:     { ...base.companion,     ...(s.companion     || {}) },
    guardians:     { ...base.guardians,     ...(s.guardians     || {}) },
    guideStone:    { ...base.guideStone,    ...(s.guideStone    || {}) },
    perditionKing: { ...base.perditionKing, ...(s.perditionKing || {}) },
    players: Array.from({ length: 4 }, (_, i) => {
      const p = s.players?.[i] || {};
      return {
        ...base.players[0],
        ...p,
        skills: Array.from({ length: 6 }, (_, j) => p.skills?.[j] || ''),
      };
    }),
  };
};

// Legacy `statuses[id]` stored a single number (highest filled pip). New format
// is an array of filled pip indices, so pips can be toggled independently.
const migrateStatuses = (raw) => {
  const out = {};
  for (const [id, v] of Object.entries(raw || {})) {
    if (typeof v === 'number') {
      if (v > 0) out[id] = Array.from({ length: v }, (_, i) => i + 1);
    } else if (Array.isArray(v) && v.length > 0) {
      out[id] = [...v].sort((a, b) => a - b);
    }
  }
  return out;
};

const STRIPPED_TYPES = new Set(['SET_STATUS_VALUE', 'SET_ACTIVE_TAB']);
const isLiveCommand = (cmd) => cmd && !STRIPPED_TYPES.has(cmd.type);

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
            statuses: migrateStatuses(merged.statuses),
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
