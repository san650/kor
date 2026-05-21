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
   Icon library — inline SVG instead of unicode glyphs.
   iOS Safari rewrites many decorative codepoints (⚜, ⚔, ✦, ❦, ⚑…) as colour
   emoji, which clashes with the parchment aesthetic. Each icon scales to its
   parent font-size via width/height="1em" and inherits colour via currentColor.
   The SVG sources below are trusted constants in this file (no user input).
   ------------------------------------------------------------------------- */

const ICON_SVG = {
  compass: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 3.5 L13.2 12 L12 20.5 L10.8 12 Z" fill="currentColor" stroke="none"/><path d="M3.5 12 L12 13.2 L20.5 12 L12 10.8 Z" fill="currentColor" stroke="none" opacity=".55"/><circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none"/></svg>`,
  book: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 5.5 C6 4.8 9 4.4 12 4.7 C15 4.4 18 4.8 20 5.5 V19.2 C18 18.4 15 18 12 18.4 C9 18 6 18.4 4 19.2 Z"/><path d="M12 4.7 V18.4"/><path d="M7 9 H10 M7 12 H10 M14 9 H17 M14 12 H17"/></svg>`,
  swords: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 4 L13 13 M14.5 14.5 L17 17 M15 20 H20 V15 M19 16 L16.2 18.8"/><path d="M20 4 L11 13 M9.5 14.5 L7 17 M9 20 H4 V15 M5 16 L7.8 18.8"/></svg>`,
  quatrefoil: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 4 C14 4 15.2 5.6 15.2 7.5 C17 7.5 19 8.8 19 11 C19 13.2 17 14.5 15.2 14.5 C15.2 16.4 14 18 12 18 C10 18 8.8 16.4 8.8 14.5 C7 14.5 5 13.2 5 11 C5 8.8 7 7.5 8.8 7.5 C8.8 5.6 10 4 12 4 Z"/><circle cx="12" cy="11" r="1.4" fill="currentColor" stroke="none"/></svg>`,
  sunRising: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="14" r="3.5"/><path d="M3 18 H21"/><path d="M12 6 V8 M5.5 10 L6.7 11.2 M18.5 10 L17.3 11.2 M3.5 14 H5 M19 14 H20.5"/><path d="M11 3.5 L12 2 L13 3.5"/></svg>`,
  sun: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 3 V5.5 M12 18.5 V21 M3 12 H5.5 M18.5 12 H21 M5.5 5.5 L7.2 7.2 M16.8 16.8 L18.5 18.5 M5.5 18.5 L7.2 16.8 M16.8 7.2 L18.5 5.5"/></svg>`,
  sunSetting: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="14" r="3.5"/><path d="M3 18 H21"/><path d="M12 6 V8 M5.5 10 L6.7 11.2 M18.5 10 L17.3 11.2 M3.5 14 H5 M19 14 H20.5"/><path d="M11 21 L12 22.5 L13 21"/></svg>`,
  moon: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M17 4.5 A8 8 0 1 0 19 16.5 A6.5 6.5 0 1 1 17 4.5 Z"/><circle cx="6.5" cy="6" r=".6" fill="currentColor" stroke="none"/><circle cx="4" cy="13" r=".5" fill="currentColor" stroke="none"/><circle cx="9" cy="3.5" r=".4" fill="currentColor" stroke="none"/></svg>`,
  circle: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 18 18" width="1em" height="1em" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><circle cx="9" cy="9" r="3"/></svg>`,
  star: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 18 18" width="1em" height="1em" fill="currentColor" aria-hidden="true"><path d="M9 1.5 L10.4 7.6 L16.5 9 L10.4 10.4 L9 16.5 L7.6 10.4 L1.5 9 L7.6 7.6 Z"/></svg>`,
  cross: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 18 18" width="1em" height="1em" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path d="M5 5 L13 13 M13 5 L5 13"/></svg>`,
  check: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 18 18" width="1em" height="1em" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3.5 9.5 L7 13 L14.5 5"/></svg>`,
  chevronLeft: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 6 L9 12 L15 18"/></svg>`,
  chevronRight: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 6 L15 12 L9 18"/></svg>`,
  scroll: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 4 H17 A2 2 0 0 1 19 6 V18 A2 2 0 0 1 17 20 H6"/><path d="M6 4 A2 2 0 0 0 4 6 A2 2 0 0 0 6 8 H9"/><path d="M17 20 A2 2 0 0 0 19 18"/><path d="M9 11 H15 M9 14 H13"/></svg>`,
  banner: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 4 V21"/><path d="M6 5 H18 L15 9 L18 13 H6"/></svg>`,
  refresh: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 13 A8 8 0 1 1 18.4 7.5"/><path d="M20 4 V8 H16"/></svg>`,
  plus: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" aria-hidden="true"><path d="M12 5 V19 M5 12 H19"/></svg>`,
  download: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 4 V15"/><path d="M7 10 L12 15 L17 10"/><path d="M5 19 H19"/></svg>`,
  upload: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 16 V5"/><path d="M7 10 L12 5 L17 10"/><path d="M5 19 H19"/></svg>`,
  undo: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 5 L3 10 L8 15"/><path d="M3 10 H13 a6 6 0 0 1 0 12 H10"/></svg>`,
  redo: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M16 5 L21 10 L16 15"/><path d="M21 10 H11 a6 6 0 0 0 0 12 H14"/></svg>`,
};

const ICON_CACHE = {};
const ICON_PARSER = new DOMParser();
// Parse trusted in-file SVG strings into real SVGSVGElement nodes. DOMParser
// runs in a sandbox (no script execution), and these source strings are
// hard-coded constants — no user input is ever fed into it.
const icon = (name) => {
  if (!ICON_CACHE[name]) {
    const parsed = ICON_PARSER.parseFromString(ICON_SVG[name], 'image/svg+xml');
    ICON_CACHE[name] = parsed.documentElement;
  }
  return ICON_CACHE[name].cloneNode(true);
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

const askConfirm = ({ title, body, confirmLabel = 'Tachar', cancelLabel = 'Conservar' }) =>
  new Promise((resolve) => {
    confirmResolver = resolve;
    confirmTitle.textContent = title;
    confirmBody.textContent  = body || '';
    confirmDialog.querySelector('[data-confirm-accept]').textContent = confirmLabel;
    const cancelBtn = confirmDialog.querySelector('[data-confirm-cancel]');
    // Pass `cancelLabel: null` to hide the secondary button (e.g. for error
    // dialogs that only need an "OK"-style dismiss).
    if (cancelLabel == null || cancelLabel === '') {
      cancelBtn.hidden = true;
    } else {
      cancelBtn.hidden = false;
      cancelBtn.textContent = cancelLabel;
    }
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
  { key: 'dawn',  iconName: 'sunRising',  label: 'Alba'     },
  { key: 'noon',  iconName: 'sun',        label: 'Mediodía' },
  { key: 'dusk',  iconName: 'sunSetting', label: 'Ocaso'    },
  { key: 'night', iconName: 'moon',       label: 'Noche'    },
];

const MENHIR_STATES = ['dormant', 'lit', 'extinguished'];
const MENHIR_ICONS  = { dormant: 'circle', lit: 'star', extinguished: 'cross' };
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
      el('span', { class: 'timetrack__glyph' }, icon(seg.iconName)),
      seg.label,
    ));
  }
  scene.append(track);

  scene.append(
    el('h3', { class: 'scene__title' }, 'Transcurso del tiempo'),
    el('p',  { class: 'scene__sub'   }, 'marca el paso del capítulo'),
    renderTimeTrackers(doc),
    el('hr', { class: 'divider' }),
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
          }, icon(MENHIR_ICONS[m.state])),
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
          }, icon('cross')),
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
      }, icon('plus'), ' Inscribir piedra'),
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
          }, it.done ? icon('check') : null),
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
          }, icon('cross')),
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
      }, icon('plus'), ' ' + addLabel),
    ),
  );
  return node;
};

/* -------------------------------------------------------------------------
   Transcurso del tiempo — 10 trackers (uno por capítulo)
   ------------------------------------------------------------------------- */

const ROMAN_NUMERALS = ['I', 'II', 'III', 'IV', 'V', 'VI'];
const TIME_WHEEL_SEGMENTS = 6;
const TIME_WHEEL_DEG = 360 / TIME_WHEEL_SEGMENTS; // 60° per wedge

const renderTimeTracker = (chapter, count, opts = {}) => {
  const r = 40;
  const wedgePaths = svgEl('g', { class: 'time-tracker__wedges' });
  const labels     = svgEl('g', { class: 'time-tracker__labels' });

  for (let i = 0; i < TIME_WHEEL_SEGMENTS; i++) {
    const startA = (i * TIME_WHEEL_DEG) * Math.PI / 180;
    const endA   = ((i + 1) * TIME_WHEEL_DEG) * Math.PI / 180;
    const x1 = (50 + r * Math.sin(startA)).toFixed(2);
    const y1 = (50 - r * Math.cos(startA)).toFixed(2);
    const x2 = (50 + r * Math.sin(endA)).toFixed(2);
    const y2 = (50 - r * Math.cos(endA)).toFixed(2);
    const isFilled = i < count;
    wedgePaths.append(svgEl('path', {
      d: `M 50 50 L ${x1} ${y1} A ${r} ${r} 0 0 1 ${x2} ${y2} Z`,
      fill: isFilled ? 'var(--ink)' : 'var(--vellum-hi)',
      stroke: 'var(--ink-soft)',
      'stroke-width': '0.6',
    }));

    const midA = ((i + 0.5) * TIME_WHEEL_DEG) * Math.PI / 180;
    const labelR = 30;
    const lx = (50 + labelR * Math.sin(midA)).toFixed(2);
    const ly = (50 - labelR * Math.cos(midA)).toFixed(2);
    labels.append(svgEl('text', {
      x: lx,
      y: ly,
      'text-anchor': 'middle',
      'dominant-baseline': 'central',
      'font-family': 'IM Fell English Local, Georgia, serif',
      'font-size': '11',
      fill: isFilled ? 'var(--vellum-hi)' : 'var(--ink-soft)',
    }, ROMAN_NUMERALS[i]));
  }

  const svg = svgEl('svg', {
    class: 'time-tracker__circle',
    viewBox: '0 0 100 100',
    'aria-hidden': 'true',
  }, wedgePaths, labels);

  const full = count >= TIME_WHEEL_SEGMENTS;
  return el('button', {
    type: 'button',
    class: opts.focus ? 'time-tracker time-tracker--focus' : 'time-tracker',
    dataset: { full: full ? 'true' : 'false' },
    'aria-label': `Transcurso del tiempo, Capítulo ${chapter + 1}, ${count} de ${TIME_WHEEL_SEGMENTS}`,
    onclick: () => {
      if (count >= TIME_WHEEL_SEGMENTS) return;
      store.dispatch(makeCommand('SET_CHAPTER_TIME', {
        chapter, from: count, to: count + 1,
      }));
    },
  },
    svg,
    el('div', { class: 'time-tracker__caption' },
      el('span', { class: 'time-tracker__title' }, `Capítulo ${chapter + 1}`),
      el('span', { class: 'time-tracker__count' }, `${count}/${TIME_WHEEL_SEGMENTS}`),
    ),
  );
};

// Custom listbox-style dropdown. We render a button + menu and toggle a
// data-open flag on the wrapper; CSS handles the visual transition and the
// document-level handlers below close on outside-tap / Escape.
const openChapterDropdown = (dropdown) => {
  document.querySelectorAll('.chapter-dropdown[data-open="true"]').forEach(closeChapterDropdown);
  dropdown.dataset.open = 'true';
  dropdown.querySelector('.chapter-dropdown__trigger')?.setAttribute('aria-expanded', 'true');
};
const closeChapterDropdown = (dropdown) => {
  dropdown.dataset.open = 'false';
  dropdown.querySelector('.chapter-dropdown__trigger')?.setAttribute('aria-expanded', 'false');
};

document.addEventListener('click', (e) => {
  const open = document.querySelector('.chapter-dropdown[data-open="true"]');
  if (open && !open.contains(e.target)) closeChapterDropdown(open);
});
document.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape') return;
  const open = document.querySelector('.chapter-dropdown[data-open="true"]');
  if (open) {
    e.preventDefault();
    closeChapterDropdown(open);
  }
});

const renderChapterDropdown = (selected) => {
  const dropdown = el('div', {
    class: 'chapter-dropdown',
    dataset: { open: 'false' },
  });

  const trigger = el('button', {
    type: 'button',
    class: 'chapter-dropdown__trigger',
    'aria-haspopup': 'listbox',
    'aria-expanded': 'false',
    'aria-label': 'Capítulo activo',
    onclick: (e) => {
      e.stopPropagation();
      if (dropdown.dataset.open === 'true') closeChapterDropdown(dropdown);
      else openChapterDropdown(dropdown);
    },
  },
    el('span', { class: 'chapter-dropdown__label' }, `Capítulo ${selected + 1}`),
    el('span', { class: 'chapter-dropdown__chevron' }, icon('chevronRight')),
  );

  const menu = el('ul', {
    class: 'chapter-dropdown__menu',
    role: 'listbox',
    'aria-label': 'Elegir capítulo',
  });
  for (let i = 0; i < 10; i++) {
    const isSelected = i === selected;
    menu.append(
      el('li', {
        class: 'chapter-dropdown__option',
        role: 'option',
        'aria-selected': isSelected ? 'true' : 'false',
        onclick: () => {
          if (i === selected) {
            closeChapterDropdown(dropdown);
            return;
          }
          // The render that follows will replace this dropdown DOM with a
          // fresh one in the closed state, so no explicit close needed.
          store.dispatch(makeCommand('SET_SELECTED_CHAPTER', {
            from: selected, to: i,
          }));
        },
      },
        el('span', { class: 'chapter-dropdown__option-label' }, `Capítulo ${i + 1}`),
        isSelected ? el('span', { class: 'chapter-dropdown__check' }, icon('check')) : null,
      ),
    );
  }

  dropdown.append(trigger, menu);
  return dropdown;
};

const renderTimeTrackers = (doc) => {
  const counts = Array.isArray(doc.chapterTime) ? doc.chapterTime : [];
  const selected = Math.max(0, Math.min(9, doc.selectedChapter ?? 0));

  const mobile = el('div', { class: 'time-trackers__mobile' },
    renderChapterDropdown(selected),
    renderTimeTracker(selected, counts[selected] || 0, { focus: true }),
  );

  const grid = el('div', { class: 'time-trackers' });
  for (let i = 0; i < 10; i++) grid.append(renderTimeTracker(i, counts[i] || 0));

  return el('div', { class: 'time-trackers__section' }, mobile, grid);
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
          }, q.done ? icon('check') : null),
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
          }, icon('cross')),
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
      }, icon('plus'), ' Iniciar misión'),
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
    addLabel: 'Añadir misión secundaria',
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
    addLabel: 'Inscribir personaje',
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
    addLabel: 'Anotar lugar',
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
          }, icon('cross')),
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
      }, icon('plus'), ' Anotar'),
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
      }, icon('plus'), ' Revelar secreto'),
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
          }, icon('cross')),
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
      }, icon('plus'), ' Alzar estandarte'),
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

// The deployed shell's version lives in sw.js as the source of truth. We
// query the active SW (and listen for its broadcast on activate) and reflect
// whatever it tells us. The drawer title stays blank until the SW responds —
// which is the correct signal that the SW is missing or stale.
let swVersion = '';

const setSwVersion = (value) => {
  if (!value) return;

  drawerVersion.textContent = value;
};

const askSwVersion = () => {
  if (!('serviceWorker' in navigator)) return;
  navigator.serviceWorker.ready.then((reg) => {
    const target = navigator.serviceWorker.controller || reg.active;
    target?.postMessage({ type: 'GET_CACHE_VERSION' });
  }).catch(() => {});
};

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.addEventListener('message', (e) => {
    if (e.data?.type === 'CACHE_VERSION') setSwVersion(e.data.value);
  });
  navigator.serviceWorker.addEventListener('controllerchange', askSwVersion);
}

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
    case 'SET_CHAPTER_TIME':
      return `Transcurso del tiempo — Capítulo ${p.chapter + 1}: ${p.from} → ${p.to}`;
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
  // Habilidades del personaje
  agresividad: 'agresividad',
  audacia: 'audacia',
  logica: 'lógica',
  empatia: 'empatía',
  cautela: 'cautela',
  espiritualidad: 'espiritualidad',
  // Vitalidad
  energia: 'energía',
  salud: 'salud',
  terror: 'terror',
  // Recursos
  food: 'comida',
  wealth: 'riqueza',
  magic: 'magia',
  exp: 'experiencia',
  items: 'objetos / secretos',
};

const describeSessionPath = (path) => {
  if (!Array.isArray(path) || path.length === 0) return '';
  if (path[0] === 'players') {
    const idx = path[1];
    const sub = path[2];
    const who = CHARACTER_NAMES[idx] || `Jugador ${idx + 1}`;
    // Legacy `skills` (positional 6-slot array) — keep readable for any
    // existing saved logs.
    if (sub === 'skills') return `${who} — habilidad ${path[3] + 1}`;
    return `${who} — ${SESSION_LABELS[sub] || sub}`;
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

// Export the entire doc as a JSON file. Tries the Web Share API first
// (iOS PWA / share-sheet target), falls back to <a download> on desktop.
// Both calls MUST be synchronous inside the originating tap handler — iOS
// drops the activation token after the first await.
const exportDoc = () => {
  const payload = {
    app: 'kor-companion',
    version: swVersion || 'unknown',
    exportedAt: new Date().toISOString(),
    doc: store.state.doc,
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const stamp = new Date().toISOString().slice(0, 10);
  const filename = `kor-tomo-${stamp}.json`;
  try {
    const file = new File([blob], filename, { type: 'application/json' });
    if (navigator.canShare?.({ files: [file] })) {
      navigator.share({ files: [file], title: filename }).catch(() => {});
      return;
    }
  } catch {}
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

// Open a file picker, parse the chosen JSON, ask the user to confirm
// replacing the current doc, then load it. The <input> is created and
// `.click()`-ed synchronously inside the gesture so iOS opens the picker
// (no awaits, no setTimeouts, no modals first).
const importDocFromFile = () => {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'application/json,.json';
  input.style.position = 'fixed';
  input.style.left = '-9999px';
  input.style.opacity = '0';
  document.body.appendChild(input);
  input.addEventListener('change', async () => {
    const file = input.files?.[0];
    input.remove();
    if (!file) return;
    let payload;
    try {
      const text = await file.text();
      payload = JSON.parse(text);
    } catch {
      await askConfirm({
        title: 'No se pudo leer',
        body: 'El archivo no es JSON válido.',
        confirmLabel: 'Cerrar',
        cancelLabel: null,
      });
      return;
    }
    const doc = (payload && typeof payload === 'object') ? (payload.doc || payload) : null;
    if (!doc || typeof doc !== 'object' || Array.isArray(doc)) {
      await askConfirm({
        title: 'Archivo no válido',
        body: 'No se reconoce el formato del tomo.',
        confirmLabel: 'Cerrar',
        cancelLabel: null,
      });
      return;
    }
    const ok = await askConfirm({
      title: '¿Reemplazar el tomo?',
      body: `Todo el contenido actual se perderá y se cargará «${file.name}».`,
      confirmLabel: 'Cargar tomo',
    });
    if (!ok) return;
    store.importDoc(doc);
    closeDrawer();
  });
  input.click();
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
        el('span', { class: 'drawer__item-glyph' }, icon('banner')),
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
        el('span', { class: 'drawer__item-glyph' }, icon('scroll')),
        el('span', { class: 'drawer__item-body' },
          el('span', { class: 'drawer__item-title' }, 'Crónica de acciones'),
          el('span', { class: 'drawer__item-sub' }, 'lo escrito en el tomo'),
        ),
      ),
    ),
    el('li', {},
      el('button', {
        type: 'button',
        class: 'drawer__item',
        // Must call exportDoc() synchronously in the handler so iOS keeps
        // the user-gesture token for navigator.share / <a download>.
        onclick: () => exportDoc(),
      },
        el('span', { class: 'drawer__item-glyph' }, icon('download')),
        el('span', { class: 'drawer__item-body' },
          el('span', { class: 'drawer__item-title' }, 'Guardar copia del tomo'),
          el('span', { class: 'drawer__item-sub' }, 'descargar como JSON'),
        ),
      ),
    ),
    el('li', {},
      el('button', {
        type: 'button',
        class: 'drawer__item',
        // Same constraint — open the file picker synchronously in the tap.
        onclick: () => importDocFromFile(),
      },
        el('span', { class: 'drawer__item-glyph' }, icon('upload')),
        el('span', { class: 'drawer__item-body' },
          el('span', { class: 'drawer__item-title' }, 'Cargar tomo'),
          el('span', { class: 'drawer__item-sub' }, 'restaurar desde un archivo JSON'),
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
        el('span', { class: 'drawer__item-glyph' }, icon('refresh')),
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

const sessionInput = ({ path, placeholder = '', label, autocapitalize = 'sentences', inputmode }) => {
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
    inputmode: inputmode || undefined,
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

// The four canonical heroes of Reyes de la Perdición. Order matches the
// `players` array index, so persisted data carries over without migration.
const CHARACTER_NAMES = ['Elgan', 'Gerdwyn', 'Iunis', 'Osbert'];

const renderPlayerBlock = (idx) => {
  const characterName = CHARACTER_NAMES[idx];
  const summary = el('summary', { class: 'sessionf__summary' },
    el('span', { class: 'sessionf__summary-mark' }, icon('chevronRight')),
    el('span', {}, characterName),
  );
  const block = el('details', { class: 'sessionf__player' }, summary);

  const numField = (key, label) =>
    el('label', { class: 'sessionf__stat' },
      el('span', { class: 'sessionf__label' }, label),
      sessionInput({
        path: ['players', idx, key],
        placeholder: '0',
        label: `${characterName}, ${label}`,
        autocapitalize: 'none',
        inputmode: 'numeric',
      }),
    );

  block.append(
    el('div', { class: 'sessionf__player-body' },
      sessionField({
        label: 'Localización',
        path: ['players', idx, 'location'],
        placeholder: 'Cuagh Eithne',
        autocapitalize: 'words',
      }),
      el('div', { class: 'sessionf__group-title' }, 'Habilidades'),
      el('div', { class: 'sessionf__stats sessionf__stats--3' },
        numField('agresividad',    'Agresividad'),
        numField('audacia',        'Audacia'),
        numField('logica',         'Lógica'),
        numField('empatia',        'Empatía'),
        numField('cautela',        'Cautela'),
        numField('espiritualidad', 'Espiritualidad'),
      ),
      el('div', { class: 'sessionf__group-title' }, 'Vitalidad'),
      el('div', { class: 'sessionf__stats sessionf__stats--3' },
        numField('energia', 'Energía'),
        numField('salud',   'Salud'),
        numField('terror',  'Terror'),
      ),
      el('div', { class: 'sessionf__group-title' }, 'Recursos'),
      el('div', { class: 'sessionf__stats sessionf__stats--4' },
        numField('food',   'Comida'),
        numField('wealth', 'Riqueza'),
        numField('magic',  'Magia'),
        numField('exp',    'Experiencia'),
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

/* -------------------------------------------------------------------------
   Toasts — efímera notificación de deshacer / rehacer
   ------------------------------------------------------------------------- */

const toastRegion = (() => {
  const region = el('div', { id: 'toast-region', 'aria-live': 'polite' });
  document.body.append(region);
  return region;
})();

let toastSeq = 0;
const showToast = (kind, message) => {
  const id = ++toastSeq;
  const toast = el('div', {
    class: `toast toast--${kind}`,
    dataset: { id: String(id) },
  },
    el('span', { class: 'toast__icon' }, icon(kind === 'redo' ? 'redo' : 'undo')),
    el('span', { class: 'toast__body' },
      el('span', { class: 'toast__kind' }, kind === 'redo' ? 'Rehecho' : 'Deshecho'),
      el('span', { class: 'toast__msg' }, message),
    ),
  );
  toastRegion.append(toast);
  // Two RAFs so the browser commits the initial hidden state before we flip
  // the transition flag.
  requestAnimationFrame(() => requestAnimationFrame(() => {
    toast.dataset.visible = 'true';
  }));
  setTimeout(() => {
    toast.dataset.visible = 'false';
    setTimeout(() => toast.remove(), 320);
  }, 2400);
};

const undoWithToast = () => {
  // Read the action *before* state changes so log lookups still resolve names.
  const cmd = store.history.past[store.history.past.length - 1];
  if (!cmd) return;
  store.undo();
  showToast('undo', formatLogEntry(cmd, store.state.doc));
};

const redoWithToast = () => {
  const cmd = store.history.future[store.history.future.length - 1];
  if (!cmd) return;
  store.redo();
  showToast('redo', formatLogEntry(cmd, store.state.doc));
};

undoBtn.addEventListener('click', undoWithToast);
redoBtn.addEventListener('click', redoWithToast);

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
    if (e.shiftKey) redoWithToast(); else undoWithToast();
  } else if (e.key === 'y' || e.key === 'Y') {
    if (isEditableTarget(e)) return;
    e.preventDefault();
    redoWithToast();
  }
});

const start = async () => {
  await store.ready;
  store.subscribe(render);
  render();
  askSwVersion();
};

start();
