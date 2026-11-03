# Pražec

Kytarová webová aplikace: ladička, akordy, zpěvník s importem z webu, trénink, přechody, metronom a pokrok.

- Zdroj je v `src/` (`body.html`, `styles.css`, `music.js`, `app.js`).
- `node build.mjs` sestaví `docs/` (to publikuje GitHub Pages) (index.html, manifest, service worker, a do `out/` verzi pro claude.ai). Ikony vyrábí `node icons.js` (Playwright).
- `node test.js` otestuje převod akordů a import textu.
- Data se ukládají v telefonu (localStorage). Zálohu stáhneš v Pokrok → Nastavení.
