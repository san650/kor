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
  // Purity — a 4-pointed star inside a ring. Reuses the compass-rose shape
  // because clean cardinal rays already read as "pure / ordered".
  purity: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 3.5 L13.2 12 L12 20.5 L10.8 12 Z" fill="currentColor" stroke="none"/><path d="M3.5 12 L12 13.2 L20.5 12 L12 10.8 Z" fill="currentColor" stroke="none" opacity=".55"/><circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none"/></svg>`,
  // Weirdness — same compass star, but with four wavy "tendril" rays
  // sprouting between the cardinal points, so the icon reads as the
  // purity star gone slightly off.
  weirdness: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 3.5 L13.2 12 L12 20.5 L10.8 12 Z" fill="currentColor" stroke="none"/><path d="M3.5 12 L12 13.2 L20.5 12 L12 10.8 Z" fill="currentColor" stroke="none" opacity=".55"/><path d="M6.2 6.2 Q7.3 7.8 8.4 7.6 Q9.5 7.4 10.4 8.8" opacity=".8"/><path d="M17.8 6.2 Q16.7 7.8 15.6 7.6 Q14.5 7.4 13.6 8.8" opacity=".8"/><path d="M6.2 17.8 Q7.3 16.2 8.4 16.4 Q9.5 16.6 10.4 15.2" opacity=".8"/><path d="M17.8 17.8 Q16.7 16.2 15.6 16.4 Q14.5 16.6 13.6 15.2" opacity=".8"/><circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none"/></svg>`,
  // Hourglass — a single ficha de tiempo. Repeated on the card, one per
  // tally, so the count is countable at a glance without reading numerals.
  sandClock: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 4 H17"/><path d="M7 20 H17"/><path d="M7 4 V7 L12 12 L7 17 V20"/><path d="M17 4 V7 L12 12 L17 17 V20"/><path d="M9 6 H15 L13 9 H11 Z" fill="currentColor" stroke="none"/><circle cx="12" cy="14" r=".7" fill="currentColor" stroke="none"/></svg>`,
  // Crown — marks a location bearing a named Rey de la Perdición.
  crown: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 17 L5.5 7 L9 11 L12 5.5 L15 11 L18.5 7 L20 17 Z" fill="currentColor" stroke="currentColor"/><path d="M4 19.5 H20" stroke-width="1.4"/><circle cx="5.5" cy="6.2" r=".9" fill="currentColor" stroke="none"/><circle cx="18.5" cy="6.2" r=".9" fill="currentColor" stroke="none"/><circle cx="12" cy="4.6" r="1" fill="currentColor" stroke="none"/></svg>`,
  // Shield — marks a location bearing a named Guardián.
  shield: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3 L19 6 V12 C19 16.5 15.5 19.7 12 21 C8.5 19.7 5 16.5 5 12 V6 Z" fill="currentColor" stroke="currentColor" opacity=".18"/><path d="M12 3 L19 6 V12 C19 16.5 15.5 19.7 12 21 C8.5 19.7 5 16.5 5 12 V6 Z"/><path d="M9 11 L11.2 13 L15 9"/></svg>`,
  // Obelisk — a tapered standing-stone with bare, branching limbs sprouting
  // from its crown like a petrified tree. The asymmetry of the branches and
  // the way the stone roots into a small plinth nod to KOR's quietly weird,
  // half-organic monoliths. Used as the Roca Guía's centerpiece.
  obelisk: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" stroke-width="1.1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <!-- bare branches climbing out of the obelisk's crown -->
    <path d="M12 9 L12 4.2" stroke-width="1"/>
    <path d="M12 6.4 L10 4.2"/>
    <path d="M12 5 L13.6 3.4"/>
    <path d="M12 7.4 L14 5.8"/>
    <path d="M12 8 L10.4 6.6"/>
    <path d="M13.6 3.4 L14.6 2.4" opacity=".75"/>
    <path d="M10 4.2 L9 3.4" opacity=".75"/>
    <path d="M14 5.8 L15 5" opacity=".75"/>
    <!-- the obelisk shaft + plinth, filled stone -->
    <path d="M10.4 9 L13.6 9 L14 19 L16 19 L16 20.7 L8 20.7 L8 19 L10 19 Z" fill="currentColor" stroke="currentColor" stroke-width=".4"/>
    <!-- a single inscribed mark on the shaft -->
    <path d="M11.4 13 L12.6 13" opacity=".5" stroke="rgba(255,250,230,.7)"/>
  </svg>`,
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

const askConfirm = ({ title, body, confirmLabel = 'Borrar', cancelLabel = 'Conservar' }) =>
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

const editDialog        = $('edit-dialog');
const editTitle         = $('edit-title');
const editLabelText     = $('edit-label-text');
const editInputText     = $('edit-input-text');
const editFieldLoc      = $('edit-field-loc');
const editInputLoc      = $('edit-input-loc');
const editFieldWhen     = $('edit-field-when');
const editInputChapter  = $('edit-input-chapter');
const editInputDay      = $('edit-input-day');
const editForm          = editDialog.querySelector('form');
const editCancel        = editDialog.querySelector('[data-edit-cancel]');

// Parse the chapter/day <select> string into the integer we store, or null
// when the option is "—". Returns null for any value outside the valid range.
const parseChapter = (raw) => {
  const n = parseInt(raw, 10);
  return Number.isInteger(n) && n >= 1 && n <= 10 ? n : null;
};
const parseDay = (raw) => {
  const n = parseInt(raw, 10);
  return Number.isInteger(n) && n >= 1 && n <= 6 ? n : null;
};

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
  const chapter = editFieldWhen.hidden ? null : parseChapter(editInputChapter.value);
  const day = editFieldWhen.hidden ? null : parseDay(editInputDay.value);
  settleEdit({ text, location, chapter, day });
});
editCancel.addEventListener('click', () => settleEdit(null));
editDialog.addEventListener('close', () => { if (editResolver) settleEdit(null); });
editDialog.onclick = (e) => { if (e.target === editDialog) settleEdit(null); };

// askEditItem opens a modal with a description field and (optionally) a
// location field plus a chapter/day pair. Resolves with
// `{text, location, chapter, day}` — `location` is null when not enabled,
// `chapter`/`day` are integers or null. Returns null on cancel.
const askEditItem = ({
  title,
  textLabel = 'Descripción',
  textValue = '',
  textPlaceholder = '',
  textAutocapitalize = 'sentences',
  hasLocation = false,
  locationValue = '',
  hasChapterDay = true,
  chapterValue = null,
  dayValue = null,
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
  if (hasChapterDay) {
    editFieldWhen.hidden = false;
    editInputChapter.value = parseChapter(chapterValue) != null ? String(chapterValue) : '';
    editInputDay.value = parseDay(dayValue) != null ? String(dayValue) : '';
  } else {
    editFieldWhen.hidden = true;
    editInputChapter.value = '';
    editInputDay.value = '';
  }
  editDialog.showModal();
  requestAnimationFrame(() => {
    editInputText.focus();
    editInputText.select?.();
  });
});

// Location card editor — stepper for fichas + polarity toggle + named
// guardian/king inputs. Resolves with the edited fields or null on cancel.
const locEditDialog       = $('loc-edit-dialog');
const locEditTitle        = $('loc-edit-title');
const locEditForm         = locEditDialog.querySelector('form');
const locEditFichasVal    = locEditDialog.querySelector('[data-loc-edit-fichas-val]');
const locEditFichasDec    = locEditDialog.querySelector('[data-loc-edit-fichas-dec]');
const locEditFichasInc    = locEditDialog.querySelector('[data-loc-edit-fichas-inc]');
const locEditPolarityBtns = locEditDialog.querySelectorAll('[data-loc-edit-polarity]');
const locEditInputGuardian = $('loc-edit-input-guardian');
const locEditInputKing     = $('loc-edit-input-king');
const locEditCancel       = locEditDialog.querySelector('[data-loc-edit-cancel]');

let locEditState = { fichas: 0, polarity: 'pureza' };
let locEditResolver = null;

const settleLocEdit = (value) => {
  if (locEditResolver) { locEditResolver(value); locEditResolver = null; }
  if (locEditDialog.open) locEditDialog.close();
};

const refreshLocEditFichas = () => {
  locEditFichasVal.textContent = String(locEditState.fichas);
  locEditFichasDec.disabled = locEditState.fichas <= 0;
};
const refreshLocEditPolarity = () => {
  for (const btn of locEditPolarityBtns) {
    btn.setAttribute('aria-pressed',
      btn.dataset.locEditPolarity === locEditState.polarity ? 'true' : 'false');
  }
};

locEditFichasInc.addEventListener('click', () => {
  locEditState.fichas = Math.min(99, locEditState.fichas + 1);
  refreshLocEditFichas();
});
locEditFichasDec.addEventListener('click', () => {
  locEditState.fichas = Math.max(0, locEditState.fichas - 1);
  refreshLocEditFichas();
});
for (const btn of locEditPolarityBtns) {
  btn.addEventListener('click', () => {
    locEditState.polarity = btn.dataset.locEditPolarity;
    refreshLocEditPolarity();
  });
}

locEditForm.addEventListener('submit', (e) => {
  e.preventDefault();
  settleLocEdit({
    fichas: locEditState.fichas,
    polarity: locEditState.polarity,
    guardian: locEditInputGuardian.value.trim(),
    perditionKing: locEditInputKing.value.trim(),
  });
});
locEditCancel.addEventListener('click', () => settleLocEdit(null));
locEditDialog.addEventListener('close', () => { if (locEditResolver) settleLocEdit(null); });
locEditDialog.onclick = (e) => { if (e.target === locEditDialog) settleLocEdit(null); };

const askEditLocation = ({ code, fichas, polarity, guardian, perditionKing }) =>
  new Promise((resolve) => {
    locEditResolver = resolve;
    locEditState = {
      fichas: Number.isInteger(fichas) ? Math.max(0, fichas) : 0,
      polarity: polarity === 'rareza' ? 'rareza' : 'pureza',
    };
    locEditTitle.textContent = code ? `Locación ${code}` : 'Editar locación';
    locEditInputGuardian.value = guardian || '';
    locEditInputKing.value = perditionKing || '';
    refreshLocEditFichas();
    refreshLocEditPolarity();
    locEditDialog.showModal();
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
          dataset: { hero: heroKey(idx) },
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

// Format the optional chapter/day pair as a compact tag, e.g. "Cap 1-III".
// Returns null when neither is set so callers can omit the tag entirely.
const formatChapterDay = (chapter, day) => {
  const c = Number.isInteger(chapter) && chapter >= 1 && chapter <= 10 ? chapter : null;
  const d = Number.isInteger(day) && day >= 1 && day <= 6 ? day : null;
  if (c == null && d == null) return null;
  if (c != null && d != null) return `Cap ${c}-${ROMAN_NUMERALS[d - 1]}`;
  if (c != null) return `Cap ${c}`;
  return `Día ${ROMAN_NUMERALS[d - 1]}`;
};

const whenTag = (chapter, day) => {
  const label = formatChapterDay(chapter, day);
  return label ? el('span', { class: 'ledger__row-when' }, label) : null;
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
              chapterValue: it.chapter ?? null,
              dayValue: it.day ?? null,
            });
            if (!result) return;
            const to = {
              ...it,
              title: result.text,
              location: result.location || '',
              chapter: result.chapter,
              day: result.day,
            };
            if (to.title === it.title
              && to.location === (it.location || '')
              && to.chapter === (it.chapter ?? null)
              && to.day === (it.day ?? null)) return;
            store.dispatch(makeCommand(`UPDATE_${prefix}`, { id: it.id, from: it, to }));
          },
        },
          it.location ? el('span', { class: 'ledger__row-loc' }, it.location) : null,
          whenTag(it.chapter, it.day),
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
      el('li', {
        class: 'ledger__note',
        dataset: { done: n.done ? 'true' : 'false' },
      },
        el('button', {
          type: 'button',
          class: 'ledger__check',
          'aria-label': n.done ? 'Marcar como pendiente' : 'Marcar como cumplida',
          onclick: () => store.dispatch(makeCommand('TOGGLE_NOTE', {
            id: n.id, from: !!n.done, to: !n.done,
          })),
        }, n.done ? icon('check') : null),
        el('button', {
          type: 'button',
          class: 'ledger__note-text',
          'aria-label': 'Editar nota',
          onclick: async () => {
            const result = await askEditItem({
              title: 'Editar nota',
              textLabel: '¿Qué se quiere recordar?',
              textValue: n.text || '',
              hasLocation: true,
              locationValue: n.location || '',
              chapterValue: n.chapter ?? null,
              dayValue: n.day ?? null,
            });
            if (!result) return;
            const to = {
              ...n,
              text: result.text,
              location: result.location || '',
              chapter: result.chapter,
              day: result.day,
            };
            if (to.text === (n.text || '')
              && to.location === (n.location || '')
              && to.chapter === (n.chapter ?? null)
              && to.day === (n.day ?? null)) return;
            store.dispatch(makeCommand('UPDATE_NOTE', { id: n.id, from: n, to }));
          },
        },
          n.location ? el('span', { class: 'ledger__row-loc ledger__note-loc' }, n.location) : null,
          whenTag(n.chapter, n.day),
          el('span', { class: 'ledger__note-body' }, n.text),
        ),
        el('button', {
          type: 'button',
          class: 'ledger__row-del',
          'aria-label': 'Borrar nota',
          onclick: async () => {
            const ok = await askConfirm({
              title: '¿Borrar la nota?',
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
              title: '¿Borrar la misión?',
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
// Used by Compañeros and parallel text+location ledgers.
const renderTextLocRows = (items, prefix, confirmRemove, editTitle = 'Editar') => {
  if (items.length === 0) return null;
  const list = el('ul', { class: 'ledger__list' });
  items.forEach((it, idx) => {
    list.append(
      el('li', {
        class: 'ledger__row ledger__row--text',
        dataset: { done: it.done ? 'true' : 'false' },
      },
        el('button', {
          type: 'button',
          class: 'ledger__check',
          'aria-label': it.done ? 'Marcar como pendiente' : 'Marcar como cumplido',
          onclick: () => store.dispatch(makeCommand(`TOGGLE_${prefix}`, {
            id: it.id, from: !!it.done, to: !it.done,
          })),
        }, it.done ? icon('check') : null),
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
              chapterValue: it.chapter ?? null,
              dayValue: it.day ?? null,
            });
            if (!result) return;
            const to = {
              ...it,
              text: result.text,
              location: result.location || '',
              chapter: result.chapter,
              day: result.day,
            };
            if (to.text === (it.text || '')
              && to.location === (it.location || '')
              && to.chapter === (it.chapter ?? null)
              && to.day === (it.day ?? null)) return;
            store.dispatch(makeCommand(`UPDATE_${prefix}`, { id: it.id, from: it, to }));
          },
        },
          it.location ? el('span', { class: 'ledger__row-loc' }, it.location) : null,
          whenTag(it.chapter, it.day),
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

// Locaciones — composite section with two sub-blocks: "Conocidas" (a list
// of revealed location codes the players have discovered) and "Roca Guía"
// (up to 3 cards, each a 2×2 grid of quadrant location codes). The
// section title is just "Locaciones"; both sub-blocks live under it.
const MAX_GUIDE_STONES = 3;

// Header for a nested sub-block inside a ledger group. Mirrors
// `renderLedgerHead` but one rank smaller (h4, thinner rule).
const renderSubLedgerHead = ({ title, addLabel, onAdd }) =>
  el('header', { class: 'sub-ledger__head' },
    el('h4', { class: 'sub-ledger__title' }, title),
    el('span', { class: 'sub-ledger__rule', 'aria-hidden': 'true' }),
    onAdd
      ? el('button', {
          type: 'button',
          class: 'sub-ledger__add',
          onclick: onAdd,
        }, icon('plus'), el('span', { class: 'sub-ledger__add-label' }, addLabel))
      : null,
  );

// Conocidas — a bulk-add input bar that splits on whitespace, plus a
// flex-wrap grid of parchment-plaque tags. Each token in the input
// dispatches its own ADD_LOCATION (skipping codes already in the list),
// so undo peels them off one at a time the same way they were typed.
const parseLocationTokens = (raw) =>
  String(raw || '')
    .split(/\s+/)
    .map((t) => t.trim())
    .filter(Boolean);

const renderLocationAddInput = (locations) => {
  // Submit parses, deduplicates against existing codes, and fires one
  // ADD_LOCATION per fresh token. The input is cleared BEFORE dispatch
  // so the focus-restore snapshot taken during the imminent re-render
  // captures an empty value (we don't want submitted text re-appearing).
  const submit = (input) => {
    const raw = input.value;
    input.value = '';
    const tokens = parseLocationTokens(raw);
    if (tokens.length === 0) return;
    const existing = new Set(locations.map((l) => (l.location || '').trim()).filter(Boolean));
    let idx = locations.length;
    for (const t of tokens) {
      if (existing.has(t)) continue;
      existing.add(t);
      store.dispatch(makeCommand('ADD_LOCATION', {
        to: { id: newId(), location: t },
        index: idx,
      }));
      idx += 1;
    }
  };

  const input = el('input', {
    type: 'text',
    class: 'loc__add-input',
    placeholder: '101  102  103…',
    'aria-label': 'Añadir locaciones (separadas por espacio)',
    autocomplete: 'off',
    autocapitalize: 'none',
    spellcheck: 'false',
    dataset: { locAddInput: 'true' },
    // onblur on the input (not the form) so tabbing out commits whatever's
    // typed without requiring an explicit Enter.
    onblur: (e) => submit(e.target),
  });

  return el('form', {
    class: 'loc__add',
    onsubmit: (e) => {
      e.preventDefault();
      submit(input);
    },
  },
    el('span', { class: 'loc__add-plus', 'aria-hidden': 'true' }, '+'),
    input,
  );
};

const renderLocationTags = (items) => {
  if (items.length === 0) return null;

  // Sort case insensitive
  items = items.slice().sort((a, b) => a.location.localeCompare(b.location, "es", { sensitivity: 'base' }));

  const list = el('div', { class: 'loc__tags', role: 'list' });
  items.forEach((it, idx) => {
    const code = it.location || '';
    const fichas = Math.max(0, Number.isInteger(it.fichas) ? it.fichas : 0);
    const polarity = it.polarity === 'rareza' ? 'rareza' : 'pureza';
    const guardian = (it.guardian || '').trim();
    const king = (it.perditionKing || '').trim();

    // Sand-clock row — one icon per ficha. Empty when the location has no
    // tally, which keeps the bottom-of-card height stable for unmarked
    // locations.
    const clocks = el('div', { class: 'loc__tag-clocks', 'aria-hidden': 'true' });
    for (let i = 0; i < fichas; i++) clocks.append(icon('sandClock'));

    // Optional dweller badges (Guardián / Rey de la Perdición). Rendered as
    // small icons with the bearer's name as a tooltip so the card stays
    // legible at a glance.
    const dwellers = el('div', { class: 'loc__tag-dwellers', 'aria-hidden': guardian || king ? 'false' : 'true' });
    if (guardian) {
      dwellers.append(el('span', {
        class: 'loc__tag-dweller loc__tag-dweller--guardian',
        title: `Guardián: ${guardian}`,
      }, icon('shield')));
    }
    if (king) {
      dwellers.append(el('span', {
        class: 'loc__tag-dweller loc__tag-dweller--king',
        title: `Rey de la Perdición: ${king}`,
      }, icon('crown')));
    }

    list.append(
      el('article',
        {
          class: 'loc__tag',
          role: 'listitem',
          dataset: { polarity, fichas: String(fichas) },
        },
        // The card body is itself the tap target that opens the editor;
        // the × delete button sits absolutely positioned on top.
        el('button', {
          type: 'button',
          class: 'loc__tag-body',
          'aria-label': code ? `Editar locación ${code}` : 'Editar locación',
          onclick: async () => {
            const result = await askEditLocation({
              code,
              fichas,
              polarity,
              guardian,
              perditionKing: king,
            });
            if (!result) return;
            const to = {
              ...it,
              fichas: result.fichas,
              polarity: result.polarity,
              guardian: result.guardian || '',
              perditionKing: result.perditionKing || '',
            };
            // Nothing actually changed — skip the dispatch so undo history
            // doesn't accumulate empty edits.
            if (to.fichas === fichas
              && to.polarity === polarity
              && to.guardian === guardian
              && to.perditionKing === king) return;
            store.dispatch(makeCommand('UPDATE_LOCATION', { id: it.id, from: it, to }));
          },
        },
          el('span', { class: 'loc__tag-code' }, code || '—'),
          el('span', { class: 'loc__tag-glyph' },
            icon(polarity === 'rareza' ? 'weirdness' : 'purity'),
          ),
          dwellers,
          clocks,
        ),
        el('button', {
          type: 'button',
          class: 'loc__tag-del',
          'aria-label': code ? `Borrar locación ${code}` : 'Borrar locación',
          onclick: async (e) => {
            // Stop the body's onclick from also firing the editor.
            e.stopPropagation();
            const label = code ? `«${code}»` : 'esta locación';
            const ok = await askConfirm({
              title: '¿Borrar locación?',
              body: `${label} se perderá.`,
              confirmLabel: 'Borrar',
            });
            if (!ok) return;
            store.dispatch(makeCommand('REMOVE_LOCATION', { from: it, index: idx }));
          },
        }, icon('cross')),
      ),
    );
  });
  return list;
};

const renderGuideStone = (stone, indexInList) => {
  const field = (key) => {
    const value = stone[key] || '';
    return el('input', {
      type: 'text',
      class: 'guidestone__input',
      value,
      placeholder: '101',
      'aria-label': `Roca Guía — cuadrante ${key.slice(1)}`,
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
        // Any new, non-empty quadrant code is also a "revealed" location —
        // surface it in Conocidas automatically. Skip if it's already
        // tracked (case-trimmed match). Stays a separate command so undo
        // can peel the auto-added tag back independently.
        const trimmed = (to || '').trim();
        if (!trimmed) return;
        const locations = store.state.doc.locations || [];
        const exists = locations.some((l) => (l.location || '').trim() === trimmed);
        if (exists) return;
        store.dispatch(makeCommand('ADD_LOCATION', {
          to: { id: newId(), location: trimmed },
          index: locations.length,
        }));
      },
    });
  };

  return el('article', { class: 'guidestone' },
    // DOM order here drives keyboard tab order. Each quadrant has a fixed
    // `grid-area` in CSS so visual placement is independent of DOM order.
    // Tabbing flows clockwise from top-left so it matches how a player
    // reads the four destinations radiating from the stone: TL → TR → BR → BL.
    // The remove × lives at the end of the article so it doesn't interrupt
    // the flow between consecutive stones.
    el('div', { class: 'guidestone__grid' },
      el('div', { class: 'guidestone__quad guidestone__quad--tl' }, field('q1')),
      el('div', { class: 'guidestone__quad guidestone__quad--tr' }, field('q2')),
      el('div', { class: 'guidestone__quad guidestone__quad--br' }, field('q4')),
      el('div', { class: 'guidestone__quad guidestone__quad--bl' }, field('q3')),
      // Center is now a decorative obelisk icon — the stone itself, mute and
      // monolithic at the crossroads of its four destinations.
      el('div', { class: 'guidestone__center', 'aria-hidden': 'true' },
        icon('obelisk'),
      ),
    ),
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
  );
};

const renderLocationsSection = (locations, stones) => {
  const canAddStone = stones.length < MAX_GUIDE_STONES;

  const group = el('div', { class: 'ledger__group' });

  // Sub-block 1 — Conocidas. Head carries no add button; the input bar
  // below is the entry point (it accepts whitespace-separated codes).
  group.append(
    renderSubLedgerHead({ title: 'Conocidas' }),
    renderLocationAddInput(locations),
  );
  const tags = renderLocationTags(locations);
  if (tags) group.append(tags);

  // Sub-block 2 — Roca Guía
  group.append(renderSubLedgerHead({
    title: 'Roca Guía',
    addLabel: canAddStone ? 'inscribir' : null,
    onAdd: canAddStone ? () => {
      const stone = { id: newId(), q1: '', q2: '', q3: '', q4: '' };
      store.dispatch(makeCommand('ADD_GUIDE_STONE', { to: stone, index: stones.length }));
    } : null,
  }));
  if (stones.length > 0) {
    const cards = el('div', { class: 'guidestones' });
    stones.forEach((s, i) => cards.append(renderGuideStone(s, i)));
    group.append(cards);
  }

  return renderLedgerSection({ title: 'Locaciones', body: group });
};

/* -------------------------------------------------------------------------
   Andanzas — the per-location lens over notes / misiones / compañeros.
   Pick a location at the top (or "Todas" to drop the filter); add new
   entries that arrive pre-filled with that location, or add new location
   codes via the quick-add input.
   ------------------------------------------------------------------------- */

let selectedLocation = null;
let hideCompleted = false;

// `selectedLocation === null` means the "Todas" pseudo-chip is active and
// every ledger renders unfiltered.
const renderByLocation = (doc) => {
  const scene = el('section', { class: 'scene' });

  // Build the alphabetical (numeric-aware) list of known locations.
  const locations = (doc.locations || [])
    .slice()
    .sort((a, b) =>
      (a.location || '').localeCompare(b.location || '', 'es', { numeric: true, sensitivity: 'base' }),
    );

  // The selected chip clamps to a still-existing code. If it was removed,
  // fall through to "Todas" rather than silently jumping the user to an
  // unrelated location.
  if (selectedLocation != null && !locations.some((l) => l.location === selectedLocation)) {
    selectedLocation = null;
  }

  // Selector — "Todas" chip first, then every revealed location.
  const chips = el('div', { class: 'by-loc__chips' });
  chips.append(el('button', {
    type: 'button',
    class: 'by-loc__chip by-loc__chip--all',
    'aria-pressed': selectedLocation == null ? 'true' : 'false',
    onclick: () => { selectedLocation = null; render(); },
  }, 'Todas'));
  for (const loc of locations) {
    const isSel = loc.location === selectedLocation;
    chips.append(el('button', {
      type: 'button',
      class: 'by-loc__chip',
      'aria-pressed': isSel ? 'true' : 'false',
      onclick: () => { selectedLocation = loc.location; render(); },
    }, loc.location));
  }
  scene.append(chips);

  // Filter strip + quick-add — the toggle hides every completed entry across
  // all sections on this screen.
  scene.append(el('div', { class: 'by-loc__controls' },
    renderLocationAddInput(doc.locations || []),
    el('button', {
      type: 'button',
      class: 'by-loc__hide-done',
      'aria-pressed': hideCompleted ? 'true' : 'false',
      onclick: () => { hideCompleted = !hideCompleted; render(); },
      title: 'Ocultar notas, misiones y compañeros cumplidos',
    }, 'ocultar cumplidas'),
  ));

  const loc = selectedLocation;
  const showAll = loc == null;
  const matchesLoc = (it) => showAll || (it.location || '').trim() === loc;
  const matchesDone = (it) => !hideCompleted || !it.done;
  const matches = (it) => matchesLoc(it) && matchesDone(it);

  // Filter each ledger to items whose location matches the selection
  // (or all items when "Todas" is active), and drop completed entries
  // when the toggle is on.
  const allSideQuests = doc.sideQuests || [];
  const allNotes      = doc.notes      || [];
  const allPartners   = doc.partners   || [];

  const sideQuests = allSideQuests.filter(matches);
  const notes      = allNotes.filter(matches);
  const partners   = allPartners.filter(matches);

  // Per-section add handler. When a location is selected we pre-fill it
  // in the modal; in "Todas" mode the modal opens with an empty location
  // so the user can still add from this screen.
  const prefillLoc = showAll ? '' : loc;

  const sharedLocSection = ({ title, addLabel, prefix, items, allLength, promptTitle, promptLabel, promptPlaceholder, removeTitle, editTitle }) =>
    renderLedgerSection({
      title,
      addLabel,
      onAdd: async () => {
        const result = await askEditItem({
          title: promptTitle,
          textLabel: promptLabel,
          textPlaceholder: promptPlaceholder,
          hasLocation: true,
          locationValue: prefillLoc,
        });
        if (!result) return;
        const it = {
          id: newId(),
          text: result.text,
          location: result.location || '',
          chapter: result.chapter,
          day: result.day,
        };
        store.dispatch(makeCommand(`ADD_${prefix}`, { to: it, index: allLength }));
      },
      body: renderTextLocRows(items, prefix, (it) => askConfirm({
        title: removeTitle,
        body: it.text ? `«${it.text}» se perderá.` : 'La entrada se perderá.',
      }), editTitle),
    });

  scene.append(renderLedgerSection({
    title: 'Misiones',
    addLabel: 'añadir',
    onAdd: async () => {
      const result = await askEditItem({
        title: 'Nueva misión',
        textLabel: '¿Qué encargo se acepta?',
        textPlaceholder: 'Recuperar la espada perdida',
        hasLocation: true,
        locationValue: prefillLoc,
      });
      if (!result) return;
      const it = {
        id: newId(),
        title: result.text,
        location: result.location || '',
        chapter: result.chapter,
        day: result.day,
        done: false,
      };
      store.dispatch(makeCommand('ADD_SIDE_QUEST', { to: it, index: allSideQuests.length }));
    },
    body: renderChecklistRows(sideQuests, 'SIDE_QUEST', (it) => askConfirm({
      title: '¿Borrar la misión?',
      body: `«${it.title}» será arrancada del diario.`,
    }), 'Editar misión'),
  }));

  scene.append(renderLedgerSection({
    title: 'Notas',
    addLabel: 'anotar',
    onAdd: async () => {
      const result = await askEditItem({
        title: 'Nueva nota',
        textLabel: '¿Qué se quiere recordar?',
        textPlaceholder: 'La hoguera ardió tres noches…',
        hasLocation: true,
        locationValue: prefillLoc,
      });
      if (!result) return;
      const n = {
        id: newId(),
        text: result.text,
        location: result.location || '',
        chapter: result.chapter,
        day: result.day,
      };
      store.dispatch(makeCommand('ADD_NOTE', { to: n, index: allNotes.length }));
    },
    body: renderNoteRows(notes),
  }));

  scene.append(sharedLocSection({
    title: 'Compañeros',
    addLabel: 'añadir',
    prefix: 'PARTNER',
    items: partners,
    allLength: allPartners.length,
    promptTitle: 'Nuevo compañero',
    promptLabel: 'Nombre o descripción',
    promptPlaceholder: 'Aedric el Bardo',
    removeTitle: '¿Olvidar a este compañero?',
    editTitle: 'Editar compañero',
  }));

  return scene;
};

/* -------------------------------------------------------------------------
   Transcurso del tiempo — el horarium

   A compact horizontal sundial: day arcs left-to-right from a gilded sun
   through six horæ into a darkening moon. The 10 chapters live on a thin
   strip above, each chapter a single pip with its own state mark.
   ------------------------------------------------------------------------- */

const ROMAN_NUMERALS = ['I', 'II', 'III', 'IV', 'V', 'VI'];
const TIME_WHEEL_SEGMENTS = 6;
const CHAPTER_COUNT = 10;

const setChapterTime = (chapter, from, to) => {
  const clamped = Math.max(0, Math.min(TIME_WHEEL_SEGMENTS, to));
  if (clamped === from) return;
  store.dispatch(makeCommand('SET_CHAPTER_TIME', { chapter, from, to: clamped }));
};

const renderHorariumChapters = (selected, counts) => {
  const strip = el('div', {
    class: 'horarium__chapters',
    role: 'tablist',
    'aria-label': 'Elegir capítulo',
  });

  for (let i = 0; i < CHAPTER_COUNT; i++) {
    const count = counts[i] || 0;
    const isSelected = i === selected;
    const isComplete = count >= TIME_WHEEL_SEGMENTS;
    const state = isComplete ? 'done' : count > 0 ? 'partial' : 'empty';

    strip.append(el('button', {
      type: 'button',
      class: 'horarium__chapter',
      role: 'tab',
      'aria-selected': isSelected ? 'true' : 'false',
      'aria-label': `Capítulo ${i + 1}, ${count} de ${TIME_WHEEL_SEGMENTS}`,
      dataset: { selected: isSelected ? 'true' : 'false', state },
      onclick: () => {
        if (i === selected) return;
        store.dispatch(makeCommand('SET_SELECTED_CHAPTER', { from: selected, to: i }));
      },
    },
      el('span', { class: 'horarium__chapter-num' }, String(i + 1)),
      el('span', { class: 'horarium__chapter-mark', 'aria-hidden': 'true' }),
    ));
  }

  return strip;
};

const renderHorariumBand = (chapter, count) => {
  const hours = el('div', {
    class: 'horarium__hours',
    role: 'group',
    'aria-label': 'Marcar las horas',
  });

  for (let i = 0; i < TIME_WHEEL_SEGMENTS; i++) {
    const isFilled = i < count;
    const isCurrent = isFilled && i === count - 1;
    // Tap a filled hour to retreat to its predecessor; any other jumps the
    // marker straight to that position. Mirrors the old wedge behaviour.
    hours.append(el('button', {
      type: 'button',
      class: 'horarium__hour',
      dataset: {
        tier: String(i),
        filled: isFilled ? 'true' : 'false',
        current: isCurrent ? 'true' : 'false',
      },
      'aria-pressed': isFilled ? 'true' : 'false',
      'aria-label': `Marcar ${ROMAN_NUMERALS[i]} (${i + 1} de ${TIME_WHEEL_SEGMENTS})`,
      onclick: () => setChapterTime(chapter, count, count === i + 1 ? i : i + 1),
    },
      el('span', { class: 'horarium__hour-glyph' }, ROMAN_NUMERALS[i]),
    ));
  }

  const full = count >= TIME_WHEEL_SEGMENTS;

  return el('div', {
    class: 'horarium__band',
    dataset: { full: full ? 'true' : 'false', count: String(count) },
    'aria-label': `Capítulo ${chapter + 1}, ${count} de ${TIME_WHEEL_SEGMENTS}`,
  },
    el('span', { class: 'horarium__celest horarium__celest--sun', 'aria-hidden': 'true' },
      icon('sun')),
    hours,
    el('span', { class: 'horarium__celest horarium__celest--moon', 'aria-hidden': 'true' },
      icon('moon')),
  );
};

const renderTimeTrackers = (doc) => {
  const counts = Array.isArray(doc.chapterTime) ? doc.chapterTime : [];
  const selected = Math.max(0, Math.min(CHAPTER_COUNT - 1, doc.selectedChapter ?? 0));
  const count = counts[selected] || 0;

  return el('div', { class: 'horarium' },
    renderHorariumChapters(selected, counts),
    renderHorariumBand(selected, count),
  );
};

// The horarium gets its own ledger head — the title on the left, and the
// active chapter's name on the right (where the add-button usually sits) so
// the band beneath needs no caption of its own.
const renderHorariumSection = (doc) => {
  const counts = Array.isArray(doc.chapterTime) ? doc.chapterTime : [];
  const selected = Math.max(0, Math.min(CHAPTER_COUNT - 1, doc.selectedChapter ?? 0));
  const count = counts[selected] || 0;
  const full = count >= TIME_WHEEL_SEGMENTS;

  const head = el('header', { class: 'ledger__head horarium__head' },
    el('h3', { class: 'ledger__title' }, 'Transcurso del tiempo'),
    el('span', { class: 'ledger__rule', 'aria-hidden': 'true' }),
    el('span', {
      class: 'horarium__chapter-label',
      dataset: { full: full ? 'true' : 'false' },
      'aria-live': 'polite',
    },
      el('span', { class: 'horarium__chapter-label-cap' }, 'cap.'),
      el('span', { class: 'horarium__chapter-label-num' }, String(selected + 1)),
    ),
  );

  return el('section', { class: 'ledger horarium-section' },
    head,
    renderTimeTrackers(doc),
  );
};

/* -------------------------------------------------------------------------
   Estados — la Hoja de Estados oficial
   ------------------------------------------------------------------------- */

let statusSearch = '';
let statusOnlyActive = false;

// Sort a list by `location` ascending (numeric-aware), placing items with no
// location at the end.
const sortByLocation = (items) => {
  const withLoc = [];
  const noLoc = [];
  for (const it of items) {
    if ((it.location || '').trim() !== '') withLoc.push(it);
    else noLoc.push(it);
  }
  withLoc.sort((a, b) =>
    (a.location || '').localeCompare(b.location || '', 'es', { numeric: true, sensitivity: 'base' }),
  );
  return [...withLoc, ...noLoc];
};

const renderStatuses = (doc) => {
  const scene = el('section', { class: 'scene' });
  const active = doc.statuses || {};

  // Controls: search box + activos toggle.
  const controls = el('div', { class: 'status-controls' },
    el('div', { class: 'status-search-wrap' },
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
      statusSearch && el('button', {
        type: 'button',
        class: 'status-search-clear',
        'aria-label': 'Borrar búsqueda',
        onclick: () => {
          statusSearch = '';
          render();
          document.querySelector('.status-search')?.focus({ preventScroll: true });
        },
      }, '×'),
    ),
    el('button', {
      type: 'button',
      class: 'status-onlyactive',
      'aria-pressed': statusOnlyActive ? 'true' : 'false',
      onclick: () => { statusOnlyActive = !statusOnlyActive; render(); },
      title: 'Mostrar sólo los estados con valor mayor que cero',
    }, 'activos'),
  );
  scene.append(controls);

  // Quick summary: every status with filled pips, sorted alphabetically.
  const activeStatuses = STATUSES
    .filter((s) => (active[s.id]?.length ?? 0) > 0)
    .sort((a, b) => stripAccents(a.name).localeCompare(stripAccents(b.name), 'es'));
  if (activeStatuses.length > 0) {
    const summary = el('ul', { class: 'status-summary' });
    for (const s of activeStatuses) {
      const filled = (active[s.id] || []).slice().sort((a, b) => a - b);
      const value = s.unnumbered ? '•'.repeat(filled.length).split('').join(' ') : filled.join(', ');
      summary.append(
        el('li', { class: 'status-summary__item' },
          el('span', { class: 'status-summary__name' }, s.name),
          el('span', { class: 'status-summary__value' }, value),
        ),
      );
    }
    scene.append(summary);
  }

  const q = stripAccents(statusSearch.trim());
  let filtered = STATUSES;
  if (q) filtered = filtered.filter((s) => stripAccents(s.name).includes(q));
  // While searching, ignore the "activos" filter so a typed query always
  // surfaces every matching estado.
  else if (statusOnlyActive) filtered = filtered.filter((s) => (active[s.id]?.length ?? 0) > 0);

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
    // Two-column grid keeps the alphabetical list compact. Items flow
    // row-by-row so adjacent reading stays alphabetical.
    const grid = el('div', { class: 'alpha__items' });
    for (const s of items) {
      grid.append(renderStatusRow(s, active[s.id] ?? []));
    }
    scene.append(grid);
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

// Keep the screen awake while the app is open. The OS releases the wake
// lock whenever the document is hidden (app switch, lock screen) and never
// restores it, so we re-request on visibilitychange. iOS PWAs additionally
// reject the first cold-launch request until there's been a user gesture,
// so we also retry on the first pointerdown.
let wakeLock = null;
const acquireWakeLock = async () => {
  if (!('wakeLock' in navigator)) return;
  if (document.visibilityState !== 'visible') return;
  if (wakeLock) return;
  try {
    wakeLock = await navigator.wakeLock.request('screen');
    wakeLock.addEventListener('release', () => { wakeLock = null; });
  } catch {
    wakeLock = null;
  }
};
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') acquireWakeLock();
});
window.addEventListener('pointerdown', () => { acquireWakeLock(); }, { passive: true });
acquireWakeLock();

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
      return `Borrar misión «${p.from?.title ?? '?'}»`;
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
    case 'REMOVE_SIDE_QUEST': return `Borrar misión secundaria «${p.from?.title ?? '?'}»`;
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
    case 'ADD_PARTNER':          return `Compañero inscrito: «${(p.to?.text || '').slice(0, 40)}»`;
    case 'REMOVE_PARTNER':       return `Compañero borrado: «${(p.from?.text || '').slice(0, 40)}»`;
    case 'UPDATE_PARTNER':       return `Compañero editado: «${(p.to?.text || '').slice(0, 40)}»`;
    case 'ADD_GUARDIAN':         return `Guardián inscrito: «${(p.to?.text || '').slice(0, 40)}»`;
    case 'REMOVE_GUARDIAN':      return `Guardián borrado: «${(p.from?.text || '').slice(0, 40)}»`;
    case 'UPDATE_GUARDIAN':      return `Guardián editado: «${(p.to?.text || '').slice(0, 40)}»`;
    case 'ADD_PERDITION_KING':   return `Rey de la Perdición inscrito: «${(p.to?.text || '').slice(0, 40)}»`;
    case 'REMOVE_PERDITION_KING':return `Rey de la Perdición borrado: «${(p.from?.text || '').slice(0, 40)}»`;
    case 'UPDATE_PERDITION_KING':return `Rey de la Perdición editado: «${(p.to?.text || '').slice(0, 40)}»`;
    case 'ADD_LOCATION':         return `Locación revelada: «${p.to?.location || '∅'}»`;
    case 'REMOVE_LOCATION':      return `Locación olvidada: «${p.from?.location || '∅'}»`;
    case 'UPDATE_LOCATION': {
      const code = p.to?.location || p.from?.location || '∅';
      return `Locación «${code}» editada`;
    }
    case 'ADD_GUIDE_STONE':      return `Roca Guía inscrita`;
    case 'REMOVE_GUIDE_STONE':   return `Roca Guía borrada`;
    case 'SET_GUIDE_STONE_FIELD':
      return `Roca Guía — cuadrante ${p.field.slice(1)}: ${p.from || '∅'} → ${p.to || '∅'}`;
    case 'ADD_NOTE':
      return `Nota añadida: «${(p.to?.text || '').slice(0, 40)}${(p.to?.text?.length ?? 0) > 40 ? '…' : ''}»`;
    case 'REMOVE_NOTE':
      return `Nota borrada: «${(p.from?.text || '').slice(0, 40)}${(p.from?.text?.length ?? 0) > 40 ? '…' : ''}»`;
    case 'UPDATE_NOTE':
      return `Nota editada: «${(p.to?.text || '').slice(0, 40)}${(p.to?.text?.length ?? 0) > 40 ? '…' : ''}»`;
    case 'TOGGLE_NOTE': {
      const n = findIn('notes', p.id);
      return `Nota${n ? ` «${(n.text || '').slice(0, 40)}»` : ''}: ${p.to ? 'cumplida' : 'reabierta'}`;
    }
    case 'TOGGLE_PARTNER': {
      const it = findIn('partners', p.id);
      return `Compañero${it ? ` «${it.text}»` : ''}: ${p.to ? 'cumplido' : 'reabierto'}`;
    }
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
  const doc = store.state.doc;
  const payload = {
    app: 'kor-companion',
    // `version` is the SW build tag (which app build wrote the file).
    // `schemaVersion` is the data shape revision — what `migrate()` keys off.
    version: swVersion || 'unknown',
    schemaVersion: doc.schemaVersion,
    exportedAt: new Date().toISOString(),
    doc,
    history: store.history.serialize(),
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
    store.importDoc(doc, payload?.history);
    closeDrawer();
  });
  input.click();
};

const renderDrawerMenu = () => {
  const wrap = el('div', { class: 'drawer__menu' });

  // Undo / redo — a single rune-bar at the top of the menu. The pair sits
  // side by side because the actions are inverse: rolling time back and
  // letting it forward. Disabled when the history has nothing on that side.
  const canUndo = store.canUndo();
  const canRedo = store.canRedo();
  const actions = el('div', { class: 'drawer__actions', role: 'group', 'aria-label': 'Cronología' },
    el('button', {
      type: 'button',
      class: 'drawer__action',
      disabled: !canUndo,
      'aria-label': 'Deshacer',
      onclick: () => { undoWithToast(); },
    },
      el('span', { class: 'drawer__action-glyph' }, icon('undo')),
      el('span', { class: 'drawer__action-label' }, 'Deshacer'),
    ),
    el('span', { class: 'drawer__actions-sep', 'aria-hidden': 'true' }),
    el('button', {
      type: 'button',
      class: 'drawer__action',
      disabled: !canRedo,
      'aria-label': 'Rehacer',
      onclick: () => { redoWithToast(); },
    },
      el('span', { class: 'drawer__action-glyph' }, icon('redo')),
      el('span', { class: 'drawer__action-label' }, 'Rehacer'),
    ),
  );

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

  wrap.append(actions, list);
  return wrap;
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
  if (variant === 'cell') classes.push('hero__cell-input');
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

// Stat dropdown for the hero cells (Habilidades / Vitalidad / Recursos).
// Renders a 0..max <select> with a leading "—" empty option; non-matching
// stored values just leave the select unselected until the user picks.
const sheetSelect = ({ path, label, min = 0, max = 20 }) => {
  const initial = String(getSessionAt(path) ?? '');
  const options = [el('option', { value: '' }, '—')];
  for (let i = min; i <= max; i++) {
    options.push(el('option', { value: String(i) }, String(i)));
  }
  const select = el('select', {
    class: 'hero__cell-input hero__cell-input--select',
    'aria-label': label || path.join('.'),
    dataset: { sessionPath: path.join('.') },
    onchange: (e) => {
      const from = getSessionAt(path);
      const to = e.target.value;
      if (String(from ?? '') === to) return;
      store.dispatch(makeCommand('SET_SESSION_FIELD', { path, from, to }));
    },
  }, ...options);
  // Assigning value *after* the options exist lets the matching <option>
  // pick up `selected`. Falls back to "" (the "—" option) when the stored
  // value isn't in range.
  select.value = initial;
  return select;
};

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

const sigilSvg = (idx) =>
  ICON_PARSER.parseFromString(CHARACTER_SIGILS[idx], 'image/svg+xml').documentElement;

const sigilNode = (idx) => {
  const wrap = el('span', { class: 'gamesheet__sigil', 'aria-hidden': 'true' });
  wrap.append(sigilSvg(idx));
  return wrap;
};

// Lowercase key for [data-hero] attribute / accent CSS.
const heroKey = (idx) => CHARACTER_NAMES[idx].toLowerCase();

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
              hasLocation: true,
              locationValue: it.location || '',
            });
            if (!result) return;
            const to = { ...it, text: result.text, location: result.location || '' };
            if (to.text === (it.text || '') && to.location === (it.location || '')) return;
            store.dispatch(makeCommand('UPDATE_HERO_ITEM', { heroIdx, id: it.id, from: it, to }));
          },
        },
          it.location ? el('span', { class: 'ledger__row-loc ledger__note-loc' }, it.location) : null,
          el('span', { class: 'ledger__note-body' }, it.text),
        ),
        el('button', {
          type: 'button',
          class: 'ledger__row-del',
          'aria-label': 'Borrar nota',
          onclick: async () => {
            const ok = await askConfirm({
              title: '¿Borrar la nota?',
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
      const result = await askEditItem({
        title: `Anotar para ${heroName}`,
        textLabel: '¿Qué se quiere recordar?',
        textPlaceholder: 'Una bolsa de monedas, una llave oxidada…',
        hasLocation: true,
      });
      if (!result) return;
      const it = { id: newId(), text: result.text, location: result.location || '' };
      store.dispatch(makeCommand('ADD_HERO_ITEM', { heroIdx, to: it, index: items.length }));
    },
    body: renderHeroItemRows(heroIdx, items),
  });
};

const renderPlayerCard = (idx, orderIndex = 0) => {
  const characterName = CHARACTER_NAMES[idx];
  const key = heroKey(idx);

  const cell = (statKey, label, short, opts = {}) =>
    el('label', { class: 'hero__cell' },
      sheetSelect({
        path: ['players', idx, statKey],
        label: `${characterName}, ${label}`,
        ...opts,
      }),
      el('span', { class: 'hero__cell-label' }, short || label),
    );

  const group = (title, modifier, ...cells) =>
    el('section', { class: 'hero__group', dataset: { group: modifier } },
      el('header', { class: 'hero__rubric' },
        el('span', { class: 'hero__rubric-mark', 'aria-hidden': 'true' }),
        el('h4', { class: 'hero__rubric-title' }, title),
        el('span', { class: 'hero__rubric-line', 'aria-hidden': 'true' }),
      ),
      el('div', { class: 'hero__cells' }, ...cells),
    );

  return el('article', {
    class: 'hero',
    dataset: { hero: key },
    style: `--hero-i: ${orderIndex}`,
  },
    el('header', { class: 'hero__head' },
      el('h3', { class: 'hero__name' }, characterName),
      // Location sits inline next to the name, wrapped in literal parens
      // via CSS ::before/::after so the input flow remains accessible.
      el('label', { class: 'hero__loc', 'aria-label': `${characterName}, Localización` },
        el('span', { class: 'hero__loc-tag' }, 'en la'),
        sheetInput({
          path: ['players', idx, 'location'],
          placeholder: '101',
          label: `${characterName}, Localización`,
          autocapitalize: 'none',
          inputmode: 'numeric',
          variant: 'location',
        }),
      ),
      el('button', {
        type: 'button',
        class: 'hero__remove',
        'aria-label': `Quitar a ${characterName} de la sesión`,
        title: 'Quitar de la sesión',
        onclick: async () => {
          const ok = await askConfirm({
            title: `¿Quitar a ${characterName}?`,
            body: 'Sus datos quedarán guardados en el tomo; podrás volver a añadirlo más tarde.',
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
    el('div', { class: 'hero__content' },
      group('Habilidades', 'skills',
        cell('agresividad',    'Agresividad',    'Agresividad'),
        cell('audacia',        'Audacia',        'Audacia'),
        cell('logica',         'Lógica',         'Lógica'),
        cell('empatia',        'Empatía',        'Empatía'),
        cell('cautela',        'Cautela',        'Cautela'),
        cell('espiritualidad', 'Espiritualidad', 'Espiritual.'),
      ),
      group('Vitalidad', 'vitality',
        cell('energia', 'Energía', 'Energía'),
        cell('salud',   'Salud',   'Salud'),
        cell('terror',  'Terror',  'Terror'),
      ),
      group('Recursos', 'resources',
        cell('food',   'Comida',      'Comida',      { max: 50 }),
        cell('wealth', 'Riqueza',     'Riqueza',     { max: 50 }),
        cell('exp',    'Experiencia', 'Exp.',        { max: 50 }),
        cell('magic',  'Magia',       'Magia',       { max: 50 }),
      ),
      el('div', { class: 'hero__items' }, renderHeroItemsSection(idx, characterName)),
    ),
  );
};

const renderHeroes = (doc = store.state.doc) => {
  const scene = el('section', { class: 'scene gamesheet' });

  // Transcurso del tiempo lives at the top of the gamesheet now — the
  // horarium is the first thing players reach for between turns.
  scene.append(renderHorariumSection(doc));

  // Locaciones — the deck of revealed location cards (and any Roca Guía
  // boards). Sits between time and the heroes grid.
  const locations   = doc.locations   || [];
  const guideStones = doc.guideStones || [];
  scene.append(renderLocationsSection(locations, guideStones));

  const session = store.state.doc.session || {};
  const selected = Array.isArray(session.selectedHeroes) ? session.selectedHeroes : [];
  const available = CHARACTER_NAMES.map((_, i) => i).filter((i) => !selected.includes(i));

  const heroesGrid = el('div', { class: 'gamesheet__heroes' });
  selected.forEach((idx, i) => heroesGrid.append(renderPlayerCard(idx, i)));

  // The add card sits inside the grid so on wide screens it slots in beside
  // existing heroes; on narrow it stacks below. It only renders while there
  // are heroes left to choose from.
  if (available.length > 0) {
    heroesGrid.append(
      el('button', {
        type: 'button',
        class: 'gamesheet__add-hero',
        dataset: { empty: selected.length === 0 ? 'true' : 'false' },
        style: `--hero-i: ${selected.length}`,
        onclick: async () => {
          const pick = await askHeroPicker(available);
          if (pick == null) return;
          store.dispatch(makeCommand('ADD_HERO', { to: pick, index: selected.length }));
        },
      },
        el('span', { class: 'gamesheet__add-hero-mark', 'aria-hidden': 'true' }, icon('plus')),
        el('span', { class: 'gamesheet__add-hero-label' },
          selected.length === 0 ? 'Convocar al primer héroe' : 'Convocar a otro héroe',
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
  if (a.dataset?.locAddInput) {
    // The add-input is a transient buffer for typed-but-unsubmitted text,
    // so capture its value too — otherwise an external re-render mid-type
    // would silently wipe what the user was about to enter.
    return { kind: 'loc-add-input', value: a.value, sel: a.selectionStart ?? null };
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
  } else if (snap.kind === 'loc-add-input') {
    const input = document.querySelector('[data-loc-add-input]');
    if (input) {
      input.value = snap.value || '';
      input.focus({ preventScroll: true });
      if (snap.sel != null) {
        try { input.setSelectionRange(snap.sel, snap.sel); } catch {}
      }
    }
  }
};

const render = () => {
  const snap = captureFocus();
  const doc = store.state.doc;
  setTabs(doc.tab);
  view.replaceChildren();
  if (doc.tab === 'heroes')          view.append(renderHeroes(doc));
  else if (doc.tab === 'byLocation') view.append(renderByLocation(doc));
  else                               view.append(renderStatuses(doc));
  // The undo/redo controls live in the drawer now; if it's open, rerender
  // so disabled-states and the action items stay in sync with the store.
  if (drawerOpen) renderDrawerBody();
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
