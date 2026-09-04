require "minitest/autorun"
require "net/http"
require "uri"

# Run against a live `middleman server`:
#   PORTFOLIO_URL=http://localhost:4567 bundle exec ruby test/local_preview_test.rb
#
# This file used to assert the opposite of what it asserts now. The preview
# server deliberately emitted raw theramenranger.com URLs while production
# emitted /.netlify/images ones, which meant the production image path was the
# one path never exercised before deploying. It broke exactly that way:
# Netlify's edge forwards the browser's `Sec-Fetch-Dest: image` header upstream,
# and Cloudflare in front of theramenranger scores that as a bot and returns 403
# for roughly a third of requests. Locally nothing went through Netlify, so
# nothing failed. Both environments now emit the same URL.
class LocalPreviewTest < Minitest::Test
  def setup
    @base_url = ENV.fetch("PORTFOLIO_URL", nil)
    skip "set PORTFOLIO_URL to a running middleman server" unless @base_url
  end

  def review_thumb_tag
    html = Net::HTTP.get(URI(@base_url))
    html.match(/<img class="review-thumb".*?>/m)&.to_s
  end

  def test_preview_emits_the_same_image_url_as_production
    tag = review_thumb_tag
    refute_nil tag, "no review thumbnail rendered"

    src = tag[/\ssrc="([^"]+)"/, 1]
    refute_nil src
    assert_includes src, "/.netlify/images",
                    "preview must emit the production URL so that path is exercised locally"
    assert_includes src, "url=https%3A%2F%2Ftheramenranger.com"
  end

  # The safety net for the 403s: if the edge cannot produce a derivative, the
  # card drops to the unoptimized original rather than showing a broken image.
  def test_thumbnail_falls_back_to_the_origin_image
    tag = review_thumb_tag
    refute_nil tag

    onerror = tag[/onerror="([^"]+)"/, 1]
    refute_nil onerror, "no onerror fallback on the thumbnail"
    assert_match %r{src='https://theramenranger\.com/}, onerror
    assert_includes onerror, "this.onerror=null", "fallback must not be able to loop"
  end

  # Without this the preview server 404s its own image URLs, since there is no
  # Netlify edge behind it.
  def test_preview_server_resolves_the_netlify_image_path
    src = review_thumb_tag[/\ssrc="([^"]+)"/, 1]
    response = Net::HTTP.get_response(URI("#{@base_url}#{src}"))

    assert_equal "302", response.code, "preview server should redirect to the origin photo"
    assert_match %r{\Ahttps://theramenranger\.com/}, response["location"]
  end

  def test_preview_server_rejects_a_missing_url_parameter
    response = Net::HTTP.get_response(URI("#{@base_url}/.netlify/images"))
    assert_equal "400", response.code
  end
end
