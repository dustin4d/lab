<script>
  /** Simple club monogram: a V inside a double ring. Placeholder until the club's own mark is supplied. */
  let { size = 44, title = 'Vestavia Country Club' } = $props();
</script>

<svg width={size} height={size} viewBox="0 0 64 64" role="img" aria-label={title}>
  <circle cx="32" cy="32" r="30.5" fill="none" stroke="currentColor" stroke-width="1.2" />
  <circle cx="32" cy="32" r="26.5" fill="none" stroke="currentColor" stroke-width="0.6" opacity="0.6" />
  <path d="M19.5 20.5h7.2l-1.4 1.1L32 40.2l6.6-18.6-1.4-1.1h6.8l-1.6 1.2L34 45.5h-3.6l-9.1-23.8z" fill="currentColor" />
  <path d="M22 49.5h20" stroke="currentColor" stroke-width="0.8" opacity="0.7" />
  <circle cx="32" cy="13.5" r="1.4" fill="currentColor" />
</svg>
