require "net/http"
require "uri"
require "yaml"
require "time"
require "cgi"

# Pulls the current book from Goodreads' public shelf widget and writes it to
# data/reading.yml.
#
# Goodreads retired its API in December 2020 and the per-shelf RSS feeds on
# 2026-10-28 (every /review/list_rss/ URL now 404s); the shelf pages themselves
# redirect signed-out visitors to a login. The embeddable widget is what is
# left. It is a script that document.write()s an HTML snippet, undocumented
# and unversioned, so treat it as something that can disappear without notice
# — a failed fetch leaves the committed data/reading.yml alone, and the tile
# falls back to the static list.
#
# The widget is public and needs no key, so the user ID lives here rather than
# in the environment.
module ReadingFetcher
  USER_ID    = "92203084"
  WIDGET_URL = "https://www.goodreads.com/review/custom_widget/#{USER_ID}" \
               "?shelf=currently-reading&num_books=5&widget_id=".freeze
  TIMEOUT    = 8
  ROOT       = File.expand_path("..", __dir__)
  DATA_PATH  = File.join(ROOT, "data", "reading.yml")

  module_function

  # Returns :updated, :unchanged, or :failed. Never raises.
  def refresh
    body = fetch(widget_url)
    return :failed if body.nil?

    books = parse(body)
    return :failed if books.empty?

    document = {
      "fetched_at" => Time.now.utc.strftime("%Y-%m-%dT%H:%M:%SZ"),
      "books" => books
    }

    previous = existing
    if previous && previous["books"] == books
      :unchanged
    else
      File.write(DATA_PATH, document.to_yaml)
      :updated
    end
  end

  # Goodreads caches each widget by user and widget_id and serves the first
  # render for that pair, whatever the other parameters say. A fixed id would
  # pin the shelf as it was on the first fetch, so every request gets a new one.
  def widget_url
    "#{WIDGET_URL}#{Time.now.to_i}"
  end

  def fetch(url, redirects = 3)
    uri = URI(url)
    response = Net::HTTP.start(
      uri.host, uri.port,
      use_ssl: uri.scheme == "https", open_timeout: TIMEOUT, read_timeout: TIMEOUT
    ) { |http| http.get(uri.request_uri, "User-Agent" => "sorenumstot.com build") }

    if response.is_a?(Net::HTTPRedirection) && redirects.positive?
      return fetch(URI.join(url, response["location"]).to_s, redirects - 1)
    end

    unless response.is_a?(Net::HTTPSuccess)
      warn "[reading] #{response.code} from the Goodreads widget"
      return nil
    end

    response.body
  rescue StandardError => e
    warn "[reading] fetch failed: #{e.class}: #{e.message}"
    nil
  end

  # The HTML sits inside a single-quoted JavaScript string, so it arrives with
  # \" \' \/ and \n escapes. Each book is a gr_custom_each_container div; only
  # the fields we render are kept.
  def parse(body)
    html = body.to_s.gsub(/\\n/, "\n").gsub(/\\(["'\/])/, '\1')
    html.split(/<div class="gr_custom_each_container/).drop(1).filter_map do |item|
      title = anchor_text(item, "gr_custom_title")
      next if title.nil?

      cover = item[/<img [^>]*src="([^"]+)"/, 1]
      {
        "title" => title,
        "author" => anchor_text(item, "gr_custom_author"),
        "link" => book_url(cover),
        "cover" => full_size(cover)
      }.compact
    end
  rescue StandardError => e
    warn "[reading] parse failed: #{e.class}: #{e.message}"
    []
  end

  # Text of the first link inside the div whose class starts with `name`.
  # Goodreads pads author names with runs of spaces ("Xiao     Hai").
  def anchor_text(item, name)
    raw = item[/<div class="#{name}[^"]*">.*?<a [^>]*>(.*?)<\/a>/m, 1]
    value = CGI.unescapeHTML(raw.to_s).gsub(/\s+/, " ").strip
    value.empty? ? nil : value
  end

  # The widget links to the private review page (/review/show/…), which 404s
  # for anyone not logged in as me. The book ID is the cover file's name
  # (…/books/1787643091l/257458411._SY75_.jpg), and gives the public page.
  # Books without a cover get the nophoto image, and so no link.
  def book_url(cover)
    id = cover.to_s[%r{/books/\d+\w/(\d+)}, 1]
    id && "https://www.goodreads.com/book/show/#{id}"
  end

  # Drop the ._SY75_ thumbnail suffix to get the full-size image.
  def full_size(cover)
    cover&.sub(/\._S[XY]\d+_(?=\.\w+\z)/, "")
  end

  def existing
    return nil unless File.exist?(DATA_PATH)

    YAML.safe_load_file(DATA_PATH, permitted_classes: [Time])
  rescue StandardError
    nil
  end
end
