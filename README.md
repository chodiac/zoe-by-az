# ZOE by AZ — digital fashion experience

A single-page, scroll-choreographed site for the Serbian womenswear house **ZOE by AZ**.
Vanilla HTML / CSS / JS. Motion: **GSAP + ScrollTrigger + Lenis** (CDN). No build step.

Interaction language adapted from the pacing / scroll philosophy of
[era-residence.com](https://www.era-residence.com) — oversized type, tiny microcopy,
huge negative space, pinned scrub sequences, horizontal exploration, scenes that
transform into one another rather than stack.

---

## Run it

No Node / Python required on this machine — there is a tiny PowerShell static server:

```bash
powershell -NoProfile -ExecutionPolicy Bypass -File serve.ps1 -Port 5178
```

Then open `http://localhost:5178/`. Any static host (Netlify, Vercel, GitHub Pages,
nginx …) also works — the files are plain assets.

`.claude/launch.json` (in `D:\CLAUDE`) wires this for `preview_start name:"zoe-by-az"`.

### Dev flags (query string)

| flag | effect |
|------|--------|
| `?motion` | force full motion even when the browser hard-codes `prefers-reduced-motion` (headless / in-app browsers do this). Adds `.force-motion` to `<html>` so the reduced-motion CSS is bypassed too. |
| `?raw` | disable Lenis smooth scroll (native scroll) — handy for debugging / screenshots. |

Real visitors need neither flag.

---

## File map

```
index.html        all DOM + section comments + placeholder declarations
css/style.css      all styles (numbered table of contents at the top)
js/main.js         all behaviour — one init* function per concern
serve.ps1          local static server
```

`js/main.js` is a single IIFE. Every feature is an `init*` function called from
`boot()`:

`buildPlaceholders` · `initSmoothScroll` · `initCursor` · `initMagnetic` ·
`initNav` · `initMenu` · `initProgress` · `initBackground` · `initTextReveals` ·
`initMediaReveals` · `initParallax` · `initHero` · `initHorizontal` · `initWoman` ·
`initFounder` · `initValues` · `initInterlude` · `initLookGallery` · `initSequence` ·
`initFooter` · `initForm`

---

## Media placeholder system

Every image / video slot is a `<figure class="media">` with data attributes.
`buildPlaceholders()` injects the art-direction frame (inner surface, hairline
frame, corner ticks, ID label, dimension label). **Nothing is a real photo yet —
all frames are intentional empty art-direction frames.**

```html
<figure class="media"
        data-media="HERO_01"      <!-- id shown in the corner label -->
        data-dim="2400×1600"      <!-- recommended pixel size, shown centred -->
        data-ratio="3 / 2"        <!-- aspect-ratio, applied inline -->
        data-reveal="up"          <!-- optional: up | down | left | right | center -->
        data-parallax="-8"        <!-- optional: scroll parallax amount (vh-ish) -->
        data-cursor="view">       <!-- optional: custom-cursor label on hover -->
</figure>
```

### Replacing a placeholder with a real asset

**Option A — data attribute (simplest):**

```html
<figure class="media" data-media="HERO_01" data-ratio="3 / 2"
        data-src="assets/hero-01.jpg" data-alt="ZOE by AZ — kampanja">
</figure>
```

`buildPlaceholders()` puts the `<img>` inside `.media__inner` (the element that is
scaled / parallaxed), so every reveal, mask, parallax and hover effect keeps
working untouched.

**Option B — drop markup in by hand:**

```html
<figure class="media" data-media="HERO_01" data-ratio="3 / 2">
  <div class="media__inner"><img src="assets/hero-01.jpg" alt="…"></div>
</figure>
```

For video use `<video class="…" autoplay muted loop playsinline>` inside
`.media__inner` instead of `<img>` (add `object-fit:cover` — already set on
`.media__inner img`; add the same rule for `video` if needed).

Keep `data-ratio` accurate — it reserves the correct box before the asset loads.

### Placeholder inventory (recommended sizes)

| ID | role | ratio | recommended |
|----|------|-------|-------------|
| `HERO_01` | hero campaign | 3 / 2 | 2400×1600 |
| `EDITORIAL_01–04` | floating editorial frames | 4/5, 2/3, 1/1, 12/7 | 1400×1750 … 2400×1400 |
| `COLLECTION_01–04` | horizontal collection looks | 8 / 11 | 1600×2200 |
| `WOMAN_01` | "the woman" portrait | 8 / 11 | 1600×2200 |
| `ANKICA_01` | founder portrait | 8 / 11 | 1600×2200 |
| `VALUE_01–04` | principle detail crops | 4 / 5 | 1200×1500 |
| `INTERLUDE_01` | typographic-interlude strip (video ok) | 8 / 3 | 2400×900 |
| `LOOK_01–07` | selected-looks gallery | varies | see `index.html` |
| `ATELIER_01–03` | craft details | 4 / 5 | 1200×1500 |
| `DETAIL_01–04` | pinned detail sequence | 4 / 5 | 1600×2000 |
| `INSTAGRAM_01–06` | social row | 4/5, 1/1, 3/4 | 1200×1500 |
| `MENU_01–05` | fullscreen-menu hover previews | 4 / 5 | 1200×1500 |

---

## Copy

Primary language **Serbian**; a few editorial phrases and all nav labels stay
English by design. All copy is plain text in `index.html` — edit in place.
`EST. MMXX` in the loader and `© 2026` in the footer are the two dated strings.

Instagram links: brand → `https://www.instagram.com/zoebyaz/`,
founder → `https://www.instagram.com/zivkovic.ankica/`.

The contact form has **no backend** — it clears the fields and shows a thank-you
line. Wire `#form`'s submit handler in `initForm()` to a real endpoint when ready.

---

## Accessibility / performance notes

- Respects `prefers-reduced-motion`: no loader, no Lenis, no pins/scrubs/parallax,
  no custom cursor — every section resolves to a legible static state, all content
  present. (`?motion` overrides this for previews only.)
- Text-reveal splitting keeps the original string in an `aria-label` + a
  visually-hidden copy, so screen readers get clean text and nothing disappears if
  JS fails.
- Animations are `transform` / `opacity` / `clip-path` only. `will-change` is used
  sparingly (continuously-scrubbed elements only). ScrollTriggers are grouped and
  rebuilt via `gsap.matchMedia()` at the 1100px breakpoint; `ScrollTrigger.refresh()`
  runs after fonts load and on debounced resize.
- Custom cursor and magnetic effects are `(hover:hover) and (pointer:fine)` only.
