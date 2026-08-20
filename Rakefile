require_relative "lib/review_fetcher"

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
