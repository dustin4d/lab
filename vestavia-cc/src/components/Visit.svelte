<script>
  import { onMount } from 'svelte';
  import { CLUB } from '../lib/content.js';
  import { cascade, revealOnScroll } from '../lib/motion.js';
  import { drawTopo } from '../lib/topo.js';
  import { filmBus } from '../lib/film.js';

  const g = 'visit';
  let map;

  onMount(() => {
    const draw = () => {
      const r = map.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      map.width = Math.round(r.width * dpr);
      map.height = Math.round(r.height * dpr);
      drawTopo(map, { x0: 0, z0: 0, span: 2600, step: 3, cell: 4 * dpr, color: 'rgba(138,106,51,.28)', major: 'rgba(138,106,51,.6)' });
    };
    if (filmBus.active || !window.requestIdleCallback) return void draw();
    const id = requestIdleCallback(draw);
    return () => cancelIdleCallback(id);
  });
</script>

<section id="visit" class="visit" use:revealOnScroll={g} data-film-group={g}>
  <div class="wrap grid">
    <div>
      <p class="eyebrow" use:cascade={{ group: g, preset: 'fall', duration: 800 }}><span class="rule"></span>Visit</p>
      <h2 class="display h2" use:cascade={{ group: g, delay: 100, preset: 'castFlat', duration: 1100 }}>Up the hill,<br /><em>off Beaumont Drive.</em></h2>
      <dl class="info">
        <div use:cascade={{ group: g, delay: 240, preset: 'rise', duration: 900 }}>
          <dt>Address</dt>
          <dd>{CLUB.address[0]}<br />{CLUB.address[1]}</dd>
        </div>
        <div use:cascade={{ group: g, delay: 330, preset: 'rise', duration: 900 }}>
          <dt>Telephone</dt>
          <dd><a href={CLUB.phoneHref}>{CLUB.phone}</a></dd>
        </div>
      </dl>
      <div class="ctas" use:cascade={{ group: g, delay: 420, preset: 'rise', duration: 900 }}>
        <a class="btn ink" href={CLUB.maps} target="_blank" rel="noopener">Get directions</a>
        <a class="link" href="https://www.vestaviacc.com/" rel="noopener">Member login →</a>
      </div>
    </div>
    <figure class="map" use:cascade={{ group: g, delay: 200, preset: 'cast', duration: 1300 }}>
      <canvas bind:this={map} aria-hidden="true"></canvas>
      <div class="pin" aria-hidden="true"><span></span></div>
      <figcaption>Vestavia Hills, Alabama · Appalachian foothills south of Birmingham</figcaption>
    </figure>
  </div>
</section>

<style>
  .visit {
    padding: clamp(80px, 10vw, 140px) 0;
    background: var(--paper);
  }
  .grid {
    display: grid;
    grid-template-columns: minmax(0, 0.9fr) minmax(0, 1.1fr);
    gap: clamp(40px, 6vw, 96px);
    align-items: center;
  }
  .h2 {
    margin: 22px 0 34px;
  }
  .h2 em {
    color: var(--accent);
  }
  .info {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 24px;
    margin: 0 0 34px;
  }
  dt {
    margin-bottom: 6px;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.2em;
    text-transform: uppercase;
    color: var(--muted);
  }
  dd {
    margin: 0;
    font-family: var(--serif);
    font-size: 24px;
    line-height: 1.25;
  }
  dd a {
    text-decoration: none;
    border-bottom: 1px solid var(--line);
  }
  .ctas {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 22px;
  }
  .link {
    font-size: 14px;
    font-weight: 600;
    letter-spacing: 0.06em;
    text-decoration: none;
    color: var(--accent);
  }
  .map {
    position: relative;
    margin: 0;
    aspect-ratio: 16 / 11;
    overflow: hidden;
    border: 1px solid var(--line);
    border-radius: var(--radius);
    background: var(--card);
  }
  canvas {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
  }
  .pin {
    position: absolute;
    left: 50%;
    top: 50%;
    width: 18px;
    height: 18px;
    translate: -50% -50%;
    border-radius: 50%;
    background: var(--evergreen);
    box-shadow: 0 0 0 6px rgba(184, 149, 90, 0.35), 0 0 0 22px rgba(184, 149, 90, 0.12);
  }
  .pin span {
    position: absolute;
    inset: 5px;
    border-radius: 50%;
    background: var(--brass-2);
  }
  figcaption {
    position: absolute;
    left: 18px;
    bottom: 14px;
    font-size: 12px;
    letter-spacing: 0.08em;
    color: var(--muted);
  }
  @media (max-width: 960px) {
    .grid {
      grid-template-columns: 1fr;
    }
  }
  @media (max-width: 520px) {
    .info {
      grid-template-columns: 1fr;
    }
  }
</style>
