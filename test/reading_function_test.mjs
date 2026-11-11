import test from "node:test";
import assert from "node:assert/strict";

import reading from "../netlify/functions/reading.mjs";

// Trimmed from a real /review/custom_widget/ response: the HTML arrives inside
// a single-quoted JavaScript string, with \" \/ and \n escapes.
const WIDGET = String.raw`  var widget_code = '  <div class=\"gr_custom_container_1\">\n      <div class=\"gr_custom_each_container_1\">\n          <div class=\"gr_custom_book_container_1\">\n            <a title=\"The Dispossessed\" rel=\"nofollow\" href=\"https://www.goodreads.com/review/show/123456789?utm_medium=api&amp;utm_source=custom_widget\"><img alt=\"The Dispossessed\" border=\"0\" src=\"https://i.gr-assets.com/images/S/compressed.photo.goodreads.com/books/1353467455l/13651._SY75_.jpg\" /><\/a>\n          <\/div>\n          <div class=\"gr_custom_title_1\">\n            <a rel=\"nofollow\" href=\"https://www.goodreads.com/review/show/123456789?utm_medium=api&amp;utm_source=custom_widget\">The Dispossessed<\/a>\n          <\/div>\n          <div class=\"gr_custom_author_1\">\n            by <a rel=\"nofollow\" href=\"https://www.goodreads.com/author/show/874602.Ursula_K_Le_Guin\">Ursula K.     Le Guin<\/a>\n          <\/div>\n      <\/div>\n  <\/div>\n'
  var widget_div = document.getElementById('gr_custom_widget_1')`;

async function withWidget(body, run) {
  const originalFetch = globalThis.fetch;
  const requested = [];
  globalThis.fetch = async (url) => {
    requested.push(String(url));
    return new Response(body);
  };

  try {
    return await run(requested);
  } finally {
    globalThis.fetch = originalFetch;
  }
}

test("the live reading endpoint links anonymous visitors to the public book page", async () => {
  await withWidget(WIDGET, async () => {
    const response = await reading();
    const payload = await response.json();

    assert.equal(response.status, 200);
    assert.deepEqual(payload.books, [{
      title: "The Dispossessed",
      author: "Ursula K. Le Guin",
      link: "https://www.goodreads.com/book/show/13651",
      cover: "https://i.gr-assets.com/images/S/compressed.photo.goodreads.com/books/1353467455l/13651.jpg"
    }]);
  });
});

// Goodreads replays the first render for a given widget_id, so a fixed id
// would pin the shelf as it was on the first fetch.
test("each request asks Goodreads for a fresh widget render", async () => {
  await withWidget(WIDGET, async (requested) => {
    await reading();
    await new Promise((resolve) => setTimeout(resolve, 2));
    await reading();

    const ids = requested.map((url) => new URL(url).searchParams.get("widget_id"));
    assert.equal(ids.length, 2);
    assert.ok(ids.every(Boolean));
    assert.notEqual(ids[0], ids[1]);
  });
});

test("an empty shelf is a failure, so the built markup stays", async () => {
  await withWidget("var widget_code = '';", async () => {
    const response = await reading();
    const payload = await response.json();

    assert.equal(response.status, 502);
    assert.deepEqual(payload.books, []);
  });
});
