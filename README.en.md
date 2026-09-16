# Tối Nay Xem Gì? 🎰

[Tiếng Việt](README.md) · **English**

A local case-opening app that randomly selects a movie. The movie list comes from the public [Nguồn Phim API](https://phim.nguonc.com/api-document). You can view descriptions, open a watch link, and save selected movies to a browser-local personal collection.

<video src="assets/promo.mp4" controls="controls" muted="muted" width="100%"></video>

## Run locally

Node.js 22.12+ and the pnpm version in `package.json` are required.

```sh
pnpm install --frozen-lockfile
pnpm dev
```

Open [127.0.0.1:3000](http://127.0.0.1:3000). When no local snapshot exists, the app fetches the latest movie list from the Nguồn Phim API. With `npm`, the equivalent commands are `npm install` and `npm run dev`.

```sh
pnpm test
pnpm typecheck
pnpm lint
pnpm build
pnpm preview
```

The app is local-only. It has no login, accounts, backend, or cloud sync. Public API requests load the movie list and details when needed, while watch links open only after an explicit user action.

## Features
- **Movie case opening:** pick a movie using rarity tiers and a case-opening animation.
- **Movie details:** load the poster, original title, release year, runtime, quality, language, director, cast, and description from the detail endpoint.
- **Watch flow:** retrieve the first episode after the user chooses to watch.
- **Personal collection:** save up to 12 selected movies in a host-only browser cookie; the collection is never uploaded.
- **Local counter:** the spin count belongs to the current browser, not to the community.

## API endpoints

- Latest movies: `https://phim.nguonc.com/api/films/phim-moi-cap-nhat?page=1`
- Movie details and episodes: `https://phim.nguonc.com/api/film/{slug}`
- API documentation: [phim.nguonc.com/api-document](https://phim.nguonc.com/api-document)

API responses are external data. The app validates the fields it needs before adding a movie to the case or displaying it, and reports unavailable data or cookies visibly.

## GitHub Pages, contributing and history

GitHub Pages redirects only to https://truanayangi.com/; only `pages-redirect/` is published to `gh-pages`, while this local app stays on `main`. Issues and fork PRs to `main` are welcome in Vietnamese or English, including drafts.

Inspired by [nagisanzenin/truanayangi](https://github.com/nagisanzenin/truanayangi). This repository preserves history from `nagisanzenin/truanayangi`. See [ATTRIBUTION.md](ATTRIBUTION.md) for asset credits.
