// Serves the current book from Goodreads' public shelf widget as JSON.
//
// The page cannot read the widget itself: goodreads.com sends no
// Access-Control-Allow-Origin header, and unlike the Ramen Ranger API it is
// not ours to change, so the browser refuses the response no matter how the
// request is made. Fetching it here makes the response same-origin, so no
// CORS is involved at all. (The widget is a script that document.write()s its
// HTML, so it could be embedded directly, but that would replace the site's
// own markup with Goodreads'.)
//
// Goodreads retired the shelf RSS feeds this used to read on 2026-10-28, and
// shelf pages now redirect signed-out visitors to a login; the widget is the
// public source left.
//
// Shape matches data/reading.yml, which lib/reading_fetcher.rb writes at build
// time, so the client treats the two interchangeably.
const USER_ID = "92203084";
const WIDGET_URL =
  `https://www.goodreads.com/review/custom_widget/${USER_ID}` +
  "?shelf=currently-reading&num_books=5&widget_id=";
const TIMEOUT = 8000;
const CACHE_SECONDS = 900;

export default async () => {
  let body;
  try {
    // Goodreads caches each widget by user and widget_id and serves the first
    // render for that pair, whatever the other parameters say. A fixed id would
    // pin the shelf as it was on the first fetch, so every request gets a new one.
    body = await fetchWidget(WIDGET_URL + Date.now());
  } catch (error) {
    return fail(`fetch failed: ${error.message}`, 502);
  }

  const books = parse(body);
  if (!books.length) return fail("no books in the widget", 502);

  return new Response(
    JSON.stringify({ fetched_at: new Date().toISOString(), books }),
    {
      headers: {
        "content-type": "application/json; charset=utf-8",
        // Goodreads is polled once per window for the whole site rather than
        // once per visitor. A shelf changes every week or two; a stale read of
        // up to fifteen minutes is invisible and keeps us off their rate limit.
        "cache-control": `public, max-age=${CACHE_SECONDS}`
      }
    }
  );
};

// A failure here is not an error state for the page: the caller keeps whatever
// the build rendered. The status still says what went wrong for the logs.
const fail = (message, status) =>
  new Response(JSON.stringify({ error: message, books: [] }), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store"
    }
  });

async function fetchWidget(url) {
  const response = await fetch(url, {
    signal: AbortSignal.timeout(TIMEOUT),
    headers: { "user-agent": "sorenumstot.com" },
    redirect: "follow"
  });

  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.text();
}

// The HTML sits inside a single-quoted JavaScript string, so it arrives with
// \" \' \/ and \n escapes. Each book is a gr_custom_each_container div.
// Mirrors ReadingFetcher.parse; only the rendered fields are kept. Regex
// rather than an HTML parser: Node ships none, the shape is fixed, and a
// dependency here would need bundling into the function.
function parse(body) {
  const html = String(body)
    .replace(/\\n/g, "\n")
    .replace(/\\(["'\/])/g, "$1");

  return html
    .split('<div class="gr_custom_each_container')
    .slice(1)
    .map((item) => {
      const title = anchorText(item, "gr_custom_title");
      if (!title) return null;

      const cover = (item.match(/<img [^>]*src="([^"]+)"/) || [])[1];
      return prune({
        title,
        author: anchorText(item, "gr_custom_author"),
        link: bookUrl(cover),
        cover: fullSize(cover)
      });
    })
    .filter(Boolean);
}

// Text of the first link inside the div whose class starts with `name`.
// Goodreads pads author names with runs of spaces ("Xiao     Hai").
function anchorText(item, name) {
  const match = item.match(
    new RegExp(`<div class="${name}[^"]*">[\\s\\S]*?<a [^>]*>([\\s\\S]*?)</a>`)
  );
  if (!match) return null;

  return decode(match[1]).replace(/\s+/g, " ").trim() || null;
}

// The widget links to the private review page (/review/show/…), which 404s
// for anyone not logged in as me. The book ID is the cover file's name
// (…/books/1787643091l/257458411._SY75_.jpg), and gives the public page.
// Books without a cover get the nophoto image, and so no link.
function bookUrl(cover) {
  const id = (String(cover || "").match(/\/books\/\d+\w\/(\d+)/) || [])[1];
  return id ? `https://www.goodreads.com/book/show/${id}` : null;
}

// Drop the ._SY75_ thumbnail suffix to get the full-size image.
const fullSize = (cover) => cover && cover.replace(/\._S[XY]\d+_(?=\.\w+$)/, "");

function decode(value) {
  return value
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&amp;/g, "&"); // last, so &amp;lt; does not become <
}

const prune = (object) =>
  Object.fromEntries(Object.entries(object).filter(([, value]) => value));

export const config = { path: "/api/reading" };
