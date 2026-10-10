# Vestavia Country Club — landing page + drone flyover

A concept landing page for [Vestavia Country Club](https://www.vestaviacc.com) (Vestavia Hills, Alabama) and a
26-second drone-style flyover film in which the page's hero elements cascade onto live aerial footage, then a
virtual camera lifts off and flies over the page itself.

- **Stack:** Svelte 5 + Vite (no SvelteKit), Three.js for the 3D grounds, plain JS modules.
- **Film:** `media/vestavia-flyover.mp4` — 26 s, 1920×1080, 30 fps, H.264. Rendered frame-by-frame from the real page.
- **Poster:** `media/vestavia-flyover-poster.jpg`.
- **Standalone page:** `media/vestavia-landing.html` — the whole site in one file (≈2 MB); open it straight from disk.

> **Read before using this with the club.** The live site could not be scanned from the build environment
> (its network policy blocked `www.vestaviacc.com`), so nothing here is copied from the club's own pages:
>
> - **Copy and facts** come from public reporting (see [Sources](#sources)) and need the club's confirmation.
> - **Imagery** is procedural 3D rendering of an *illustrative* course, clubhouse, 15 courts and three pools —
>   not photographs and not a survey of the real property. Swap in real photography and aerial video.
> - **The monogram** is a placeholder, not the club's mark.
> - **The inquiry form** has no backend; `Membership.svelte` marks where to wire it up.

## Run it

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # static site in dist/ (relative paths, deploy anywhere)
npm run preview
npm run build:single   # one self-contained HTML file -> media/vestavia-landing.html
```

## What's on the page

| Section | Notes |
| --- | --- |
| Hero | Live WebGL flyover of the grounds at golden hour (pause button, flight HUD naming the hole below). Headline words drop in, stat cards cascade from the right. Falls back to a poster image without WebGL; renders a single still frame under `prefers-reduced-motion`. |
| The Course | Lester George renovation story, key numbers, 1948–2019 timeline. |
| Signature Holes | No. 7 over the lake, No. 11 Principal's Nose, No. 13 Redan, No. 15 Biarritz — SVG template diagrams (illustrative). |
| Club Life | Tennis, aquatics, clubhouse dining & events, fitness & family. |
| Membership | "By invitation" story, categories, inquiry form, contour-map art drawn from the 3D height field. |
| Visit | Address, phone, directions, contour locator map. |

Each section's elements cascade in once as it scrolls into view (`use:cascade` + `use:revealOnScroll` in
`src/lib/motion.js`, built on the Web Animations API). Dark mode follows the OS setting; the layout holds at
phone width with no horizontal scroll.

## How the film is made

`?film` turns the page into a set (`src/components/FilmStage.svelte`):

1. **0–6.4 s** drone descent over the par-3 seventh, full-bleed, with only the flight HUD.
2. **6.4–12.6 s** the hero UI cascades onto the footage: nav, eyebrow, headline words, sub-copy, buttons, stat cards.
3. **12.6–22.6 s** the camera lifts off the hero and flies over the tilted page in 3D; each section cascades in as the
   camera's focus reaches it, over a contour-map ground.
4. **22.6–26 s** end card.

Every animation is seekable (`window.__film.seek(t)`), so frames are deterministic. `scripts/render-video.mjs` drives
headless Chromium (software WebGL), screenshots each frame to `.frames/film/` (resumable), then encodes with ffmpeg:

```bash
npm run build
node scripts/render-video.mjs --stills          # page imagery -> src/assets/img (rebuild afterwards)
node scripts/render-video.mjs --frames 3,9,15   # preview PNGs in .frames/
node scripts/render-video.mjs --film            # full film -> media/vestavia-flyover.mp4
```

Delete `.frames/film` after changing the page, or stale frames will be reused. In software GL a frame takes ~7–10 s,
so the full film is roughly 1.5–2 hours; on a machine with a GPU, drop the `--use-angle=swiftshader` flags via
`CHROME_ARGS` and it is much faster.

## Code map

```
src/
  App.svelte               routes ?film / ?still=<preset> / normal site
  components/              Nav, Hero, Course, Holes, ClubLife, Membership, Visit, Footer, FilmStage, StillRender
  lib/content.js           all copy and facts in one place
  lib/course.js            illustrative layout, terrain height field, flight route
  lib/flyover.js           Three.js scene: terrain shader (baked course SDF), trees (3D near, billboards far),
                           lake reflector, clubhouse precinct, golden-hour sky and haze
  lib/motion.js            cascade animations (seekable for the film)
  lib/topo.js              contour lines from the height field
scripts/render-video.mjs   stills + film renderer
```

Quality tiers (`film`, `high`, `low`) live at the top of `createFlyover`; phones and ≤4-core machines get `low`.
`?still=path&t=9&dbg=notrees,noshadow,nowater,noaa` toggles scene features for profiling.

## Facts to confirm with the club

- Founding: clubhouse designed 1948, opened to members 1950 (one listing says 1960).
- Course: 6,811 yards, par 72 from the back tees; original design by George Cobb.
- Renovation: Lester George / George Golf Design, January 2017 – June 2018; all 18 holes renovated, 10 rebuilt,
  500+ trees removed, new zoysia, water features, new practice range.
- Golf Digest: No. 4 Best New Private Courses (class of 2018, announced 2019); No. 7 Best in State, 2023–24.
- Template holes: par-3 7th over a lake, Principal's Nose bunker on 11, Redan 13th, Biarritz green on 15.
- Amenities: 15 tennis courts (another listing says 12 clay), clay and hard courts, tennis clubhouse; three pools
  including a junior Olympic–size pool; fitness center; childcare; ballroom and patio.
- Membership: ~900 members; Golf, Tennis, Social and Junior categories; by invitation.
- Address and phone: 400 Beaumont Drive, Vestavia Hills, AL 35216 · (205) 822-8300.
- "Member Login" links to the existing site's home page; point it at the member portal.

## Sources

- Bhamwiki — [Vestavia Country Club](https://www.bhamwiki.com/w/Vestavia_Country_Club)
- Bham Now — [Golf Digest names Birmingham golf course 4th best in nation](https://bhamnow.com/2019/02/05/golf-digest-names-birmingham-golf-course-4th-best-in-nation/)
- Golf Digest — [Vestavia Country Club: Championship](https://www.golfdigest.com/courses/al/vestavia-country-club-championship)
- Golf Course Architecture — [Vestavia reopens following renovation by Lester George](https://www.golfcoursearchitecture.net/content/PgrID/573/PageID/1/artmid/574/articleid/13143)
- Vestavia Voice — [Golf course reopens after renovations](https://vestaviavoice.com/businesses/vestavia-country-club-golf-course-reopens-after-renovations/) ·
  [Club prepares for $10 million makeover](https://vestaviavoice.com/businesses/vestavia-country-club-prepares-for-10-million-makeover728/)
- Top 100 Golf Courses — [Vestavia](https://www.top100golfcourses.com/golf-course/vestavia)
- Open Golf API — [Vestavia Country Club](https://courses.opengolfapi.org/courses/AL/vestavia-country-club)
- GuideStar — [Vestavia Country Club](https://www.guidestar.org/profile/63-0275649)
- ThePricer — [Vestavia Country Club membership](https://www.thepricer.org/how-much-does-a-vestavia-country-club-membership-cost/)
- Bounce — [Vestavia Country Club courts](https://www.bounce.game/court/vestavia-country-club-birmingham-alabama-us)
- Golf Course Print — [Vestavia Country Club](https://golfcourseprint.com/products/vestavia-country-club-alabama-printed-golf-courses)

Fonts: Cormorant Garamond and Manrope (SIL Open Font License), self-hosted from Google Fonts.
