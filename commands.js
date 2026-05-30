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

  UPDATE_QUEST: {
    apply: (s, p) => replaceListItem(s, 'quests', p.id, () => p.to),
    revert: (s, p) => replaceListItem(s, 'quests', p.id, () => p.from),
    coalesceKey: (p) => `updateQuest:${p.id}`,
  },

  SET_ACTIVE_TAB: {
    transient: true,
    apply: (s, p) => replaceField(s, 'tab', p.to),
    revert: (s, p) => replaceField(s, 'tab', p.from),
    coalesceKey: () => 'tab',
  },

  TOGGLE_STATUS_PIP: {
    apply: (s, p) => writeStatusPip(s, p.id, p.pip, p.to),
    revert: (s, p) => writeStatusPip(s, p.id, p.pip, p.from),
    coalesceKey: (p) => `statusPip:${p.id}:${p.pip}`,
  },

  SET_CHAPTER_TIME: {
    apply: (s, p) => writeChapterTime(s, p.chapter, p.to),
    revert: (s, p) => writeChapterTime(s, p.chapter, p.from),
    coalesceKey: (p) => `chapterTime:${p.chapter}`,
  },

  SET_SELECTED_CHAPTER: {
    transient: true,
    apply: (s, p) => replaceField(s, 'selectedChapter', p.to),
    revert: (s, p) => replaceField(s, 'selectedChapter', p.from),
    coalesceKey: () => 'selectedChapter',
  },

  TOGGLE_ACHIEVEMENT: {
    apply: (s, p) => writeAchievement(s, p.key, p.to),
    revert: (s, p) => writeAchievement(s, p.key, p.from),
    coalesceKey: (p) => `achievement:${p.key}`,
  },
};

const writeAchievement = (state, key, sealed) => {
  const doc = docFrom(state);
  const next = { ...(doc.achievements || {}) };
  if (sealed) next[key] = true;
  else delete next[key];
  state.doc = { ...doc, achievements: next };
};

const writeChapterTime = (state, chapter, value) => {
  const doc = docFrom(state);
  const arr = Array.isArray(doc.chapterTime)
    ? [...doc.chapterTime]
    : Array.from({ length: 10 }, () => 0);
  while (arr.length < 10) arr.push(0);
  arr[chapter] = Math.max(0, Math.min(6, Math.floor(Number(value) || 0)));
  state.doc = { ...doc, chapterTime: arr };
};

const checklistCommands = (listKey, prefix) => ({
  [`ADD_${prefix}`]: {
    apply: (s, p) => {
      const list = ensureCollection(s, listKey);
      s.doc = { ...docFrom(s), [listKey]: insertAt(list, p.to, p.index) };
    },
    revert: (s, p) => {
      const list = ensureCollection(s, listKey);
      s.doc = { ...docFrom(s), [listKey]: removeById(list, p.to.id) };
    },
    coalesceKey: (p) => `add${prefix}:${p.to.id}`,
  },
  [`REMOVE_${prefix}`]: {
    apply: (s, p) => {
      const list = ensureCollection(s, listKey);
      s.doc = { ...docFrom(s), [listKey]: removeById(list, p.from.id) };
    },
    revert: (s, p) => {
      const list = ensureCollection(s, listKey);
      s.doc = { ...docFrom(s), [listKey]: insertAt(list, p.from, p.index) };
    },
    coalesceKey: (p) => `remove${prefix}:${p.from.id}`,
  },
  [`TOGGLE_${prefix}`]: {
    apply: (s, p) => replaceListItem(s, listKey, p.id, (it) => ({ ...it, done: p.to })),
    revert: (s, p) => replaceListItem(s, listKey, p.id, (it) => ({ ...it, done: p.from })),
    coalesceKey: (p) => `toggle${prefix}:${p.id}`,
  },
  [`UPDATE_${prefix}`]: {
    apply: (s, p) => replaceListItem(s, listKey, p.id, () => p.to),
    revert: (s, p) => replaceListItem(s, listKey, p.id, () => p.from),
    coalesceKey: (p) => `update${prefix}:${p.id}`,
  },
});

// Add/remove/update triple without TOGGLE — for lists whose items aren't
// done/undone. UPDATE replaces the whole item: payload is `{id, from, to}`
// so undo restores the prior shape exactly.
const listCommands = (listKey, prefix) => ({
  [`ADD_${prefix}`]: {
    apply: (s, p) => {
      const list = ensureCollection(s, listKey);
      s.doc = { ...docFrom(s), [listKey]: insertAt(list, p.to, p.index) };
    },
    revert: (s, p) => {
      const list = ensureCollection(s, listKey);
      s.doc = { ...docFrom(s), [listKey]: removeById(list, p.to.id) };
    },
    coalesceKey: (p) => `add${prefix}:${p.to.id}`,
  },
  [`REMOVE_${prefix}`]: {
    apply: (s, p) => {
      const list = ensureCollection(s, listKey);
      s.doc = { ...docFrom(s), [listKey]: removeById(list, p.from.id) };
    },
    revert: (s, p) => {
      const list = ensureCollection(s, listKey);
      s.doc = { ...docFrom(s), [listKey]: insertAt(list, p.from, p.index) };
    },
    coalesceKey: (p) => `remove${prefix}:${p.from.id}`,
  },
  [`UPDATE_${prefix}`]: {
    apply: (s, p) => replaceListItem(s, listKey, p.id, () => p.to),
    revert: (s, p) => replaceListItem(s, listKey, p.id, () => p.from),
    coalesceKey: (p) => `update${prefix}:${p.id}`,
  },
});

Object.assign(COMMANDS,
  checklistCommands('sideQuests', 'SIDE_QUEST'),
  checklistCommands('partners',   'PARTNER'),
  listCommands('timeTokens',     'TIME_TOKEN'),
  listCommands('guardians',      'GUARDIAN'),
  listCommands('perditionKings', 'PERDITION_KING'),
  listCommands('locations',      'LOCATION'),
  listCommands('guideStones',    'GUIDE_STONE'),
);

// Toggle a note's `done` flag. Mirrors TOGGLE_<X> from checklistCommands but
// has to live alongside the bespoke ADD/REMOVE/UPDATE_NOTE definitions
// below.
COMMANDS.TOGGLE_NOTE = {
  apply: (s, p) => replaceListItem(s, 'notes', p.id, (n) => ({ ...n, done: p.to })),
  revert: (s, p) => replaceListItem(s, 'notes', p.id, (n) => ({ ...n, done: p.from })),
  coalesceKey: (p) => `toggleNote:${p.id}`,
};

// Inline edit for guide-stone quadrants/center. The card surfaces five
// text inputs (center + 4 quadrants) that users fill in over time as they
// discover the surrounding locations, so we need a per-field update path.
COMMANDS.SET_GUIDE_STONE_FIELD = {
  apply: (s, p) => replaceListItem(s, 'guideStones', p.id, (g) => ({ ...g, [p.field]: p.to })),
  revert: (s, p) => replaceListItem(s, 'guideStones', p.id, (g) => ({ ...g, [p.field]: p.from })),
  coalesceKey: (p) => `guideStone:${p.id}:${p.field}`,
};

COMMANDS.ADD_NOTE = {
  apply: (s, p) => {
    const list = ensureCollection(s, 'notes');
    s.doc = { ...docFrom(s), notes: insertAt(list, p.to, p.index) };
  },
  revert: (s, p) => {
    const list = ensureCollection(s, 'notes');
    s.doc = { ...docFrom(s), notes: removeById(list, p.to.id) };
  },
  coalesceKey: (p) => `addNote:${p.to.id}`,
};
COMMANDS.REMOVE_NOTE = {
  apply: (s, p) => {
    const list = ensureCollection(s, 'notes');
    s.doc = { ...docFrom(s), notes: removeById(list, p.from.id) };
  },
  revert: (s, p) => {
    const list = ensureCollection(s, 'notes');
    s.doc = { ...docFrom(s), notes: insertAt(list, p.from, p.index) };
  },
  coalesceKey: (p) => `removeNote:${p.from.id}`,
};
COMMANDS.UPDATE_NOTE = {
  apply: (s, p) => replaceListItem(s, 'notes', p.id, () => p.to),
  revert: (s, p) => replaceListItem(s, 'notes', p.id, () => p.from),
  coalesceKey: (p) => `updateNote:${p.id}`,
};

export const defaultSession = () => ({
  // Hero data persists in this 4-slot array regardless of whether the hero
  // is currently in play. `selectedHeroes` is the ordered list of indices the
  // user has chosen to render — adding/removing only toggles visibility, the
  // underlying stats never get wiped (so re-adding a hero restores them).
  selectedHeroes: [],
  players: Array.from({ length: 4 }, () => ({
    name: '', location: '',
    // Habilidades del personaje
    agresividad: '', audacia: '', logica: '',
    empatia: '', cautela: '', espiritualidad: '',
    // Vitalidad
    energia: '', salud: '', terror: '',
    // Recursos
    food: '', wealth: '', magic: '', exp: '',
    // Items/notes are a list of `{id, text}` entries — same shape as
    // Andanzas notes.
    items: [],
  })),
});

const setSessionAt = (state, path, value) => {
  const doc = docFrom(state);
  const session = structuredClone(doc.session || defaultSession());
  let node = session;
  for (let i = 0; i < path.length - 1; i++) {
    const k = path[i];
    if (node[k] == null) node[k] = (typeof path[i + 1] === 'number') ? [] : {};
    node = node[k];
  }
  node[path[path.length - 1]] = value;
  state.doc = { ...doc, session };
};

COMMANDS.SET_SESSION_FIELD = {
  apply: (s, p) => setSessionAt(s, p.path, p.to),
  revert: (s, p) => setSessionAt(s, p.path, p.from),
  coalesceKey: (p) => `session:${p.path.join('.')}`,
};

const writeSelectedHeroes = (state, next) => {
  const doc = docFrom(state);
  const session = structuredClone(doc.session || defaultSession());
  session.selectedHeroes = next;
  state.doc = { ...doc, session };
};

COMMANDS.ADD_HERO = {
  apply: (s, p) => {
    const current = (docFrom(s).session?.selectedHeroes || []).slice();
    if (!current.includes(p.to)) {
      const next = current.slice();
      next.splice(p.index ?? next.length, 0, p.to);
      writeSelectedHeroes(s, next);
    }
  },
  revert: (s, p) => {
    const current = (docFrom(s).session?.selectedHeroes || []).slice();
    writeSelectedHeroes(s, current.filter((h) => h !== p.to));
  },
  coalesceKey: (p) => `addHero:${p.to}`,
};

COMMANDS.REMOVE_HERO = {
  apply: (s, p) => {
    const current = (docFrom(s).session?.selectedHeroes || []).slice();
    writeSelectedHeroes(s, current.filter((h) => h !== p.from));
  },
  revert: (s, p) => {
    const current = (docFrom(s).session?.selectedHeroes || []).slice();
    if (!current.includes(p.from)) {
      const next = current.slice();
      next.splice(p.index ?? next.length, 0, p.from);
      writeSelectedHeroes(s, next);
    }
  },
  coalesceKey: (p) => `removeHero:${p.from}`,
};

const updateHeroItems = (state, heroIdx, mutator) => {
  const doc = docFrom(state);
  const session = structuredClone(doc.session || defaultSession());
  const player = session.players?.[heroIdx] || { ...defaultSession().players[0] };
  const current = Array.isArray(player.items) ? player.items : [];
  player.items = mutator(current);
  if (!Array.isArray(session.players)) session.players = defaultSession().players;
  session.players[heroIdx] = player;
  state.doc = { ...doc, session };
};

COMMANDS.ADD_HERO_ITEM = {
  apply: (s, p) => updateHeroItems(s, p.heroIdx, (list) => insertAt(list, p.to, p.index)),
  revert: (s, p) => updateHeroItems(s, p.heroIdx, (list) => removeById(list, p.to.id)),
  coalesceKey: (p) => `addHeroItem:${p.heroIdx}:${p.to.id}`,
};

COMMANDS.REMOVE_HERO_ITEM = {
  apply: (s, p) => updateHeroItems(s, p.heroIdx, (list) => removeById(list, p.from.id)),
  revert: (s, p) => updateHeroItems(s, p.heroIdx, (list) => insertAt(list, p.from, p.index)),
  coalesceKey: (p) => `removeHeroItem:${p.heroIdx}:${p.from.id}`,
};

COMMANDS.UPDATE_HERO_ITEM = {
  apply: (s, p) => updateHeroItems(s, p.heroIdx,
    (list) => list.map((it) => (it.id === p.id ? p.to : it))),
  revert: (s, p) => updateHeroItems(s, p.heroIdx,
    (list) => list.map((it) => (it.id === p.id ? p.from : it))),
  coalesceKey: (p) => `updateHeroItem:${p.heroIdx}:${p.id}`,
};

const writeStatusPip = (state, id, pip, filled) => {
  const doc = docFrom(state);
  const statuses = { ...(doc.statuses || {}) };
  const current = Array.isArray(statuses[id]) ? statuses[id] : [];
  let next;
  if (filled) {
    next = current.includes(pip) ? current : [...current, pip].sort((a, b) => a - b);
  } else {
    next = current.filter((n) => n !== pip);
  }
  if (next.length === 0) delete statuses[id];
  else statuses[id] = next;
  state.doc = { ...doc, statuses };
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
