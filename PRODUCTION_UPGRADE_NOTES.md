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
