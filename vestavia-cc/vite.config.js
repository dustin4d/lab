import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';

// `npm run build:single` emits one self-contained HTML file (scripts, styles,
// fonts and images inlined) that opens straight from disk.
const single = process.env.SINGLE === '1';

function inlineIntoHtml() {
  return {
    name: 'inline-into-html',
    enforce: 'post',
    generateBundle(_, bundle) {
      const html = Object.values(bundle).find((f) => f.fileName.endsWith('.html'));
      if (!html) return;
      let src = String(html.source);
      for (const [name, file] of Object.entries(bundle)) {
        if (name.endsWith('.js')) {
          const tag = src.match(new RegExp(`<script[^>]*src="[^"]*${name.replace(/[.]/g, '\\.')}"[^>]*></script>`));
          if (!tag) continue;
          // no chunks left to preload once everything is inlined
          const code = file.code.replace(/__VITE_PRELOAD__/g, 'void 0').replace(/<\/script/gi, '<\\/script');
          src = src.replace(tag[0], () => `<script type="module">${code}</script>`);
          delete bundle[name];
        } else if (name.endsWith('.css')) {
          const tag = src.match(new RegExp(`<link[^>]*href="[^"]*${name.replace(/[.]/g, '\\.')}"[^>]*>`));
          if (!tag) continue;
          src = src.replace(tag[0], () => `<style>${file.source}</style>`);
          delete bundle[name];
        }
      }
      html.source = src;
    },
  };
}

export default defineConfig({
  base: './',
  plugins: [svelte(), single && inlineIntoHtml()].filter(Boolean),
  build: {
    target: 'es2022',
    chunkSizeWarningLimit: 1200,
    ...(single && {
      outDir: 'dist-single',
      assetsInlineLimit: 100_000_000,
      cssCodeSplit: false,
      modulePreload: false,
      rollupOptions: { output: { inlineDynamicImports: true } },
    }),
  },
});
