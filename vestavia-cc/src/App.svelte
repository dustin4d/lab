<script>
  import Site from './components/Site.svelte';
  import FilmStage from './components/FilmStage.svelte';
  import StillRender from './components/StillRender.svelte';
  import { configureMotion } from './lib/motion.js';
  import { filmBus } from './lib/film.js';

  const q = new URLSearchParams(location.search);
  const mode = q.has('film') ? 'film' : q.has('still') ? 'still' : 'site';
  configureMotion({ film: mode === 'film' });
  filmBus.active = mode === 'film';
  if (mode !== 'site') document.documentElement.dataset.theme = 'light';
</script>

{#if mode === 'film'}
  <FilmStage />
{:else if mode === 'still'}
  <StillRender preset={q.get('still')} t={Number(q.get('t') || 9)} sunElevation={q.has('sun') ? Number(q.get('sun')) : undefined} debug={(q.get('dbg') || '').split(',').filter(Boolean)} />
{:else}
  <Site />
{/if}
