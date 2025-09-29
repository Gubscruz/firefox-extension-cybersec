# Privacy Shield A+ (Firefox WebExtension – Manifest V2)

Advanced privacy / anti-tracking extension implementing request classification, tracker blocking, cookie & storage inspection, cookie sync and fingerprinting detection, hijack heuristics, and a transparent scoring model.

## Feature Matrix (Concept A Coverage)

| Feature                           | Implemented | Notes                                                   |
| --------------------------------- | ----------- | ------------------------------------------------------- |
| 1st vs 3rd-party detection        | ✅          | eTLD+1 mapping per tab via `webNavigation.onCommitted`  |
| Tracker identification            | ✅          | Built-in `tracker_domains.json` + regex support         |
| Blocking engine                   | ✅          | `webRequestBlocking` cancels tracker/blocked domains    |
| Per-site overrides                | ✅          | Allow / Block / Regex lists in Options UI               |
| Global enable/disable             | ✅          | Toggle in Options                                       |
| Cookie inventory & classification | ✅          | Session vs persistent & 1st vs 3rd in popup             |
| HTML5 storage detection           | ✅          | localStorage, sessionStorage, IndexedDB, Cache Storage  |
| Cookie syncing detection          | ✅          | SHA-1 hashed comparison + optional raw (deep) mode      |
| Canvas fingerprinting detection   | ✅          | Monkey patches canvas APIs, heuristic thresholds        |
| Hijack indicators                 | ✅          | Detect hook.js, beforeunload, popup flood               |
| Privacy score (0–100)             | ✅          | Weighted deductions with caps, detailed breakdown       |
| Popup dashboard                   | ✅          | Score, requests, cookies, storage, alerts, blocked list |
| Options page                      | ✅          | Rules management + import/export JSON                   |
| Report page                       | ✅          | Site filter + CSV export of events/alerts               |
| CSV export                        | ✅          | Report page button                                      |
| Dark theme polished UI            | ✅          | Consistent styling across pages                         |

## File Structure

```
manifest.json
package.json
web-ext.config.js
src/
	background/
		background.js
		requestClassifier.js
		cookieSyncDetector.js
		storage.js
		score.js
		rulesEngine.js
		domainUtils.js
		hijackDetector.js
		messaging.js
	content/
		contentProbe.js
		canvasHook.js
	ui/
		popup.html
		popup.js
		popup.css
		options.html
		options.js
		options.css
		report.html
		report.js
		report.css
	assets/
		icon-16.png
		icon-48.png
		icon-128.png
	rules/
		tracker_domains.json
LICENSE
README.md
```

## Install & Run (Development)

### With web-ext

```
npm install
npm run start:ff
```

This launches Firefox with the extension loaded temporarily. Any changes trigger auto-reload.

### Manual Temporary Load

1. `about:debugging#/runtime/this-firefox`
2. "Load Temporary Add-on" → select `manifest.json`.

## Permissions Rationale

| Permission                      | Reason                                                         |
| ------------------------------- | -------------------------------------------------------------- |
| webRequest / webRequestBlocking | Inspect & optionally cancel tracker/third-party requests       |
| webNavigation                   | Determine top-level site per tab for 1st vs 3rd classification |
| cookies                         | Enumerate and classify 1st vs 3rd-party cookies                |
| storage                         | Persist rules, events, summaries                               |
| tabs / activeTab                | Access active tab URL for popup context                        |
| <all_urls>                      | Needed to observe & act on requests across sites               |

No data leaves the browser. Cookie values are hashed (SHA-1) for sync detection unless deep mode is explicitly enabled.

## Privacy Score Model

Start: 100

| Component                    | Deduction | Cap   |
| ---------------------------- | --------- | ----- |
| Unique 3rd-party domains     | −1 each   | −20   |
| Tracker domains              | −2 each   | −30   |
| 3rd-party cookies            | −1 each   | −15   |
| 1st-party persistent cookies | −0.5 each | −5    |
| Canvas fingerprint suspect   | −10       | fixed |
| Cookie sync detected         | −15       | fixed |
| Hijack indicators            | −15       | fixed |

Floor at 0. UI presents total plus per-component breakdown.

## Custom Rules

In Options:

- Add `example.com` or `*.example.com` (default treated as block rule unless prefixed)
- Prefix with `allow:` to force allow, `block:` to force block, or `regex:/pattern/` for regex.
- Export → downloads JSON. Import → merges from selected file (overwrites existing structure).

## Cookie Sync Detection

1. Collect 1st-party cookie name → SHA-1(value).
2. For each third-party request, parse query + fragment values.
3. Hash param values and compare to cookie hashes (and optionally raw values when deep mode enabled).
4. Record match events with cookie name, recipient domain, match type (hash/raw).

## Canvas Fingerprinting Heuristics

- Counts reads (`toDataURL`, `getImageData`, `toBlob`) per second.
- Flags if >10 reads in <1s window or >50 `measureText` calls.
- Periodic message to background with stats & suspect flag.

## Hijack Indicators

- Added `<script src=.../hook.js>` detection.
- `beforeunload` handler presence.
- More than 5 rapid `window.open` calls → popup flood.

## Report Page

Currently aggregates alerts (cookie sync, canvas, hijack). Network request events could be extended by enumerating stored per-tab arrays if tab IDs are tracked historically.

## Testing / Demonstration Steps

1. Trackers: Visit a major news site (e.g., cnn.com) – popup should list 3rd-party & tracker domains; some blocked.
2. Canvas: Open a canvas fingerprint test page (e.g., browserleaks.com/canvas) – triggers Canvas FP alert badge.
3. Cookie Sync: Use a test page that echoes cookie values in request parameters → observe Cookie Sync alert.
4. Storage: On a test page run in console:
   ```js
   localStorage.setItem("k1", "v");
   sessionStorage.setItem("k2", "v");
   indexedDB.open("demoDB");
   caches.open("demoCache");
   ```
   Reopen popup → storage counts update.
5. Hijack: Inject a script tag with src ending `/hook.js` or add `window.addEventListener('beforeunload',()=>{})` – expect Hijack alert.
6. Export: Open report → Export CSV → confirm downloaded file rows.
7. Rules: Add `allow:doubleclick.net` → confirm previously blocked domain now allowed (reload page).

## Build

```
npm run build
```

Creates a distributable `.zip` via `web-ext`.

## Future Enhancements

- Persist historical per-site scoring over time.
- More granular fingerprinting API coverage (WebGL, AudioContext).
- Improved UI for rule precedence explanation.
- Add unit tests & eslint config.

## Security & Privacy Notes

- No remote network calls by extension logic itself.
- Cookie values not stored unless deep sync check is on; even then, not exported.
- SHA-1 used only as a non-cryptographic mapping tool (collision risk acceptable for heuristic matching).

## License

MIT – see `LICENSE`.
