<script>
  import { onMount } from 'svelte';

  // ?still=<preset> renders one frame for the page imagery; ?still=path&t=9 renders a flight frame.
  let { preset = 'aerial', t = 9, sunElevation, debug = [] } = $props();
  let canvas;

  onMount(async () => {
    const { createFlyover } = await import('../lib/flyover.js');
    const fly = createFlyover(canvas, { film: true, tier: 'film', sunElevation, debug });
    fly.resize(window.innerWidth, window.innerHeight);
    if (preset === 'path') fly.renderAt(t);
    else fly.renderPreset(preset, t);
    window.__render = (x) => { fly.renderAt(x); return { calls: fly.state.calls, tris: fly.state.tris }; };
    window.__info = { trees: fly.state.trees };
    window.__ready = true;
  });
</script>

<canvas bind:this={canvas}></canvas>

<style>
  canvas {
    position: fixed;
    inset: 0;
    width: 100vw;
    height: 100vh;
  }
</style>
