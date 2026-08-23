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

  def other_locale_path
    other_locale == :en ? "/" : "/ja/"
  end

  # A tile is a link when it has a url and a plain div when it does not. ERB
  # cannot straddle a conditional element, so the tags are emitted as strings.
  def tile_open(span, url)
    return %(<div class="tile #{span}">) unless url

    %(<a class="tile #{span}" href="#{url}" target="_blank" rel="noopener">)
  end

  def tile_close(url)
    url ? "</a>" : "</div>"
  end

  def bare_url(url)
    url.to_s.sub(%r{\Ahttps?://}, "").chomp("/")
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

  # Fingerprint assets so a changed image or stylesheet reaches people who have
  # already visited. Without this, images are served at a stable path and an
  # updated file keeps showing the cached bytes until the browser decides to
  # look again — which is indistinguishable from the change not working.
  activate :asset_hash
end
