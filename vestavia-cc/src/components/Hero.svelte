<script>
  import { onMount } from 'svelte';
  import { HERO, STATS } from '../lib/content.js';
  import { CHAPTERS } from '../lib/course.js';
  import { cascade, playGroup } from '../lib/motion.js';
  import { filmBus } from '../lib/film.js';
  import poster from '../assets/img/poster.jpg';

  let { film = false } = $props();

  let canvas;
  let section;
  let ready = $state(false);
  let failed = $state(false);
  let paused = $state(false);
  let reduced = $state(false);
  let hud = $state({ chapter: 0, alt: 0, hdg: 0, progress: 0, sunX: 0.5, sunY: 0.2, sunVisible: 0 });

  const chapter = $derived(CHAPTERS[hud.chapter] ?? CHAPTERS[0]);
  const pad3 = (n) => String(Math.round(n) % 360).padStart(3, '0');
  const compass = (d) => ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'][Math.round(d / 45) % 8];

  // word index across both headline lines, for stagger
  const headline = HERO.lines.map((line, li) => line.map((w, wi) => ({ w, i: HERO.lines.slice(0, li).flat().length + wi })));

  let togglePause = () => {};

  onMount(() => {
    let fly;
    let raf = 0;
    let disposed = false;
    let visible = true;
    let clock = 0; // flight seconds
    let last = 0;
    let lastHud = 0;
    reduced = !film && matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (!film) {
      document.fonts?.ready.then(() => setTimeout(() => playGroup('hero'), 250));
      playGroup('hud');
    }

    const tier = film
      ? 'film'
      : matchMedia('(max-width: 760px)').matches || (navigator.hardwareConcurrency || 8) <= 4
        ? 'low'
        : 'high';

    const resize = () => {
      if (!fly) return;
      const r = canvas.getBoundingClientRect();
      fly.resize(Math.max(1, Math.round(r.width)), Math.max(1, Math.round(r.height)));
      if (paused || reduced) fly.renderAt(clock);
    };
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const io = new IntersectionObserver(([e]) => (visible = e.isIntersecting), { threshold: 0 });
    io.observe(section);

    const loop = (now) => {
      raf = requestAnimationFrame(loop);
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      if (paused || !visible || document.hidden) return;
      clock += dt;
      fly.renderAt(clock);
      if (!ready) ready = true;
      if (now - lastHud > 120) {
        lastHud = now;
        hud = { ...fly.state };
      }
    };

    togglePause = () => {
      paused = !paused;
    };

    // Let the headline paint first, then build the scene.
    const boot = async () => {
      try {
        const { createFlyover } = await import('../lib/flyover.js');
        if (disposed) return;
        fly = createFlyover(canvas, { film, tier, intro: film ? 6.5 : 5.5 });
        resize();
        if (film) {
          filmBus.heroRender = (t, { ratio = 1, skip = false } = {}) => {
            if (skip) return; // hero is off-frame: keep the last image
            fly.setPixelRatio(ratio);
            fly.renderAt(t);
            hud = { ...fly.state };
            ready = true;
          };
          return;
        }
        if (reduced) {
          clock = 9.5;
          fly.renderAt(clock);
          hud = { ...fly.state };
          ready = true;
          return;
        }
        last = performance.now();
        raf = requestAnimationFrame(loop);
      } catch (err) {
        console.warn('Flyover unavailable, showing still image.', err);
        failed = true;
      }
    };
    const id = setTimeout(boot, film ? 0 : 120);

    return () => {
      disposed = true;
      clearTimeout(id);
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      fly?.dispose();
      filmBus.heroRender = null;
    };
  });
</script>

<section class="hero" id="top" bind:this={section} aria-label="Welcome">
  <div class="media" aria-hidden="true">
    <img class="poster" src={poster} alt="" />
    <canvas bind:this={canvas} class:ready={ready && !failed}></canvas>
    <div
      class="glare"
      style:left="{hud.sunX * 100}%"
      style:top="{hud.sunY * 100}%"
      style:opacity={hud.sunVisible ? 0.85 : 0}
    ></div>
    <div class="shade" use:cascade={{ group: 'hero', delay: 0, preset: 'fade', duration: 1600 }}></div>
    <div class="vignette"></div>
  </div>


  <div class="content wrap">
    <div class="copy">
      <p class="eyebrow">
        <span class="rule" use:cascade={{ group: 'hero', delay: 120, preset: 'line', duration: 900 }}></span>
        <span use:cascade={{ group: 'hero', delay: 220, preset: 'fall', duration: 900 }}>{HERO.eyebrow}</span>
      </p>

      <h1 class="display title" aria-label={HERO.lines.flat().join(' ')}>
        {#each headline as line, li}
          <span class="line" class:italic={li === 1} aria-hidden="true">
            {#each line as { w, i }}
              <span class="w" use:cascade={{ group: 'hero', delay: 360 + i * 140, preset: 'drop', duration: 1250 }}>{w}</span>
              {' '}
            {/each}
          </span>
        {/each}
      </h1>

      <p class="sub" use:cascade={{ group: 'hero', delay: 1100, preset: 'rise', duration: 1000 }}>{HERO.sub}</p>

      <div class="ctas">
        <a class="btn" href="#course" use:cascade={{ group: 'hero', delay: 1300, preset: 'castFlat', duration: 900 }}>
          Explore the course
          <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M2 8h11M9 4l4 4-4 4" fill="none" stroke="currentColor" stroke-width="1.5" /></svg>
        </a>
        <a class="btn ghost" href="#membership" use:cascade={{ group: 'hero', delay: 1420, preset: 'castFlat', duration: 900 }}>
          Membership inquiries
        </a>
      </div>
    </div>

    <ul class="stats" aria-label="At a glance">
      {#each STATS as s, i}
        <li use:cascade={{ group: 'hero', delay: 1250 + i * 170, preset: 'card', duration: 1100 }}>
          <span class="num">{s.n}</span>
          <span class="lbl">{s.l}</span>
          <span class="src">{s.src}</span>
        </li>
      {/each}
    </ul>
  </div>

  <div class="hud wrap" use:cascade={{ group: 'hud', delay: 600, preset: 'fade', duration: 900 }}>
    <div class="live">
      <span class="dot" class:paused></span>
      {paused ? 'Flyover paused' : 'Live flyover'}
    </div>
    <div class="chapter" aria-live="off">
      <strong>{chapter.hole}</strong>
      <span>{chapter.note}</span>
    </div>
    <dl class="tele">
      <div><dt>Alt</dt><dd>{Math.round(hud.alt * 3.281)} ft</dd></div>
      <div><dt>Hdg</dt><dd>{pad3(hud.hdg)}° {compass(hud.hdg)}</dd></div>
    </dl>
    <div class="track" aria-hidden="true"><span style:transform="scaleX({hud.progress})"></span></div>
    {#if !film && !reduced && !failed}
      <button class="pause" type="button" aria-pressed={paused} onclick={() => togglePause()}>
        {#if paused}
          <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4 2.5v11l9-5.5z" fill="currentColor" /></svg>
          <span>Play</span>
        {:else}
          <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4 2.5h3v11H4zM9 2.5h3v11H9z" fill="currentColor" /></svg>
          <span>Pause</span>
        {/if}
      </button>
    {/if}
  </div>
</section>

<style>
  .hero {
    position: relative;
    height: 100svh;
    min-height: 680px;
    overflow: hidden;
    background: var(--evergreen);
    color: var(--on-dark);
    isolation: isolate;
  }
  .media,
  .media > * {
    position: absolute;
    inset: 0;
  }
  .poster {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  canvas {
    width: 100%;
    height: 100%;
    opacity: 0;
    transition: opacity 1.2s ease;
  }
  canvas.ready {
    opacity: 1;
  }
  .glare {
    inset: auto;
    width: 70vmax;
    height: 70vmax;
    translate: -50% -50%;
    background: radial-gradient(closest-side, rgba(255, 214, 160, 0.55), rgba(255, 190, 120, 0.18) 40%, rgba(255, 180, 110, 0) 70%);
    mix-blend-mode: screen;
    pointer-events: none;
    transition: opacity 0.6s;
  }
  .shade {
    background:
      linear-gradient(180deg, rgba(8, 22, 17, 0.62) 0%, rgba(8, 22, 17, 0) 22%),
      linear-gradient(0deg, rgba(8, 22, 17, 0.88) 0%, rgba(8, 22, 17, 0.45) 32%, rgba(8, 22, 17, 0) 62%),
      linear-gradient(90deg, rgba(8, 22, 17, 0.5) 0%, rgba(8, 22, 17, 0) 55%);
  }
  .vignette {
    background: radial-gradient(120% 90% at 50% 45%, transparent 60%, rgba(4, 12, 9, 0.45) 100%);
    pointer-events: none;
  }

  .content {
    position: relative;
    z-index: 2;
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    align-items: end;
    gap: 48px;
    height: 100%;
    padding-top: 120px;
    padding-bottom: 132px;
  }
  .eyebrow {
    color: var(--brass-2);
    margin: 0 0 26px;
  }
  .title {
    font-size: clamp(3.6rem, 9.6vw, 10rem);
    line-height: 0.86;
    margin: 0 0 28px;
    letter-spacing: -0.015em;
    text-shadow: 0 2px 40px rgba(6, 18, 13, 0.35);
  }
  .line {
    display: block;
    perspective: 900px;
  }
  .line.italic {
    font-style: italic;
    color: var(--brass-2);
    padding-left: 0.5em;
  }
  .w {
    display: inline-block;
    transform-origin: 50% 0%;
    will-change: transform, opacity, filter;
  }
  .sub {
    max-width: 50ch;
    margin: 0 0 34px;
    font-size: clamp(1rem, 1.25vw, 1.15rem);
    line-height: 1.65;
    color: var(--on-dark-muted);
    text-wrap: pretty;
  }
  .ctas {
    display: flex;
    flex-wrap: wrap;
    gap: 14px;
  }

  .stats {
    display: grid;
    gap: 14px;
    width: 300px;
    margin: 0;
    padding: 0;
    list-style: none;
    perspective: 1200px;
  }
  .stats li {
    display: grid;
    grid-template-columns: auto 1fr;
    grid-template-rows: auto auto;
    column-gap: 18px;
    align-items: baseline;
    padding: 18px 22px;
    border: 1px solid rgba(243, 238, 226, 0.16);
    border-radius: var(--radius);
    background: linear-gradient(135deg, rgba(14, 42, 33, 0.62), rgba(14, 42, 33, 0.34));
    backdrop-filter: blur(14px) saturate(1.1);
    transform-origin: 100% 50%;
  }
  .num {
    grid-row: span 2;
    font-family: var(--serif);
    font-size: 44px;
    font-weight: 500;
    line-height: 1;
    color: var(--brass-2);
  }
  .lbl {
    font-size: 14px;
    font-weight: 600;
    line-height: 1.3;
  }
  .src {
    font-size: 11px;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--on-dark-muted);
  }

  .hud {
    position: absolute;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 3;
    display: flex;
    align-items: center;
    gap: 28px;
    height: 76px;
    border-top: 1px solid rgba(243, 238, 226, 0.14);
    font-size: 12px;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: var(--on-dark-muted);
    max-width: none;
  }
  .live {
    display: inline-flex;
    align-items: center;
    gap: 10px;
    font-weight: 600;
    color: var(--on-dark);
    white-space: nowrap;
  }
  .dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: #e0533f;
    box-shadow: 0 0 0 4px rgba(224, 83, 63, 0.22);
    animation: pulse 1.6s ease-in-out infinite;
  }
  .dot.paused {
    background: var(--brass);
    box-shadow: none;
    animation: none;
  }
  @keyframes pulse {
    50% {
      box-shadow: 0 0 0 7px rgba(224, 83, 63, 0);
    }
  }
  .chapter {
    display: inline-flex;
    gap: 12px;
    align-items: baseline;
    white-space: nowrap;
  }
  .chapter strong {
    color: var(--brass-2);
    font-weight: 700;
  }
  .tele {
    display: flex;
    gap: 22px;
    margin: 0;
    font-variant-numeric: tabular-nums;
  }
  .tele div {
    display: flex;
    gap: 8px;
  }
  .tele dt {
    opacity: 0.6;
  }
  .tele dd {
    margin: 0;
    color: var(--on-dark);
    min-width: 7ch;
  }
  .track {
    flex: 1;
    height: 1px;
    background: rgba(243, 238, 226, 0.18);
    overflow: hidden;
  }
  .track span {
    display: block;
    height: 100%;
    background: var(--brass-2);
    transform-origin: left;
  }
  .pause {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    height: 36px;
    padding: 0 14px;
    border: 1px solid rgba(243, 238, 226, 0.3);
    border-radius: 999px;
    background: transparent;
    font-size: 11px;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    cursor: pointer;
  }
  .pause:hover {
    border-color: var(--on-dark);
    color: var(--on-dark);
  }
  .pause svg {
    width: 12px;
    height: 12px;
  }

  @media (max-width: 1100px) {
    .content {
      grid-template-columns: 1fr;
      align-content: end;
      gap: 28px;
    }
    .stats {
      grid-template-columns: repeat(3, minmax(0, 1fr));
      width: 100%;
    }
    .stats li {
      grid-template-columns: 1fr;
      padding: 14px 16px;
    }
    .num {
      grid-row: auto;
      font-size: 34px;
      margin-bottom: 6px;
    }
    .tele,
    .track {
      display: none;
    }
  }
  @media (max-width: 640px) {
    .hero {
      min-height: 720px;
    }
    .eyebrow .rule {
      display: none;
    }
    .content {
      padding-top: 96px;
      padding-bottom: 96px;
    }
    .title {
      font-size: clamp(3.3rem, 17vw, 5rem);
    }
    .stats {
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 8px;
    }
    .stats li {
      padding: 12px;
    }
    .num {
      font-size: 26px;
    }
    .lbl {
      font-size: 12px;
    }
    .src {
      display: none;
    }
    .hud {
      height: 60px;
      gap: 14px;
      font-size: 10px;
    }
    .chapter span {
      display: none;
    }
    .pause span {
      display: none;
    }
    .pause {
      margin-left: auto;
      padding: 0 12px;
    }
    .ctas .btn {
      flex: 1 1 auto;
      justify-content: center;
    }
  }
</style>
