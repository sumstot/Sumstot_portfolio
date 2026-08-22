require_relative "lib/env_file"
require_relative "lib/review_fetcher"
require_relative "lib/reading_fetcher"

EnvFile.load

namespace :reviews do
  desc "Refresh data/reviews.yml from the Ramen Ranger API"
  task :fetch do
    case ReviewFetcher.refresh
    when :updated   then puts "[reviews] data/reviews.yml updated"
    when :unchanged then puts "[reviews] already current"
    else                 puts "[reviews] fetch failed — keeping committed data"
    end
  end
end

namespace :reading do
  desc "Refresh data/reading.yml from the Goodreads shelf RSS feed"
  task :fetch do
    case ReadingFetcher.refresh
    when :updated   then puts "[reading] data/reading.yml updated"
    when :unchanged then puts "[reading] already current"
    when :skipped   then puts "[reading] GOODREADS_RSS_URL not set — skipped"
    else                 puts "[reading] fetch failed — keeping committed data"
    end
  end
end
