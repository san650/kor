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

const renderChecklist = ({
  items, prefix, emptyText, addLabel,
  promptTitle, promptLabel, promptPlaceholder,
  removeTitle, removeBody,
}) => {
  const node = document.createDocumentFragment();
  if (items.length === 0) {
    node.append(el('p', { class: 'hush' }, emptyText));
  } else {
    const list = el('ul', { class: 'quests' });
    items.forEach((it, idx) => {
      list.append(
        el('li', { class: 'quest', dataset: { done: it.done ? 'true' : 'false' } },
          el('button', {
            type: 'button',
            class: 'quest__check',
            'aria-label': it.done ? 'Marcar como abierta' : 'Marcar como cumplida',
            onclick: () => store.dispatch(makeCommand(`TOGGLE_${prefix}`, {
              id: it.id, from: !!it.done, to: !it.done,
            })),
          }, it.done ? '✓' : ''),
          el('div', { class: 'quest__body' },
            it.code ? el('div', { class: 'quest__code' }, it.code) : null,
            el('div', { class: 'quest__title' }, it.title),
          ),
          el('button', {
            type: 'button',
            class: 'quest__del',
            'aria-label': `Borrar ${it.title}`,
            onclick: async () => {
              const ok = await askConfirm({
                title: removeTitle,
                body: removeBody(it),
              });
              if (!ok) return;
              store.dispatch(makeCommand(`REMOVE_${prefix}`, { from: it, index: idx }));
            },
          }, '✕'),
        )
      );
    });
    node.append(list);
  }
  node.append(
    el('div', { class: 'actions' },
      el('button', {
        type: 'button',
        class: 'btn btn--ink',
        onclick: async () => {
          const title = await askPrompt({
            title: promptTitle,
            label: promptLabel,
            placeholder: promptPlaceholder,
          });
          if (!title) return;
          const it = { id: newId(), title, done: false };
          store.dispatch(makeCommand(`ADD_${prefix}`, { to: it, index: items.length }));
        },
      }, addLabel),
    ),
  );
  return node;
};

const renderJournal = (doc) => {
  const scene = el('section', { class: 'scene' });

  scene.append(
    el('h2', { class: 'scene__title' }, 'Diario'),
    el('p',  { class: 'scene__sub'   }, 'misiones emprendidas, secretos revelados'),
    flourish(),
    el('h3', { class: 'scene__title' }, 'Misión principal'),
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
    el('h3', { class: 'scene__title' }, 'Misiones secundarias'),
    el('p',  { class: 'scene__sub'   }, 'caminos paralelos al sendero mayor'),
  );
  scene.append(renderChecklist({
    items: doc.sideQuests || [],
    prefix: 'SIDE_QUEST',
    emptyText: 'Sin desvíos por ahora.',
    addLabel: '＋ Añadir misión secundaria',
    promptTitle: 'Nueva misión secundaria',
    promptLabel: '¿Qué encargo se acepta?',
    promptPlaceholder: 'Recuperar la espada perdida',
    removeTitle: '¿Tachar la misión?',
    removeBody: (it) => `«${it.title}» será arrancada del diario.`,
  }));

  scene.append(el('hr', { class: 'divider' }));

  scene.append(
    el('h3', { class: 'scene__title' }, 'Personajes importantes'),
    el('p',  { class: 'scene__sub'   }, 'rostros que pesarán en el camino'),
  );
  scene.append(renderChecklist({
    items: doc.characters || [],
    prefix: 'CHARACTER',
    emptyText: 'Aún no se ha cruzado nadie de nombre.',
    addLabel: '＋ Inscribir personaje',
    promptTitle: 'Nuevo personaje',
    promptLabel: 'Nombre o título',
    promptPlaceholder: 'Lady Morgaine',
    removeTitle: '¿Olvidar a este personaje?',
    removeBody: (it) => `«${it.title}» dejará el tomo.`,
  }));

  scene.append(el('hr', { class: 'divider' }));

  scene.append(
    el('h3', { class: 'scene__title' }, 'Localizaciones'),
    el('p',  { class: 'scene__sub'   }, 'lugares que el pie ha pisado o desea pisar'),
  );
  scene.append(renderChecklist({
    items: doc.locations || [],
    prefix: 'LOCATION',
    emptyText: 'Sin lugares anotados.',
    addLabel: '＋ Anotar lugar',
    promptTitle: 'Nuevo lugar',
    promptLabel: 'Nombre del lugar',
    promptPlaceholder: 'Tarn del Ermitaño',
    removeTitle: '¿Borrar el lugar?',
    removeBody: (it) => `«${it.title}» dejará el mapa.`,
  }));

  scene.append(el('hr', { class: 'divider' }));

  scene.append(
    el('h3', { class: 'scene__title' }, 'Notas extendidas'),
    el('p',  { class: 'scene__sub'   }, 'apuntes al margen del tomo'),
  );
  const notes = doc.notes || [];
  if (notes.length === 0) {
    scene.append(el('p', { class: 'hush' }, 'Aún sin apuntes.'));
  } else {
    const list = el('ul', { class: 'notes' });
    notes.forEach((n, idx) => {
      list.append(
        el('li', { class: 'note' },
          el('div', { class: 'note__text' }, n.text),
          el('button', {
            type: 'button',
            class: 'quest__del',
            'aria-label': 'Borrar nota',
            onclick: async () => {
              const ok = await askConfirm({
                title: '¿Tachar la nota?',
                body: 'La nota se perderá.',
              });
              if (!ok) return;
              store.dispatch(makeCommand('REMOVE_NOTE', { from: n, index: idx }));
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
          const text = await askPrompt({
            title: 'Nueva nota',
            label: '¿Qué se quiere recordar?',
            placeholder: 'La hoguera ardió tres noches…',
          });
          if (!text) return;
          const n = { id: newId(), text };
          store.dispatch(makeCommand('ADD_NOTE', { to: n, index: notes.length }));
        },
      }, '＋ Anotar'),
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
  if (statusOnlyActive) filtered = filtered.filter((s) => (active[s.id]?.length ?? 0) > 0);

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
      scene.append(renderStatusRow(s, active[s.id] ?? []));
    }
  }

  return scene;
};

const renderStatusRow = (status, filled) => {
  const count = filled.length;
  const filledSet = new Set(filled);
  const row = el('div', { class: 'status', dataset: { active: count > 0 ? 'true' : 'false' } });

  row.append(
    el('div', { class: 'status__head' },
      el('div', { class: 'status__name' }, status.name),
      el('div', { class: 'status__value' }, `${count}/${status.max}`),
    ),
  );

  const showNumbers = !status.unnumbered;
  const track = el('div', { class: 'status__track', dataset: { numbered: showNumbers ? 'true' : 'false' } });
  for (let i = 1; i <= status.max; i++) {
    const isFilled = filledSet.has(i);
    track.append(el('button', {
      type: 'button',
      class: 'status__pip',
      dataset: { filled: isFilled ? 'true' : 'false' },
      'aria-label': `${status.name}: casilla ${i}${isFilled ? ' (marcada)' : ''}`,
      'aria-pressed': isFilled ? 'true' : 'false',
      onclick: () => {
        store.dispatch(makeCommand('TOGGLE_STATUS_PIP', {
          id: status.id,
          pip: i,
          from: isFilled,
          to: !isFilled,
        }));
      },
    }, showNumbers ? String(i) : ''));
  }
  row.append(track);

  return row;
};

/* -------------------------------------------------------------------------
   Drawer — bottom-sheet de "Más opciones" + crónica de acciones
   ------------------------------------------------------------------------- */

const drawer          = $('drawer');
const drawerBackdrop  = $('drawer-backdrop');
const drawerKnob      = $('drawer-knob');
const drawerBody      = $('drawer-body');
const drawerTitleText = $('drawer-title-text');
const drawerVersion   = $('drawer-version');
const drawerBack      = $('drawer-back');
const drawerClose     = $('drawer-close');

let drawerOpen = false;
let drawerMode = 'menu'; // 'menu' | 'log' | 'session'

const DRAWER_TITLES = {
  menu: 'Más opciones',
  log: 'Crónica de acciones',
  session: 'Hoja de juego',
};

const setDrawerMode = (mode) => {
  drawerMode = mode;
  drawerTitleText.textContent = DRAWER_TITLES[mode] || DRAWER_TITLES.menu;
  drawerBack.hidden = (mode === 'menu');
  renderDrawerBody();
};

// Ask the active service worker which cache it's serving. Lets the user
// confirm at a glance that they're seeing the freshest deployed shell.
const askSwVersion = () => {
  if (!('serviceWorker' in navigator)) return;
  navigator.serviceWorker.ready.then((reg) => {
    const target = navigator.serviceWorker.controller || reg.active;
    if (!target) return;
    const channel = new MessageChannel();
    channel.port1.onmessage = (e) => {
      if (e.data?.type === 'CACHE_VERSION') {
        drawerVersion.textContent = e.data.value;
      }
    };
    target.postMessage({ type: 'GET_CACHE_VERSION' }, [channel.port2]);
  }).catch(() => {});
};

const openDrawer = () => {
  if (drawerOpen) return;
  drawerOpen = true;
  drawerKnob.setAttribute('aria-expanded', 'true');
  setDrawerMode('menu');
  drawer.hidden = false;
  drawerBackdrop.hidden = false;
  // Two RAFs so the browser commits the initial hidden→visible state before
  // we flip the transition flag.
  requestAnimationFrame(() => requestAnimationFrame(() => {
    drawer.dataset.open = 'true';
    drawerBackdrop.dataset.open = 'true';
  }));
};

const closeDrawer = () => {
  if (!drawerOpen) return;
  // Flush any pending text-input edit so its `change` event commits to the
  // store before we tear the form down.
  const a = document.activeElement;
  if (a && drawerBody.contains(a) && (a.tagName === 'INPUT' || a.tagName === 'TEXTAREA')) {
    a.blur();
  }
  drawerOpen = false;
  drawerKnob.setAttribute('aria-expanded', 'false');
  drawer.dataset.open = 'false';
  drawerBackdrop.dataset.open = 'false';
  const finish = (e) => {
    if (e.target !== drawer) return;
    drawer.hidden = true;
    drawerBackdrop.hidden = true;
    drawer.removeEventListener('transitionend', finish);
  };
  drawer.addEventListener('transitionend', finish);
};

const toggleDrawer = () => (drawerOpen ? closeDrawer() : openDrawer());

const TAB_LABELS = {
  exploration: 'Andanzas', journal: 'Diario', diplomacy: 'Diplomacia', statuses: 'Estados',
};

const statusName = (id) => {
  const found = STATUSES.find((s) => s.id === id);
  return found ? found.name : id;
};

const formatLogEntry = (cmd, doc) => {
  const p = cmd.payload || {};
  const findIn = (key, id) => (doc[key] || []).find((x) => x.id === id);
  switch (cmd.type) {
    case 'SET_DAY':
      return `Día ${p.from} → ${p.to}`;
    case 'SET_TIME_OF_DAY':
      return `Momento del día: ${TIME_SEGMENTS.find((s) => s.key === p.to)?.label || p.to}`;
    case 'SET_ACTIVE_TAB':
      return `Abrir ${TAB_LABELS[p.to] || p.to}`;
    case 'ADD_MENHIR':
      return `Inscribir menhir «${p.to?.name ?? '?'}»`;
    case 'REMOVE_MENHIR':
      return `Tachar menhir «${p.from?.name ?? '?'}»`;
    case 'SET_MENHIR_STATE': {
      const m = findIn('menhirs', p.id);
      return `Menhir${m ? ` «${m.name}»` : ''}: ${MENHIR_LABELS[p.to] || p.to}`;
    }
    case 'ADD_QUEST':
      return `Iniciar misión «${p.to?.title ?? '?'}»`;
    case 'REMOVE_QUEST':
      return `Tachar misión «${p.from?.title ?? '?'}»`;
    case 'TOGGLE_QUEST': {
      const q = findIn('quests', p.id);
      return `Misión${q ? ` «${q.title}»` : ''}: ${p.to ? 'cumplida' : 'reabierta'}`;
    }
    case 'ADD_SECRET':
      return `Secreto revelado: N.º ${p.to}`;
    case 'REMOVE_SECRET':
      return `Secreto olvidado: N.º ${p.from}`;
    case 'ADD_FACTION':
      return `Alzar estandarte «${p.to?.name ?? '?'}»`;
    case 'REMOVE_FACTION':
      return `Disolver estandarte «${p.from?.name ?? '?'}»`;
    case 'SET_FACTION_VALUE': {
      const f = findIn('factions', p.id);
      const fmt = (n) => (n > 0 ? `+${n}` : `${n}`);
      return `Estandarte${f ? ` «${f.name}»` : ''}: ${fmt(p.from)} → ${fmt(p.to)}`;
    }
    case 'TOGGLE_STATUS_PIP':
      return `Estado «${statusName(p.id)}»: casilla ${p.pip} ${p.to ? 'marcada' : 'borrada'}`;
    case 'ADD_SIDE_QUEST':    return `Añadir misión secundaria «${p.to?.title ?? '?'}»`;
    case 'REMOVE_SIDE_QUEST': return `Tachar misión secundaria «${p.from?.title ?? '?'}»`;
    case 'TOGGLE_SIDE_QUEST': {
      const it = findIn('sideQuests', p.id);
      return `Misión secundaria${it ? ` «${it.title}»` : ''}: ${p.to ? 'cumplida' : 'reabierta'}`;
    }
    case 'ADD_CHARACTER':     return `Inscribir personaje «${p.to?.title ?? '?'}»`;
    case 'REMOVE_CHARACTER':  return `Olvidar personaje «${p.from?.title ?? '?'}»`;
    case 'TOGGLE_CHARACTER': {
      const it = findIn('characters', p.id);
      return `Personaje${it ? ` «${it.title}»` : ''}: ${p.to ? 'cumplido' : 'reabierto'}`;
    }
    case 'ADD_LOCATION':      return `Anotar lugar «${p.to?.title ?? '?'}»`;
    case 'REMOVE_LOCATION':   return `Borrar lugar «${p.from?.title ?? '?'}»`;
    case 'TOGGLE_LOCATION': {
      const it = findIn('locations', p.id);
      return `Lugar${it ? ` «${it.title}»` : ''}: ${p.to ? 'visitado' : 'pendiente'}`;
    }
    case 'ADD_NOTE':
      return `Nota añadida: «${(p.to?.text || '').slice(0, 40)}${(p.to?.text?.length ?? 0) > 40 ? '…' : ''}»`;
    case 'REMOVE_NOTE':
      return `Nota borrada: «${(p.from?.text || '').slice(0, 40)}${(p.from?.text?.length ?? 0) > 40 ? '…' : ''}»`;
    case 'SET_SESSION_FIELD':
      return `Hoja de juego — ${describeSessionPath(p.path)}`;
    default:
      return cmd.type;
  }
};

const SESSION_LABELS = {
  timeTokens: 'Fichas de Tiempo / Misión',
  companion: 'Compañero',
  guardians: 'Guardianes',
  guideStone: 'Roca Guía',
  perditionKing: 'Rey de la Perdición',
  notes: 'Notas',
  name: 'nombre',
  location: 'localización',
  food: 'comida',
  wealth: 'riqueza',
  exp: 'EXP',
  magic: 'magia',
  items: 'objetos / secretos',
};

const describeSessionPath = (path) => {
  if (!Array.isArray(path) || path.length === 0) return '';
  if (path[0] === 'players') {
    const idx = path[1];
    const sub = path[2];
    if (sub === 'skills') return `Jugador ${idx + 1} — habilidad ${path[3] + 1}`;
    return `Jugador ${idx + 1} — ${SESSION_LABELS[sub] || sub}`;
  }
  return path.map((k) => SESSION_LABELS[k] || k).join(' — ');
};

const formatLogTime = (t) => {
  if (!t) return '';
  const d = new Date(t);
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  const today = new Date();
  const sameDay = d.toDateString() === today.toDateString();
  return sameDay ? `${hh}:${mm}` : `${d.getDate()}/${d.getMonth() + 1} ${hh}:${mm}`;
};

const renderDrawerMenu = () => {
  const list = el('ul', { class: 'drawer__items' });
  list.append(
    el('li', {},
      el('button', {
        type: 'button',
        class: 'drawer__item',
        onclick: () => setDrawerMode('session'),
      },
        el('span', { class: 'drawer__item-glyph' }, '⚑'),
        el('span', { class: 'drawer__item-body' },
          el('span', { class: 'drawer__item-title' }, 'Hoja de juego'),
          el('span', { class: 'drawer__item-sub' }, 'estado entre sesiones'),
        ),
      ),
    ),
    el('li', {},
      el('button', {
        type: 'button',
        class: 'drawer__item',
        onclick: () => setDrawerMode('log'),
      },
        el('span', { class: 'drawer__item-glyph' }, '❦'),
        el('span', { class: 'drawer__item-body' },
          el('span', { class: 'drawer__item-title' }, 'Crónica de acciones'),
          el('span', { class: 'drawer__item-sub' }, 'lo escrito en el tomo'),
        ),
      ),
    ),
    el('li', {},
      el('button', {
        type: 'button',
        class: 'drawer__item drawer__item--danger',
        onclick: async () => {
          const ok = await askConfirm({
            title: '¿Comenzar de nuevo?',
            body: 'Todo lo escrito en el tomo se perderá: días, menhires, misiones, secretos, estandartes, estados y la hoja de juego.',
            confirmLabel: 'Borrar todo',
          });
          if (!ok) return;
          store.reset();
          closeDrawer();
        },
      },
        el('span', { class: 'drawer__item-glyph' }, '↻'),
        el('span', { class: 'drawer__item-body' },
          el('span', { class: 'drawer__item-title' }, 'Comenzar de nuevo'),
          el('span', { class: 'drawer__item-sub' }, 'borrar el tomo y abrir página en blanco'),
        ),
      ),
    ),
  );
  return list;
};

/* -------------------------------------------------------------------------
   Hoja de juego — form de estado entre sesiones
   ------------------------------------------------------------------------- */

const getSessionAt = (path) => {
  let node = store.state.doc.session;
  for (const k of path) {
    if (node == null) return '';
    node = node[k];
  }
  return node ?? '';
};

const sessionInput = ({ path, placeholder = '', label, autocapitalize = 'sentences' }) => {
  const initial = getSessionAt(path);
  return el('input', {
    type: 'text',
    class: 'sessionf__input',
    value: initial,
    placeholder,
    'aria-label': label || path.join('.'),
    autocomplete: 'off',
    autocapitalize,
    spellcheck: 'false',
    dataset: { sessionPath: path.join('.') },
    onchange: (e) => {
      const from = getSessionAt(path);
      const to = e.target.value;
      if (from === to) return;
      store.dispatch(makeCommand('SET_SESSION_FIELD', { path, from, to }));
    },
  });
};

const sessionTextarea = ({ path, placeholder = '', label, rows = 3 }) => {
  const initial = getSessionAt(path);
  return el('textarea', {
    class: 'sessionf__textarea',
    placeholder,
    'aria-label': label || path.join('.'),
    autocapitalize: 'sentences',
    spellcheck: 'false',
    rows,
    dataset: { sessionPath: path.join('.') },
    onchange: (e) => {
      const from = getSessionAt(path);
      const to = e.target.value;
      if (from === to) return;
      store.dispatch(makeCommand('SET_SESSION_FIELD', { path, from, to }));
    },
  }, initial);
};

const sessionField = ({ label, path, ...opts }) =>
  el('label', { class: 'sessionf__field' },
    el('span', { class: 'sessionf__label' }, label),
    sessionInput({ path, label, ...opts }),
  );

const sessionTextareaField = ({ label, path, ...opts }) =>
  el('label', { class: 'sessionf__field sessionf__field--block' },
    el('span', { class: 'sessionf__label' }, label),
    sessionTextarea({ path, label, ...opts }),
  );

const renderPlayerBlock = (idx) => {
  const summary = el('summary', { class: 'sessionf__summary' },
    el('span', { class: 'sessionf__summary-mark' }, '▸'),
    el('span', null, `Jugador ${idx + 1}`),
  );
  const block = el('details', { class: 'sessionf__player' }, summary);

  block.append(
    el('div', { class: 'sessionf__player-body' },
      el('div', { class: 'sessionf__pair' },
        sessionField({ label: 'Nombre',       path: ['players', idx, 'name'],     placeholder: 'Aedric',           autocapitalize: 'words' }),
        sessionField({ label: 'Localización', path: ['players', idx, 'location'], placeholder: 'Cuagh Eithne',     autocapitalize: 'words' }),
      ),
      el('div', { class: 'sessionf__group-title' }, 'Habilidades'),
      el('div', { class: 'sessionf__skills' },
        ...Array.from({ length: 6 }, (_, i) => sessionInput({
          path: ['players', idx, 'skills', i],
          placeholder: `Habilidad ${i + 1}`,
          label: `Jugador ${idx + 1}, habilidad ${i + 1}`,
          autocapitalize: 'sentences',
        })),
      ),
      el('div', { class: 'sessionf__resources' },
        el('label', { class: 'sessionf__res' },
          el('span', { class: 'sessionf__label' }, 'Comida'),
          sessionInput({ path: ['players', idx, 'food'],   placeholder: '0', label: `Jugador ${idx + 1}, comida`,   autocapitalize: 'none' }),
        ),
        el('label', { class: 'sessionf__res' },
          el('span', { class: 'sessionf__label' }, 'Riqueza'),
          sessionInput({ path: ['players', idx, 'wealth'], placeholder: '0', label: `Jugador ${idx + 1}, riqueza`,  autocapitalize: 'none' }),
        ),
        el('label', { class: 'sessionf__res' },
          el('span', { class: 'sessionf__label' }, 'EXP'),
          sessionInput({ path: ['players', idx, 'exp'],    placeholder: '0', label: `Jugador ${idx + 1}, EXP`,      autocapitalize: 'none' }),
        ),
        el('label', { class: 'sessionf__res' },
          el('span', { class: 'sessionf__label' }, 'Magia'),
          sessionInput({ path: ['players', idx, 'magic'],  placeholder: '0', label: `Jugador ${idx + 1}, magia`,    autocapitalize: 'none' }),
        ),
      ),
      sessionTextareaField({
        label: 'Objetos / Secretos',
        path: ['players', idx, 'items'],
        placeholder: 'Una bolsa de monedas, una llave oxidada…',
        rows: 3,
      }),
    ),
  );
  return block;
};

const renderSessionForm = () => {
  const form = el('form', { class: 'sessionf', onsubmit: (e) => e.preventDefault() });

  form.append(
    el('div', { class: 'sessionf__group' },
      el('div', { class: 'sessionf__group-title' }, 'Estado compartido'),
      sessionField({ label: 'Fichas de Tiempo / Misión', path: ['timeTokens'], placeholder: '0', autocapitalize: 'none' }),
      el('div', { class: 'sessionf__pair' },
        sessionField({ label: 'Compañero',  path: ['companion', 'name'],     placeholder: 'Nombre', autocapitalize: 'words' }),
        sessionField({ label: 'Localiz.',   path: ['companion', 'location'], placeholder: 'Lugar',  autocapitalize: 'words' }),
      ),
      el('div', { class: 'sessionf__pair' },
        sessionField({ label: 'Guardianes', path: ['guardians', 'name'],     placeholder: 'Nombre', autocapitalize: 'words' }),
        sessionField({ label: 'Localiz.',   path: ['guardians', 'location'], placeholder: 'Lugar',  autocapitalize: 'words' }),
      ),
      sessionField({ label: 'Roca Guía — localización',          path: ['guideStone',    'location'], placeholder: 'Lugar', autocapitalize: 'words' }),
      sessionField({ label: 'Rey de la Perdición — localización', path: ['perditionKing', 'location'], placeholder: 'Lugar', autocapitalize: 'words' }),
      sessionTextareaField({
        label: 'Notas',
        path: ['notes'],
        placeholder: 'Apuntes para la próxima sesión…',
        rows: 4,
      }),
    ),
    el('div', { class: 'sessionf__players' },
      el('div', { class: 'sessionf__group-title' }, 'Jugadores'),
      ...Array.from({ length: 4 }, (_, i) => renderPlayerBlock(i)),
    ),
  );

  return form;
};

const renderDrawerLog = () => {
  const doc = store.state.doc;
  const past = store.history.past || [];
  if (past.length === 0) {
    return el('p', { class: 'hush' }, 'Nada se ha escrito todavía.');
  }
  const list = el('ul', { class: 'drawer__log' });
  for (let i = past.length - 1; i >= 0; i--) {
    const cmd = past[i];
    list.append(
      el('li', { class: 'drawer__log-entry' },
        el('span', { class: 'drawer__log-time' }, formatLogTime(cmd.t)),
        el('span', { class: 'drawer__log-text' }, formatLogEntry(cmd, doc)),
      ),
    );
  }
  return list;
};

const renderDrawerBody = () => {
  let content;
  if (drawerMode === 'log')          content = renderDrawerLog();
  else if (drawerMode === 'session') content = renderSessionForm();
  else                               content = renderDrawerMenu();
  drawerBody.replaceChildren(content);
};

drawerKnob.addEventListener('click', toggleDrawer);
drawerClose.addEventListener('click', closeDrawer);
drawerBackdrop.addEventListener('click', closeDrawer);
drawerBack.addEventListener('click', () => setDrawerMode('menu'));
window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && drawerOpen) {
    e.preventDefault();
    closeDrawer();
  }
});

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
  // Only the log view needs to track live state — the menu is static, and
  // the session form is uncontrolled (rebuilding it would steal focus and
  // wipe in-progress typing).
  if (drawerOpen && drawerMode === 'log') renderDrawerBody();
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
  askSwVersion();
};

start();
