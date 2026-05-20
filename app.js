import { store } from './store.js';
import { makeCommand } from './commands.js';
import { STATUSES, stripAccents } from './statuses.js';

/* -------------------------------------------------------------------------
   DOM helpers
   ------------------------------------------------------------------------- */

const $ = (id) => document.getElementById(id);

const el = (tag, attrs = {}, ...children) => {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k === 'class') node.className = v;
    else if (k === 'dataset') for (const [dk, dv] of Object.entries(v)) node.dataset[dk] = dv;
    else if (k.startsWith('on') && typeof v === 'function') {
      // iOS Safari needs the onclick *property* on non-button tappables to fire click.
      const evt = k.slice(2).toLowerCase();
      if (evt === 'click') node.onclick = v;
      else node.addEventListener(evt, v);
    } else if (k in node && k !== 'list') {
      try { node[k] = v; } catch { node.setAttribute(k, v); }
    } else {
      node.setAttribute(k, v);
    }
  }
  for (const c of children.flat()) {
    if (c == null || c === false) continue;
    node.append(c.nodeType ? c : document.createTextNode(String(c)));
  }
  return node;
};

const SVG_NS = 'http://www.w3.org/2000/svg';
const svgEl = (tag, attrs = {}, ...children) => {
  const node = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    node.setAttribute(k, String(v));
  }
  for (const c of children.flat()) {
    if (c == null || c === false) continue;
    node.append(c);
  }
  return node;
};

/* -------------------------------------------------------------------------
   Diálogos personalizados — nunca usar window.alert/confirm/prompt
   ------------------------------------------------------------------------- */

const promptDialog = $('prompt-dialog');
const promptInput  = $('prompt-input');
const promptTitle  = $('prompt-title');
const promptLabel  = $('prompt-label');
const promptBody   = $('prompt-body');
const promptCancel = promptDialog.querySelector('[data-prompt-cancel]');
const promptForm   = promptDialog.querySelector('form');

let promptResolver = null;
const settlePrompt = (value) => {
  if (promptResolver) { promptResolver(value); promptResolver = null; }
  if (promptDialog.open) promptDialog.close();
};
promptForm.addEventListener('submit', (e) => {
  e.preventDefault();
  settlePrompt(promptInput.value.trim());
});
promptCancel.addEventListener('click', () => settlePrompt(null));
promptDialog.addEventListener('close', () => { if (promptResolver) settlePrompt(null); });
promptDialog.onclick = (e) => { if (e.target === promptDialog) settlePrompt(null); };

const askPrompt = ({ title, label, body, value = '', placeholder = '' }) =>
  new Promise((resolve) => {
    promptResolver = resolve;
    promptTitle.textContent = title;
    promptLabel.textContent = label;
    promptInput.value = value;
    promptInput.placeholder = placeholder;
    if (body) { promptBody.textContent = body; promptBody.hidden = false; }
    else { promptBody.hidden = true; }
    promptDialog.showModal();
    requestAnimationFrame(() => promptInput.focus());
  });

const confirmDialog = $('confirm-dialog');
const confirmTitle  = $('confirm-title');
const confirmBody   = $('confirm-body');
const confirmCancel = confirmDialog.querySelector('[data-confirm-cancel]');
const confirmForm   = confirmDialog.querySelector('form');

let confirmResolver = null;
const settleConfirm = (value) => {
  if (confirmResolver) { confirmResolver(value); confirmResolver = null; }
  if (confirmDialog.open) confirmDialog.close();
};
confirmForm.addEventListener('submit', (e) => { e.preventDefault(); settleConfirm(true); });
confirmCancel.addEventListener('click', () => settleConfirm(false));
confirmDialog.addEventListener('close', () => { if (confirmResolver) settleConfirm(false); });
confirmDialog.onclick = (e) => { if (e.target === confirmDialog) settleConfirm(false); };

const askConfirm = ({ title, body, confirmLabel = 'Tachar' }) =>
  new Promise((resolve) => {
    confirmResolver = resolve;
    confirmTitle.textContent = title;
    confirmBody.textContent  = body || '';
    confirmDialog.querySelector('[data-confirm-accept]').textContent = confirmLabel;
    confirmDialog.showModal();
  });

/* -------------------------------------------------------------------------
   Utilidades
   ------------------------------------------------------------------------- */

const newId = () => 'i' + Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-3);

/* Florituras celtas como nodos SVG */
const flourish = () =>
  svgEl('svg', {
    class: 'flourish',
    viewBox: '0 0 200 14',
    fill: 'none',
    stroke: 'currentColor',
    'stroke-width': '1',
    'stroke-linecap': 'round',
    'aria-hidden': 'true',
  },
    svgEl('path', { d: 'M0 7h60M140 7h60', opacity: '0.7' }),
    svgEl('path', { d: 'M70 7c5-5 10-5 15 0s10 5 15 0 10-5 15 0', opacity: '0.85' }),
    svgEl('circle', { cx: '100', cy: '7', r: '2.5', fill: 'currentColor', stroke: 'none' }),
    svgEl('circle', { cx: '62', cy: '7', r: '1.2', fill: 'currentColor', stroke: 'none', opacity: '0.6' }),
    svgEl('circle', { cx: '138', cy: '7', r: '1.2', fill: 'currentColor', stroke: 'none', opacity: '0.6' }),
  );

/* -------------------------------------------------------------------------
   Andanzas (exploración)
   ------------------------------------------------------------------------- */

const TIME_SEGMENTS = [
  { key: 'dawn',  glyph: '☀', label: 'Alba'     },
  { key: 'noon',  glyph: '☉', label: 'Mediodía' },
  { key: 'dusk',  glyph: '☽', label: 'Ocaso'    },
  { key: 'night', glyph: '☾', label: 'Noche'    },
];

const MENHIR_STATES = ['dormant', 'lit', 'extinguished'];
const MENHIR_MARKS  = { dormant: '◦', lit: '✦', extinguished: '✕' };
const MENHIR_LABELS = { dormant: 'durmiente', lit: 'encendido', extinguished: 'apagado' };
const cycleMenhirState = (s) => MENHIR_STATES[(MENHIR_STATES.indexOf(s) + 1) % MENHIR_STATES.length];

const renderExploration = (doc) => {
  const scene = el('section', { class: 'scene' });

  scene.append(
    el('h2', { class: 'scene__title' }, 'Andanzas'),
    el('p',  { class: 'scene__sub'   }, 'crónica de días y piedras erguidas'),
    flourish(),
  );

  scene.append(
    el('div', { class: 'daycard' },
      el('button', {
        class: 'stepper',
        type: 'button',
        'aria-label': 'Restar día',
        onclick: () => {
          const from = doc.day;
          if (from <= 1) return;
          store.dispatch(makeCommand('SET_DAY', { from, to: from - 1 }));
        },
      }, '−'),
      el('div', { class: 'daycard__center' },
        el('div', { class: 'daycard__label' }, 'día'),
        el('div', { class: 'daycard__value' }, String(doc.day)),
      ),
      el('button', {
        class: 'stepper',
        type: 'button',
        'aria-label': 'Sumar día',
        onclick: () => {
          const from = doc.day;
          store.dispatch(makeCommand('SET_DAY', { from, to: from + 1 }));
        },
      }, '+'),
    )
  );

  const track = el('div', { class: 'timetrack', role: 'group', 'aria-label': 'Momento del día' });
  for (const seg of TIME_SEGMENTS) {
    const pressed = doc.timeOfDay === seg.key;
    track.append(el('button', {
      type: 'button',
      class: 'timetrack__seg',
      'aria-pressed': pressed ? 'true' : 'false',
      onclick: () => {
        const from = doc.timeOfDay;
        if (from === seg.key) return;
        store.dispatch(makeCommand('SET_TIME_OF_DAY', { from, to: seg.key }));
      },
    },
      el('span', { class: 'timetrack__glyph' }, seg.glyph),
      seg.label,
    ));
  }
  scene.append(track);

  scene.append(
    el('h3', { class: 'scene__title' }, 'Menhires'),
    el('p',  { class: 'scene__sub'   }, 'marca las piedras; aviva los fuegos'),
  );

  if (doc.menhirs.length === 0) {
    scene.append(el('p', { class: 'hush' }, 'Ninguna piedra inscrita. Anota la primera.'));
  } else {
    const list = el('ul', { class: 'menhirs' });
    doc.menhirs.forEach((m, idx) => {
      list.append(
        el('li', { class: 'menhir', dataset: { state: m.state } },
          el('button', {
            type: 'button',
            class: 'menhir__mark',
            'aria-label': `Cambiar estado de ${m.name} (${MENHIR_LABELS[m.state]})`,
            onclick: () => {
              store.dispatch(makeCommand('SET_MENHIR_STATE', {
                id: m.id, from: m.state, to: cycleMenhirState(m.state),
              }));
            },
          }, MENHIR_MARKS[m.state]),
          el('div', { class: 'menhir__body' },
            el('div', { class: 'menhir__name' }, m.name),
            el('div', { class: 'menhir__state' }, MENHIR_LABELS[m.state]),
          ),
          el('button', {
            type: 'button',
            class: 'menhir__del',
            'aria-label': `Borrar ${m.name}`,
            onclick: async () => {
              const ok = await askConfirm({
                title: '¿Tachar del tomo?',
                body: `«${m.name}» se perderá en las brumas.`,
              });
              if (!ok) return;
              store.dispatch(makeCommand('REMOVE_MENHIR', { from: m, index: idx }));
            },
          }, '✕'),
        )
      );
    });
    scene.append(list);
  }

  scene.append(
    el('div', { class: 'actions' },
      el('button', {
        type: 'button',
        class: 'btn btn--ink',
        onclick: async () => {
          const name = await askPrompt({
            title: 'Nuevo menhir',
            label: 'Nombre de la piedra',
            placeholder: 'Cnoc na Sídhe',
          });
          if (!name) return;
          const m = { id: newId(), name, state: 'dormant' };
          store.dispatch(makeCommand('ADD_MENHIR', { to: m, index: doc.menhirs.length }));
        },
      }, '＋ Inscribir piedra'),
    ),
  );

  return scene;
};

/* -------------------------------------------------------------------------
   Diario — misiones + secretos
   ------------------------------------------------------------------------- */

const renderJournal = (doc) => {
  const scene = el('section', { class: 'scene' });

  scene.append(
    el('h2', { class: 'scene__title' }, 'Diario'),
    el('p',  { class: 'scene__sub'   }, 'misiones emprendidas, secretos revelados'),
    flourish(),
    el('h3', { class: 'scene__title' }, 'Misiones'),
  );

  if (doc.quests.length === 0) {
    scene.append(el('p', { class: 'hush' }, 'La página está en blanco. Comienza una misión.'));
  } else {
    const list = el('ul', { class: 'quests' });
    doc.quests.forEach((q, idx) => {
      list.append(
        el('li', { class: 'quest', dataset: { done: q.done ? 'true' : 'false' } },
          el('button', {
            type: 'button',
            class: 'quest__check',
            'aria-label': q.done ? 'Marcar como abierta' : 'Marcar como cumplida',
            onclick: () => store.dispatch(makeCommand('TOGGLE_QUEST', {
              id: q.id, from: !!q.done, to: !q.done,
            })),
          }, q.done ? '✓' : ''),
          el('div', { class: 'quest__body' },
            q.code ? el('div', { class: 'quest__code' }, q.code) : null,
            el('div', { class: 'quest__title' }, q.title),
          ),
          el('button', {
            type: 'button',
            class: 'quest__del',
            'aria-label': `Borrar ${q.title}`,
            onclick: async () => {
              const ok = await askConfirm({
                title: '¿Tachar la misión?',
                body: `«${q.title}» será arrancada del diario.`,
              });
              if (!ok) return;
              store.dispatch(makeCommand('REMOVE_QUEST', { from: q, index: idx }));
            },
          }, '✕'),
        )
      );
    });
    scene.append(list);
  }

  scene.append(
    el('div', { class: 'actions' },
      el('button', {
        type: 'button',
        class: 'btn btn--ink',
        onclick: async () => {
          const title = await askPrompt({
            title: 'Nueva misión',
            label: '¿Qué se emprende?',
            placeholder: 'Encontrar al Ermitaño del Tarn',
          });
          if (!title) return;
          const code = await askPrompt({
            title: 'Marca el capítulo',
            label: 'Capítulo o código (opcional)',
            placeholder: 'M3.1',
          });
          const q = { id: newId(), title, code: code || '', done: false };
          store.dispatch(makeCommand('ADD_QUEST', { to: q, index: doc.quests.length }));
        },
      }, '＋ Iniciar misión'),
    ),
  );

  scene.append(el('hr', { class: 'divider' }));

  scene.append(
    el('h3', { class: 'scene__title' }, 'Secretos'),
    el('p',  { class: 'scene__sub'   }, 'pasajes numerados del libro profundo'),
  );

  if (doc.secrets.length === 0) {
    scene.append(el('p', { class: 'hush' }, 'Nada se ha revelado aún.'));
  } else {
    const sorted = [...doc.secrets].sort((a, b) => a - b);
    const ring = el('div', { class: 'secrets' });
    for (const n of sorted) {
      ring.append(el('button', {
        type: 'button',
        class: 'secret',
        'aria-label': `Borrar secreto ${n}`,
        onclick: async () => {
          const ok = await askConfirm({
            title: '¿Olvidar este secreto?',
            body: `El secreto N.º ${n} será borrado.`,
          });
          if (!ok) return;
          store.dispatch(makeCommand('REMOVE_SECRET', { from: n }));
        },
      }, String(n)));
    }
    scene.append(ring);
  }

  scene.append(
    el('div', { class: 'actions' },
      el('button', {
        type: 'button',
        class: 'btn btn--ink',
        onclick: async () => {
          const raw = await askPrompt({
            title: 'Secreto revelado',
            label: 'Número del secreto',
            placeholder: '37',
          });
          if (!raw) return;
          const n = parseInt(raw, 10);
          if (!Number.isFinite(n)) return;
          if (doc.secrets.includes(n)) return;
          store.dispatch(makeCommand('ADD_SECRET', { to: n }));
        },
      }, '＋ Revelar secreto'),
    ),
  );

  return scene;
};

/* -------------------------------------------------------------------------
   Diplomacia
   ------------------------------------------------------------------------- */

const FACTION_MIN = -10;
const FACTION_MAX =  10;

const renderPips = (value) => {
  const pips = el('div', { class: 'faction__pips', 'aria-hidden': 'true' });
  const total = 9;
  const half = (total - 1) / 2;
  const clamped = Math.max(-half, Math.min(half, value));
  for (let i = -half; i <= half; i++) {
    const isPivot = i === 0;
    const filled =
      (clamped > 0 && i > 0 && i <= clamped) ||
      (clamped < 0 && i < 0 && i >= clamped) ||
      (clamped === 0 && isPivot);
    pips.append(el('span', {
      class: 'faction__pip',
      dataset: { filled: filled ? 'true' : 'false', pivot: isPivot ? 'true' : 'false' },
    }));
  }
  const wrap = el('div', { class: 'faction__pipwrap' });
  wrap.append(
    pips,
    el('div', { class: 'faction__value' }, (value > 0 ? '+' : '') + value),
  );
  return wrap;
};

const renderDiplomacy = (doc) => {
  const scene = el('section', { class: 'scene' });

  scene.append(
    el('h2', { class: 'scene__title' }, 'Diplomacia'),
    el('p',  { class: 'scene__sub'   }, 'cómo te pesan los reinos'),
    flourish(),
  );

  if (doc.factions.length === 0) {
    scene.append(el('p', { class: 'hush' }, 'Sin estandartes alzados. Nombra los reinos.'));
  } else {
    const list = el('ul', { class: 'factions' });
    doc.factions.forEach((f, idx) => {
      list.append(
        el('li', { class: 'faction' },
          el('div', { class: 'faction__name' }, f.name),
          el('button', {
            type: 'button',
            class: 'faction__del',
            'aria-label': `Borrar ${f.name}`,
            onclick: async () => {
              const ok = await askConfirm({
                title: '¿Disolver el estandarte?',
                body: `«${f.name}» será olvidado.`,
              });
              if (!ok) return;
              store.dispatch(makeCommand('REMOVE_FACTION', { from: f, index: idx }));
            },
          }, '✕'),
          el('div', { class: 'faction__track' },
            el('button', {
              type: 'button',
              class: 'stepper',
              'aria-label': `Restar a ${f.name}`,
              onclick: () => {
                const from = f.value ?? 0;
                if (from <= FACTION_MIN) return;
                store.dispatch(makeCommand('SET_FACTION_VALUE', { id: f.id, from, to: from - 1 }));
              },
            }, '−'),
            renderPips(f.value ?? 0),
            el('button', {
              type: 'button',
              class: 'stepper',
              'aria-label': `Sumar a ${f.name}`,
              onclick: () => {
                const from = f.value ?? 0;
                if (from >= FACTION_MAX) return;
                store.dispatch(makeCommand('SET_FACTION_VALUE', { id: f.id, from, to: from + 1 }));
              },
            }, '+'),
          ),
        )
      );
    });
    scene.append(list);
  }

  scene.append(
    el('div', { class: 'actions' },
      el('button', {
        type: 'button',
        class: 'btn btn--ink',
        onclick: async () => {
          const name = await askPrompt({
            title: 'Nuevo estandarte',
            label: 'Nombre del reino o clan',
            placeholder: 'Los Renegados',
          });
          if (!name) return;
          const f = { id: newId(), name, value: 0 };
          store.dispatch(makeCommand('ADD_FACTION', { to: f, index: doc.factions.length }));
        },
      }, '＋ Alzar estandarte'),
    ),
  );

  return scene;
};

/* -------------------------------------------------------------------------
   Estados — la Hoja de Estados oficial
   ------------------------------------------------------------------------- */

let statusSearch = '';
let statusOnlyActive = false;

const renderStatuses = (doc) => {
  const scene = el('section', { class: 'scene' });
  const active = doc.statuses || {};

  scene.append(
    el('h2', { class: 'scene__title' }, 'Estados'),
    el('p',  { class: 'scene__sub'   }, 'hoja de los reyes de la perdición'),
    flourish(),
  );

  // Controles: búsqueda + filtro de activos
  const controls = el('div', { class: 'status-controls' },
    el('input', {
      type: 'search',
      class: 'status-search',
      placeholder: 'Buscar estado…',
      'aria-label': 'Buscar estado',
      value: statusSearch,
      autocomplete: 'off',
      autocapitalize: 'none',
      autocorrect: 'off',
      spellcheck: 'false',
      oninput: (e) => { statusSearch = e.target.value; render(); },
    }),
    el('button', {
      type: 'button',
      class: 'status-onlyactive',
      'aria-pressed': statusOnlyActive ? 'true' : 'false',
      onclick: () => { statusOnlyActive = !statusOnlyActive; render(); },
      title: 'Mostrar sólo los estados con valor mayor que cero',
    }, 'activos'),
  );
  scene.append(controls);

  const q = stripAccents(statusSearch.trim());
  let filtered = STATUSES;
  if (q) filtered = filtered.filter((s) => stripAccents(s.name).includes(q));
  if (statusOnlyActive) filtered = filtered.filter((s) => (active[s.id] ?? 0) > 0);

  if (filtered.length === 0) {
    scene.append(el('p', { class: 'hush' }, 'Nada se halla con esos signos.'));
    return scene;
  }

  // Agrupar por primera letra (sin acentos) para iniciales iluminadas
  const groups = new Map();
  for (const s of filtered) {
    const letter = stripAccents(s.name).charAt(0).toUpperCase();
    if (!groups.has(letter)) groups.set(letter, []);
    groups.get(letter).push(s);
  }

  for (const [letter, items] of groups) {
    scene.append(
      el('div', { class: 'alpha' },
        el('span', { class: 'alpha__letter' }, letter),
        el('span', { class: 'alpha__rule' }),
      ),
    );
    for (const s of items) {
      scene.append(renderStatusRow(s, active[s.id] ?? 0));
    }
  }

  return scene;
};

const renderStatusRow = (status, current) => {
  const row = el('div', { class: 'status', dataset: { active: current > 0 ? 'true' : 'false' } });

  row.append(
    el('div', { class: 'status__head' },
      el('div', { class: 'status__name' }, status.name),
      el('div', { class: 'status__value' }, `${current}/${status.max}`),
    ),
  );

  const track = el('div', { class: 'status__track' });
  for (let i = 1; i <= status.max; i++) {
    track.append(el('button', {
      type: 'button',
      class: 'status__pip',
      dataset: { filled: i <= current ? 'true' : 'false' },
      'aria-label': `${status.name}: marca ${i}`,
      onclick: () => {
        const from = current;
        const to = (from === i) ? i - 1 : i;
        if (from === to) return;
        store.dispatch(makeCommand('SET_STATUS_VALUE', { id: status.id, from, to }));
      },
    }));
  }
  row.append(track);

  return row;
};

/* -------------------------------------------------------------------------
   Orquestación del render
   ------------------------------------------------------------------------- */

const view = $('view');
const undoBtn = $('undo');
const redoBtn = $('redo');

const setTabs = (tab) => {
  for (const btn of document.querySelectorAll('.tab')) {
    btn.setAttribute('aria-selected', btn.dataset.tab === tab ? 'true' : 'false');
  }
};

const captureFocus = () => {
  const a = document.activeElement;
  if (!a) return null;
  if (a.classList?.contains('status-search')) {
    return { kind: 'status-search', sel: a.selectionStart ?? null };
  }
  return null;
};

const restoreFocus = (snap) => {
  if (!snap) return;
  if (snap.kind === 'status-search') {
    const input = document.querySelector('.status-search');
    if (!input) return;
    input.focus({ preventScroll: true });
    if (snap.sel != null) {
      try { input.setSelectionRange(snap.sel, snap.sel); } catch {}
    }
  }
};

const render = () => {
  const snap = captureFocus();
  const doc = store.state.doc;
  setTabs(doc.tab);
  view.replaceChildren();
  if (doc.tab === 'exploration')      view.append(renderExploration(doc));
  else if (doc.tab === 'journal')     view.append(renderJournal(doc));
  else if (doc.tab === 'diplomacy')   view.append(renderDiplomacy(doc));
  else                                view.append(renderStatuses(doc));
  undoBtn.disabled = !store.canUndo();
  redoBtn.disabled = !store.canRedo();
  restoreFocus(snap);
};

/* -------------------------------------------------------------------------
   Cableado
   ------------------------------------------------------------------------- */

for (const btn of document.querySelectorAll('.tab')) {
  btn.addEventListener('click', () => {
    const to = btn.dataset.tab;
    const from = store.state.doc.tab;
    if (from === to) return;
    store.dispatch(makeCommand('SET_ACTIVE_TAB', { from, to }));
  });
}

undoBtn.addEventListener('click', () => store.undo());
redoBtn.addEventListener('click', () => store.redo());

const isEditableTarget = (e) => {
  const t = e.target;
  return t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable);
};

window.addEventListener('keydown', (e) => {
  const meta = e.metaKey || e.ctrlKey;
  if (!meta) return;
  if (e.key === 'z' || e.key === 'Z') {
    if (isEditableTarget(e)) return;
    e.preventDefault();
    if (e.shiftKey) store.redo(); else store.undo();
  } else if (e.key === 'y' || e.key === 'Y') {
    if (isEditableTarget(e)) return;
    e.preventDefault();
    store.redo();
  }
});

const start = async () => {
  await store.ready;
  store.subscribe(render);
  render();
};

start();
