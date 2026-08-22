# Local secrets come from .env, which is gitignored. On Netlify the same
# variables are set in the site's build environment instead. Kept dependency
# free — dotenv would be one more gem for a dozen lines.
#
# Loaded by both config.rb (Middleman builds) and Rakefile (the fetch tasks),
# so `rake reading:fetch` sees the same variables a build does.
module EnvFile
  ROOT = File.expand_path("..", __dir__)
  PATH = File.join(ROOT, ".env")

  module_function

  # Existing environment variables always win, so Netlify's build environment
  # is never overridden by a stray local file.
  def load(path = PATH)
    return false unless File.exist?(path)

    File.foreach(path) do |line|
      stripped = line.strip
      next if stripped.empty? || stripped.start_with?("#")

      name, _, value = stripped.partition("=")
      ENV[name.strip] ||= value.strip.gsub(/\A["']|["']\z/, "")
    end
    true
  end
end
