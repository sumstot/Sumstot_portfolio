// Serves the current book from the Goodreads shelf RSS feed as JSON.
//
// The page cannot read that feed itself. goodreads.com sends no
// Access-Control-Allow-Origin header, and unlike the Ramen Ranger API it is
// not ours to change, so the browser refuses the response no matter how the
// request is made. The feed URL also carries a `key` parameter that would
// become public the moment it appeared in page source. Both problems go away
// by fetching it here: the key stays in the environment, and the response is
// same-origin, so no CORS is involved at all.
//
// Shape matches data/reading.yml, which lib/reading_fetcher.rb writes at build
// time, so the client treats the two interchangeably.
const RSS_URL = "GOODREADS_RSS_URL";
const TIMEOUT = 8000;
const CACHE_SECONDS = 900;

export default async () => {
  const url = (process.env[RSS_URL] || "").trim();
  if (!url) return fail(`${RSS_URL} is not set`, 503);

  let xml;
  try {
    xml = await fetchFeed(url);
  } catch (error) {
    return fail(`fetch failed: ${error.message}`, 502);
  }

  const books = parse(xml);
  if (!books.length) return fail("no items in the feed", 502);

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

async function fetchFeed(url) {
  const response = await fetch(url, {
    signal: AbortSignal.timeout(TIMEOUT),
    headers: { "user-agent": "sorenumstot.com" },
    redirect: "follow"
  });

  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.text();
}

// Goodreads puts its own unnamespaced elements inside each <item> and wraps
// most values in CDATA. Mirrors ReadingFetcher.parse; only the rendered fields
// are kept. Regex rather than an XML parser: Node ships none, the shape is
// fixed, and a dependency here would need bundling into the function.
function parse(xml) {
  return String(xml)
    .split("<item>")
    .slice(1)
    .map((chunk) => chunk.split("</item>")[0])
    .map((item) => {
      const title = tag(item, "title");
      if (!title) return null;

      return prune({
        title,
        author: tag(item, "author_name"),
        link: tag(item, "link"),
        cover: tag(item, "book_large_image_url") ||
               tag(item, "book_medium_image_url") ||
               tag(item, "book_small_image_url"),
        started_on: date(tag(item, "user_date_added"))
      });
    })
    .filter(Boolean);
}

function tag(item, name) {
  const match = item.match(new RegExp(`<${name}>([\\s\\S]*?)</${name}>`));
  if (!match) return null;

  let value = match[1].trim();
  const cdata = value.match(/^<!\[CDATA\[([\s\S]*?)\]\]>$/);
  if (cdata) value = cdata[1].trim();

  return decode(value) || null;
}

function decode(value) {
  return value
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&amp;/g, "&"); // last, so &amp;lt; does not become <
}

function date(value) {
  if (!value) return null;

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString().slice(0, 10);
}

const prune = (object) =>
  Object.fromEntries(Object.entries(object).filter(([, value]) => value));

export const config = { path: "/api/reading" };
