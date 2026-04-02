# PetConnect Pages

Static GitHub Pages version of the PetConnect photo-search idea.

## What this version is for

This build is designed for **GitHub Pages** and other static hosting.
It runs face search **in the browser** using `face-api.js`.

Use it when you want to:
- publish a quick public search page without hosting Python
- demo the product flow
- test a small face library

## What it can do

- `search.html`: visitor uploads one image and the browser compares the best detected face against your published library
- `enroll.html`: admin helper to build a library locally in the browser and export a `library.json`
- `data/library.json`: repo-backed search index for public visitors

## What it cannot do on GitHub Pages alone

- store shared public uploads into one central database
- run FastAPI / Python / server-side pipelines
- process videos or long background jobs
- keep private admin state for all users

## Quick publish

1. Create a GitHub repo.
2. Put all files from this folder in the repo root.
3. Commit and push.
4. In GitHub, enable Pages and publish from the repository root or `/docs` if you move the files there.
5. Open `search.html` on the published site.

## Build your library

### Fast local test

1. Open `enroll.html`.
2. Add one person with several sample photos.
3. Export the JSON.
4. Open `search.html` in the same browser and test.

### Publish the library for everyone

1. Export the JSON from `enroll.html`.
2. Replace `data/library.json` with the exported file.
3. Commit and push.
4. Optional: replace data-URL thumbs with file paths inside the repo for a cleaner library.

## `library.json` format

```json
{
  "version": 1,
  "updated_at": "2026-04-02",
  "entries": [
    {
      "id": "jane-doe",
      "label": "Jane Doe",
      "href": "./profiles/jane.html",
      "thumb": "./assets/library/jane.jpg",
      "notes": "Reference library entry",
      "descriptors": [[0.01, 0.02, 0.03]]
    }
  ]
}
```

## Notes

- The model files are loaded from a public CDN-backed source at runtime.
- The uploaded query photo is processed in the browser.
- The local library created in `enroll.html` is stored only in the current browser until you export it.

## Best next upgrade

When you are ready for a proper hosted version, move back to a real backend so you can:
- accept public uploads into one shared DB
- manage auth/admin tools
- process bulk images and videos
- keep a persistent search index
