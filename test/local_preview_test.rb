require "minitest/autorun"
require "net/http"
require "uri"

class LocalPreviewTest < Minitest::Test
  def test_middleman_preview_uses_direct_review_images
    base_url = ENV.fetch("PORTFOLIO_URL")
    html = Net::HTTP.get(URI(base_url))
    image_src = html.match(/<img class="review-thumb"\s+src="([^"]+)/m)&.[](1)

    refute_nil image_src
    assert_match %r{\Ahttps://theramenranger\.com/}, image_src
    refute_includes image_src, "/.netlify/images"
  end
end
