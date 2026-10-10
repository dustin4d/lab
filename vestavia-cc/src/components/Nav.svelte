<script>
  import { onMount } from 'svelte';
  import Monogram from './Monogram.svelte';
  import { NAV } from '../lib/content.js';
  import { cascade } from '../lib/motion.js';

  let { film = false } = $props();
  let scrolled = $state(false);
  let open = $state(false);

  onMount(() => {
    if (film) return;
    const onScroll = () => (scrolled = window.scrollY > 40);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  });

  const close = () => (open = false);
</script>

<header class="nav" class:scrolled class:film class:open>
  <div class="bar wrap">
    <a class="brand" href="#top" onclick={close} use:cascade={{ group: 'hero', delay: 60, preset: 'fall', duration: 900 }}>
      <Monogram size={42} />
      <span class="word">
        <span class="w1">Vestavia</span>
        <span class="w2">Country Club</span>
      </span>
    </a>

    <nav aria-label="Primary">
      <ul id="nav-links">
        {#each NAV as item, i}
          <li use:cascade={{ group: 'hero', delay: 140 + i * 70, preset: 'fall', duration: 800 }}>
            <a href={item.href} onclick={close}>{item.label}</a>
          </li>
        {/each}
      </ul>
    </nav>

    <div class="actions" use:cascade={{ group: 'hero', delay: 520, preset: 'fall', duration: 800 }}>
      <a class="login" href="https://www.vestaviacc.com/" rel="noopener">Member Login</a>
      <button class="menu" aria-expanded={open} aria-controls="nav-links" onclick={() => (open = !open)}>
        <span class="sr-only">{open ? 'Close menu' : 'Open menu'}</span>
        <span class="bars" aria-hidden="true"><i></i><i></i></span>
      </button>
    </div>
  </div>
</header>

<style>
  .nav {
    position: fixed;
    inset: 0 0 auto 0;
    z-index: 50;
    color: var(--on-dark);
    transition: background 0.35s, box-shadow 0.35s, backdrop-filter 0.35s;
  }
  .nav.film {
    position: absolute;
  }
  .nav.scrolled {
    background: rgba(14, 42, 33, 0.9);
    backdrop-filter: blur(10px);
    box-shadow: 0 1px 0 rgba(243, 238, 226, 0.08);
  }
  .bar {
    display: flex;
    align-items: center;
    gap: 32px;
    height: 88px;
    transition: height 0.35s;
  }
  .scrolled .bar {
    height: 72px;
  }
  .brand {
    display: inline-flex;
    align-items: center;
    gap: 14px;
    text-decoration: none;
    color: var(--brass-2);
  }
  .word {
    display: grid;
    line-height: 1;
    color: var(--on-dark);
  }
  .w1 {
    font-family: var(--serif);
    font-size: 25px;
    font-weight: 600;
    letter-spacing: 0.16em;
    text-transform: uppercase;
  }
  .w2 {
    margin-top: 5px;
    font-size: 10px;
    font-weight: 600;
    letter-spacing: 0.42em;
    text-transform: uppercase;
    color: var(--brass-2);
  }
  nav {
    margin-left: auto;
  }
  ul {
    display: flex;
    gap: 30px;
    margin: 0;
    padding: 0;
    list-style: none;
  }
  ul a {
    position: relative;
    font-size: 13px;
    font-weight: 500;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    text-decoration: none;
    color: var(--on-dark-muted);
    transition: color 0.2s;
  }
  ul a::after {
    content: '';
    position: absolute;
    left: 0;
    right: 0;
    bottom: -6px;
    height: 1px;
    background: var(--brass);
    transform: scaleX(0);
    transform-origin: left;
    transition: transform 0.3s;
  }
  ul a:hover {
    color: var(--on-dark);
  }
  ul a:hover::after {
    transform: scaleX(1);
  }
  .actions {
    display: flex;
    align-items: center;
    gap: 12px;
  }
  .login {
    display: inline-flex;
    align-items: center;
    height: 40px;
    padding: 0 18px;
    border: 1px solid rgba(243, 238, 226, 0.4);
    border-radius: 999px;
    font-size: 12px;
    font-weight: 600;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    text-decoration: none;
    transition: border-color 0.2s, background 0.2s;
  }
  .login:hover {
    border-color: var(--brass-2);
    background: rgba(217, 191, 138, 0.1);
  }
  .menu {
    display: none;
    width: 44px;
    height: 44px;
    border: 0;
    background: transparent;
    cursor: pointer;
  }
  .bars {
    display: grid;
    gap: 7px;
    justify-items: end;
  }
  .bars i {
    display: block;
    width: 24px;
    height: 1.5px;
    background: currentColor;
    transition: transform 0.3s, width 0.3s;
  }
  .bars i:last-child {
    width: 16px;
  }
  .open .bars i:first-child {
    transform: translateY(4.25px) rotate(45deg);
  }
  .open .bars i:last-child {
    width: 24px;
    transform: translateY(-4.25px) rotate(-45deg);
  }

  @media (max-width: 1100px) {
    ul {
      gap: 22px;
    }
  }
  @media (max-width: 960px) {
    .bar {
      height: 72px;
      gap: 16px;
    }
    .login {
      display: none;
    }
    .menu {
      display: grid;
      place-items: center;
    }
    nav {
      position: fixed;
      inset: 72px 0 auto 0;
      background: rgba(14, 42, 33, 0.97);
      backdrop-filter: blur(10px);
      padding: 8px var(--gutter) 28px;
      transform: translateY(-8px);
      opacity: 0;
      visibility: hidden;
      transition: opacity 0.25s, transform 0.25s, visibility 0.25s;
    }
    .open nav {
      opacity: 1;
      transform: none;
      visibility: visible;
    }
    .open {
      background: rgba(14, 42, 33, 0.97);
    }
    ul {
      flex-direction: column;
      gap: 0;
    }
    ul li {
      border-bottom: 1px solid rgba(243, 238, 226, 0.1);
    }
    ul a {
      display: block;
      padding: 16px 0;
      font-size: 14px;
    }
    .actions {
      margin-left: auto;
    }
    .w1 {
      font-size: 21px;
    }
  }
</style>
