# Production upgrade notes

This bundle keeps the public site GitHub-Pages friendly, while adding a scaffold for the next hosted phase.

## Already added in this bundle
- visible scan progress on search and enrollment
- instant result filtering by animal type, source, and strong matches only
- quick share actions: share top result, WhatsApp, and 106 email draft
- stronger service-worker caching with query-safe cache fallback
- more defensive loading for `assets/common.js`

## Next hosted step
When you move off GitHub Pages, these are the recommended upgrades:

1. Replace browser-only matching with backend embeddings.
2. Store vectors in PostgreSQL with `pgvector`.
3. Add API rate limiting with `slowapi`.
4. Add authenticated volunteer weighting and audit logs.
5. Add true offline upload retry using IndexedDB + Background Sync.
6. Add a map flow with manual pin-drop and radius search.

## Suggested search threshold
- strong visual match: `>= 0.75`
- color-only fallback: show top results, but label them clearly as color similarity only

## Important note
The static site still performs matching in the browser for GitHub Pages compatibility. The new backend scaffold files are documentation and starter code, not a deployed production pipeline yet.


## Added in this refresh
- cache-first static asset loading in `sw.js` for faster offline boot
- `manifest.webmanifest` + install icons
- translation helper split into `assets/i18n.js` for future HE/AR/EN expansion
- home-page instant match gallery backed by the last top-3 local search results

## Privacy-safe map groundwork
This GitHub Pages build still does not ship a live Leaflet map, but `assets/common.js` now includes a `privacyBlurCoordinates(...)` helper so the hosted version can show an approximate 100m area instead of an exact home point.


## Added in v3
- search page code cleaned into `search.inline.js` instead of a huge inline block
- cache-first service worker now explicitly pre-caches `search.inline.js` and `enroll.inline.js`
- client-side image downsampling tuned to ~1024px / 80% JPEG for weaker mobile networks
- result cards now show a stronger score pill and immediate share / WhatsApp / 106 actions
- 106 and share flows now use privacy-blurred coordinates by default


## עדכון v4
- נוסף `assets/app.js` כקובץ תאימות לשיטות `shrinkImage`, `displayMatches`, `postMultipart`.
- דף הבית משתמש כעת ב-`match-results-container` מפורש לגלריית ההתאמות האחרונות.
- `sw.js` שודרג ל-v11 ומקדים גם את `assets/app.js`.


## משתני סביבה ואבטחה

- בגרסת GitHub Pages אין מפתחות שרת חיים, אבל בגרסה המתארחת אסור לשמור מפתחות API או מחרוזות חיבור ב-`config.js` ציבורי.
- שמרי קבצי סודיות כ-`.env` או `config.local.js` מחוץ ל-Git, והזרימי אותם לשרת דרך משתני סביבה.
- מומלץ להוסיף בדיקות build שמוודאות שאין `API_KEY=` או `postgres://` בקבצים הציבוריים.


## Added in v7
- auto timestamping on the search page the moment a photo is chosen
- reverse-geocode helper for geolocation so the location field can prefill automatically when connectivity exists
- breed-aware enroll/search fields with chips and browser-side ranking boosts
- local-only impact counters and badges on the homepage (searches, strong matches, exports)
- blur-up image rendering on result cards for a faster feel on slower devices
- hosted-only scaffolding for the Owner Wall in `app/security.py`
- hosted-only `pgvector` + HNSW SQL starter in `app/vector_index.sql`

## Owner Wall guidance
For the hosted backend, expose only the verification prompt publicly. Keep the verification answer hash, owner phone number, and any proof-of-ownership workflow strictly server-side.

## What is still static-only here
The GitHub Pages build still cannot safely expose private owner contact data, proof-of-ownership uploads, or real badge leaderboards. Those features require a hosted backend and authenticated users.
