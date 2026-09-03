require "minitest/autorun"
require "json"

class PortfolioRenderTest < Minitest::Test
  ROOT = File.expand_path("..", __dir__)

  def pages
    @pages ||= {
      en: File.read(File.join(ROOT, "build/index.html")),
      ja: File.read(File.join(ROOT, "build/ja/index.html"))
    }
  end

  def compiled_css
    @compiled_css ||= begin
      path = pages.fetch(:en).match(%r{href="(/stylesheets/site-[^"]+\.css)"})[1]
      File.read(File.join(ROOT, "build", path))
    end
  end

  def test_primary_content_has_main_landmark_and_skip_link
    pages.each_value do |page|
      assert_match %r{<main\s+id="main-content">}, page
      assert_match %r{<a\s+class="skip-link"\s+href="#main-content">}, page
    end
  end

  def test_heading_levels_do_not_skip
    pages.each_value do |page|
      levels = page.scan(/<h([1-6])(?:\s|>)/).flatten.map(&:to_i)

      levels.each_cons(2) do |previous, current|
        assert_operator current, :<=, previous + 1,
          "heading level jumped from h#{previous} to h#{current}"
      end
    end
  end

  def test_locale_control_does_not_wrap_between_characters
    assert_match(/\.nav nav (?:a)?\.lang\{[^}]*white-space:nowrap/, compiled_css)
  end

  def test_mobile_navigation_uses_a_deliberate_two_row_layout
    assert_match(/\.nav \.wrap\{[^}]*flex-direction:column[^}]*align-items:stretch/, compiled_css)
    assert_match(/\.nav \.name\{[^}]*white-space:nowrap/, compiled_css)
    assert_match(/\.nav nav\{[^}]*margin-left:0[^}]*width:100%[^}]*justify-content:space-between/, compiled_css)
    assert_match(/html\{scroll-padding-top:144px\}/, compiled_css)
  end

  def test_url_backed_project_has_a_keyboard_action
    pages.each_value do |page|
      assert_match %r{<a\s+class="tile-link"\s+href="https://mypensionjapan\.com"\s+target="_blank"\s+rel="noopener">}, page
    end
  end

  def test_review_images_use_bounded_netlify_transformations
    pages.each_value do |page|
      images = page.scan(/<img\s+([^>]*class="review-thumb"[^>]*)>/).flatten
        .select { |attributes| attributes.include?("/.netlify/images?") }
      refute_empty images

      images.each do |attributes|
        assert_match %r{src="/\.netlify/images\?[^\"]*w=320}, attributes
        assert_match %r{srcset="[^\"]*w=480}, attributes
        assert_includes attributes, 'sizes="(max-width: 640px) 62vw, 240px"'
        assert_includes attributes, 'width="320"'
        assert_includes attributes, 'height="400"'
      end
    end
  end

  def test_structured_data_identifies_one_localized_person
    pages.each_value do |page|
      person = JSON.parse(page.match(%r{<script type="application/ld\+json">(.*?)</script>}m)[1])
      canonical = page.match(%r{<link rel="canonical" href="([^"]+)">})[1]
      language = page.match(/<html lang="([^"]+)">/)[1]

      assert_equal "https://sorenumstot.com/#person", person.fetch("@id")
      assert_equal canonical, person.fetch("url")
      assert_equal language, person.fetch("inLanguage")
    end
  end
end
