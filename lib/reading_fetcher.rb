require "net/http"
require "uri"
require "yaml"
require "time"
require "rexml/document"

# Pulls the current book from a Goodreads shelf RSS feed and writes it to
# data/reading.yml.
#
# Goodreads retired its API in December 2020; the per-shelf RSS feeds are what
# survived. They are undocumented and unversioned, so treat them as something
# that can disappear without notice — a failed fetch leaves the committed
# data/reading.yml alone, and the tile falls back to the static list.
#
# Set GOODREADS_RSS_URL to the feed linked at the bottom of the shelf page
# (it usually carries a `key` parameter; copy it verbatim).
module ReadingFetcher
  ENV_KEY   = "GOODREADS_RSS_URL"
  TIMEOUT   = 8
  ROOT      = File.expand_path("..", __dir__)
  DATA_PATH = File.join(ROOT, "data", "reading.yml")

  module_function

  # Returns :updated, :unchanged, :skipped, or :failed. Never raises.
  def refresh
    url = ENV[ENV_KEY].to_s.strip
    return :skipped if url.empty?

    body = fetch(url)
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
      warn "[reading] #{response.code} from Goodreads — check #{ENV_KEY}"
      return nil
    end

    response.body
  rescue StandardError => e
    warn "[reading] fetch failed: #{e.class}: #{e.message}"
    nil
  end

  # Goodreads puts its own unnamespaced elements inside each <item>, and wraps
  # the cover markup in <description>. Only the fields we render are kept.
  def parse(body)
    doc = REXML::Document.new(body)
    doc.elements.to_a("//item").filter_map do |item|
      title = text(item, "title")
      next if title.to_s.empty?

      {
        "title" => title,
        "author" => text(item, "author_name"),
        "link" => text(item, "link"),
        "cover" => text(item, "book_large_image_url") ||
                   text(item, "book_medium_image_url") ||
                   text(item, "book_small_image_url"),
        "started_on" => date(text(item, "user_date_added"))
      }.compact
    end
  rescue StandardError => e
    warn "[reading] parse failed: #{e.class}: #{e.message}"
    []
  end

  def text(item, name)
    node = item.elements[name]
    return nil unless node

    value = node.text.to_s.strip
    value.empty? ? nil : value
  end

  def date(value)
    return nil unless value

    Time.parse(value).strftime("%Y-%m-%d")
  rescue StandardError
    nil
  end

  def existing
    return nil unless File.exist?(DATA_PATH)

    YAML.safe_load_file(DATA_PATH, permitted_classes: [Time])
  rescue StandardError
    nil
  end
end
