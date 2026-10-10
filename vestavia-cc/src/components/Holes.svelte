<script>
  import { HOLES, HOLES_INTRO } from '../lib/content.js';
  import { cascade, revealOnScroll } from '../lib/motion.js';

  const g = 'holes';
</script>

<section id="holes" class="holes" use:revealOnScroll={g} data-film-group={g}>
  <div class="wrap">
    <header class="head">
      <div>
        <p class="eyebrow" use:cascade={{ group: g, preset: 'fall', duration: 800 }}><span class="rule"></span>{HOLES_INTRO.eyebrow}</p>
        <h2 class="display h2" use:cascade={{ group: g, delay: 100, preset: 'castFlat', duration: 1100 }}>{HOLES_INTRO.title}</h2>
      </div>
      <p class="lede" use:cascade={{ group: g, delay: 220, preset: 'rise', duration: 900 }}>{HOLES_INTRO.lede}</p>
    </header>

    <ol class="cards">
      {#each HOLES as h, i}
        <li class="card" use:cascade={{ group: g, delay: 320 + i * 150, preset: 'cast', duration: 1150 }}>
          <div class="plan" aria-hidden="true">
            <svg viewBox="0 0 240 300">
              <defs>
                <pattern id="ripple-{h.n}" width="14" height="8" patternUnits="userSpaceOnUse">
                  <path d="M0 5 q3.5 -3 7 0 t7 0" fill="none" stroke="rgba(217,191,138,.35)" stroke-width="0.8" />
                </pattern>
              </defs>
              {#if h.kind === 'lake'}
                <path class="fw" d="M120 276 L120 252" stroke-width="30" />
                <path class="water" d="M44 178 C40 140 78 118 120 122 C168 120 206 138 200 176 C196 210 160 222 120 218 C76 220 48 208 44 178 Z" />
                <path d="M44 178 C40 140 78 118 120 122 C168 120 206 138 200 176 C196 210 160 222 120 218 C76 220 48 208 44 178 Z" fill="url(#ripple-{h.n})" />
                <ellipse class="green" cx="124" cy="70" rx="38" ry="25" />
                <ellipse class="sand" cx="80" cy="54" rx="13" ry="7" transform="rotate(-25 80 54)" />
                <ellipse class="sand" cx="170" cy="58" rx="11" ry="6" transform="rotate(30 170 58)" />
                <path class="flight" d="M120 262 Q 168 170 126 76" />
              {:else if h.kind === 'nose'}
                <path class="fw-edge" d="M118 282 C108 220 92 170 104 118 C112 86 124 70 130 62" />
                <path class="fw" d="M118 282 C108 220 92 170 104 118 C112 86 124 70 130 62" stroke-width="54" />
                <ellipse class="sand" cx="104" cy="168" rx="9" ry="6" />
                <ellipse class="sand" cx="90" cy="156" rx="7" ry="5" />
                <ellipse class="sand" cx="116" cy="182" rx="7.5" ry="5" />
                <ellipse class="green" cx="132" cy="52" rx="34" ry="24" />
                <ellipse class="sand" cx="170" cy="72" rx="11" ry="6" transform="rotate(35 170 72)" />
                <path class="flight" d="M118 268 Q 70 200 76 168" />
                <path class="flight alt" d="M118 268 Q 150 210 132 176" />
                <text x="148" y="168" class="note">THE NOSE</text>
              {:else if h.kind === 'redan'}
                <path class="fw" d="M122 280 L122 186" stroke-width="44" />
                <ellipse class="green" cx="118" cy="96" rx="70" ry="26" transform="rotate(-28 118 96)" />
                <path class="sand deep" d="M60 140 C 80 150 120 140 150 126 C 156 132 150 142 140 146 C 112 160 76 166 58 152 Z" />
                <path class="flight" d="M122 262 Q 170 190 160 120 Q 140 90 96 82" />
                <text x="20" y="196" class="note">DEEP FRONT BUNKER</text>
              {:else}
                <path class="fw" d="M120 284 L120 214" stroke-width="40" />
                <ellipse class="green" cx="120" cy="110" rx="30" ry="84" />
                <rect class="swale" x="88" y="100" width="64" height="18" rx="9" />
                <path d="M92 104 h56 M92 110 h56 M92 116 h56" stroke="rgba(14,42,33,.45)" stroke-width="1" />
                <ellipse class="sand" cx="72" cy="120" rx="8" ry="40" />
                <ellipse class="sand" cx="168" cy="96" rx="8" ry="40" />
                <path class="flight" d="M120 270 Q 136 150 122 62" />
                <text x="160" y="160" class="note">SWALE</text>
              {/if}
              <rect class="tee" x="108" y="278" width="24" height="12" rx="2" />
              {#if h.kind !== 'biarritz'}
                <path class="pin" d="M126 {h.kind === 'nose' ? 52 : h.kind === 'redan' ? 92 : 70} v-26 l14 5 -14 5" />
              {:else}
                <path class="pin" d="M120 66 v-26 l14 5 -14 5" />
              {/if}
            </svg>
          </div>
          <div class="meta">
            <span class="no">No. {h.n}</span>
            <span class="tag">{h.tag}</span>
          </div>
          <h3 class="display">{h.name}</h3>
          <p>{h.text}</p>
        </li>
      {/each}
    </ol>
    <p class="fine" use:cascade={{ group: g, delay: 1000, preset: 'fade', duration: 900 }}>Diagrams illustrate each template; they are not survey plans of the holes.</p>
  </div>
</section>

<style>
  .holes {
    padding: clamp(80px, 11vw, 150px) 0;
    background: var(--evergreen);
    color: var(--on-dark);
  }
  .holes :global(.eyebrow) {
    color: var(--brass-2);
  }
  .head {
    display: grid;
    grid-template-columns: minmax(0, 1.1fr) minmax(0, 0.9fr);
    gap: 48px;
    align-items: end;
    margin-bottom: clamp(44px, 6vw, 72px);
  }
  .h2 {
    margin-top: 22px;
  }
  .lede {
    color: var(--on-dark-muted);
    margin: 0;
  }
  .cards {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 18px;
    margin: 0;
    padding: 0;
    list-style: none;
  }
  .card {
    display: grid;
    align-content: start;
    padding: 18px 18px 26px;
    border: 1px solid rgba(243, 238, 226, 0.12);
    border-radius: var(--radius);
    background: linear-gradient(180deg, rgba(29, 70, 54, 0.75), rgba(18, 53, 42, 0.5));
    transition: border-color 0.3s, transform 0.3s;
  }
  .card:hover {
    border-color: rgba(217, 191, 138, 0.5);
  }
  .plan {
    aspect-ratio: 4 / 5;
    margin-bottom: 18px;
    border-radius: 2px;
    background:
      radial-gradient(circle at 30% 20%, rgba(85, 112, 64, 0.35), transparent 60%),
      repeating-linear-gradient(135deg, rgba(243, 238, 226, 0.025) 0 2px, transparent 2px 9px),
      #163a2d;
  }
  svg {
    width: 100%;
    height: 100%;
  }
  .fw {
    fill: none;
    stroke: rgba(143, 184, 82, 0.34);
    stroke-linecap: round;
  }
  .fw-edge {
    fill: none;
    stroke: rgba(217, 191, 138, 0.45);
    stroke-width: 56;
    stroke-linecap: round;
  }
  .green {
    fill: rgba(150, 198, 86, 0.55);
    stroke: var(--brass-2);
    stroke-width: 1.2;
  }
  .sand {
    fill: #efe3c3;
  }
  .sand.deep {
    stroke: rgba(14, 42, 33, 0.6);
    stroke-width: 2;
  }
  .water {
    fill: rgba(78, 128, 138, 0.55);
    stroke: rgba(217, 191, 138, 0.5);
    stroke-width: 1;
  }
  .swale {
    fill: rgba(14, 42, 33, 0.38);
  }
  .flight {
    fill: none;
    stroke: var(--brass-2);
    stroke-width: 1.4;
    stroke-dasharray: 3 5;
  }
  .flight.alt {
    opacity: 0.55;
  }
  .tee {
    fill: var(--brass);
  }
  .pin {
    fill: #d24a3a;
    stroke: #f3eee2;
    stroke-width: 1.2;
    stroke-linejoin: round;
  }
  .note {
    font-family: var(--sans);
    font-size: 8.5px;
    font-weight: 700;
    letter-spacing: 0.18em;
    fill: var(--brass-2);
  }
  .meta {
    display: flex;
    justify-content: space-between;
    gap: 12px;
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.18em;
    text-transform: uppercase;
  }
  .no {
    color: var(--brass-2);
  }
  .tag {
    color: var(--on-dark-muted);
    text-align: right;
  }
  h3 {
    margin: 12px 0 10px;
    font-size: 32px;
    line-height: 1.02;
  }
  .card p {
    margin: 0;
    font-size: 15px;
    line-height: 1.6;
    color: var(--on-dark-muted);
  }
  .fine {
    margin: 26px 0 0;
    font-size: 12px;
    color: rgba(243, 238, 226, 0.5);
  }
  @media (max-width: 1100px) {
    .cards {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }
  @media (max-width: 760px) {
    .head {
      grid-template-columns: 1fr;
      gap: 18px;
    }
  }
  @media (max-width: 520px) {
    .cards {
      grid-template-columns: 1fr;
    }
    .plan {
      aspect-ratio: 16 / 13;
    }
  }
</style>
