<script>
  import Monogram from './Monogram.svelte';
  import { CLUB, NAV } from '../lib/content.js';
</script>

<footer class="footer">
  <div class="wrap top">
    <a class="brand" href="#top">
      <Monogram size={56} />
      <span>
        <strong>{CLUB.name}</strong>
        <small>Est. {CLUB.est} · Vestavia Hills, Alabama</small>
      </span>
    </a>
    <nav aria-label="Footer">
      <ul>
        {#each NAV as item}<li><a href={item.href}>{item.label}</a></li>{/each}
      </ul>
    </nav>
  </div>
  <div class="wrap bottom">
    <span>{CLUB.address.join(', ')} · <a href={CLUB.phoneHref}>{CLUB.phone}</a></span>
    <span>Private club · Membership by invitation</span>
  </div>
</footer>

<style>
  .footer {
    padding: 64px 0 36px;
    background: #0a2019;
    color: var(--on-dark-muted);
  }
  .top {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 32px;
    padding-bottom: 40px;
    border-bottom: 1px solid rgba(243, 238, 226, 0.1);
  }
  .brand {
    display: flex;
    align-items: center;
    gap: 18px;
    text-decoration: none;
    color: var(--brass-2);
  }
  .brand span {
    display: grid;
    gap: 4px;
  }
  strong {
    font-family: var(--serif);
    font-size: 28px;
    font-weight: 500;
    color: var(--on-dark);
  }
  small {
    font-size: 12px;
    letter-spacing: 0.14em;
    text-transform: uppercase;
  }
  ul {
    display: flex;
    flex-wrap: wrap;
    gap: 10px 28px;
    margin: 0;
    padding: 0;
    list-style: none;
  }
  ul a {
    font-size: 13px;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    text-decoration: none;
  }
  ul a:hover {
    color: var(--on-dark);
  }
  .bottom {
    display: flex;
    flex-wrap: wrap;
    justify-content: space-between;
    gap: 12px;
    padding-top: 26px;
    font-size: 13px;
  }
  .bottom a {
    text-decoration: none;
  }
</style>
