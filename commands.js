// Every state mutation is a reversible Command with apply / revert.
// All UI actions go through store.dispatch(makeCommand(type, { from, to })).

const docFrom = (state) => {
  if (!state.doc) state.doc = {};
  return state.doc;
};

const ensureCollection = (state, key, factory) => {
  const doc = docFrom(state);
  if (!Array.isArray(doc[key])) doc[key] = factory ? factory() : [];
  return doc[key];
};

const replaceField = (state, key, value) => {
  state.doc = { ...docFrom(state), [key]: value };
};

const replaceListItem = (state, key, id, mutator) => {
  const list = ensureCollection(state, key);
  state.doc = {
    ...docFrom(state),
    [key]: list.map((item) => (item.id === id ? mutator(item) : item)),
  };
};

const insertAt = (list, item, index) => {
  const i = index == null ? list.length : index;
  return [...list.slice(0, i), item, ...list.slice(i)];
};

const removeById = (list, id) => list.filter((item) => item.id !== id);

export const COMMANDS = {
  SET_DAY: {
    apply: (s, p) => replaceField(s, 'day', p.to),
    revert: (s, p) => replaceField(s, 'day', p.from),
    coalesceKey: () => 'day',
  },

  SET_TIME_OF_DAY: {
    apply: (s, p) => replaceField(s, 'timeOfDay', p.to),
    revert: (s, p) => replaceField(s, 'timeOfDay', p.from),
    coalesceKey: () => 'timeOfDay',
  },

  ADD_MENHIR: {
    apply: (s, p) => {
      const list = ensureCollection(s, 'menhirs');
      s.doc = { ...docFrom(s), menhirs: insertAt(list, p.to, p.index) };
    },
    revert: (s, p) => {
      const list = ensureCollection(s, 'menhirs');
      s.doc = { ...docFrom(s), menhirs: removeById(list, p.to.id) };
    },
    coalesceKey: (p) => `add:${p.to.id}`,
  },

  REMOVE_MENHIR: {
    apply: (s, p) => {
      const list = ensureCollection(s, 'menhirs');
      s.doc = { ...docFrom(s), menhirs: removeById(list, p.from.id) };
    },
    revert: (s, p) => {
      const list = ensureCollection(s, 'menhirs');
      s.doc = { ...docFrom(s), menhirs: insertAt(list, p.from, p.index) };
    },
    coalesceKey: (p) => `remove:${p.from.id}`,
  },

  SET_MENHIR_STATE: {
    apply: (s, p) => replaceListItem(s, 'menhirs', p.id, (m) => ({ ...m, state: p.to })),
    revert: (s, p) => replaceListItem(s, 'menhirs', p.id, (m) => ({ ...m, state: p.from })),
    coalesceKey: (p) => `menhirState:${p.id}`,
  },

  ADD_QUEST: {
    apply: (s, p) => {
      const list = ensureCollection(s, 'quests');
      s.doc = { ...docFrom(s), quests: insertAt(list, p.to, p.index) };
    },
    revert: (s, p) => {
      const list = ensureCollection(s, 'quests');
      s.doc = { ...docFrom(s), quests: removeById(list, p.to.id) };
    },
    coalesceKey: (p) => `addQuest:${p.to.id}`,
  },

  REMOVE_QUEST: {
    apply: (s, p) => {
      const list = ensureCollection(s, 'quests');
      s.doc = { ...docFrom(s), quests: removeById(list, p.from.id) };
    },
    revert: (s, p) => {
      const list = ensureCollection(s, 'quests');
      s.doc = { ...docFrom(s), quests: insertAt(list, p.from, p.index) };
    },
    coalesceKey: (p) => `removeQuest:${p.from.id}`,
  },

  TOGGLE_QUEST: {
    apply: (s, p) => replaceListItem(s, 'quests', p.id, (q) => ({ ...q, done: p.to })),
    revert: (s, p) => replaceListItem(s, 'quests', p.id, (q) => ({ ...q, done: p.from })),
    coalesceKey: (p) => `toggleQuest:${p.id}`,
  },

  ADD_SECRET: {
    apply: (s, p) => {
      const list = ensureCollection(s, 'secrets');
      s.doc = { ...docFrom(s), secrets: [...list, p.to] };
    },
    revert: (s, p) => {
      const list = ensureCollection(s, 'secrets');
      s.doc = { ...docFrom(s), secrets: list.filter((n) => n !== p.to) };
    },
    coalesceKey: (p) => `addSecret:${p.to}`,
  },

  REMOVE_SECRET: {
    apply: (s, p) => {
      const list = ensureCollection(s, 'secrets');
      s.doc = { ...docFrom(s), secrets: list.filter((n) => n !== p.from) };
    },
    revert: (s, p) => {
      const list = ensureCollection(s, 'secrets');
      s.doc = { ...docFrom(s), secrets: [...list, p.from].sort((a, b) => a - b) };
    },
    coalesceKey: (p) => `removeSecret:${p.from}`,
  },

  ADD_FACTION: {
    apply: (s, p) => {
      const list = ensureCollection(s, 'factions');
      s.doc = { ...docFrom(s), factions: insertAt(list, p.to, p.index) };
    },
    revert: (s, p) => {
      const list = ensureCollection(s, 'factions');
      s.doc = { ...docFrom(s), factions: removeById(list, p.to.id) };
    },
    coalesceKey: (p) => `addFaction:${p.to.id}`,
  },

  REMOVE_FACTION: {
    apply: (s, p) => {
      const list = ensureCollection(s, 'factions');
      s.doc = { ...docFrom(s), factions: removeById(list, p.from.id) };
    },
    revert: (s, p) => {
      const list = ensureCollection(s, 'factions');
      s.doc = { ...docFrom(s), factions: insertAt(list, p.from, p.index) };
    },
    coalesceKey: (p) => `removeFaction:${p.from.id}`,
  },

  SET_FACTION_VALUE: {
    apply: (s, p) => replaceListItem(s, 'factions', p.id, (f) => ({ ...f, value: p.to })),
    revert: (s, p) => replaceListItem(s, 'factions', p.id, (f) => ({ ...f, value: p.from })),
    coalesceKey: (p) => `factionValue:${p.id}`,
  },

  SET_ACTIVE_TAB: {
    apply: (s, p) => replaceField(s, 'tab', p.to),
    revert: (s, p) => replaceField(s, 'tab', p.from),
    coalesceKey: () => 'tab',
  },

  SET_STATUS_VALUE: {
    apply: (s, p) => {
      const doc = docFrom(s);
      const statuses = { ...(doc.statuses || {}) };
      if (p.to === 0) delete statuses[p.id];
      else statuses[p.id] = p.to;
      s.doc = { ...doc, statuses };
    },
    revert: (s, p) => {
      const doc = docFrom(s);
      const statuses = { ...(doc.statuses || {}) };
      if (p.from === 0) delete statuses[p.id];
      else statuses[p.id] = p.from;
      s.doc = { ...doc, statuses };
    },
    coalesceKey: (p) => `status:${p.id}`,
  },
};

export const makeCommand = (type, payload) => ({ type, payload });

export const coalesceKeyOf = (cmd) =>
  `${cmd.type}:${COMMANDS[cmd.type].coalesceKey(cmd.payload)}`;

export const isNoOp = (cmd) => {
  const { from, to } = cmd.payload;
  if (from === undefined || to === undefined) return false;
  if (from === to) return true;
  return false;
};
