# Cash Counter

Count Australian notes, coins and coin rolls and see the total instantly. The app
works offline, and can be installed on a phone or computer.

**Use it:** https://bibek2250.github.io/Cash-Counter/

## Features

- Drawn notes and coins at their real relative sizes, with piles that grow as you count
- Count loose coins and bank rolls of each coin side by side
- Float & banking: enter how much to leave in the till and see the amount to bank
- Safe count: switch between Till and Safe, count the safe's notes and coin rolls, and see
  whether it's balanced, over or short against the expected amount
- Print safe count: a plain printed report of the safe, line by line, with the result
- Counts last until you close the app (a refresh keeps them); the float and expected safe
  amounts are remembered. Undo after Clear all
- Read total: hear the count spoken aloud
- Accessible: screen reader announcements, full keyboard use (arrow keys, Shift for bulk),
  a Reduce motion switch, high-contrast and forced-colours support
- Works offline as an installable web app

## Project layout

```
index.html            Page structure and security policy
style.css             All styling
sw.js                 Service worker (offline support)
manifest.json         Install settings
js/
  app.js              Entry point: state, rendering and events
  currencies.js       Australian notes, coins and roll sizes, and money formatting
  counts.js           Pure counting logic (clamping, totals, saved-data cleanup)
  float.js            Pure float maths (amount parsing, float/bank split)
  float-ui.js         Float & banking section
  safe.js             Pure safe check maths (balanced, over or short)
  safe-ui.js          Safe check section
  report.js           Pure printed safe report
  print-ui.js         Print safe count button and print layout
  art.js              Drawn notes and coins (SVG)
  read-aloud.js       "Read total" (speech synthesis)
  effects.js          Animations and the reduce-motion setting
  storage.js          Safe localStorage access
  dom.js              Element helpers (no HTML strings)
fonts/                Self-hosted fonts and their licences
tests/                Automated tests (Node's built-in test runner)
```

## Running it locally

The app uses JavaScript modules, which browsers only load from a web server, not by
double-clicking `index.html`. From this folder, run either:

```bash
npm start                      # needs Node.js
python -m http.server 8000     # needs Python, then open http://localhost:8000
```

## Tests

Requires Node.js 20 or newer. No packages to install.

```bash
npm test
```

Tests also run automatically on GitHub for every push and pull request.

## Making a release

1. Bump `CACHE` in `sw.js` (so installed apps update) and `version` in `package.json`.
2. Commit and push, then tag: `git tag -a v1.2.0 -m "Cash Counter v1.2.0"` and `git push origin v1.2.0`.
3. Create the release on GitHub from that tag.

## Security

See [SECURITY.md](SECURITY.md) for how the app is protected and how to report a problem.

## Credits

Fonts: [Archivo](https://github.com/Omnibus-Type/Archivo) and
[JetBrains Mono](https://github.com/JetBrains/JetBrainsMono), both under the SIL Open Font
License (see `fonts/`). Note and coin pictures are simplified drawings, not reproductions
of real banknotes.
