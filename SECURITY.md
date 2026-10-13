# Security

## Reporting a problem

Please report security issues privately using GitHub's
[private vulnerability reporting](https://github.com/Bibek2250/Cash-Counter/security/advisories/new)
rather than opening a public issue. You should get a reply within a week.

## How the app is protected

Cash Counter is a static site with no server, no accounts and no tracking. Counts are stored
only in the browser's own storage on your device.

- **Content Security Policy** (in `index.html`): the page can only load files from its own
  site. Inline scripts, `eval`, plugins, forms and `<base>` tags are all blocked.
- **Trusted Types**: browsers that support it refuse to turn strings into HTML or script URLs.
  The code never uses `innerHTML`; all text goes into the page as plain text. The only
  allowed script URL is the service worker, through the `cash-counter` policy in `js/app.js`.
- **No third parties**: fonts are hosted with the app, so visiting it sends nothing to other
  companies. `<meta name="referrer" content="no-referrer">` stops the address leaking out.
- **Untrusted data is cleaned**: anything read from storage, typed in or heard by voice
  commands is checked against the known notes and coins and clamped to whole numbers from
  0 to 99,999 before use (`sanitizeCounts` in `js/counts.js`, covered by tests).
- **Offline cache** (`sw.js`): only ever stores the app's own listed files, fetched
  successfully from this site, so crafted links can't fill the cache or slip other content
  into it. Requests to other sites are never touched.
- **No framing**: the app refuses to run inside another site's page (clickjacking), and shows
  a link to open it in its own tab instead.
- **Microphone**: only used after you press "Voice commands", and stops when you press it
  again or switch away from the tab. In Chrome and Edge, speech is turned into text by the
  browser maker's servers.
- **Checked automatically**: `tests/security.test.js` fails the build if the Content Security
  Policy is weakened or any script starts using `innerHTML`, `eval` or similar. GitHub Actions
  are pinned to exact commits, and Dependabot keeps those pins up to date.

## Limits

GitHub Pages doesn't allow custom HTTP headers, so protections that only work as headers
(`frame-ancestors`, `Permissions-Policy`, HSTS preload) can't be set. Framing is blocked in
script instead, which a page that disables scripts in its frame can get around, but then the
app's buttons do nothing. The app holds no secrets or accounts, so the risk is low.
