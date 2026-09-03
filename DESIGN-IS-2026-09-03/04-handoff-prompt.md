```text
/make-plan Refine the bilingual Sumstot professional portfolio based on a Dieter Rams audit (total 20/30).

Verdict paragraph (quoted from 03-verdict.md):
> REFINE — the portfolio’s minimal, bilingual structure is worth preserving, but professional trust and conversion are being reduced by imprecise claims, missing outcome evidence, one broken project path, accessibility details, and disproportionate feed-image weight.

Keep (already strong, do NOT touch in this pass):
- Principle #5 (unobtrusive) scored 3 — Evidence: `source/localizable/index.html.erb:42-74`, `source/stylesheets/components/_nav.scss:1-33`. Regression check: verify there are still zero modals, badges, autoplay elements, or idle animations and the content remains visually dominant.
- Principle #7 (long-lasting) scored 3 — Evidence: `source/stylesheets/config/_tokens.scss:11-24`, `source/stylesheets/components/_bento.scss:1-12`. Regression check: verify no gradients, fad effects, novelty interactions, or unnecessary new visual tokens are introduced.

Fix in priority order (top 3–5 moves from the audit, verbatim):
1. Principle #6 — Honest: qualify “solo,” “live,” and exact-count claims so every statement matches the work and fallback behavior. Evidence: `locales/en.yml:24-26,61,82-95`; `source/javascripts/live.js:3-10,129-213`.
2. Principle #2 — Useful: make My Pension Japan’s configured project URL a clear keyboard-accessible action, and keep consulting/service discovery reachable on mobile. Evidence: `data/projects.yml:7-16`; `source/partials/_tile.erb:17-39`; `source/stylesheets/components/_responsive.scss:19-32`.
3. Principles #2/#4 — Useful and understandable: add compact proof—dates, role scope, one measurable outcome per major project, and concrete consulting engagement types—without expanding the visual system. Evidence: `locales/en.yml:33-51,85-145`.
4. Principle #8 — Thorough: fix heading order, add `main`/skip navigation, use consistent visible focus, and raise footer contrast above 4.5:1. Evidence: `source/localizable/index.html.erb:1-74`; `source/stylesheets/components/_tile.scss:60-70`; `source/stylesheets/components/_contact.scss:1-5,40-50`.
5. Principle #9 — Environmentally friendly: serve genuinely small responsive review thumbnails or proxy/cache resized variants; the five current images account for 29.7 MB. Evidence: `data/reviews.yml:5-54`; `source/partials/_review_card.erb:11-15`; Lighthouse mobile run, 2026-09-03.

Out of scope for this refine pass: visual redesign, new brand direction, replacing the bilingual information architecture, changing the Middleman stack, adding speculative testimonials, or inventing metrics that Soren cannot substantiate.

Deliverables for the plan:
- Per-fix: target files, exact change, verification step
- Token/spec changes consolidated in one place
- Regression checklist for every “Keep” item above
- A short list of factual inputs Soren must provide before credibility copy can be finalized

Anti-patterns to guard against (specific to REFINE):
- Adding new abstractions where a direct change suffices
- Restyling areas that already scored 3
- Scope creep into structural redesign
- Letting fixes mutate principles outside the priority list
```
