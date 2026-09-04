require "date"
require "json"

require_relative "lib/env_file"
require_relative "lib/review_fetcher"
require_relative "lib/reading_fetcher"

EnvFile.load

# Refresh the Ramen Ranger feed before Middleman reads data/. The API sends no
# CORS header so the browser cannot call it; we render it statically instead.
# A failed fetch leaves the committed data/reviews.yml in place.
if build? || ENV["FETCH_REVIEWS"]
  ReviewFetcher.refresh
  ReadingFetcher.refresh
end

# Activate and configure extensions
# https://middlemanapp.com/advanced/configuration/#configuring-extensions

activate :autoprefixer do |prefix|
  prefix.browsers = "last 2 versions"
end

# English at /, Japanese at /ja/. Templates under source/localizable are built
# once per locale; everything else (partials, assets) is shared.
activate :i18n, mount_at_root: :en, langs: [:en, :ja]

# Layouts
# https://middlemanapp.com/basics/layouts/

# Per-page layout changes
page '/*.xml', layout: false
page '/*.json', layout: false
page '/*.txt', layout: false

helpers do
  # Middleman's built-in `t` splats its arguments, so in Ruby 3 an option like
  # `default:` arrives at I18n.translate as a positional hash and raises.
  # Take keywords properly instead.
  def t(key, **options)
    ::I18n.t(key, **options)
  end

  # Tiles carry a column span out of six, and optionally a row span so a tall
  # tile can sit beside a stack of shorter ones.
  def tile_span_class(span, row_span = nil)
    ["c#{span}", ("r#{row_span}" if row_span.to_i > 1)].compact.join(" ")
  end

  # Path to the same page in the other locale. Only two locales, so this stays
  # a swap rather than a lookup table.
  def other_locale
    I18n.locale == :ja ? :en : :ja
  end

  # Root path of a locale's page. Two locales, so a swap rather than a lookup.
  def locale_path(locale = I18n.locale)
    locale == :ja ? "/ja/" : "/"
  end

  def other_locale_path
    locale_path(other_locale)
  end

  # Fully-qualified URLs for the <head>: canonical, hreflang alternates, and the
  # Open Graph / JSON-LD tags all need an absolute address.
  def site_url
    data.site.url
  end

  def absolute_url(path)
    "#{site_url}#{path}"
  end

  def canonical_url
    absolute_url(locale_path)
  end

  # schema.org Person, emitted as JSON-LD so search can tie the site to the
  # GitHub and LinkedIn profiles behind it.
  def person_schema
    {
      "@context" => "https://schema.org",
      "@type" => "Person",
      # A stable @id ties the English and Japanese pages to one entity. Without
      # it each locale reads as a separate Person who happens to share a name.
      "@id" => "#{site_url}/#person",
      "name" => "Soren Umstot",
      "url" => canonical_url,
      "inLanguage" => I18n.locale.to_s,
      "image" => absolute_url(image_path("soren-umstot.jpg")),
      "jobTitle" => t("meta.job_title"),
      "worksFor" => { "@type" => "Organization", "name" => "Biz Creation" },
      "address" => {
        "@type" => "PostalAddress", "addressLocality" => "Osaka", "addressCountry" => "JP"
      },
      "knowsLanguage" => %w[en ja],
      "sameAs" => [data.site.github, data.site.linkedin]
    }.to_json
  end

  # A tile is always a div. When it links somewhere the anchor lives on the
  # heading and an ::after overlay stretches the click target back over the
  # whole card -- wrapping the card itself in an <a> made the accessible name
  # the entire tile, several hundred characters read as one utterance.
  def tile_open(span, url)
    %(<div class="tile #{url ? "linked " : ""}#{span}">)
  end

  def tile_close(_url = nil)
    "</div>"
  end

  # The heading of a linked tile. The overlay that makes the rest of the card
  # clickable is drawn by .tile-link::after in _tile.scss.
  def tile_heading(title, url)
    return %(<h3>#{title}</h3>) unless url

    %(<h3><a class="tile-link" href="#{url}" target="_blank" rel="noopener">#{title}</a></h3>)
  end

  # An English page that drops a Japanese word into an English sentence has to
  # tag it, or a screen reader voices it with an English engine and it comes
  # out as noise. Wraps each run of Japanese in <span lang="ja">. On the
  # Japanese page <html lang="ja"> already covers it, so this is a no-op there.
  JAPANESE_RUN = /([\p{Han}\p{Hiragana}\p{Katakana}\u30FC]+)/.freeze

  def tag_japanese(text)
    string = text.to_s
    return string if I18n.locale == :ja

    string.split(JAPANESE_RUN).map do |part|
      part.match?(/\A#{JAPANESE_RUN}\z/) ? %(<span lang="ja">#{part}</span>) : part
    end.join
  end

  def bare_url(url)
    url.to_s.sub(%r{\Ahttps?://}, "").chomp("/")
  end

  # The review cards are only a few hundred pixels wide, so ask Netlify's
  # edge image service for a bounded derivative instead of the full photo.
  def review_image_url(url, width:, height: 200)
    return "" if url.to_s.empty?
    return url unless build?

    "/.netlify/images?url=#{ERB::Util.url_encode(url)}&w=#{width}&h=#{height}&fit=cover&q=72"
  end

  # Prefill the subject so a mail client opens with something already typed.
  # ERB::Util.url_encode, not CGI.escape — the latter writes spaces as "+",
  # which mail clients paste through literally.
  def mailto(address, subject_key)
    "mailto:#{address}?subject=#{ERB::Util.url_encode(t(subject_key))}"
  end

  # The most recent book on the Goodreads shelf, or nil when the feed has
  # never been fetched.
  # Read through `data.reading` rather than `data.to_h`: to_h hands back a plain
  # Hash with symbol keys underneath, so entry["books"] silently misses. The
  # EnhancedHash from `data.reading` takes either.
  def current_book
    Array(data.reading && data.reading["books"]).first
  rescue StandardError
    nil
  end

  def reviews_count
    data.reviews["review_count"].to_i
  end

  # Whole years since a date. An anniversary that hasn't come round yet this
  # year doesn't count. Evaluated at build time, so the copy that uses it steps
  # up on the next deploy after the date — fine for a figure that moves once a
  # year.
  def years_since(date)
    today = Date.today
    elapsed = today.year - date.year
    before_anniversary = ([today.month, today.day] <=> [date.month, date.day]).negative?
    before_anniversary ? elapsed - 1 : elapsed
  end

  # Landed in Japan on 2016-07-24.
  def years_in_japan
    years_since(Date.new(2016, 7, 24))
  end

  # Reviewing ramen since 2018 — only the year is on record.
  def years_reviewing_ramen
    Date.today.year - data.site.ramen_ranger.since.to_i
  end

  # Fills the <template> copy of a review card, which carries structure for
  # javascripts/live.js to clone but no data of its own.
  def blank_review
    {
      "id" => "", "score" => 0.0, "name" => "", "name_ja" => "", "area" => "",
      "soup" => [], "visited_on" => "", "image_url" => "", "url" => "#"
    }
  end

  # "2026-04-30" -> "Apr 30, 2026" / "2026年4月30日"
  def review_date(value)
    parts = value.to_s[0, 10].split("-")
    return "" unless parts.length == 3

    year, month, day = parts.map(&:to_i)
    if I18n.locale == :ja
      "#{year}年#{month}月#{day}日"
    else
      months = %w[Jan Feb Mar Apr May Jun Jul Aug Sep Oct Nov Dec]
      "#{months[month - 1]} #{day}, #{year}"
    end
  end
end

configure :build do
  activate :minify_css

  # live.js ships with its reasoning intact in source; none of that needs to
  # travel over the wire.
  activate :minify_javascript

  # Fingerprint assets so a changed image or stylesheet reaches people who have
  # already visited. Without this, images are served at a stable path and an
  # updated file keeps showing the cached bytes until the browser decides to
  # look again — which is indistinguishable from the change not working.
  activate :asset_hash
end
