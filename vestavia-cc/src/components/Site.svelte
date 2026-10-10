<script>
  import Nav from './Nav.svelte';
  import Hero from './Hero.svelte';
  import Course from './Course.svelte';
  import Holes from './Holes.svelte';
  import ClubLife from './ClubLife.svelte';
  import Membership from './Membership.svelte';
  import Visit from './Visit.svelte';
  import Footer from './Footer.svelte';

  let { film = false } = $props();
</script>

{#if !film}<a class="skip" href="#course">Skip to content</a>{/if}
<Nav {film} />
<Hero {film} />
<main>
  <Course />
  <Holes />
  <ClubLife />
  <Membership />
  <Visit />
</main>
<Footer />

<style>
  .skip {
    position: absolute;
    left: 16px;
    top: -60px;
    z-index: 100;
    padding: 10px 16px;
    background: var(--ivory);
    color: var(--evergreen);
    border-radius: var(--radius);
    font-weight: 600;
  }
  .skip:focus {
    top: 16px;
  }
</style>
