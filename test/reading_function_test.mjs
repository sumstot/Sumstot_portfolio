import test from "node:test";
import assert from "node:assert/strict";

import reading from "../netlify/functions/reading.mjs";

test("the live reading endpoint links anonymous visitors to the public book page", async () => {
  const originalUrl = process.env.GOODREADS_RSS_URL;
  const originalFetch = globalThis.fetch;

  process.env.GOODREADS_RSS_URL = "https://www.goodreads.com/review/list_rss/example";
  globalThis.fetch = async () => new Response(`
    <rss><channel><item>
      <title><![CDATA[The Dispossessed]]></title>
      <author_name>Ursula K. Le Guin</author_name>
      <book_id>13651</book_id>
      <link><![CDATA[https://www.goodreads.com/review/show/123456789]]></link>
    </item></channel></rss>
  `);

  try {
    const response = await reading();
    const payload = await response.json();

    assert.equal(response.status, 200);
    assert.equal(payload.books[0].link, "https://www.goodreads.com/book/show/13651");
  } finally {
    globalThis.fetch = originalFetch;
    if (originalUrl === undefined) delete process.env.GOODREADS_RSS_URL;
    else process.env.GOODREADS_RSS_URL = originalUrl;
  }
});
