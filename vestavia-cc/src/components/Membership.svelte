<script>
  import { onMount } from 'svelte';
  import { MEMBERSHIP } from '../lib/content.js';
  import { cascade, revealOnScroll } from '../lib/motion.js';
  import { drawTopo } from '../lib/topo.js';
  import { filmBus } from '../lib/film.js';

  const g = 'membership';
  let topo;
  let sent = $state(false);
  let form = $state({ name: '', email: '', phone: '', interest: 'Golf', sponsor: '', note: '' });

  onMount(() => {
    // contour art of the real height field around the clubhouse
    const draw = () => {
      const r = topo.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      topo.width = Math.round(r.width * dpr);
      topo.height = Math.round(r.height * dpr);
      drawTopo(topo, { x0: -260, z0: -240, span: 1500, step: 2.5, cell: 5 * dpr, rot: 0.4, color: 'rgba(217,191,138,.16)', major: 'rgba(217,191,138,.34)' });
    };
    if (filmBus.active || !window.requestIdleCallback) return void draw();
    const id = requestIdleCallback(draw);
    return () => cancelIdleCallback(id);
  });

  function submit(e) {
    e.preventDefault();
    // No backend in this concept build: wire this to the club's CRM or email service.
    sent = true;
  }
</script>

<section id="membership" class="membership" use:revealOnScroll={g} data-film-group={g}>
  <canvas class="topo" bind:this={topo} aria-hidden="true"></canvas>
  <div class="wrap grid">
    <div class="text">
      <p class="eyebrow" use:cascade={{ group: g, preset: 'fall', duration: 800 }}><span class="rule"></span>{MEMBERSHIP.eyebrow}</p>
      <h2 class="display title" use:cascade={{ group: g, delay: 100, preset: 'castFlat', duration: 1200 }}>
        {MEMBERSHIP.title[0]}<br /><em>{MEMBERSHIP.title[1]}</em>
      </h2>
      <p class="lede" use:cascade={{ group: g, delay: 260, preset: 'rise', duration: 900 }}>{MEMBERSHIP.body}</p>
      <ul class="types" aria-label="Membership categories">
        {#each MEMBERSHIP.types as t, i}
          <li use:cascade={{ group: g, delay: 400 + i * 90, preset: 'castFlat', duration: 900 }}>{t}</li>
        {/each}
      </ul>
    </div>

    <div class="panel" use:cascade={{ group: g, delay: 300, preset: 'cast', duration: 1300 }}>
      {#if sent}
        <div class="thanks" role="status">
          <h3 class="display">Thank you, {form.name.split(' ')[0] || 'friend'}.</h3>
          <p>Your note is with the membership office. Expect to hear from us soon.</p>
          <button class="btn ink" type="button" onclick={() => (sent = false)}>Send another</button>
        </div>
      {:else}
        <form onsubmit={submit}>
          <h3 class="display">Request information</h3>
          <div class="row">
            <label>
              <span>Full name</span>
              <input required autocomplete="name" bind:value={form.name} />
            </label>
            <label>
              <span>Email</span>
              <input required type="email" autocomplete="email" bind:value={form.email} />
            </label>
          </div>
          <div class="row">
            <label>
              <span>Phone <em>optional</em></span>
              <input type="tel" autocomplete="tel" bind:value={form.phone} />
            </label>
            <label>
              <span>Interest</span>
              <select bind:value={form.interest}>
                {#each MEMBERSHIP.types as t}<option>{t}</option>{/each}
              </select>
            </label>
          </div>
          <label>
            <span>Sponsoring member <em>if known</em></span>
            <input bind:value={form.sponsor} />
          </label>
          <label>
            <span>Note <em>optional</em></span>
            <textarea rows="3" bind:value={form.note}></textarea>
          </label>
          <button class="btn" type="submit">
            Send inquiry
            <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M2 8h11M9 4l4 4-4 4" fill="none" stroke="currentColor" stroke-width="1.5" /></svg>
          </button>
        </form>
      {/if}
    </div>
  </div>
</section>

<style>
  .membership {
    overflow: hidden;
    padding: clamp(90px, 12vw, 170px) 0;
    background: radial-gradient(120% 90% at 85% 10%, #1b4535 0%, var(--evergreen) 55%, #0a2019 100%);
    color: var(--on-dark);
  }
  .topo {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
  }
  .grid {
    position: relative;
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(0, 520px);
    gap: clamp(40px, 6vw, 96px);
    align-items: center;
  }
  .eyebrow {
    color: var(--brass-2);
  }
  .title {
    margin: 22px 0 26px;
    font-size: clamp(3rem, 6.4vw, 6.4rem);
    line-height: 0.92;
  }
  .title em {
    color: var(--brass-2);
  }
  .lede {
    color: var(--on-dark-muted);
  }
  .types {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    margin: 30px 0 0;
    padding: 0;
    list-style: none;
  }
  .types li {
    padding: 9px 18px;
    border: 1px solid rgba(217, 191, 138, 0.42);
    border-radius: 999px;
    font-size: 12px;
    font-weight: 600;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    color: var(--brass-2);
  }
  .panel {
    padding: clamp(24px, 3vw, 40px);
    border-radius: var(--radius);
    background: var(--ivory);
    color: #15211b;
  }
  form,
  .thanks {
    display: grid;
    gap: 16px;
  }
  h3 {
    margin: 0 0 6px;
    font-size: 34px;
  }
  .row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 14px;
  }
  label {
    display: grid;
    gap: 6px;
  }
  label span {
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    color: #4a554d;
  }
  label em {
    font-style: normal;
    font-weight: 500;
    letter-spacing: 0.04em;
    text-transform: none;
    color: #7a837b;
  }
  input,
  select,
  textarea {
    width: 100%;
    min-height: 46px;
    padding: 10px 14px;
    border: 1px solid rgba(21, 33, 27, 0.2);
    border-radius: var(--radius);
    background: #fffdf8;
    color: #15211b;
    font-size: 15px;
  }
  textarea {
    resize: vertical;
  }
  input:focus,
  select:focus,
  textarea:focus {
    outline: none;
    border-color: var(--brass);
    box-shadow: 0 0 0 3px rgba(184, 149, 90, 0.25);
  }
  form .btn {
    justify-self: start;
    margin-top: 6px;
  }
  .thanks p {
    margin: 0 0 8px;
    color: #4a554d;
  }
  .thanks .btn {
    justify-self: start;
  }
  @media (max-width: 960px) {
    .grid {
      grid-template-columns: 1fr;
    }
  }
  @media (max-width: 520px) {
    .row {
      grid-template-columns: 1fr;
    }
  }
</style>
