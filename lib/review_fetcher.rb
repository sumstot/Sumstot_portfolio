require "net/http"
require "json"
require "uri"
require "yaml"
require "time"

# Pulls the most recent Ramen Ranger reviews and writes them to data/reviews.yml.
#
# The fetch runs at build time, never in the browser: the API sends no
# Access-Control-Allow-Origin header, and anything in frontend JavaScript is
# public, which would expose the key. Set RAMEN_RANGER_API_KEY in the
# environment (Netlify build settings, or a local .env) and it is sent as a
# bearer token. If the fetch fails for any reason the committed
# data/reviews.yml is left alone, so the row never renders empty.
module ReviewFetcher
  API_URL   = "https://theramenranger.com/api/v1/ramen_reviews"
  SITE_URL  = "https://theramenranger.com"
  # Even, so the two-column layout at the 1000px breakpoint has no orphan row.
  LIMIT     = 4
  TIMEOUT   = 8
  ROOT      = File.expand_path("..", __dir__)
  DATA_PATH = File.join(ROOT, "data", "reviews.yml")
  API_KEY   = "RAMEN_RANGER_API_KEY"

  module_function

  # Returns :updated, :unchanged, or :failed. Never raises.
  def refresh
    payload = fetch
    return :failed if payload.nil? || payload.empty?

    reviews = payload.map { |item| normalize(item) }.compact.first(LIMIT)
    return :failed if reviews.empty?

    document = {
      "fetched_at" => Time.now.utc.strftime("%Y-%m-%dT%H:%M:%SZ"),
      # The API exposes no total-count route and caps at 12 rows, so the highest
      # id we have seen stands in for the review count. Never let it go backwards.
      "review_count" => [reviews.map { |r| r["id"] }.max.to_i, existing_count].max,
      "reviews" => reviews
    }

    previous = existing
    if previous && previous["reviews"] == reviews
      :unchanged
    else
      File.write(DATA_PATH, document.to_yaml)
      :updated
    end
  end

  # The key is read from the environment and never written to disk or into the
  # built page. Absent, the request goes out unauthenticated.
  def headers
    h = { "Accept" => "application/json" }
    key = ENV[API_KEY].to_s.strip
    h["Authorization"] = "Bearer #{key}" unless key.empty?
    h
  end

  def fetch
    uri = URI("#{API_URL}?limit=#{LIMIT}")
    response = Net::HTTP.start(
      uri.host, uri.port,
      use_ssl: true, open_timeout: TIMEOUT, read_timeout: TIMEOUT
    ) { |http| http.get(uri.request_uri, headers) }

    if response.is_a?(Net::HTTPUnauthorized)
      warn "[reviews] 401 from the API — check #{API_KEY}"
      return nil
    end

    return nil unless response.is_a?(Net::HTTPSuccess)

    body = JSON.parse(response.body)
    body.is_a?(Array) ? body : (body["reviews"] || body["data"])
  rescue StandardError => e
    warn "[reviews] fetch failed: #{e.class}: #{e.message}"
    nil
  end

  # Flattens the API shape into what the template renders. Keys are strings so
  # a round trip through YAML and Middleman's data store stays identical.
  def normalize(item)
    return nil unless item.is_a?(Hash) && item["id"]

    restaurant = item["restaurant"] || {}
    soup = Array(item["soup"]).map { |s| s.to_s.tr("_", " ") }

    {
      "id" => item["id"],
      "score" => item["score"].to_f,
      "name" => restaurant["name"].to_s,
      "name_ja" => restaurant["jpn_name"].to_s,
      "area" => [restaurant["city"], restaurant["prefecture"]].compact.uniq.reject(&:empty?).join(", "),
      "soup" => soup,
      "visited_on" => item["date_visited"].to_s,
      "image_url" => item["primary_image_url"].to_s,
      "url" => "#{SITE_URL}/ramen_reviews/#{item['id']}"
    }
  rescue StandardError
    nil
  end

  def existing
    return nil unless File.exist?(DATA_PATH)

    YAML.safe_load_file(DATA_PATH, permitted_classes: [Time])
  rescue StandardError
    nil
  end

  def existing_count
    (existing || {})["review_count"].to_i
  end
end
