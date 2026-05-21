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

const askPrompt = ({ title, label, body, value = '', placeholder = '', inputmode = '' }) =>
  new Promise((resolve) => {
    promptResolver = resolve;
    promptTitle.textContent = title;
    promptLabel.textContent = label;
    promptInput.value = value;
    promptInput.placeholder = placeholder;
    promptInput.inputMode = inputmode || '';
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

const editDialog     = $('edit-dialog');
const editTitle      = $('edit-title');
const editLabelText  = $('edit-label-text');
const editInputText  = $('edit-input-text');
const editFieldLoc   = $('edit-field-loc');
const editInputLoc   = $('edit-input-loc');
const editForm       = editDialog.querySelector('form');
const editCancel     = editDialog.querySelector('[data-edit-cancel]');

let editResolver = null;
const settleEdit = (value) => {
  if (editResolver) { editResolver(value); editResolver = null; }
  if (editDialog.open) editDialog.close();
};
editForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const text = editInputText.value.trim();
  if (!text) { editInputText.focus(); return; }
  const location = editFieldLoc.hidden ? null : editInputLoc.value.trim();
  settleEdit({ text, location });
});
editCancel.addEventListener('click', () => settleEdit(null));
editDialog.addEventListener('close', () => { if (editResolver) settleEdit(null); });
editDialog.onclick = (e) => { if (e.target === editDialog) settleEdit(null); };

// askEditItem opens a modal with a description field and an optional
// location field. Resolves with `{text, location}` (location may be null
// when hasLocation is false) or `null` on cancel.
const askEditItem = ({
  title,
  textLabel = 'Descripción',
  textValue = '',
  textPlaceholder = '',
  textAutocapitalize = 'sentences',
  hasLocation = false,
  locationValue = '',
}) => new Promise((resolve) => {
  editResolver = resolve;
  editTitle.textContent = title;
  editLabelText.textContent = textLabel;
  editInputText.value = textValue;
  editInputText.placeholder = textPlaceholder;
  editInputText.setAttribute('autocapitalize', textAutocapitalize);
  if (hasLocation) {
    editFieldLoc.hidden = false;
    editInputLoc.value = locationValue;
  } else {
    editFieldLoc.hidden = true;
    editInputLoc.value = '';
  }
  editDialog.showModal();
  requestAnimationFrame(() => {
    editInputText.focus();
    editInputText.select?.();
  });
});

const heroPickerDialog = $('hero-picker-dialog');
const heroPickerList   = $('hero-picker-list');
const heroPickerCancel = heroPickerDialog.querySelector('[data-hero-picker-cancel]');

let heroPickerResolver = null;
const settleHeroPicker = (value) => {
  if (heroPickerResolver) { heroPickerResolver(value); heroPickerResolver = null; }
  if (heroPickerDialog.open) heroPickerDialog.close();
};
heroPickerCancel.addEventListener('click', () => settleHeroPicker(null));
heroPickerDialog.addEventListener('close', () => { if (heroPickerResolver) settleHeroPicker(null); });
heroPickerDialog.onclick = (e) => { if (e.target === heroPickerDialog) settleHeroPicker(null); };

// askHeroPicker takes the indices of heroes the player can still add and
// resolves with the chosen index — or null on cancel/dismiss. Buttons are
// rebuilt every call so the list always reflects the current availability.
const askHeroPicker = (availableIndices) => new Promise((resolve) => {
  heroPickerResolver = resolve;
  heroPickerList.replaceChildren();
  for (const idx of availableIndices) {
    const name = CHARACTER_NAMES[idx];
    heroPickerList.append(
      el('li', {},
        el('button', {
          type: 'button',
          class: 'hero-picker__btn',
          onclick: () => settleHeroPicker(idx),
        },
          sigilNode(idx),
          el('span', { class: 'hero-picker__name' }, name),
        ),
      ),
    );
  }
  heroPickerDialog.showModal();
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

/* -------------------------------------------------------------------------
   Ledger sections — compact heading + optional list. The add action lives
   inside the heading (chip on the right), so an empty section reads as a
   single line with a call-to-action, not a wasted paragraph.
   ------------------------------------------------------------------------- */

const renderLedgerHead = ({ title, addLabel, onAdd }) =>
  el('header', { class: 'ledger__head' },
    el('h3', { class: 'ledger__title' }, title),
    el('span', { class: 'ledger__rule', 'aria-hidden': 'true' }),
    onAdd
      ? el('button', {
          type: 'button',
          class: 'ledger__add',
          onclick: onAdd,
        }, icon('plus'), el('span', { class: 'ledger__add-label' }, addLabel))
      : null,
  );

const renderLedgerSection = ({ title, addLabel, onAdd, body }) => {
  const section = el('section', { class: 'ledger' },
    renderLedgerHead({ title, addLabel, onAdd }),
  );
  if (body) section.append(body);
  return section;
};

const renderChecklistRows = (items, prefix, confirmRemove, editTitle = 'Editar') => {
  if (items.length === 0) return null;
  const list = el('ul', { class: 'ledger__list' });
  items.forEach((it, idx) => {
    list.append(
      el('li', { class: 'ledger__row', dataset: { done: it.done ? 'true' : 'false' } },
        el('button', {
          type: 'button',
          class: 'ledger__check',
          'aria-label': it.done ? 'Marcar como abierta' : 'Marcar como cumplida',
          onclick: () => store.dispatch(makeCommand(`TOGGLE_${prefix}`, {
            id: it.id, from: !!it.done, to: !it.done,
          })),
        }, it.done ? icon('check') : null),
        el('button', {
          type: 'button',
          class: 'ledger__row-body',
          'aria-label': `Editar «${it.title}»`,
          onclick: async () => {
            const result = await askEditItem({
              title: editTitle,
              textLabel: 'Descripción',
              textValue: it.title || '',
              hasLocation: true,
              locationValue: it.location || '',
            });
            if (!result) return;
            const to = { ...it, title: result.text, location: result.location || '' };
            if (to.title === it.title && to.location === (it.location || '')) return;
            store.dispatch(makeCommand(`UPDATE_${prefix}`, { id: it.id, from: it, to }));
          },
        },
          it.location ? el('span', { class: 'ledger__row-loc' }, it.location) : null,
          el('span', { class: 'ledger__row-title' }, it.title),
        ),
        el('button', {
          type: 'button',
          class: 'ledger__row-del',
          'aria-label': `Borrar ${it.title}`,
          onclick: async () => {
            const ok = await confirmRemove(it);
            if (!ok) return;
            store.dispatch(makeCommand(`REMOVE_${prefix}`, { from: it, index: idx }));
          },
        }, icon('cross')),
      )
    );
  });
  return list;
};

const renderNoteRows = (notes) => {
  if (notes.length === 0) return null;
  const list = el('ul', { class: 'ledger__list ledger__list--notes' });
  notes.forEach((n, idx) => {
    list.append(
      el('li', { class: 'ledger__note' },
        el('button', {
          type: 'button',
          class: 'ledger__note-text',
          'aria-label': 'Editar nota',
          onclick: async () => {
            const result = await askEditItem({
              title: 'Editar nota',
              textLabel: '¿Qué se quiere recordar?',
              textValue: n.text || '',
            });
            if (!result) return;
            const to = { ...n, text: result.text };
            if (to.text === (n.text || '')) return;
            store.dispatch(makeCommand('UPDATE_NOTE', { id: n.id, from: n, to }));
          },
        }, n.text),
        el('button', {
          type: 'button',
          class: 'ledger__row-del',
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
  return list;
};

const renderQuestRows = (quests) => {
  if (quests.length === 0) return null;
  const list = el('ul', { class: 'ledger__list' });
  quests.forEach((q, idx) => {
    list.append(
      el('li', { class: 'ledger__row', dataset: { done: q.done ? 'true' : 'false' } },
        el('button', {
          type: 'button',
          class: 'ledger__check',
          'aria-label': q.done ? 'Marcar como abierta' : 'Marcar como cumplida',
          onclick: () => store.dispatch(makeCommand('TOGGLE_QUEST', {
            id: q.id, from: !!q.done, to: !q.done,
          })),
        }, q.done ? icon('check') : null),
        el('button', {
          type: 'button',
          class: 'ledger__row-body',
          'aria-label': `Editar «${q.title}»`,
          onclick: async () => {
            const result = await askEditItem({
              title: 'Editar misión',
              textLabel: '¿Qué se emprende?',
              textValue: q.title || '',
              hasLocation: true,
              locationValue: q.location || '',
            });
            if (!result) return;
            const to = { ...q, title: result.text, location: result.location || '' };
            if (to.title === q.title && to.location === (q.location || '')) return;
            store.dispatch(makeCommand('UPDATE_QUEST', { id: q.id, from: q, to }));
          },
        },
          q.location ? el('span', { class: 'ledger__row-loc' }, q.location) : null,
          el('span', { class: 'ledger__row-title' }, q.title),
        ),
        el('button', {
          type: 'button',
          class: 'ledger__row-del',
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
  return list;
};

// Shared state row — text on the left, optional location plaque, delete chip.
// Used by the four text+location sections (Fichas, Partners, Rey, Guardianes).
const renderTextLocRows = (items, prefix, confirmRemove, editTitle = 'Editar') => {
  if (items.length === 0) return null;
  const list = el('ul', { class: 'ledger__list' });
  items.forEach((it, idx) => {
    list.append(
      el('li', { class: 'ledger__row ledger__row--text' },
        el('button', {
          type: 'button',
          class: 'ledger__row-body',
          'aria-label': it.text ? `Editar «${it.text}»` : 'Editar',
          onclick: async () => {
            const result = await askEditItem({
              title: editTitle,
              textLabel: 'Descripción',
              textValue: it.text || '',
              hasLocation: true,
              locationValue: it.location || '',
            });
            if (!result) return;
            const to = { ...it, text: result.text, location: result.location || '' };
            if (to.text === (it.text || '') && to.location === (it.location || '')) return;
            store.dispatch(makeCommand(`UPDATE_${prefix}`, { id: it.id, from: it, to }));
          },
        },
          it.location ? el('span', { class: 'ledger__row-loc' }, it.location) : null,
          el('span', { class: 'ledger__row-title' }, it.text || '—'),
        ),
        el('button', {
          type: 'button',
          class: 'ledger__row-del',
          'aria-label': 'Borrar',
          onclick: async () => {
            const ok = await confirmRemove(it);
            if (!ok) return;
            store.dispatch(makeCommand(`REMOVE_${prefix}`, { from: it, index: idx }));
          },
        }, icon('cross')),
      )
    );
  });
  return list;
};

// Roca Guía — one card per stone: 2×2 grid of quadrant locations surrounding
// a circular center holding the stone's own location number. All five fields
// are inline-editable; SET_GUIDE_STONE_FIELD dispatches on blur (onchange).
const MAX_GUIDE_STONES = 4;

const renderGuideStone = (stone, indexInList) => {
  const field = (key, extraClass) => {
    const value = stone[key] || '';
    return el('input', {
      type: 'text',
      class: `guidestone__input${extraClass ? ` ${extraClass}` : ''}`,
      value,
      placeholder: '101',
      'aria-label': key === 'center'
        ? 'Roca Guía — localización central'
        : `Roca Guía — cuadrante ${key.slice(1)}`,
      autocomplete: 'off',
      autocapitalize: 'none',
      spellcheck: 'false',
      inputmode: 'numeric',
      dataset: { guideStoneField: `${stone.id}:${key}` },
      onchange: (e) => {
        const to = e.target.value;
        if (value === to) return;
        store.dispatch(makeCommand('SET_GUIDE_STONE_FIELD', {
          id: stone.id, field: key, from: value, to,
        }));
      },
    });
  };

  return el('article', { class: 'guidestone' },
    el('button', {
      type: 'button',
      class: 'guidestone__remove',
      'aria-label': 'Borrar esta Roca Guía',
      onclick: async () => {
        const ok = await askConfirm({
          title: '¿Borrar esta Roca Guía?',
          body: 'Las localizaciones registradas se perderán.',
          confirmLabel: 'Borrar',
        });
        if (!ok) return;
        store.dispatch(makeCommand('REMOVE_GUIDE_STONE', { from: stone, index: indexInList }));
      },
    }, icon('cross')),
    el('div', { class: 'guidestone__grid' },
      el('div', { class: 'guidestone__quad guidestone__quad--tl' }, field('q1')),
      el('div', { class: 'guidestone__quad guidestone__quad--tr' }, field('q2')),
      el('div', { class: 'guidestone__quad guidestone__quad--bl' }, field('q3')),
      el('div', { class: 'guidestone__quad guidestone__quad--br' }, field('q4')),
      el('div', { class: 'guidestone__center' },
        field('center', 'guidestone__input--center'),
      ),
    ),
  );
};

const renderGuideStonesSection = (stones) => {
  const canAdd = stones.length < MAX_GUIDE_STONES;
  let body = null;
  if (stones.length > 0) {
    body = el('div', { class: 'guidestones' });
    stones.forEach((s, i) => body.append(renderGuideStone(s, i)));
  }
  return renderLedgerSection({
    title: 'Roca Guía',
    addLabel: canAdd ? 'inscribir' : null,
    onAdd: canAdd ? () => {
      const stone = { id: newId(), center: '', q1: '', q2: '', q3: '', q4: '' };
      store.dispatch(makeCommand('ADD_GUIDE_STONE', { to: stone, index: stones.length }));
    } : null,
    body,
  });
};

const renderExploration = (doc) => {
  const scene = el('section', { class: 'scene' });

  scene.append(
    el('h2', { class: 'scene__title' }, 'Andanzas'),
    el('p',  { class: 'scene__sub'   }, 'lo recorrido y lo escrito'),
    flourish(),
  );

  // Transcurso del tiempo — visual top of the page, ledger-headed but no add.
  scene.append(
    renderLedgerHead({ title: 'Transcurso del tiempo' }),
    renderTimeTrackers(doc),
  );

  const quests         = doc.quests         || [];
  const sideQuests     = doc.sideQuests     || [];
  const notes          = doc.notes          || [];
  const timeTokens     = doc.timeTokens     || [];
  const partners       = doc.partners       || [];
  const guardians      = doc.guardians      || [];
  const perditionKings = doc.perditionKings || [];
  const guideStones    = doc.guideStones    || [];

  const askLocation = (title) => askPrompt({
    title,
    label: 'N.º de localización (opcional)',
    placeholder: '101',
    inputmode: 'numeric',
  });

  // --- Shared state ---------------------------------------------------
  // Each of these is a checklist of `{text, location}` items: prompts ask
  // for a description first, then an optional location number. The remove
  // confirm uses the description as the subject when present.
  const sharedSection = ({ title, addLabel, prefix, items, promptTitle, promptLabel, promptPlaceholder, removeTitle, editTitle }) =>
    renderLedgerSection({
      title,
      addLabel,
      onAdd: async () => {
        const text = await askPrompt({
          title: promptTitle,
          label: promptLabel,
          placeholder: promptPlaceholder,
        });
        if (!text) return;
        const location = await askLocation('Marca la localización');
        const it = { id: newId(), text, location: location || '' };
        store.dispatch(makeCommand(`ADD_${prefix}`, { to: it, index: items.length }));
      },
      body: renderTextLocRows(items, prefix, (it) => askConfirm({
        title: removeTitle,
        body: it.text ? `«${it.text}» se perderá.` : 'La entrada se perderá.',
      }), editTitle || `Editar`),
    });

  scene.append(renderLedgerSection({
    title: 'Misión principal',
    addLabel: 'iniciar',
    onAdd: async () => {
      const title = await askPrompt({
        title: 'Nueva misión',
        label: '¿Qué se emprende?',
        placeholder: 'Encontrar al Ermitaño del Tarn',
      });
      if (!title) return;
      const location = await askLocation('Marca la localización');
      const q = { id: newId(), title, location: location || '', done: false };
      store.dispatch(makeCommand('ADD_QUEST', { to: q, index: quests.length }));
    },
    body: renderQuestRows(quests),
  }));

  scene.append(renderLedgerSection({
    title: 'Misiones secundarias',
    addLabel: 'añadir',
    onAdd: async () => {
      const title = await askPrompt({
        title: 'Nueva misión secundaria',
        label: '¿Qué encargo se acepta?',
        placeholder: 'Recuperar la espada perdida',
      });
      if (!title) return;
      const location = await askLocation('Marca la localización');
      const it = { id: newId(), title, location: location || '', done: false };
      store.dispatch(makeCommand('ADD_SIDE_QUEST', { to: it, index: sideQuests.length }));
    },
    body: renderChecklistRows(sideQuests, 'SIDE_QUEST', (it) => askConfirm({
      title: '¿Tachar la misión?',
      body: `«${it.title}» será arrancada del diario.`,
    }), 'Editar misión secundaria'),
  }));

  scene.append(renderLedgerSection({
    title: 'Notas',
    addLabel: 'anotar',
    onAdd: async () => {
      const text = await askPrompt({
        title: 'Nueva nota',
        label: '¿Qué se quiere recordar?',
        placeholder: 'La hoguera ardió tres noches…',
      });
      if (!text) return;
      const n = { id: newId(), text };
      store.dispatch(makeCommand('ADD_NOTE', { to: n, index: notes.length }));
    },
    body: renderNoteRows(notes),
  }));

  scene.append(sharedSection({
    title: 'Partners',
    addLabel: 'añadir',
    prefix: 'PARTNER',
    items: partners,
    promptTitle: 'Nuevo partner',
    promptLabel: 'Nombre o descripción',
    promptPlaceholder: 'Aedric el Bardo',
    removeTitle: '¿Olvidar a este partner?',
    editTitle: 'Editar partner',
  }));

  scene.append(sharedSection({
    title: 'Fichas de Tiempo',
    addLabel: 'añadir',
    prefix: 'TIME_TOKEN',
    items: timeTokens,
    promptTitle: 'Nueva ficha de tiempo',
    promptLabel: 'Descripción',
    promptPlaceholder: 'Cae la noche sobre el valle',
    removeTitle: '¿Tachar la ficha?',
    editTitle: 'Editar ficha de tiempo',
  }));

  scene.append(sharedSection({
    title: 'Rey de la Perdición',
    addLabel: 'añadir',
    prefix: 'PERDITION_KING',
    items: perditionKings,
    promptTitle: 'Rey de la Perdición',
    promptLabel: 'Nombre o descripción',
    promptPlaceholder: 'El Coronado de Espinos',
    removeTitle: '¿Tachar al Rey?',
    editTitle: 'Editar Rey de la Perdición',
  }));

  scene.append(sharedSection({
    title: 'Guardianes',
    addLabel: 'añadir',
    prefix: 'GUARDIAN',
    items: guardians,
    promptTitle: 'Nuevo guardián',
    promptLabel: 'Nombre o descripción',
    promptPlaceholder: 'Los Centinelas de Bran',
    removeTitle: '¿Olvidar al guardián?',
    editTitle: 'Editar guardián',
  }));

  scene.append(renderGuideStonesSection(guideStones));

  return scene;
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

const drawerKnob = $('drawer-knob');

// Drawer + backdrop are mounted on demand. When not open, neither exists in
// the DOM — no risk of a residual element intercepting clicks or scroll. The
// cleanup timer is the single source of truth for unmounting (transitionend
// is unreliable: prefers-reduced-motion disables transitions so it never fires).
let drawerEl = null;
let drawerBackdropEl = null;
let drawerOpen = false;
let drawerMode = 'menu'; // 'menu' | 'log'
let pendingCloseTimer = null;

const DRAWER_TITLES = {
  menu: 'Más opciones',
  log: 'Crónica de acciones',
};

// Slightly longer than the 260ms transform/220ms opacity transitions so the
// fade-out finishes visually before the node leaves the DOM.
const DRAWER_CLOSE_MS = 320;

// The deployed shell's version lives in sw.js as the source of truth. We
// query the active SW (and listen for its broadcast on activate) and reflect
// whatever it tells us. Cached so a fresh drawer mount displays it even if
// the SW reported the version while the drawer was closed.
let swVersion = '';

const setSwVersion = (value) => {
  if (!value) return;
  swVersion = value;
  if (drawerEl) drawerEl._version.textContent = value;
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

const buildBackdrop = () => el('div', {
  class: 'drawer-backdrop',
  onclick: closeDrawer,
});

const buildDrawer = () => {
  const titleText = el('span', { id: 'drawer-title-text' },
    DRAWER_TITLES[drawerMode] || DRAWER_TITLES.menu);
  const version = el('span', {
    id: 'drawer-version',
    class: 'drawer__version',
    'aria-hidden': 'true',
  });
  if (swVersion) version.textContent = swVersion;

  const back = el('button', {
    id: 'drawer-back',
    type: 'button',
    class: 'drawer__back',
    hidden: drawerMode === 'menu',
    'aria-label': 'Volver',
    onclick: () => setDrawerMode('menu'),
  }, icon('chevronLeft'));

  const close = el('button', {
    id: 'drawer-close',
    type: 'button',
    class: 'drawer__close',
    'aria-label': 'Cerrar',
    onclick: closeDrawer,
  }, icon('cross'));

  const body = el('div', { id: 'drawer-body', class: 'drawer__body' });

  const drawer = el('aside', {
    id: 'drawer',
    class: 'drawer',
    role: 'dialog',
    'aria-modal': 'false',
    'aria-labelledby': 'drawer-title',
  },
    el('div', { class: 'drawer__rail', 'aria-hidden': 'true' },
      el('span', { class: 'drawer__rail-handle' }),
    ),
    el('div', { class: 'drawer__head' },
      back,
      el('h2', { id: 'drawer-title', class: 'drawer__title' }, titleText, version),
      close,
    ),
    body,
  );

  // Cache descendant refs so setDrawerMode / setSwVersion / renderDrawerBody
  // don't have to re-query each time.
  drawer._titleText = titleText;
  drawer._version = version;
  drawer._back = back;
  drawer._body = body;
  return drawer;
};

const openDrawer = () => {
  if (drawerOpen) return;
  // If a previous close is still fading out, finish it instantly so we don't
  // briefly have two stacks of drawer/backdrop in the DOM at once.
  if (pendingCloseTimer) {
    clearTimeout(pendingCloseTimer);
    pendingCloseTimer = null;
    document.querySelectorAll('.drawer, .drawer-backdrop').forEach((n) => n.remove());
  }
  drawerOpen = true;
  drawerMode = 'menu';
  drawerKnob.setAttribute('aria-expanded', 'true');

  drawerBackdropEl = buildBackdrop();
  drawerEl = buildDrawer();
  document.body.append(drawerBackdropEl, drawerEl);
  renderDrawerBody();

  // Two RAFs so the browser commits the initial (data-open absent → closed)
  // state before we flip the transition flag.
  requestAnimationFrame(() => requestAnimationFrame(() => {
    if (!drawerEl) return;
    drawerEl.dataset.open = 'true';
    drawerBackdropEl.dataset.open = 'true';
  }));
};

const closeDrawer = () => {
  if (!drawerOpen) return;
  // Flush any pending text-input edit so its `change` event commits to the
  // store before we tear the form down.
  const a = document.activeElement;
  if (a && drawerEl?.contains(a) && (a.tagName === 'INPUT' || a.tagName === 'TEXTAREA')) {
    a.blur();
  }
  drawerOpen = false;
  drawerKnob.setAttribute('aria-expanded', 'false');

  // Snapshot the current pair and detach them from module state immediately,
  // so any concurrent openDrawer() builds a fresh pair instead of mutating
  // these. The originals continue to fade out via CSS until the timer fires.
  const dEl = drawerEl;
  const bdEl = drawerBackdropEl;
  drawerEl = null;
  drawerBackdropEl = null;
  dEl.dataset.open = 'false';
  bdEl.dataset.open = 'false';

  pendingCloseTimer = setTimeout(() => {
    dEl.remove();
    bdEl.remove();
    pendingCloseTimer = null;
  }, DRAWER_CLOSE_MS);
};

const setDrawerMode = (mode) => {
  drawerMode = mode;
  if (!drawerEl) return;
  drawerEl._titleText.textContent = DRAWER_TITLES[mode] || DRAWER_TITLES.menu;
  drawerEl._back.hidden = (mode === 'menu');
  renderDrawerBody();
};

const toggleDrawer = () => (drawerOpen ? closeDrawer() : openDrawer());

const TAB_LABELS = {
  exploration: 'Andanzas', statuses: 'Estados', heroes: 'Héroes',
};

const statusName = (id) => {
  const found = STATUSES.find((s) => s.id === id);
  return found ? found.name : id;
};

const formatLogEntry = (cmd, doc) => {
  const p = cmd.payload || {};
  const findIn = (key, id) => (doc[key] || []).find((x) => x.id === id);
  switch (cmd.type) {
    case 'SET_ACTIVE_TAB':
      return `Abrir ${TAB_LABELS[p.to] || p.to}`;
    case 'ADD_QUEST':
      return `Iniciar misión «${p.to?.title ?? '?'}»`;
    case 'REMOVE_QUEST':
      return `Tachar misión «${p.from?.title ?? '?'}»`;
    case 'TOGGLE_QUEST': {
      const q = findIn('quests', p.id);
      return `Misión${q ? ` «${q.title}»` : ''}: ${p.to ? 'cumplida' : 'reabierta'}`;
    }
    case 'UPDATE_QUEST':
      return `Misión editada: «${(p.to?.title || '').slice(0, 40)}»`;
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
    case 'UPDATE_SIDE_QUEST':
      return `Misión secundaria editada: «${(p.to?.title || '').slice(0, 40)}»`;
    case 'ADD_HERO':
      return `Héroe en juego: ${CHARACTER_NAMES[p.to] ?? '?'}`;
    case 'REMOVE_HERO':
      return `Héroe retirado: ${CHARACTER_NAMES[p.from] ?? '?'}`;
    case 'ADD_HERO_ITEM':
      return `${CHARACTER_NAMES[p.heroIdx] ?? '?'} — anotar «${(p.to?.text || '').slice(0, 40)}»`;
    case 'REMOVE_HERO_ITEM':
      return `${CHARACTER_NAMES[p.heroIdx] ?? '?'} — borrar «${(p.from?.text || '').slice(0, 40)}»`;
    case 'UPDATE_HERO_ITEM':
      return `${CHARACTER_NAMES[p.heroIdx] ?? '?'} — editar «${(p.to?.text || '').slice(0, 40)}»`;
    case 'ADD_TIME_TOKEN':       return `Ficha de tiempo añadida: «${(p.to?.text || '').slice(0, 40)}»`;
    case 'REMOVE_TIME_TOKEN':    return `Ficha de tiempo borrada: «${(p.from?.text || '').slice(0, 40)}»`;
    case 'UPDATE_TIME_TOKEN':    return `Ficha de tiempo editada: «${(p.to?.text || '').slice(0, 40)}»`;
    case 'ADD_PARTNER':          return `Partner inscrito: «${(p.to?.text || '').slice(0, 40)}»`;
    case 'REMOVE_PARTNER':       return `Partner borrado: «${(p.from?.text || '').slice(0, 40)}»`;
    case 'UPDATE_PARTNER':       return `Partner editado: «${(p.to?.text || '').slice(0, 40)}»`;
    case 'ADD_GUARDIAN':         return `Guardián inscrito: «${(p.to?.text || '').slice(0, 40)}»`;
    case 'REMOVE_GUARDIAN':      return `Guardián borrado: «${(p.from?.text || '').slice(0, 40)}»`;
    case 'UPDATE_GUARDIAN':      return `Guardián editado: «${(p.to?.text || '').slice(0, 40)}»`;
    case 'ADD_PERDITION_KING':   return `Rey de la Perdición inscrito: «${(p.to?.text || '').slice(0, 40)}»`;
    case 'REMOVE_PERDITION_KING':return `Rey de la Perdición borrado: «${(p.from?.text || '').slice(0, 40)}»`;
    case 'UPDATE_PERDITION_KING':return `Rey de la Perdición editado: «${(p.to?.text || '').slice(0, 40)}»`;
    case 'ADD_GUIDE_STONE':      return `Roca Guía inscrita`;
    case 'REMOVE_GUIDE_STONE':   return `Roca Guía borrada`;
    case 'SET_GUIDE_STONE_FIELD': {
      const which = p.field === 'center' ? 'centro' : `cuadrante ${p.field.slice(1)}`;
      return `Roca Guía — ${which}: ${p.from || '∅'} → ${p.to || '∅'}`;
    }
    case 'ADD_NOTE':
      return `Nota añadida: «${(p.to?.text || '').slice(0, 40)}${(p.to?.text?.length ?? 0) > 40 ? '…' : ''}»`;
    case 'REMOVE_NOTE':
      return `Nota borrada: «${(p.from?.text || '').slice(0, 40)}${(p.from?.text?.length ?? 0) > 40 ? '…' : ''}»`;
    case 'UPDATE_NOTE':
      return `Nota editada: «${(p.to?.text || '').slice(0, 40)}${(p.to?.text?.length ?? 0) > 40 ? '…' : ''}»`;
    case 'SET_SESSION_FIELD':
      return `Héroes — ${describeSessionPath(p.path)}`;
    default:
      return cmd.type;
  }
};

// Labels for the path components that SET_SESSION_FIELD ends up dispatching
// against — used by the activity log to render a readable line per change.
// Only fields the UI currently writes are listed here; anything else falls
// back to the raw key.
const SESSION_LABELS = {
  location: 'localización',
  // Habilidades
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
            body: 'Todo lo escrito en el tomo se perderá: capítulos, misiones, notas, estados y la hoja de juego.',
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
   Hoja de juego — full-page sheet of inter-session state
   ------------------------------------------------------------------------- */

const getSessionAt = (path) => {
  let node = store.state.doc.session;
  for (const k of path) {
    if (node == null) return '';
    node = node[k];
  }
  return node ?? '';
};

const sheetInput = ({ path, placeholder = '', label, autocapitalize = 'sentences', inputmode, variant }) => {
  const initial = getSessionAt(path);
  const classes = ['gamesheet__input'];
  if (variant === 'stat') classes.push('gamesheet__input--stat');
  if (variant === 'location') classes.push('gamesheet__input--location');
  return el('input', {
    type: 'text',
    class: classes.join(' '),
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

const sheetField = ({ label, path, block, ...opts }) =>
  el('label', { class: `gamesheet__field${block ? ' gamesheet__field--block' : ''}` },
    el('span', { class: 'gamesheet__label' }, label),
    sheetInput({ path, label, ...opts }),
  );

// The four canonical heroes of Reyes de la Perdición. Order matches the
// `players` array index, so persisted data carries over without migration.
const CHARACTER_NAMES = ['Elgan', 'Gerdwyn', 'Iunis', 'Osbert'];

// One small runic sigil per character. These are decorative SVGs (no semantic
// meaning) — each is hand-drawn to feel like a personal mark inscribed in ink.
const CHARACTER_SIGILS = [
  // Elgan — crossed spears within a sun-disc
  '<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="16" cy="16" r="11"/><path d="M16 5v22M5 16h22"/><path d="M8.5 8.5l15 15M23.5 8.5l-15 15" opacity=".55"/><circle cx="16" cy="16" r="2.4" fill="currentColor" stroke="none"/></svg>',
  // Gerdwyn — triple knot
  '<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M16 5c4 3 4 9 0 12s-4 9 0 12"/><path d="M16 5c-4 3-4 9 0 12s4 9 0 12"/><circle cx="16" cy="16" r="1.6" fill="currentColor" stroke="none"/></svg>',
  // Iunis — crescent and star
  '<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22 5a11 11 0 1 0 0 22 8 8 0 1 1 0-22z"/><path d="M9 9l1 2 2 .5-1.5 1.5.5 2-2-1-2 1 .5-2L6 11.5l2-.5z" fill="currentColor" stroke="none" opacity=".75"/></svg>',
  // Osbert — antler / branching tree
  '<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M16 27V8"/><path d="M16 13l-4-4M16 13l4-4M16 18l-5-3M16 18l5-3M16 9l-2-3M16 9l2-3"/><circle cx="16" cy="7" r="1.4" fill="currentColor" stroke="none"/></svg>',
];

const sigilNode = (idx) => {
  const wrap = el('span', { class: 'gamesheet__sigil', 'aria-hidden': 'true' });
  const parsed = ICON_PARSER.parseFromString(CHARACTER_SIGILS[idx], 'image/svg+xml');
  wrap.append(parsed.documentElement);
  return wrap;
};

// Each hero now owns a list of items/notes that behaves like the Andanzas
// Notes section — add via prompt, delete with confirm. Items survive across
// hero removal/re-add because the data lives in `players[idx]`, not in the
// selectedHeroes list.
const renderHeroItemRows = (heroIdx, items) => {
  if (items.length === 0) return null;
  const list = el('ul', { class: 'ledger__list ledger__list--notes' });
  items.forEach((it, idx) => {
    list.append(
      el('li', { class: 'ledger__note' },
        el('button', {
          type: 'button',
          class: 'ledger__note-text',
          'aria-label': 'Editar nota',
          onclick: async () => {
            const result = await askEditItem({
              title: 'Editar nota',
              textLabel: '¿Qué se quiere recordar?',
              textValue: it.text || '',
            });
            if (!result) return;
            const to = { ...it, text: result.text };
            if (to.text === (it.text || '')) return;
            store.dispatch(makeCommand('UPDATE_HERO_ITEM', { heroIdx, id: it.id, from: it, to }));
          },
        }, it.text),
        el('button', {
          type: 'button',
          class: 'ledger__row-del',
          'aria-label': 'Borrar nota',
          onclick: async () => {
            const ok = await askConfirm({
              title: '¿Tachar la nota?',
              body: 'La nota se perderá.',
            });
            if (!ok) return;
            store.dispatch(makeCommand('REMOVE_HERO_ITEM', { heroIdx, from: it, index: idx }));
          },
        }, icon('cross')),
      )
    );
  });
  return list;
};

const renderHeroItemsSection = (heroIdx, heroName) => {
  const items = store.state.doc.session?.players?.[heroIdx]?.items || [];
  return renderLedgerSection({
    title: 'Objetos / Notas',
    addLabel: 'anotar',
    onAdd: async () => {
      const text = await askPrompt({
        title: `Anotar para ${heroName}`,
        label: '¿Qué se quiere recordar?',
        placeholder: 'Una bolsa de monedas, una llave oxidada…',
      });
      if (!text) return;
      const it = { id: newId(), text };
      store.dispatch(makeCommand('ADD_HERO_ITEM', { heroIdx, to: it, index: items.length }));
    },
    body: renderHeroItemRows(heroIdx, items),
  });
};

const renderPlayerCard = (idx) => {
  const characterName = CHARACTER_NAMES[idx];
  const stat = (key, label, short) =>
    el('label', { class: 'gamesheet__stat' },
      el('span', { class: 'gamesheet__stat-label' }, short || label),
      sheetInput({
        path: ['players', idx, key],
        placeholder: '0',
        label: `${characterName}, ${label}`,
        autocapitalize: 'none',
        inputmode: 'numeric',
        variant: 'stat',
      }),
    );
  const rubric = (label) =>
    el('div', { class: 'gamesheet__rubric' },
      el('span', { class: 'gamesheet__rubric-mark' }),
      el('span', {}, label),
      el('span', { class: 'gamesheet__rubric-mark' }),
    );
  const statGroup = (label, gridClass, ...stats) =>
    el('div', { class: 'gamesheet__stat-group' },
      rubric(label),
      el('div', { class: `gamesheet__stats ${gridClass}` }, ...stats),
    );

  return el('article', { class: 'gamesheet__player', dataset: { hero: characterName.toLowerCase() } },
    el('header', { class: 'gamesheet__player-head' },
      sigilNode(idx),
      el('h3', { class: 'gamesheet__player-name' }, characterName),
      el('span', { class: 'gamesheet__player-rule', 'aria-hidden': 'true' }),
      el('button', {
        type: 'button',
        class: 'gamesheet__player-remove',
        'aria-label': `Quitar a ${characterName} de la sesión`,
        title: 'Quitar de la sesión',
        onclick: async () => {
          const ok = await askConfirm({
            title: `¿Quitar a ${characterName}?`,
            body: `Sus datos quedarán guardados en el tomo; podrás volver a añadirlo más tarde.`,
            confirmLabel: 'Quitar',
            cancelLabel: 'Conservar',
          });
          if (!ok) return;
          const selected = store.state.doc.session?.selectedHeroes || [];
          const position = selected.indexOf(idx);
          store.dispatch(makeCommand('REMOVE_HERO', { from: idx, index: position >= 0 ? position : selected.length }));
        },
      }, icon('cross')),
    ),
    el('div', { class: 'gamesheet__player-body' },
      el('label', { class: 'gamesheet__field gamesheet__field--block gamesheet__field--inline' },
        el('span', { class: 'gamesheet__label' }, 'Localización'),
        sheetInput({
          path: ['players', idx, 'location'],
          placeholder: '101',
          label: `${characterName}, Localización`,
          autocapitalize: 'none',
          inputmode: 'numeric',
          variant: 'location',
        }),
      ),
      // Stat groups stack on narrow viewports and pivot into a 3-column grid
      // on desktop (see .gamesheet__player-stats media rule). Items / Notas
      // always lives below as a full-width ledger section.
      el('div', { class: 'gamesheet__player-stats' },
        statGroup('Habilidades', 'gamesheet__stats--3',
          stat('agresividad',    'Agresividad',    'Agresividad'),
          stat('audacia',        'Audacia',        'Audacia'),
          stat('logica',         'Lógica',         'Lógica'),
          stat('empatia',        'Empatía',        'Empatía'),
          stat('cautela',        'Cautela',        'Cautela'),
          stat('espiritualidad', 'Espiritualidad', 'Espiritual.'),
        ),
        statGroup('Vitalidad', 'gamesheet__stats--3',
          stat('energia', 'Energía', 'Energía'),
          stat('salud',   'Salud',   'Salud'),
          stat('terror',  'Terror',  'Terror'),
        ),
        statGroup('Recursos', 'gamesheet__stats--4',
          stat('food',   'Comida',      'Comida'),
          stat('wealth', 'Riqueza',     'Riqueza'),
          stat('magic',  'Magia',       'Magia'),
          stat('exp',    'Experiencia', 'Exp.'),
        ),
      ),
      renderHeroItemsSection(idx, characterName),
    ),
  );
};

const renderHeroes = () => {
  const scene = el('section', { class: 'scene gamesheet' });

  scene.append(
    el('h2', { class: 'scene__title gamesheet__title' }, 'Héroes'),
    el('p',  { class: 'scene__sub' }, 'los compañeros de andanzas'),
    flourish(),
  );

  const session = store.state.doc.session || {};
  const selected = Array.isArray(session.selectedHeroes) ? session.selectedHeroes : [];
  const available = CHARACTER_NAMES.map((_, i) => i).filter((i) => !selected.includes(i));

  const heroesHead = el('div', { class: 'gamesheet__heroes-head' },
    el('span', { class: 'gamesheet__heroes-mark', 'aria-hidden': 'true' }),
    el('h3', { class: 'gamesheet__heroes-title' }, 'Héroes'),
    el('span', { class: 'gamesheet__heroes-mark', 'aria-hidden': 'true' }),
  );
  scene.append(heroesHead);

  const heroesGrid = el('div', { class: 'gamesheet__heroes' });
  for (const idx of selected) heroesGrid.append(renderPlayerCard(idx));

  // The add card sits inside the grid so on wide screens it slots in beside
  // existing heroes; on narrow it stacks below. It only renders while there
  // are heroes left to choose from.
  if (available.length > 0) {
    heroesGrid.append(
      el('button', {
        type: 'button',
        class: 'gamesheet__add-hero',
        dataset: { empty: selected.length === 0 ? 'true' : 'false' },
        onclick: async () => {
          const pick = await askHeroPicker(available);
          if (pick == null) return;
          store.dispatch(makeCommand('ADD_HERO', { to: pick, index: selected.length }));
        },
      },
        el('span', { class: 'gamesheet__add-hero-mark', 'aria-hidden': 'true' }, icon('plus')),
        el('span', { class: 'gamesheet__add-hero-label' },
          selected.length === 0 ? 'Añadir el primer héroe' : 'Añadir otro héroe',
        ),
      ),
    );
  }

  scene.append(heroesGrid);

  return scene;
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
  if (!drawerEl) return;
  const content = (drawerMode === 'log') ? renderDrawerLog() : renderDrawerMenu();
  drawerEl._body.replaceChildren(content);
};

drawerKnob.addEventListener('click', toggleDrawer);
window.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape') return;
  if (drawerOpen) {
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
  if (a.dataset?.sessionPath) {
    return { kind: 'session-field', path: a.dataset.sessionPath, sel: a.selectionStart ?? null };
  }
  if (a.dataset?.guideStoneField) {
    return { kind: 'guidestone-field', key: a.dataset.guideStoneField, sel: a.selectionStart ?? null };
  }
  return null;
};

const restoreFocus = (snap) => {
  if (!snap) return;
  const focusBy = (selector, sel) => {
    const input = document.querySelector(selector);
    if (!input) return;
    input.focus({ preventScroll: true });
    if (sel != null) {
      try { input.setSelectionRange(sel, sel); } catch {}
    }
  };
  if (snap.kind === 'status-search') {
    focusBy('.status-search', snap.sel);
  } else if (snap.kind === 'session-field') {
    focusBy(`[data-session-path="${CSS.escape(snap.path)}"]`, snap.sel);
  } else if (snap.kind === 'guidestone-field') {
    focusBy(`[data-guide-stone-field="${CSS.escape(snap.key)}"]`, snap.sel);
  }
};

const render = () => {
  const snap = captureFocus();
  const doc = store.state.doc;
  setTabs(doc.tab);
  view.replaceChildren();
  if (doc.tab === 'heroes')           view.append(renderHeroes());
  else if (doc.tab === 'exploration') view.append(renderExploration(doc));
  else                                view.append(renderStatuses(doc));
  undoBtn.disabled = !store.canUndo();
  redoBtn.disabled = !store.canRedo();
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
