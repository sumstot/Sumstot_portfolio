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

## The ramen feed

`lib/review_fetcher.rb` calls the Ramen Ranger API during `middleman build` and
writes `data/reviews.yml`, which the template renders statically. The fetch
never happens in the browser — the API sends no `Access-Control-Allow-Origin`
header, and anything in frontend JavaScript is public, which would leak the key.

The key comes from `RAMEN_RANGER_API_KEY` and is sent as `Authorization: Bearer`.
Set it in two places:

- **Locally** — copy `.env.example` to `.env` and fill it in. `.env` is gitignored.
- **Netlify** — Site settings → Environment variables. Available at build time.

Commands:

- Refresh by hand: `rake reviews:fetch`
- Preview the fetch on the dev server: `FETCH_REVIEWS=1 bundle exec middleman`

A missing or rejected key logs a warning and leaves the committed
`data/reviews.yml` in place, so a bad key breaks the build's freshness, never
the page.

If the fetch fails the committed `data/reviews.yml` is left in place, so the row
never renders empty. `.github/workflows/refresh-reviews.yml` pings a Netlify
build hook daily so the feed does not go stale between deploys — it needs a
`NETLIFY_BUILD_HOOK` repository secret and no-ops without one.

To make the feed genuinely live instead, add the CORS header and a Rack::Attack
throttle on the Ramen Ranger side and fetch from the client.

## Deploy

Netlify builds from `main`. Build command `bundle exec middleman build`,
publish directory `build`. Ruby and Node versions come from `.ruby-version` and
`.node-version`.
