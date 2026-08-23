# sorenumstot.com

Personal site and portfolio. Middleman, Sass, a little Stimulus. English at `/`,
Japanese at `/ja/`.

## Running it

```
bundle install
npm install
bundle exec middleman        # http://localhost:4567
```

`bundle exec middleman build` writes the static site to `build/`.

## Where things live

```
data/projects.yml         tile order and structure — id, type, span, url, stack
data/reviews.yml          the five newest ramen reviews (generated, committed)
data/site.yml             email and profile links
locales/en.yml            all English copy
locales/ja.yml            all Japanese copy
source/localizable/       templates built once per locale
source/partials/_tile.erb one project tile, dispatched on `type`
source/stylesheets/       tokens in config/_tokens.scss, one file per component
```

Adding a project means an entry in `data/projects.yml` plus a `projects.<id>`
block in each locale file. No template changes.

## The live feeds

Two rows show data from elsewhere: the five most recent ramen reviews, and the
book currently on the Goodreads shelf. Both are rendered twice.

**At build time.** `lib/review_fetcher.rb` and `lib/reading_fetcher.rb` run
during `middleman build` and write `data/reviews.yml` and `data/reading.yml`,
which the templates render into the HTML. This is what search engines and
JavaScript-less browsers see, and what stays on screen when a source is down.

**On page load.** `source/javascripts/live.js` re-fetches both and swaps the
rendered markup for anything newer. Every failure path — offline, blocked,
timed out, malformed — leaves the built markup untouched, so the worst case is
a slightly old page rather than an empty one. Review cards are cloned from a
`<template>` filled by `_review_card.erb`, so the card markup is defined once
rather than once in ERB and again in JavaScript.

The two sources reach the browser differently:

- **Ramen Ranger** is called directly. `/api/v1/ramen_reviews` is public and
  sends `Access-Control-Allow-Origin` for this domain; `Rack::Attack` throttles
  it. No key is involved, which is the point — a key in frontend JavaScript
  would not be a secret.
- **Goodreads** cannot be called directly: `goodreads.com` sends no CORS header
  and is not ours to change, and the feed URL carries a `key` parameter that
  would be public in page source. `netlify/functions/reading.mjs` fetches and
  parses it server side and serves JSON from `/api/reading`, same-origin and
  cached for 15 minutes.

Environment variables, set locally in `.env` (copy `.env.example`; gitignored)
and on Netlify under Site settings → Environment variables:

- `RAMEN_RANGER_API_KEY` — build-time only, sent as `Authorization: Bearer`.
  The endpoint the browser uses needs no key; this one still authenticates the
  build's fetch.
- `GOODREADS_RSS_URL` — read at build time and by the Netlify function.

Commands:

- Refresh by hand: `rake reviews:fetch`, `rake reading:fetch`
- Preview the fetches on the dev server: `FETCH_REVIEWS=1 bundle exec middleman`
- `middleman server` does not run functions, so `/api/reading` 404s locally and
  the reading row falls back to `data/reading.yml`. Use `netlify dev` to
  exercise it.

A missing or rejected key logs a warning and leaves the committed YAML in
place, so bad configuration costs freshness, never the page.
`.github/workflows/refresh-reviews.yml` pings a Netlify build hook daily to
keep that committed fallback from drifting too far — it needs a
`NETLIFY_BUILD_HOOK` repository secret and no-ops without one.

## Deploy

Netlify builds from `main`. Build command `bundle exec middleman build`,
publish directory `build`. Ruby and Node versions come from `.ruby-version` and
`.node-version`.
