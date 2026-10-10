<script>
  import { COURSE } from '../lib/content.js';
  import { cascade, revealOnScroll } from '../lib/motion.js';
  import lake from '../assets/img/lake.jpg';
  import { filmBus } from '../lib/film.js';

  const g = 'course';
</script>

<section id="course" class="course" use:revealOnScroll={g} data-film-group={g}>
  <div class="wrap grid">
    <div class="text">
      <p class="eyebrow" use:cascade={{ group: g, preset: 'fall', duration: 800 }}>
        <span class="rule"></span>{COURSE.eyebrow}
      </p>
      <h2 class="display h2" use:cascade={{ group: g, delay: 100, preset: 'castFlat', duration: 1100 }}>
        {COURSE.title[0]}<br /><em>{COURSE.title[1]}</em>
      </h2>
      {#each COURSE.body as p, i}
        <p class="lede" use:cascade={{ group: g, delay: 260 + i * 120, preset: 'rise', duration: 900 }}>{p}</p>
      {/each}
      <ul class="facts">
        {#each COURSE.facts as f, i}
          <li use:cascade={{ group: g, delay: 480 + i * 110, preset: 'cast', duration: 1000 }}>
            <span class="k">{f.k}</span>
            <span class="v">{f.v}</span>
          </li>
        {/each}
      </ul>
    </div>

    <figure class="photo" use:cascade={{ group: g, delay: 180, preset: 'cast', duration: 1300 }}>
      <img src={lake} alt="Aerial rendering of a par 3 played across a lake toward a green cut into the pines" loading={filmBus.active ? 'eager' : 'lazy'} />
      <figcaption>
        <span>No. 07 · Par 3</span>
        All carry, over the lake
      </figcaption>
    </figure>
  </div>

  <div class="wrap">
    <ol class="timeline">
      {#each COURSE.timeline as t, i}
        <li use:cascade={{ group: g, delay: 700 + i * 120, preset: 'castFlat', duration: 900 }}>
          <span class="yr">{t.y}</span>
          <span class="ev">{t.e}</span>
        </li>
      {/each}
    </ol>
  </div>
</section>

<style>
  .course {
    padding: clamp(80px, 11vw, 160px) 0 clamp(64px, 8vw, 120px);
    background: var(--paper);
  }
  .grid {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(0, 1.05fr);
    gap: clamp(40px, 6vw, 96px);
    align-items: center;
  }
  .h2 {
    margin: 22px 0 28px;
  }
  .h2 em {
    color: var(--accent);
  }
  .lede {
    margin: 0 0 18px;
  }
  .facts {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 12px;
    margin: 34px 0 0;
    padding: 0;
    list-style: none;
  }
  .facts li {
    display: grid;
    gap: 4px;
    padding: 18px 20px;
    background: var(--card);
    border: 1px solid var(--line);
    border-radius: var(--radius);
  }
  .k {
    font-family: var(--serif);
    font-size: 40px;
    line-height: 1;
    color: var(--ink);
  }
  .v {
    font-size: 13px;
    line-height: 1.4;
    color: var(--muted);
  }
  .photo {
    position: relative;
    margin: 0;
    aspect-ratio: 4 / 5;
    border-radius: var(--radius);
    overflow: hidden;
    background: var(--pine);
  }
  .photo img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  figcaption {
    position: absolute;
    left: 20px;
    right: 20px;
    bottom: 20px;
    display: grid;
    gap: 4px;
    padding: 16px 20px;
    background: rgba(14, 42, 33, 0.72);
    backdrop-filter: blur(10px);
    border-radius: var(--radius);
    color: var(--on-dark);
    font-family: var(--serif);
    font-size: 22px;
    line-height: 1.1;
  }
  figcaption span {
    font-family: var(--sans);
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.2em;
    text-transform: uppercase;
    color: var(--brass-2);
  }
  .timeline {
    position: relative;
    display: grid;
    grid-template-columns: repeat(5, minmax(0, 1fr));
    gap: 24px;
    margin: clamp(64px, 8vw, 110px) 0 0;
    padding: 34px 0 0;
    list-style: none;
    border-top: 1px solid var(--line);
  }
  .timeline li {
    position: relative;
    display: grid;
    gap: 6px;
  }
  .timeline li::before {
    content: '';
    position: absolute;
    top: -39px;
    left: 0;
    width: 9px;
    height: 9px;
    border-radius: 50%;
    background: var(--brass);
    box-shadow: 0 0 0 5px var(--paper);
  }
  .yr {
    font-family: var(--serif);
    font-size: 34px;
    line-height: 1;
  }
  .ev {
    font-size: 14px;
    color: var(--muted);
    line-height: 1.45;
  }
  @media (max-width: 960px) {
    .grid {
      grid-template-columns: 1fr;
    }
    .photo {
      aspect-ratio: 4 / 3;
    }
    .timeline {
      grid-template-columns: 1fr;
      gap: 22px;
      padding: 0 0 0 28px;
      border-top: 0;
      border-left: 1px solid var(--line);
    }
    .timeline li::before {
      top: 10px;
      left: -33px;
    }
  }
  @media (max-width: 520px) {
    .facts {
      grid-template-columns: 1fr;
    }
  }
</style>
