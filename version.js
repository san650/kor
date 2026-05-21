// Single source of truth for the deployed shell version.
// Loaded by index.html as a plain script (sets globalThis.KOR_VERSION)
// and by sw.js via importScripts (sets self.KOR_VERSION).
// Bump this string on every deploy.
(self || globalThis).KOR_VERSION = 'v16';
