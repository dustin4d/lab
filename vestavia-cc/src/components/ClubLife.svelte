<script>
  import { LIFE, LIFE_INTRO } from '../lib/content.js';
  import { cascade, revealOnScroll } from '../lib/motion.js';
  import tennis from '../assets/img/tennis.jpg';
  import pools from '../assets/img/pools.jpg';
  import clubhouse from '../assets/img/clubhouse.jpg';
  import { filmBus } from '../lib/film.js';

  const g = 'life';
  const img = { tennis, pools, clubhouse };
  const alt = {
    tennis: 'Aerial rendering of fifteen tennis courts beside a small pavilion',
    pools: 'Aerial rendering of three pools on a sunlit deck with umbrellas',
    clubhouse: 'Rendering of a white columned clubhouse among pines at golden hour',
  };
</script>

<section id="club-life" class="life" use:revealOnScroll={g} data-film-group={g}>
  <div class="wrap">
    <header class="head">
      <p class="eyebrow" use:cascade={{ group: g, preset: 'fall', duration: 800 }}><span class="rule"></span>{LIFE_INTRO.eyebrow}</p>
      <h2 class="display h2" use:cascade={{ group: g, delay: 100, preset: 'castFlat', duration: 1100 }}>{LIFE_INTRO.title}</h2>
    </header>

    <div class="bento">
      {#each LIFE as item, i}
        <article class="tile {item.key}" use:cascade={{ group: g, delay: 260 + i * 150, preset: 'cast', duration: 1200 }}>
          {#if img[item.key]}
            <img src={img[item.key]} alt={alt[item.key]} loading={filmBus.active ? 'eager' : 'lazy'} />
          {:else}
            <div class="pattern" aria-hidden="true">
              <svg viewBox="0 0 200 200" preserveAspectRatio="xMidYMid slice">
                {#each Array(9) as _, k}
                  <circle cx="160" cy="40" r={18 + k * 22} fill="none" stroke="currentColor" stroke-width="0.7" opacity={0.55 - k * 0.05} />
                {/each}
              </svg>
            </div>
          {/if}
          <div class="cap">
            <span class="tag">{item.tag}</span>
            <h3 class="display">{item.title}</h3>
            <p>{item.text}</p>
          </div>
        </article>
      {/each}
    </div>
  </div>
</section>

<style>
  .life {
    padding: clamp(80px, 11vw, 150px) 0;
    background: var(--paper-2);
  }
  .head {
    max-width: 760px;
    margin-bottom: clamp(40px, 5vw, 64px);
  }
  .h2 {
    margin-top: 22px;
  }
  .bento {
    display: grid;
    grid-template-columns: repeat(12, minmax(0, 1fr));
    grid-auto-rows: minmax(260px, auto);
    grid-auto-flow: dense;
    gap: 16px;
  }
  .tile {
    position: relative;
    overflow: hidden;
    border-radius: var(--radius);
    background: var(--pine);
    color: var(--on-dark);
    min-height: 300px;
  }
  .tennis {
    grid-column: span 7;
    grid-row: span 2;
  }
  .pools {
    grid-column: span 5;
  }
  .family {
    grid-column: span 5;
    background: var(--evergreen);
  }
  .clubhouse {
    grid-column: span 12;
    min-height: 460px;
  }
  .tile img {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
    transition: transform 1.2s cubic-bezier(0.16, 0.84, 0.24, 1);
  }
  .clubhouse img {
    object-position: 50% 38%;
  }
  .tile:hover img {
    transform: scale(1.035);
  }
  .tile::after {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(0deg, rgba(8, 22, 17, 0.86) 0%, rgba(8, 22, 17, 0.25) 46%, rgba(8, 22, 17, 0) 70%);
    pointer-events: none;
  }
  .family::after {
    display: none;
  }
  .pattern {
    position: absolute;
    inset: 0;
    color: var(--brass);
  }
  .pattern svg {
    width: 100%;
    height: 100%;
  }
  .cap {
    position: absolute;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 1;
    padding: clamp(20px, 2.4vw, 32px);
    max-width: 560px;
  }
  .tag {
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.22em;
    text-transform: uppercase;
    color: var(--brass-2);
  }
  h3 {
    margin: 8px 0 8px;
    font-size: clamp(30px, 3vw, 44px);
  }
  .cap p {
    margin: 0;
    font-size: 15px;
    line-height: 1.6;
    color: var(--on-dark-muted);
  }
  @media (max-width: 960px) {
    .tennis,
    .pools,
    .family,
    .clubhouse {
      grid-column: span 12;
      grid-row: auto;
    }
    .tennis {
      min-height: 420px;
    }
  }
</style>
