<script>
  // Film mode (?film): the whole landing page becomes a set. The drone flyover
  // plays full-bleed, the hero UI cascades onto it, then a virtual camera lifts
  // off the page and flies over it in 3D while each section's elements cascade
  // into place. window.__film.seek(t) renders an exact frame for the encoder.
  import { onMount, flushSync, tick } from 'svelte';
  import Site from './Site.svelte';
  import Monogram from './Monogram.svelte';
  import { cascade, seekGroup } from '../lib/motion.js';
  import { filmBus } from '../lib/film.js';
  import { drawTopo } from '../lib/topo.js';

  const FPS = 30;
  const DURATION = 26;
  const HERO_T0 = 6.4; // hero UI starts cascading onto the footage
  const PAGE_T0 = 12.6; // camera lifts off the hero
  const END_T0 = 22.6; // end card

  let page;
  let backdrop;
  let topo;
  let veil;

  // Cubic Hermite track through keyframes [t, ...values]; keys flagged `hold`
  // (and the ends) get zero tangents so the camera eases out of rest.
  function makeTrack(keys) {
    const n = keys.length;
    const dims = keys[0].v.length;
    const tan = keys.map((k, i) => {
      if (i === 0 || i === n - 1 || k.hold) return new Array(dims).fill(0);
      const a = keys[i - 1], b = keys[i + 1];
      return k.v.map((_, d) => (b.v[d] - a.v[d]) / (b.t - a.t));
    });
    return (t) => {
      if (t <= keys[0].t) return keys[0].v.slice();
      if (t >= keys[n - 1].t) return keys[n - 1].v.slice();
      let i = 0;
      while (keys[i + 1].t < t) i++;
      const a = keys[i], b = keys[i + 1], h = b.t - a.t, u = (t - a.t) / h;
      const u2 = u * u, u3 = u2 * u;
      const h00 = 2 * u3 - 3 * u2 + 1, h10 = u3 - 2 * u2 + u, h01 = -2 * u3 + 3 * u2, h11 = u3 - u2;
      return a.v.map((_, d) => h00 * a.v[d] + h10 * h * tan[i][d] + h01 * b.v[d] + h11 * h * tan[i + 1][d]);
    };
  }

  const smooth = (a, b, x) => {
    const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
    return t * t * (3 - 2 * t);
  };

  onMount(() => {
    document.documentElement.classList.add('film-mode');
    let track;
    let triggers = [];
    let heroFreeze = Infinity;

    const prepare = async () => {
      await document.fonts.ready;
      await tick();
      await Promise.all([...document.images].map((img) => img.decode().catch(() => {})));
      // wait for the hero's flyover to finish building
      while (!filmBus.heroRender) await new Promise((r) => setTimeout(r, 50));

      const top = (id) => document.getElementById(id).offsetTop;
      heroFreeze = top('course') + 900;
      // [tilt°, focus y (px on the page), depth (px), yaw°]
      track = makeTrack([
        { t: 0, v: [0, 540, 0, 0] },
        { t: PAGE_T0, v: [0, 540, 0, 0], hold: true },
        { t: PAGE_T0 + 1.9, v: [50, 760, -760, -9] },
        { t: PAGE_T0 + 3.8, v: [47, top('course') + 430, -520, -5] },
        { t: PAGE_T0 + 5.5, v: [46, top('holes') + 420, -520, 4] },
        { t: PAGE_T0 + 7.2, v: [48, top('club-life') + 520, -560, 7] },
        { t: PAGE_T0 + 8.8, v: [50, top('membership') + 380, -700, 2] },
        { t: END_T0 + 0.8, v: [58, top('visit') + 260, -1700, -3] },
        { t: DURATION, v: [63, top('visit') + 700, -3300, -6] },
      ]);

      // each section cascades in as the camera's focus approaches it
      triggers = [...document.querySelectorAll('[data-film-group]')].map((el) => {
        const target = el.offsetTop - 340;
        let tt = PAGE_T0;
        while (tt < END_T0 - 0.6 && track(tt)[1] < target) tt += 1 / FPS;
        return [el.dataset.filmGroup, tt];
      });

      const r = topo.getBoundingClientRect();
      topo.width = r.width;
      topo.height = r.height;
      drawTopo(topo, { x0: -300, z0: -300, span: 2600, step: 3, cell: 5, rot: -0.3, color: 'rgba(217,191,138,.13)', major: 'rgba(217,191,138,.3)' });

      window.__film = { fps: FPS, duration: DURATION, frames: Math.round(DURATION * FPS), seek, triggers };
      seek(0);
      window.__filmReady = true;
    };

    function seek(t) {
      // once the page tilts away the hero is small on screen, then off-frame
      const focusNow = track(t)[1];
      filmBus.heroRender(t, { ratio: t < PAGE_T0 + 0.6 ? 1 : 0.6, skip: focusNow > heroFreeze || t > END_T0 + 0.8 });
      seekGroup('hud', t * 1000);
      seekGroup('hero', (t - HERO_T0) * 1000);
      for (const [g, tg] of triggers) seekGroup(g, (t - tg) * 1000);
      seekGroup('end', (t - END_T0) * 1000);

      const [tilt, focus, depth, yaw] = track(t);
      page.style.transform = `translate3d(0, 540px, ${depth.toFixed(2)}px) rotateX(${tilt.toFixed(3)}deg) rotateZ(${yaw.toFixed(3)}deg) translate3d(0, ${(-focus).toFixed(2)}px, 0)`;
      const lift = smooth(PAGE_T0, PAGE_T0 + 1.6, t);
      page.style.boxShadow = `0 ${80 * lift}px ${180 * lift}px rgba(2, 10, 7, ${0.55 * lift})`;
      page.style.opacity = String(1 - smooth(END_T0 - 0.3, END_T0 + 0.8, t));
      backdrop.style.transform = `translate3d(0, ${(-(focus - 540) * 0.16).toFixed(2)}px, 0) scale(1.15)`;
      veil.style.opacity = String(0.6 * smooth(END_T0 - 0.3, END_T0 + 1.0, t));
      flushSync();
    }

    prepare();
    return () => document.documentElement.classList.remove('film-mode');
  });
</script>

<div class="viewport">
  <div class="backdrop" bind:this={backdrop}>
    <canvas bind:this={topo} aria-hidden="true"></canvas>
  </div>
  <div class="page" bind:this={page}>
    <Site film />
  </div>
  <div class="veil" bind:this={veil}></div>
  <div class="end">
    <div class="mark" use:cascade={{ group: 'end', delay: 600, preset: 'castFlat', duration: 1300 }}><Monogram size={104} /></div>
    <p class="name" use:cascade={{ group: 'end', delay: 820, preset: 'drop', duration: 1300 }}>Vestavia Country Club</p>
    <span class="rule" use:cascade={{ group: 'end', delay: 1100, preset: 'line', duration: 1000 }}></span>
    <p class="tag" use:cascade={{ group: 'end', delay: 1280, preset: 'rise', duration: 1100 }}><em>Built for the view.</em></p>
    <p class="meta" use:cascade={{ group: 'end', delay: 1500, preset: 'fade', duration: 1200 }}>Vestavia Hills, Alabama · Est. 1950</p>
  </div>
</div>

<style>
  :global(html.film-mode),
  :global(html.film-mode body) {
    overflow: hidden;
    scroll-behavior: auto;
  }
  .viewport {
    position: fixed;
    inset: 0;
    overflow: hidden;
    perspective: 1500px;
    perspective-origin: 50% 50%;
    background: radial-gradient(130% 100% at 50% 0%, #17402f 0%, #0e2a21 45%, #071a13 100%);
  }
  .backdrop {
    position: absolute;
    inset: -20% -10%;
  }
  .backdrop canvas {
    width: 100%;
    height: 100%;
  }
  .page {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    transform-origin: 50% 0;
    will-change: transform, opacity;
    background: var(--paper);
  }
  .veil {
    position: absolute;
    inset: 0;
    background: #071a13;
    opacity: 0;
    pointer-events: none;
  }
  .end {
    position: absolute;
    inset: 0;
    display: grid;
    place-content: center;
    justify-items: center;
    text-align: center;
    color: var(--on-dark);
    pointer-events: none;
    perspective: 900px;
  }
  .mark {
    color: var(--brass-2);
    margin-bottom: 28px;
  }
  .name {
    margin: 0;
    font-family: var(--serif);
    font-size: 92px;
    font-weight: 500;
    line-height: 1;
    letter-spacing: 0.02em;
    perspective: 900px;
  }
  .rule {
    display: block;
    width: 120px;
    height: 1px;
    margin: 30px 0 26px;
    background: var(--brass);
  }
  .tag {
    margin: 0 0 18px;
    font-family: var(--serif);
    font-size: 46px;
    color: var(--brass-2);
  }
  .meta {
    margin: 0;
    font-size: 15px;
    font-weight: 600;
    letter-spacing: 0.32em;
    text-transform: uppercase;
    color: var(--on-dark-muted);
  }
</style>
