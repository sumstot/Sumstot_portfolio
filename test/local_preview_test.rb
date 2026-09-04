require "minitest/autorun"
require "net/http"
require "uri"

# Run against a live `middleman server`:
#   PORTFOLIO_URL=http://localhost:4567 bundle exec ruby test/local_preview_test.rb
#
# Production and preview both load the original API image directly. This keeps
# the 4:5 crop used by the existing card design without relying on Netlify's
# image service, which intermittently returned 403.
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
    assert_match %r{\Ahttps://theramenranger\.com/rails/active_storage/blobs/}, src
    refute_includes src, "/.netlify/images"
  end
end
