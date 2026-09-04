// Refreshes the two feeds that go stale between deploys.
//
// Both are rendered server side from data/reviews.yml and data/reading.yml,
// which are written during `middleman build`. This site is deployed rarely, so
// that copy can be months old. Everything below is a progressive enhancement
// over it: on success the rendered feed is swapped for whatever the source
// says now, and on any failure — offline, blocked, timed out, malformed — the
// build-time markup is left exactly as it was. There is no loading state and
// nothing is ever emptied, so a dead source looks like a slightly old page
// rather than a broken one.
(function () {
  "use strict";

  var REVIEWS_URL = "https://theramenranger.com/api/v1/ramen_reviews?limit=4";
  var READING_URL = "/api/reading"; // Netlify function; holds the feed key
  var REVIEW_URL_BASE = "https://theramenranger.com/ramen_reviews/";
  // Four, not five: the count has to be even or the two-column layout at the
  // 1000px breakpoint leaves a dangling card, and four across leaves each
  // thumbnail wide enough to carry the card.
  var LIMIT = 4;
  var TIMEOUT = 5000;

  var JA = document.documentElement.lang === "ja";
  var MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
                "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  function reviewImageUrl(url, width, height) {
    return "/.netlify/images?url=" + encodeURIComponent(url) +
      "&w=" + width + "&h=" + height + "&fit=cover&q=72";
  }

  function getJSON(url) {
    var controller = new AbortController();
    var timer = setTimeout(function () { controller.abort(); }, TIMEOUT);

    return fetch(url, {
      signal: controller.signal,
      headers: { Accept: "application/json" }
    }).then(function (response) {
      return response.ok ? response.json() : null;
    }).catch(function () {
      return null;
    }).finally(function () {
      clearTimeout(timer);
    });
  }

  // Mirrors review_date in config.rb. Both formats have to agree or a swapped
  // card would read differently from the ones around it.
  function formatDate(value) {
    var parts = String(value || "").slice(0, 10).split("-");
    if (parts.length !== 3) return "";

    var year = Number(parts[0]);
    var month = Number(parts[1]);
    var day = Number(parts[2]);
    if (!year || !month || !day) return "";

    if (JA) return year + "年" + month + "月" + day + "日";
    return MONTHS[month - 1] + " " + day + ", " + year;
  }

  // Mirrors ReviewFetcher.normalize in lib/review_fetcher.rb.
  function normalizeReview(item) {
    if (!item || !item.id) return null;

    var restaurant = item.restaurant || {};
    var area = [restaurant.city, restaurant.prefecture]
      .filter(function (part) { return part; })
      .filter(function (part, i, all) { return all.indexOf(part) === i; })
      .join(", ");

    return {
      id: item.id,
      score: Number(item.score) || 0,
      name: restaurant.name || "",
      nameJa: restaurant.jpn_name || "",
      area: area,
      soup: (item.soup || []).map(function (s) { return String(s).replace(/_/g, " "); }),
      visitedOn: item.date_visited || "",
      imageUrl: item.primary_image_url || "",
      url: REVIEW_URL_BASE + item.id
    };
  }

  function fillCard(node, review) {
    node.href = review.url;
    node.setAttribute("data-review-id", String(review.id));

    var thumb = node.querySelector(".thumb");
    if (thumb) {
      if (review.imageUrl) {
        var image = thumb.querySelector("img");
        image.src = reviewImageUrl(review.imageUrl, 320, 400);
        image.srcset = [
          reviewImageUrl(review.imageUrl, 240, 300) + " 240w",
          reviewImageUrl(review.imageUrl, 320, 400) + " 320w",
          reviewImageUrl(review.imageUrl, 480, 600) + " 480w"
        ].join(", ");
        image.sizes = "(max-width: 640px) 62vw, 240px";
        image.width = 320;
        image.height = 400;
        // Mirrors the onerror in _review_card.erb. The cloned template carries
        // the blank prototype's fallback, which points nowhere, so this card's
        // own origin URL has to be bound here.
        image.onerror = function () {
          image.onerror = null;
          image.removeAttribute("srcset");
          image.removeAttribute("sizes");
          image.src = review.imageUrl;
        };
      } else {
        thumb.remove();
      }
    }

    var score = node.querySelector(".score");
    score.textContent = review.score.toFixed(1);
    score.classList.toggle("hi", review.score >= 4.5);

    // Same order as _review_card.erb: the reader's own language leads.
    node.querySelector(".shop").textContent = JA ? review.nameJa : review.name;
    node.querySelector(".shopjp").textContent = JA ? review.name : review.nameJa;

    var dish = node.querySelector(".dish");
    if (dish) {
      if (review.soup.length) {
        dish.textContent = review.soup.join(" × ");
      } else {
        dish.remove();
      }
    }

    var date = formatDate(review.visitedOn);
    node.querySelector(".when").textContent =
      review.area && date ? review.area + " · " + date : review.area || date;
  }

  // The count appears twice — the stat and the "All N reviews" link, which is
  // an interpolated translation. Replacing the digits in place keeps both
  // locales working without splitting the string up.
  function updateCount(highest) {
    var targets = document.querySelectorAll("[data-review-count]");

    Array.prototype.forEach.call(targets, function (el) {
      var current = parseInt(el.textContent.replace(/[^\d]/g, ""), 10) || 0;
      // The API caps at 12 rows and exposes no total, so the highest id we can
      // see stands in for the count. Never let it walk backwards.
      if (highest > current) {
        el.textContent = el.textContent.replace(/\d[\d,]*/, String(highest));
      }
    });
  }

  function updateReviews() {
    var feed = document.querySelector(".feed");
    var template = document.getElementById("review-card-template");
    if (!feed || !template) return Promise.resolve();

    return getJSON(REVIEWS_URL).then(function (payload) {
      if (!Array.isArray(payload)) return;

      var reviews = payload.map(normalizeReview)
        .filter(function (review) { return review; })
        .slice(0, LIMIT);
      if (!reviews.length) return;

      var incoming = reviews.map(function (review) { return String(review.id); });
      var rendered = Array.prototype.map.call(
        feed.querySelectorAll(".rev"),
        function (node) { return node.getAttribute("data-review-id"); }
      );

      updateCount(Math.max.apply(null, reviews.map(function (r) { return Number(r.id) || 0; })));

      // Nothing new since the build. Leave the DOM alone rather than
      // re-rendering identical cards and dropping the images mid-paint.
      if (rendered.join(",") === incoming.join(",")) return;

      var focusedReview = feed.contains(document.activeElement) ?
        document.activeElement.closest(".rev") : null;
      var focusedId = focusedReview && focusedReview.getAttribute("data-review-id");
      var fragment = document.createDocumentFragment();
      reviews.forEach(function (review) {
        var node = template.content.firstElementChild.cloneNode(true);
        fillCard(node, review);
        fragment.appendChild(node);
      });

      feed.replaceChildren(fragment);

      if (focusedId) {
        var replacement = feed.querySelector('[data-review-id="' + focusedId + '"]');
        if (replacement) replacement.focus();
      }
    });
  }

  function updateReading() {
    var list = document.querySelector("ul.now[data-reading-label]");
    if (!list) return Promise.resolve();

    return getJSON(READING_URL).then(function (payload) {
      var book = payload && Array.isArray(payload.books) ? payload.books[0] : null;
      if (!book || !book.title) return;

      var row = list.querySelector("[data-reading]");
      if (!row) {
        row = document.createElement("li");
        row.setAttribute("data-reading", "");
        list.appendChild(row);
      }

      var label = document.createElement("b");
      label.textContent = list.getAttribute("data-reading-label");

      // The title links to its Goodreads page when the feed carried one.
      // .txtlink matches the built markup and keeps the underline the bare
      // <a> reset drops. textContent / explicit nodes throughout: the title
      // and author are third-party strings.
      var title;
      if (book.link) {
        title = document.createElement("a");
        title.className = "txtlink";
        title.href = book.link;
        title.target = "_blank";
        title.rel = "noopener";
        title.textContent = book.title;
      } else {
        title = document.createTextNode(book.title);
      }

      // Leading space matches what the ERB emits between the label and the
      // title, so a live row and a built one read the same.
      var nodes = [label, document.createTextNode(" "), title];
      if (book.author) nodes.push(document.createTextNode(" — " + book.author));

      var note = list.getAttribute("data-reading-note");
      if (note) {
        var src = document.createElement("span");
        src.className = "now-src";
        src.textContent = note;
        nodes.push(src);
      }

      row.replaceChildren.apply(row, nodes);
    });
  }

  function start() {
    updateReviews();
    updateReading();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
})();
