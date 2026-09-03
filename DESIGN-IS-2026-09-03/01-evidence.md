# Consolidated design evidence

## 1. Innovative

- The site combines a familiar editorial portfolio structure with a data-backed bento work grid and progressively enhanced reading/review feeds (`source/localizable/index.html.erb:24-60`, `source/javascripts/live.js:129-224`).
- The six-column grid and live personal-data modules are a restrained variation on established portfolio patterns, not a novel interaction model (`source/stylesheets/components/_bento.scss:1-12`).

## 2. Useful

- The primary paths are direct: Work, How I work, Contact, locale switch, work CTA, email, GitHub, and LinkedIn (`source/localizable/index.html.erb:3-20,60-71`).
- The rendered English page has 19 visible interactive elements and three repeated same-destination groups: Work, email, and GitHub (`build/index.html:45-61,108,121,141-214,240,252,310-312`).
- My Pension Japan has a configured URL but renders as a non-interactive `div`; the most important independent case study cannot be opened from its card (`data/projects.yml:7-16`, `source/partials/_tile.erb:17-39`, `config.rb:103-121`).
- Mobile navigation hides How I work, which contains the clearest consulting/service framing (`source/stylesheets/components/_responsive.scss:19-32`, `locales/en.yml:107-138`).

## 3. Aesthetic

- The visual system uses a six-column grid that collapses to two and one columns, a shared 16px gap, quiet neutral surfaces, and a restrained red accent (`source/stylesheets/components/_bento.scss:1-12`, `source/stylesheets/components/_responsive.scss:1-17`, `source/stylesheets/config/_tokens.scss:11-24`).
- The compiled surface references 22 distinct colors, 19 font sizes, and a broad spacing set. These values produce nuance but are looser than a compact token system (`source/stylesheets/config/_base.scss:11-115`, `source/stylesheets/components/_tile.scss:1-168`, `build/stylesheets/site-8f745bbf.css:1`).
- Visual-browser screenshot inspection was unavailable; aesthetic conclusions are based on rendered markup and compiled/source CSS.

## 4. Understandable

- English and Japanese pages declare their language and reciprocal locale links correctly (`source/layouts/layout.erb:1-13`, `source/localizable/index.html.erb:3-9`).
- Headings, subtitles, and review metadata make the content hierarchy explicit (`source/localizable/index.html.erb:24-60`, `source/partials/_review_card.erb:11-31`).
- Lighthouse flags non-sequential heading order, and the document lacks a `main` landmark (`source/localizable/index.html.erb:1-74`; Lighthouse mobile run, 2026-09-03).
- Several client-facing phrases are implementation jargon rather than benefits: “coordinate-mapped PDF overlays,” “data residency,” “agentic workflows,” and “legacy rescue” (`locales/en.yml:33-51,89-95,131-137`).

## 5. Unobtrusive

- The page has five clear content regions and no modal, notification, badge, autoplay, or idle animation (`build/index.html:42-322`; Lighthouse/DOM scan, 2026-09-03).
- Navigation is a quiet 72px translucent sticky bar; motion is limited to interaction transitions and smooth scrolling (`source/stylesheets/components/_nav.scss:1-33`, `source/stylesheets/config/_base.scss:3-9`).
- Content remains the dominant figure; the red accent is reserved for scores, destinations, hover borders, and focus (`source/stylesheets/config/_tokens.scss:11-20`, `source/stylesheets/components/_tile.scss:60-77`).

## 6. Honest

- No dark patterns were found; all primary controls are ordinary anchors or mail links (`source/localizable/index.html.erb:3-8,18-19,65-67`, `source/partials/_tile.erb:41-47,69,83,105`).
- “Built and deployed solo” describes the whole Work section while Kengaku explicitly describes a three-person team (`locales/en.yml:24-26,89-95`, `locales/ja.yml:20-22,67-71`).
- “Pulled live” and “Live from Goodreads” omit that build-time content remains when runtime fetches fail (`locales/en.yml:61,82-83`, `source/javascripts/live.js:3-10,129-213`).
- “All 264 reviews” uses the highest observed review ID as a proxy rather than a true total (`locales/en.yml:82-83`, `lib/review_fetcher.rb:34-39,112-114`).
- Operational and product claims are concrete but lack dates, outcome metrics, case-study evidence, or corroborating links (`locales/en.yml:33-51,89-95,107-114`).

## 7. Long-lasting

- The neutral palette, editorial typography, grid, minimal motion, and absence of gradients or novelty interactions avoid strong trend markers (`source/stylesheets/config/_tokens.scss:11-24`, `source/stylesheets/components/_bento.scss:1-12`).
- Content and locale data are separated from templates, supporting continued maintenance without redesign (`locales/en.yml:1-150`, `locales/ja.yml:1-117`, `data/projects.yml:1-40`).

## 8. Thorough

- Language metadata, alt text, lazy loading, reduced-motion behavior, and locale alternates are implemented (`source/layouts/layout.erb:1-13`, `source/partials/_review_card.erb:11-15`, `source/stylesheets/config/_base.scss:118-120`).
- Static content acts as a resilient feed fallback, but refresh success/failure is not announced and there is no visible last-updated state (`source/javascripts/live.js:3-10,129-213`).
- Explicit custom focus styling exists only for `a.tile`; other links use browser defaults (`source/stylesheets/components/_tile.scss:60-70`).
- The lowest exposed text contrast is 4.07:1 in the footer, below WCAG AA for normal text; Lighthouse also reports a contrast failure (`source/stylesheets/components/_contact.scss:1-5,40-50`).
- There is no `main` landmark or skip link, and My Pension Japan is not keyboard actionable (`source/localizable/index.html.erb:1-74`, `source/partials/_tile.erb:17-39`).

## 9. Environmentally friendly

- JavaScript is only 8,209 transferred bytes; TBT is 0 ms, CLS is 0, and reduced-motion is honored (Lighthouse mobile run, 2026-09-03; `source/stylesheets/config/_base.scss:118-120`).
- The same run transferred 30,338,419 bytes across 34 requests. Five third-party review images account for 29,742,902 bytes (98%) and are emitted without `srcset` or `sizes` (`data/reviews.yml:5-54`, `source/partials/_review_card.erb:11-15`).
- Mobile-simulated FCP was 3,694 ms, LCP/TTI 4,968 ms. This is one local cold-load run, not production field data.

## 10. As little design as possible

- The primary DOM has 19 interactive elements, a maximum depth of 10, and no overlays or decorative interaction layers (`build/index.html:45-312`).
- The work grid contains six distinct content tiles; the five-review feed and extensive tool inventories are the densest portions (`data/projects.yml:7-40`, `source/partials/_review_feed.erb:1-16`, `locales/en.yml:115-138`).
- Work, email, and GitHub each have repeated same-destination affordances. The work/hero repetition supports scanning, while the additional GitHub route is removable without breaking the primary task (`build/index.html:47,60-61,252,310-312`).

## Professional-confidence findings

- No dated professional timeline, tenure, or recent role chronology is shown (`locales/en.yml:85-105`).
- No measurable delivery outcome accompanies My Pension Japan or Kengaku Cloud (`locales/en.yml:33-51,89-95`).
- Consulting availability is presented alongside full-time employment without scope, capacity, start window, response expectation, or conflict constraints (`locales/en.yml:89-95,140-145`).
- The only conversion action is a generic mailto; services are framed mostly as tools rather than client problems, deliverables, and outcomes (`locales/en.yml:107-145`, `source/localizable/index.html.erb:60-68`).

## Known gaps

- No screenshot/computed-layout or real-device review was possible because the integrated browser was unavailable.
- External products, LinkedIn, GitHub history, employer claims, customer evidence, analytics, and inbox conversion data were not audited.
- Performance data is from one simulated mobile run against the local English route.
