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
- client-side image downsampling tuned to ~1200px / 82% JPEG for weaker mobile networks
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


## Added in v8
- homepage hero now tries to fetch `/api/stats/summary` and falls back to cached/local impact data
- client-side image prep defaults increased to ~1200px / 82% JPEG for better standardization before matching
- added a community-watch WhatsApp generator for neighborhood groups
- added breed quick filters on the search results screen
- added an optional verification-question flow with hashed answers in the exported animal library
- added a dark-mode media block and stronger modal styling
- added Background Sync scaffolding in `sw.js` / `assets/app.js` for future hosted JSON submissions
- added a radius control so future hosted map flows can reuse the same user intent

## Important caveat for v8
The verification flow works fully in the browser only for hashes stored in the public library JSON. Background Sync is implemented as a scaffold for future JSON report endpoints, but the static GitHub Pages search flow still does not have a live upload API to retry.


## v9 additions

- Frontend matching now normalizes a dedicated 512x512 grayscale copy before extracting browser-side features. This keeps the display image intact while making vector extraction more stable.
- Hebrew city and breed inputs now use lightweight fuzzy ranking so small spelling differences like פינצ'ר / פינצר still surface the same suggestions.
- The PWA queue can now be flushed on `online` and by direct message to the service worker, in addition to Background Sync.
- `app/animal_embeddings.py` now models a real hosted vector-matching path using `scipy.spatial.distance.cosine` and candidate ranking helpers.

## Accuracy note

There is no honest way to claim a current global "accuracy score" from this static bundle without a labeled test set. Measure accuracy only after you benchmark on a held-out dataset of real missing/found animal photos.


## Animal-only preprocessing roadmap

The GitHub Pages build now includes **browser-side smart scan** using TensorFlow.js COCO-SSD so the UI can auto-focus on a dog/cat/bird/horse before searching. This is useful for the public demo, but the strongest version belongs in the hosted backend:

- run **YOLOv8** or a similar detector first,
- crop tightly to the detected animal with ~10% padding,
- blur any detected **human faces** before saving or exposing an image,
- optionally run **background removal** (for example with `rembg`) before embedding extraction,
- then compute the animal embedding on the cleaned crop only.

Included scaffold file: `app/animal_preprocess.py`

That file is not wired into the static GitHub Pages flow. It is the next hosted step so the system can ignore people, clothes and busy backgrounds more consistently.


## v11 additions
- Frontend now supports a low-data mode that automatically compresses search images more aggressively on weak connections.
- Added local neighborhood alert opt-in using the Notifications API. Real Web Push still requires a hosted backend and VAPID keys.
- Added community flyer generation as a PNG for sharing in WhatsApp and neighborhood groups.
- Current GitHub Pages build already combines visual embedding similarity, color histogram similarity, and breed/type boosts into one score. This is not a benchmarked accuracy metric.
- For a hosted phase, add real push subscriptions, a heatmap layer, a poster/PDF endpoint, and chip-scanner directories by municipality.


## v12 additions
- Frontend smart scan now prefers larger animal detections and penalizes heavy overlap with people.
- Visual matching now uses a clearer composite score: embedding/structure + fur-color histogram + breed similarity.
- Added a printable poster flow that opens a print-friendly page and supports saving as PDF from the browser.
- Marker clustering is still not live in this static build because there is no full Leaflet results map here yet; it remains a hosted-phase task.
