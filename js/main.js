/* =============================================================
   ZOE by AZ — main.js
   Scroll choreography. GSAP + ScrollTrigger + Lenis.
   -------------------------------------------------------------
   Structure
     buildPlaceholders()      inject art-direction frames
     splitLines(el)           line-mask helper (accessible)
     initLoader()             fashion-show opening
     initSmoothScroll()       Lenis <-> ScrollTrigger bridge
     initCursor()             desktop custom cursor
     initMagnetic()           subtle magnetic elements
     initNav()                floating nav show/hide
     initMenu()               fullscreen editorial menu
     initProgress()           NN / 12 + thin line
     initBackground()         scene-to-scene colour interpolation
     initTextReveals()        .reveal-lines / .line masks
     initMediaReveals()       clip-path image reveals
     initParallax()           [data-parallax] drift (never inside a pin)
     initHero()               pinned scrub composition
     initHorizontal()         vertical scroll -> horizontal + drag
     initWoman()              sticky text, travelling portrait
     initFounder()            ANKICA / ŽIVKOVIĆ split entrance
     initValues()             sticky numbers, word entrances
     initInterlude()          opposing scroll marquees
     initLookGallery()        FLIP look detail overlay
     initSequence()           pinned detail sequence
     initFooter()             rising ZOE / BY AZ
     initForm()               editorial form microinteractions
============================================================= */

(function () {
  "use strict";

  const gsap = window.gsap;
  const ScrollTrigger = window.ScrollTrigger;
  const Flip = window.Flip;
  gsap.registerPlugin(ScrollTrigger);
  if (Flip) gsap.registerPlugin(Flip);
  ScrollTrigger.config({ ignoreMobileResize: true });

  // dev flags:  ?raw = native scroll (no Lenis)   ?flat = disable scrub/pin motion
  const PARAMS = new URLSearchParams(location.search);
  const RAW = PARAMS.has("raw");
  const REDUCED = PARAMS.has("flat") || (!PARAMS.has("motion") && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  const CAN_HOVER = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  const mm = gsap.matchMedia();
  const DESKTOP = "(min-width: 1101px)";
  const MOBILE = "(max-width: 1100px)";

  let lenis = null;

  /* ----------------------------------------------------------
     PLACEHOLDERS — build the art-direction frame for every
     .media that has no real content yet.
     Replace later: put <img> inside .media__inner, or set
     data-src="path.jpg" on the <figure> (see README).
  ---------------------------------------------------------- */
  function buildPlaceholders() {
    document.querySelectorAll(".media").forEach((fig) => {
      const ratio = fig.dataset.ratio;
      if (ratio) fig.style.aspectRatio = ratio.replace(/\s/g, "");

      const inner = document.createElement("div");
      inner.className = "media__inner";

      const src = fig.dataset.src;
      if (src) {
        const img = document.createElement("img");
        img.src = src;
        img.alt = fig.dataset.alt || "";
        img.loading = "lazy";
        inner.appendChild(img);
      }

      const frame = document.createElement("span");
      frame.className = "media__frame";

      const label = document.createElement("span");
      label.className = "media__label";
      label.textContent = fig.dataset.media || "";

      const dim = document.createElement("span");
      dim.className = "media__dim";
      dim.textContent = fig.dataset.dim || "";

      fig.append(inner, frame, label, dim);
    });
  }

  /* ----------------------------------------------------------
     splitLines — wrap each visual line of an element in an
     overflow-hidden .line > span. Keeps original text node
     content (screen-reader safe). Re-runs on resize.
  ---------------------------------------------------------- */
  const lineStore = new WeakMap();

  function splitLines(el) {
    if (!lineStore.has(el)) {
      lineStore.set(el, el.getAttribute("aria-label") || el.textContent.trim().replace(/\s+/g, " "));
    }
    const source = lineStore.get(el);
    el.setAttribute("aria-label", source);

    // tokenise into words wrapped in measuring spans
    el.innerHTML = "";
    const frag = document.createDocumentFragment();
    const words = source.split(" ");
    const wordSpans = words.map((w, i) => {
      const s = document.createElement("span");
      s.className = "sl-word";
      s.style.display = "inline-block";
      s.textContent = w + (i < words.length - 1 ? " " : "");
      frag.appendChild(s);
      return s;
    });
    el.appendChild(frag);
    el.setAttribute("aria-hidden", "false");

    // group words by offsetTop -> lines
    const lines = [];
    let cur = null;
    let top = null;
    wordSpans.forEach((s) => {
      const t = s.offsetTop;
      if (top === null || Math.abs(t - top) > 4) {
        cur = [];
        lines.push(cur);
        top = t;
      }
      cur.push(s.textContent);
    });

    el.innerHTML = "";
    const inners = [];
    lines.forEach((words) => {
      const lineEl = document.createElement("span");
      lineEl.className = "line";
      const inner = document.createElement("span");
      inner.textContent = words.join("");
      lineEl.appendChild(inner);
      el.appendChild(lineEl);
      inners.push(inner);
    });
    el.setAttribute("aria-hidden", "true"); // decorative; aria-label carries text

    // wrap with a readable label sibling for AT
    if (!el.nextElementSibling || !el.nextElementSibling.classList.contains("sr-only-text")) {
      const sr = document.createElement("span");
      sr.className = "sr-only-text visually-hidden";
      sr.textContent = source;
      el.after(sr);
    }
    return inners;
  }

  /* ----------------------------------------------------------
     LOADER
  ---------------------------------------------------------- */
  function initLoader(done) {
    const loader = document.getElementById("loader");
    let finished = false;
    const reallyFinish = () => {
      if (finished) return;
      finished = true;
      if (loader) loader.remove();
      document.body.classList.remove("is-locked");
      done();
    };
    // Hold the loader until fonts have loaded so every ScrollTrigger is
    // built against final text metrics — no late refresh / scroll hop.
    const finish = () => {
      if (REDUCED || !document.fonts || !document.fonts.ready) { reallyFinish(); return; }
      Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 2000))]).then(reallyFinish);
    };

    if (!loader || REDUCED) { finish(); return; }

    document.body.classList.add("is-locked");
    const lines = loader.querySelectorAll(".loader__line > span");
    const rule = loader.querySelector(".loader__rule");
    const meta = loader.querySelector(".loader__meta");
    const curtain = loader.querySelector(".loader__curtain");
    const ruleW = Math.min(240, window.innerWidth * 0.42);

    // hard safety net: never let a stalled rAF trap the page behind the loader
    const safety = setTimeout(finish, 4200);

    gsap.timeline({
      defaults: { ease: "expo.out" },
      onComplete: () => { clearTimeout(safety); finish(); },
    })
      .to(lines, { yPercent: 0, duration: 1.1, stagger: 0.12 }, 0.15)
      .to(rule, { width: ruleW, duration: 1, ease: "power3.inOut" }, "-=0.5")
      .to(meta, { opacity: 1, duration: 0.6 }, "-=0.4")
      .to({}, { duration: 0.3 })
      .to(loader.querySelector(".loader__inner"), { yPercent: -18, opacity: 0, duration: 0.8, ease: "power3.inOut" }, ">-0.1")
      .to(curtain, { yPercent: -100, duration: 1.1, ease: "power4.inOut" }, "<")
      .set(loader, { pointerEvents: "none" });
  }

  /* ----------------------------------------------------------
     SMOOTH SCROLL
  ---------------------------------------------------------- */
  function initSmoothScroll() {
    if (REDUCED || RAW || !window.Lenis) return;

    lenis = new window.Lenis({
      duration: 1.05,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      wheelMultiplier: 1,
      touchMultiplier: 1.6,
    });

    lenis.on("scroll", ScrollTrigger.update);
    gsap.ticker.add((time) => lenis.raf(time * 1000));
    gsap.ticker.lagSmoothing(0);

    // anchor links -> lenis
    document.querySelectorAll('a[href^="#"]').forEach((a) => {
      a.addEventListener("click", (e) => {
        const id = a.getAttribute("href");
        if (id.length < 2) return;
        const target = document.querySelector(id);
        if (!target) return;
        e.preventDefault();
        closeMenu();
        lenis.scrollTo(target, { offset: 0, duration: 1.4 });
      });
    });

    window.__lenis = lenis;
  }

  function scrollToTop() {
    if (lenis) lenis.scrollTo(0, { duration: 1.6 });
    else window.scrollTo({ top: 0, behavior: REDUCED ? "auto" : "smooth" });
  }

  /* ----------------------------------------------------------
     CURSOR
  ---------------------------------------------------------- */
  function initCursor() {
    const cursor = document.getElementById("cursor");
    if (!cursor || !CAN_HOVER || REDUCED) {
      if (cursor) cursor.remove();
      return;
    }
    const dot = cursor.querySelector(".cursor__dot");
    const ring = cursor.querySelector(".cursor__ring");
    const label = cursor.querySelector(".cursor__label");

    gsap.set(cursor, { opacity: 1 });
    const xToDot = gsap.quickTo(dot, "x", { duration: 0.15, ease: "power3" });
    const yToDot = gsap.quickTo(dot, "y", { duration: 0.15, ease: "power3" });
    const xToRing = gsap.quickTo(ring, "x", { duration: 0.4, ease: "power3" });
    const yToRing = gsap.quickTo(ring, "y", { duration: 0.4, ease: "power3" });

    window.addEventListener("mousemove", (e) => {
      xToDot(e.clientX); yToDot(e.clientY);
      xToRing(e.clientX); yToRing(e.clientY);
    }, { passive: true });

    window.addEventListener("mousedown", () => cursor.classList.add("is-down"));
    window.addEventListener("mouseup", () => cursor.classList.remove("is-down"));
    document.addEventListener("mouseleave", () => gsap.to(cursor, { opacity: 0, duration: 0.3 }));
    document.addEventListener("mouseenter", () => gsap.to(cursor, { opacity: 1, duration: 0.3 }));

    const LABELS = { view: "VIEW", drag: "DRAG", link: "" };
    const setState = (state) => {
      cursor.classList.remove("is-view", "is-drag", "is-link");
      if (state) {
        cursor.classList.add("is-" + state);
        label.textContent = LABELS[state] || "";
      }
    };

    // event delegation for [data-cursor]
    document.body.addEventListener("mouseover", (e) => {
      const t = e.target.closest("[data-cursor]");
      if (t) setState(t.dataset.cursor);
    });
    document.body.addEventListener("mouseout", (e) => {
      const t = e.target.closest("[data-cursor]");
      if (t && !e.relatedTarget?.closest?.("[data-cursor]")) setState(null);
    });
  }

  /* ----------------------------------------------------------
     MAGNETIC
  ---------------------------------------------------------- */
  function initMagnetic() {
    if (!CAN_HOVER || REDUCED) return;
    document.querySelectorAll("[data-magnetic]").forEach((el) => {
      const strength = parseFloat(el.dataset.magnetic) || 0.35;
      const xTo = gsap.quickTo(el, "x", { duration: 0.5, ease: "power3" });
      const yTo = gsap.quickTo(el, "y", { duration: 0.5, ease: "power3" });
      el.addEventListener("mousemove", (e) => {
        const r = el.getBoundingClientRect();
        xTo((e.clientX - (r.left + r.width / 2)) * strength);
        yTo((e.clientY - (r.top + r.height / 2)) * strength);
      });
      el.addEventListener("mouseleave", () => { xTo(0); yTo(0); });
    });
  }

  /* ----------------------------------------------------------
     NAV — hide going down, show going up; never a solid bar
  ---------------------------------------------------------- */
  function initNav() {
    const nav = document.getElementById("nav");
    let last = 0;
    ScrollTrigger.create({
      start: 0,
      end: "max",
      onUpdate: (self) => {
        const y = self.scroll();
        if (y > last && y > window.innerHeight * 0.8) nav.classList.add("is-hidden");
        else nav.classList.remove("is-hidden");
        last = y;
      },
    });
  }

  /* ----------------------------------------------------------
     MENU
  ---------------------------------------------------------- */
  let menuOpen = false;
  function closeMenu() {
    const menu = document.getElementById("menu");
    if (!menu || !menuOpen) return;
    menuOpen = false;
    document.getElementById("menuOpen").setAttribute("aria-expanded", "false");
    menu.setAttribute("aria-hidden", "true");
    menu.classList.remove("is-open");
    if (lenis) lenis.start();
  }

  function initMenu() {
    const menu = document.getElementById("menu");
    const openBtn = document.getElementById("menuOpen");
    const closeBtn = document.getElementById("menuClose");
    if (!menu) return;
    const items = menu.querySelectorAll(".menu__item");
    const preview = menu.querySelector(".menu__preview");
    const previewLabel = preview.querySelector(".media__label");

    openBtn.addEventListener("click", () => {
      if (menuOpen) return;
      menuOpen = true;
      openBtn.setAttribute("aria-expanded", "true");
      menu.setAttribute("aria-hidden", "false");
      menu.classList.add("is-open");
      if (lenis) lenis.stop();
    });

    closeBtn.addEventListener("click", closeMenu);
    window.addEventListener("keydown", (e) => { if (e.key === "Escape") closeMenu(); });

    // hover previews (desktop)
    if (CAN_HOVER) {
      items.forEach((item) => {
        item.addEventListener("mouseenter", () => {
          const id = item.dataset.preview;
          previewLabel.textContent = id;
          preview.dataset.media = id;
          preview.classList.add("is-visible");
        });
        item.addEventListener("mouseleave", () => preview.classList.remove("is-visible"));
      });
    }
  }

  /* ----------------------------------------------------------
     PROGRESS
  ---------------------------------------------------------- */
  function initProgress() {
    const wrap = document.getElementById("progress");
    const num = document.getElementById("progressNum");
    const fill = document.getElementById("progressFill");
    if (!wrap) return;
    gsap.to(wrap, { opacity: 1, duration: 0.6, delay: 0.4 });

    const marks = gsap.utils.toArray("main [data-index]");
    const total = document.querySelector(".progress__total");
    if (total) total.textContent = String(marks.length).padStart(2, "0");
    let shown = "";
    ScrollTrigger.create({
      start: 0, end: "max",
      onUpdate: (self) => {
        fill.style.height = (self.progress * 100).toFixed(1) + "%";
        const mid = self.scroll() + window.innerHeight * 0.5;
        let current = marks[0];
        for (const m of marks) {
          const top = m.getBoundingClientRect().top + self.scroll();
          if (top <= mid) current = m; else break;
        }
        const n = String(current.dataset.index).padStart(2, "0");
        if (n !== shown) { shown = n; num.textContent = n; }
      },
    });
  }

  /* ----------------------------------------------------------
     BACKGROUND colour interpolation between scenes.
     The section whose body crosses viewport centre sets the tone —
     robust to anchor jumps and scrubbed re-entry.
  ---------------------------------------------------------- */
  function initBackground() {
    const bg = document.getElementById("bg");
    const scenes = gsap.utils.toArray("[data-bg]");
    if (!scenes.length) return;
    let current = "";

    // one global reader: whichever scene's box crosses viewport centre owns
    // the tone. No per-section onToggle — that misfires across pins / jumps.
    ScrollTrigger.create({
      start: 0, end: "max",
      onUpdate: (self) => {
        const mid = self.scroll() + window.innerHeight * 0.5;
        let tone = scenes[0].dataset.bg;
        for (const sec of scenes) {
          if (sec.getBoundingClientRect().top + self.scroll() <= mid) tone = sec.dataset.bg;
          else break;
        }
        if (tone !== current) {
          current = tone;
          gsap.to(bg, { backgroundColor: tone, duration: 0.7, ease: "power2.out", overwrite: true });
        }
      },
    });
  }

  /* ----------------------------------------------------------
     TEXT REVEALS
  ---------------------------------------------------------- */
  function initTextReveals() {
    // pre-split .line blocks already in markup
    gsap.utils.toArray(".line > span").forEach((s) => {
      if (!s.closest(".loader") && !s.closest(".menu")) gsap.set(s, { yPercent: 110 });
    });

    gsap.utils.toArray(".reveal-lines").forEach((el) => {
      splitLines(el);
    });

    const revealBlock = (el) => {
      const inners = el.querySelectorAll(".line > span");
      ScrollTrigger.create({
        trigger: el,
        start: "top 82%",
        once: true,
        onEnter: () => {
          if (REDUCED) { gsap.set(inners, { yPercent: 0 }); return; }
          gsap.to(inners, { yPercent: 0, duration: 1.1, ease: "expo.out", stagger: 0.09 });
        },
      });
    };

    gsap.utils.toArray(".reveal-lines, .house__statement, .editorial__head, .collection__title, .woman__statement, .looks__title, .atelier__head, .contact__head, .quote__text").forEach(revealBlock);

    // section labels: subtle fade + track-in
    gsap.utils.toArray(".label").forEach((el) => {
      gsap.from(el, {
        opacity: 0, y: 14, duration: 0.9, ease: "power2.out",
        scrollTrigger: { trigger: el, start: "top 88%", once: true },
      });
    });
  }

  /* ----------------------------------------------------------
     MEDIA REVEALS — clip-path + inner scale
  ---------------------------------------------------------- */
  function initMediaReveals() {
    const dirs = {
      up: "inset(100% 0 0 0)",
      down: "inset(0 0 100% 0)",
      left: "inset(0 100% 0 0)",
      right: "inset(0 0 0 100%)",
      center: "inset(50% 50% 50% 50%)",
    };
    document.querySelectorAll(".media[data-reveal]").forEach((fig) => {
      const from = dirs[fig.dataset.reveal] || dirs.up;
      const inner = fig.querySelector(".media__inner");
      if (REDUCED) { gsap.set(fig, { clipPath: "inset(0 0 0 0)" }); return; }
      gsap.set(fig, { clipPath: from });
      gsap.set(inner, { scale: 1.12 });
      ScrollTrigger.create({
        trigger: fig,
        start: "top 85%",
        once: true,
        onEnter: () => {
          gsap.to(fig, { clipPath: "inset(0 0 0 0)", duration: 1.25, ease: "expo.out" });
          gsap.to(inner, { scale: 1, duration: 1.6, ease: "expo.out" });
        },
      });
    });
  }

  /* ----------------------------------------------------------
     PARALLAX — [data-parallax] drifts .media__inner within its mask.
     Never attach to elements inside a pinned stage — the trigger
     geometry is undefined while the ancestor is pinned.
  ---------------------------------------------------------- */
  function initParallax() {
    if (REDUCED) return;
    mm.add(DESKTOP, () => {
      const tweens = [];
      document.querySelectorAll("[data-parallax]").forEach((el) => {
        if (el.closest("[data-founder],[data-seq],.hcol")) return;
        const amt = parseFloat(el.dataset.parallax);
        const inner = el.querySelector(".media__inner") || el;
        tweens.push(gsap.fromTo(inner, { yPercent: -amt * 0.6 }, {
          yPercent: amt, ease: "none",
          scrollTrigger: { trigger: el, start: "top bottom", end: "bottom top", scrub: 1 },
        }));
      });
      return () => tweens.forEach((t) => t.scrollTrigger && t.scrollTrigger.kill());
    });
  }

  /* ----------------------------------------------------------
     HERO — pinned scrub composition
  ---------------------------------------------------------- */
  function initHero() {
    const hero = document.getElementById("hero");
    const media = hero.querySelector(".hero__media");
    const zoe = hero.querySelector(".hero__brand--zoe");
    const byaz = hero.querySelector(".hero__brand--byaz");
    const headline = hero.querySelector(".hero__headline");
    const hLines = headline.querySelectorAll(".line > span");
    const metaTL = hero.querySelector(".hero__meta--tl");
    const metaBR = hero.querySelector(".hero__meta--br");
    const scrollHint = hero.querySelector(".hero__scroll");
    const innerMedia = media.querySelector(".media__inner");
    const nextHead = document.querySelector(".house__statement");

    if (REDUCED) return; // CSS leaves everything in a legible rest state

    // --- SCRUB — built synchronously so the pin (and its spacer) exists
    //     before boot()'s ScrollTrigger.refresh(). immediateRender:false
    //     keeps it from stamping values at load, so the entrance overlay
    //     below owns the first paint. -------------------------------------
    gsap.timeline({
      scrollTrigger: { trigger: hero, start: "top top", end: "+=190%", scrub: 1, pin: true },
    })
      .to(metaTL, { yPercent: -120, autoAlpha: 0, ease: "power1.in" }, 0)
      .to(metaBR, { yPercent: 120, autoAlpha: 0, ease: "power1.in" }, 0)
      .to(scrollHint, { autoAlpha: 0, duration: 0.15 }, 0)
      .fromTo(media, { scale: 1 }, { scale: 1.05, ease: "none", immediateRender: false }, 0.1)
      .fromTo(innerMedia, { scale: 1 }, { scale: 1.12, ease: "none", immediateRender: false }, 0.1)
      .fromTo(zoe, { yPercent: 0, xPercent: 0 }, { yPercent: -70, xPercent: -6, ease: "none", immediateRender: false }, 0.05)
      .fromTo(byaz, { yPercent: 0, xPercent: 0 }, { yPercent: 70, xPercent: 6, ease: "none", immediateRender: false }, 0.05)
      .to(headline, { yPercent: -150, ease: "none" }, 0.1)
      .to(hLines, { autoAlpha: 0.12, ease: "none", stagger: 0.04 }, 0.4)
      .to(media, { clipPath: "inset(0% 22% 0% 22%)", ease: "power2.inOut" }, 0.55)
      .fromTo(nextHead, { yPercent: 35, autoAlpha: 0 }, { yPercent: 0, autoAlpha: 1, ease: "power2.out", immediateRender: false }, 0.72);

    // --- ENTRANCE — overlay, plays once, only if we start at the top ----
    if (window.scrollY < 40) {
      gsap.set(hLines, { yPercent: 110 });
      gsap.set([zoe, byaz], { opacity: 0, yPercent: 14 });
      gsap.set(innerMedia, { scale: 1.08 });
      gsap.set(media, { clipPath: "inset(13% 10% 13% 10%)" });

      gsap.timeline({ delay: 0.1 })
        .to(innerMedia, { scale: 1, duration: 1.6, ease: "expo.out" }, 0)
        .to(media, { clipPath: "inset(0% 0% 0% 0%)", duration: 1.4, ease: "expo.out" }, 0)
        .to(hLines, { yPercent: 0, duration: 1.2, ease: "expo.out", stagger: 0.12 }, 0.3)
        .to([zoe, byaz], { opacity: 1, yPercent: 0, duration: 1.3, ease: "expo.out", stagger: 0.08 }, 0.45);
    }
  }

  /* ----------------------------------------------------------
     HORIZONTAL COLLECTION — vertical scroll -> translateX
     + pointer drag. Mobile: native scroll-snap.
  ---------------------------------------------------------- */
  function initHorizontal() {
    const section = document.querySelector("[data-hcol]");
    const track = document.querySelector("[data-hcol-track]");
    if (!section || !track) return;

    mm.add(DESKTOP, () => {
      if (REDUCED) return;
      const viewport = track.parentElement;
      const getDistance = () => Math.max(0, track.scrollWidth - viewport.clientWidth);

      const tween = gsap.to(track, {
        x: () => -getDistance(),
        ease: "none",
        scrollTrigger: {
          trigger: section,
          start: "top top",
          end: () => "+=" + getDistance(),
          scrub: 1,
          pin: true,
          invalidateOnRefresh: true,
        },
      });

      const st = tween.scrollTrigger;

      // drag support
      let dragging = false, startX = 0, startScroll = 0;
      const onDown = (e) => {
        dragging = true;
        startX = e.clientX ?? e.touches[0].clientX;
        startScroll = st.scroll();
        section.classList.add("is-dragging");
      };
      const onMove = (e) => {
        if (!dragging) return;
        const x = e.clientX ?? e.touches[0].clientX;
        const dx = (startX - x) * 2.4;
        const target = gsap.utils.clamp(st.start, st.end, startScroll + dx);
        if (lenis) lenis.scrollTo(target, { immediate: true });
        else window.scrollTo(0, target);
      };
      const onUp = () => { dragging = false; section.classList.remove("is-dragging"); };
      section.addEventListener("pointerdown", onDown);
      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);

      return () => {
        section.removeEventListener("pointerdown", onDown);
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
        if (st) st.kill();
        gsap.set(track, { x: 0 });
      };
    });

    mm.add(MOBILE, () => {
      const vp = section.querySelector(".hcol__viewport");
      vp.style.overflowX = "auto";
      vp.style.scrollSnapType = "x mandatory";
      track.style.transform = "none";
      section.querySelectorAll(".slide").forEach((s) => (s.style.scrollSnapAlign = "center"));
      return () => {
        vp.style.overflowX = "";
        vp.style.scrollSnapType = "";
      };
    });
  }

  /* ----------------------------------------------------------
     THE WOMAN — portrait travels up while text sticks;
     media scale settles as it exits.
  ---------------------------------------------------------- */
  function initWoman() {
    const section = document.getElementById("woman");
    const media = section.querySelector(".woman__media");
    const lines = section.querySelectorAll(".woman__statement .line > span");

    ScrollTrigger.create({
      trigger: section, start: "top 80%", once: true,
      onEnter: () => {
        if (REDUCED) { gsap.set(lines, { yPercent: 0 }); return; }
        gsap.fromTo(lines, { yPercent: 110 }, { yPercent: 0, duration: 1.1, ease: "expo.out", stagger: 0.1 });
      },
    });

    mm.add(DESKTOP, () => {
      if (REDUCED) return;
      const t = gsap.fromTo(media, { yPercent: 18 }, {
        yPercent: -22, ease: "none",
        scrollTrigger: { trigger: section, start: "top bottom", end: "bottom top", scrub: 1 },
      });
      const inner = media.querySelector(".media__inner");
      const t2 = gsap.fromTo(inner, { scale: 1.15 }, {
        scale: 1, ease: "none",
        scrollTrigger: { trigger: section, start: "top bottom", end: "center center", scrub: 1 },
      });
      return () => { [t, t2].forEach((x) => x.scrollTrigger && x.scrollTrigger.kill()); };
    });
  }

  /* ----------------------------------------------------------
     FOUNDER — ANKICA fixed, ŽIVKOVIĆ enters from right,
     portrait clip-reveals between the two words.
  ---------------------------------------------------------- */
  function initFounder() {
    const stage = document.querySelector("[data-founder]");
    if (!stage) return;
    const first = stage.querySelector(".founder__name--first");
    const last = stage.querySelector(".founder__name--last");
    const portrait = stage.querySelector(".founder__portrait");

    if (REDUCED) {
      gsap.set(first, { xPercent: -18 });
      gsap.set(last, { xPercent: 18 });
      gsap.set(portrait, { clipPath: "inset(0 0 0 0)" });
      return;
    }

    const pInner = portrait.querySelector(".media__inner");
    gsap.set(portrait, { clipPath: "inset(100% 0 0 0)" });
    gsap.set(last, { xPercent: 55, opacity: 0.4 });
    gsap.set(first, { xPercent: 0 });

    gsap.timeline({
      scrollTrigger: {
        trigger: document.getElementById("founder"),
        start: "top top",
        end: "+=160%",
        scrub: 1,
        pin: stage,
      },
    })
      .to(first, { xPercent: -32, ease: "none" }, 0)
      .to(last, { xPercent: -8, opacity: 1, ease: "none" }, 0)
      .fromTo(pInner, { yPercent: -8 }, { yPercent: 8, ease: "none" }, 0)   // inner drift (no separate trigger inside the pin)
      .fromTo(portrait, { clipPath: "inset(100% 0 0 0)" }, { clipPath: "inset(0% 0 0 0)", ease: "power2.out" }, 0.15)
      .to(portrait, { yPercent: -6, ease: "none" }, 0.15);
  }

  /* ----------------------------------------------------------
     VALUES (Section 8 · 05 — NAČELA) — pinned VERTICAL card stack.
     Existing design/text/colour untouched. As you scroll down each
     card rises from below the stage and settles over the previous
     one; scrolling up reverses it exactly. Purely vertical (y only).
  ---------------------------------------------------------- */
  function initValues() {
    const section = document.getElementById("values");
    const stage = section && section.querySelector("[data-values]");
    if (!section || !stage) return;
    const cards = gsap.utils.toArray(stage.querySelectorAll(".value"));
    if (cards.length < 2) return;

    // The giant word is just part of the card now — make sure it reads,
    // and neutralise the per-card media clip-reveal so nothing fights
    // the stack transforms (scoped entirely to Section 8's elements).
    cards.forEach((c) => {
      // initTextReveals() pre-hides every .line>span (yPercent:110); the old
      // per-value reveal used to bring it back — reset it here so the word shows.
      gsap.set(c.querySelectorAll(".value__word .line > span"), { yPercent: 0, clearProps: "transform" });
      const fig = c.querySelector(".value__media");
      if (!fig) return;
      ScrollTrigger.getAll().forEach((st) => { if (st.trigger === fig) st.kill(); });
      const inner = fig.querySelector(".media__inner");
      gsap.set(fig, { clearProps: "clipPath" });
      if (inner) gsap.set(inner, { clearProps: "transform,scale" });
    });

    if (REDUCED) return; // leave Section 8 as a plain vertical read

    const n = cards.length;

    mm.add({ isDesktop: DESKTOP, isMobile: MOBILE }, (ctx) => {
      const isMobile = ctx.conditions.isMobile;
      const OFFSET = isMobile ? 16 : 26;      // px of visible stack peek (15–35)
      const RECEDE_SCALE = 0.015;             // per depth level (subtle)
      const RECEDE_FADE = isMobile ? 0.08 : 0.12;

      section.classList.add("is-stack");

      // initial state: card 0 in place, the rest waiting below the stage
      cards.forEach((c, i) => {
        gsap.set(c, {
          zIndex: i + 1,
          transformOrigin: "center top",
          yPercent: i === 0 ? 0 : 120,
          y: 0, scale: 1, autoAlpha: 1,
        });
      });

      // ONE scrubbed timeline; scroll progress drives the whole sequence
      const tl = gsap.timeline({
        defaults: { ease: "none" },
        scrollTrigger: {
          trigger: section,
          start: "top top",
          end: () => "+=" + Math.round(window.innerHeight * n * 0.8),
          pin: true,
          scrub: 1,
          anticipatePin: 1,
          invalidateOnRefresh: true,
        },
      });

      for (let i = 1; i < n; i++) {
        const at = i - 1;                                   // step slot
        tl.to(cards[i], { yPercent: 0, y: i * OFFSET, ease: "power2.out", duration: 1 }, at);
        for (let j = 0; j < i; j++) {
          const depth = i - j;                             // levels behind the front
          tl.to(cards[j], {
            scale: 1 - depth * RECEDE_SCALE,
            autoAlpha: Math.max(0.55, 1 - depth * RECEDE_FADE),
            ease: "power1.out", duration: 1,
          }, at);
        }
      }
      tl.to({}, { duration: 0.5 });                         // hold before unpin

      return () => {
        section.classList.remove("is-stack");
        cards.forEach((c) => gsap.set(c, {
          clearProps: "transform,opacity,visibility,zIndex,scale,translate",
        }));
      };
    });
  }

  /* ----------------------------------------------------------
     INTERLUDE — opposing scroll-linked marquees
  ---------------------------------------------------------- */
  function initInterlude() {
    if (REDUCED) return;
    document.querySelectorAll("[data-marquee]").forEach((row) => {
      const dir = parseFloat(row.dataset.marquee);
      gsap.fromTo(row, { xPercent: dir < 0 ? 8 : -8 }, {
        xPercent: dir < 0 ? -30 : 10, ease: "none",
        scrollTrigger: { trigger: row.closest(".interlude"), start: "top bottom", end: "bottom top", scrub: 1 },
      });
    });
  }

  /* ----------------------------------------------------------
     LOOK GALLERY — FLIP open/close, prev/next content swap
  ---------------------------------------------------------- */
  function initLookGallery() {
    const box = document.getElementById("lookbox");
    const stage = document.getElementById("lookStage");
    const looks = gsap.utils.toArray(".look");
    if (!box || !looks.length) return;

    const els = {
      no: document.getElementById("lookNo"),
      name: document.getElementById("lookName"),
      coll: document.getElementById("lookColl"),
      desc: document.getElementById("lookDesc"),
    };
    let activeIndex = -1;
    let placedFig = null;
    let originParent = null;
    let originNext = null;

    const fillInfo = (fig) => {
      els.no.textContent = "LOOK " + fig.dataset.lookNo;
      els.name.textContent = fig.dataset.lookName;
      els.coll.textContent = fig.dataset.lookCollection;
      els.desc.textContent = fig.dataset.lookDesc;
    };

    const open = (index) => {
      const fig = looks[index];
      activeIndex = index;
      fillInfo(fig);
      box.classList.add("is-open");
      box.setAttribute("aria-hidden", "false");
      if (lenis) lenis.stop();
      document.body.classList.add("is-locked");

      originParent = fig.parentNode;
      originNext = fig.nextElementSibling;
      placedFig = fig;

      if (Flip && !REDUCED) {
        const state = Flip.getState(fig);
        stage.appendChild(fig);
        Flip.from(state, { duration: 0.8, ease: "expo.inOut", absolute: true });
      } else {
        stage.appendChild(fig);
      }
    };

    const restore = () => {
      if (!placedFig) return;
      const fig = placedFig;
      const back = () => {
        if (originNext) originParent.insertBefore(fig, originNext);
        else originParent.appendChild(fig);
        fig.removeAttribute("style");
        fig.style.aspectRatio = (fig.dataset.ratio || "").replace(/\s/g, "");
      };
      if (Flip && !REDUCED) {
        const state = Flip.getState(fig);
        back();
        Flip.from(state, { duration: 0.7, ease: "expo.inOut", absolute: true });
      } else back();
      placedFig = null;
    };

    const close = () => {
      box.classList.remove("is-open");
      box.setAttribute("aria-hidden", "true");
      restore();
      if (lenis) lenis.start();
      document.body.classList.remove("is-locked");
      activeIndex = -1;
    };

    const swap = (dir) => {
      if (activeIndex < 0) return;
      const next = (activeIndex + dir + looks.length) % looks.length;
      // move current back, bring next in without full FLIP (crossfade)
      restore();
      const fig = looks[next];
      activeIndex = next;
      fillInfo(fig);
      originParent = fig.parentNode;
      originNext = fig.nextElementSibling;
      placedFig = fig;
      gsap.set(fig, { opacity: 0 });
      stage.appendChild(fig);
      gsap.to(fig, { opacity: 1, duration: 0.5, ease: "power2.out" });
    };

    looks.forEach((fig, i) => {
      fig.addEventListener("click", () => open(i));
      fig.setAttribute("tabindex", "0");
      fig.setAttribute("role", "button");
      fig.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); open(i); }
      });
    });
    document.getElementById("lookClose").addEventListener("click", close);
    document.getElementById("lookPrev").addEventListener("click", () => swap(-1));
    document.getElementById("lookNext").addEventListener("click", () => swap(1));
    box.querySelector(".lookbox__bg").addEventListener("click", close);
    window.addEventListener("keydown", (e) => {
      if (!box.classList.contains("is-open")) return;
      if (e.key === "Escape") close();
      if (e.key === "ArrowLeft") swap(-1);
      if (e.key === "ArrowRight") swap(1);
    });
  }

  /* ----------------------------------------------------------
     PINNED DETAIL SEQUENCE
  ---------------------------------------------------------- */
  function initSequence() {
    const section = document.getElementById("seq");
    const stage = section.querySelector("[data-seq]");
    const frames = section.querySelectorAll(".seq__media");
    const items = section.querySelectorAll(".seq__index li");
    const descs = section.querySelectorAll(".seq__desc p");
    const steps = frames.length;

    if (REDUCED) {
      gsap.set(frames, { clipPath: "inset(0 0 0 0)" });
      frames.forEach((f, i) => { if (i > 0) f.style.display = "none"; });
      return;
    }

    gsap.set(frames, { clipPath: "inset(0 0 100% 0)" });
    gsap.set(frames[0], { clipPath: "inset(0 0 0% 0)" });
    gsap.set(descs, { autoAlpha: 0, y: 20 });
    gsap.set(descs[0], { autoAlpha: 1, y: 0 });

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: section,
        start: "top top",
        end: "+=" + steps * 100 + "%",
        scrub: 1,
        pin: stage,
        onUpdate: (self) => {
          // active index tracks scroll progress directly (no callback drift)
          const active = Math.min(steps - 1, Math.floor(self.progress * steps + 0.001));
          items.forEach((it, k) => it.classList.toggle("is-active", k === active));
        },
      },
    });

    for (let i = 1; i < steps; i++) {
      const seg = 1 / steps;
      const at = (i - 1) * seg;
      tl.to(frames[i], { clipPath: "inset(0 0 0% 0)", ease: "power2.inOut", duration: seg }, at)
        .to(descs[i - 1], { autoAlpha: 0, y: -20, duration: seg * 0.4 }, at)
        .to(descs[i], { autoAlpha: 1, y: 0, duration: seg * 0.4 }, at + seg * 0.35);
    }
  }

  /* ----------------------------------------------------------
     FOOTER — huge type rises as it enters
  ---------------------------------------------------------- */
  function initFooter() {
    const footer = document.getElementById("footer");
    const zoe = footer.querySelector(".footer__zoe");
    const byaz = footer.querySelector(".footer__byaz");
    document.getElementById("toTop").addEventListener("click", scrollToTop);
    if (REDUCED) return;

    gsap.timeline({
      scrollTrigger: { trigger: footer, start: "top 90%", end: "bottom bottom", scrub: 1 },
    })
      .fromTo(zoe, { yPercent: 40, opacity: 0.2 }, { yPercent: 0, opacity: 1, ease: "power2.out" }, 0)
      .fromTo(byaz, { yPercent: 60, opacity: 0 }, { yPercent: 0, opacity: 1, ease: "power2.out" }, 0.15);
  }

  /* ----------------------------------------------------------
     FORM
  ---------------------------------------------------------- */
  function initForm() {
    const form = document.getElementById("form");
    if (!form) return;
    const status = document.getElementById("formStatus");
    const ta = form.querySelector("textarea");
    if (ta) {
      ta.addEventListener("input", () => {
        ta.style.height = "auto";
        ta.style.height = ta.scrollHeight + "px";
      });
    }
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const name = form.querySelector("#f-name").value.trim();
      status.textContent = name
        ? `Hvala, ${name.split(" ")[0]}. Javićemo se uskoro.`
        : "Hvala. Javićemo se uskoro.";
      form.querySelectorAll("input[type=text],input[type=email],input[type=tel],textarea").forEach((f) => (f.value = ""));
    });
  }

  /* ----------------------------------------------------------
     BOOT
  ---------------------------------------------------------- */
  function boot() {
    buildPlaceholders();
    initSmoothScroll();
    initCursor();
    initMagnetic();
    initNav();
    initMenu();
    initProgress();
    initBackground();
    initTextReveals();
    initMediaReveals();
    initParallax();
    initHero();
    initHorizontal();
    initWoman();
    initFounder();
    initValues();
    initInterlude();
    initLookGallery();
    initSequence();
    initFooter();
    initForm();

    // Fonts are already loaded (initLoader held for them), so this is the
    // only refresh — no late font-swap recalculation to hop the scroll.
    ScrollTrigger.refresh();

    let rw = window.innerWidth;
    let rt;
    window.addEventListener("resize", () => {
      if (window.innerWidth === rw) return; // ignore mobile URL-bar height jitter
      rw = window.innerWidth;
      clearTimeout(rt);
      rt = setTimeout(() => {
        gsap.utils.toArray(".reveal-lines").forEach(splitLines);
        ScrollTrigger.refresh();
      }, 250);
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    initLoader(boot);
  });
})();
