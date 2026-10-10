#!/usr/bin/env node
// Renders the site's imagery and the flyover film from the built site (dist/).
//
//   node scripts/render-video.mjs --stills            # page imagery -> src/assets/img
//   node scripts/render-video.mjs --frames 3,9,15     # preview PNGs of the film
//   node scripts/render-video.mjs --film              # full film -> media/vestavia-flyover.mp4
//   options: --width 1920 --height 1080 --fps 30 --out path.mp4
//   (film frames are cached in .frames/film; delete it after changing the page)
//
// Frames are rendered deterministically: each one seeks the page's film
// timeline (window.__film.seek) and is screenshotted, then piped to ffmpeg.
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { serve, CHROME_ARGS } from './serve.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const opt = (name, def) => {
  const i = args.indexOf('--' + name);
  return i === -1 ? def : args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : true;
};

const W = Number(opt('width', 1920));
const H = Number(opt('height', 1080));

const STILLS = [
  { name: 'poster', q: 'still=path&t=0', w: 1920, h: 1080 },
  { name: 'lake', q: 'still=lake', w: 1200, h: 1500 },
  { name: 'tennis', q: 'still=tennis', w: 1500, h: 1300 },
  { name: 'pools', q: 'still=pools', w: 1400, h: 1000 },
  { name: 'clubhouse', q: 'still=clubhouse', w: 2200, h: 940 },
];

const dist = path.join(root, 'dist');
if (!fs.existsSync(path.join(dist, 'index.html'))) {
  console.error('dist/ is missing — run `npm run build` first.');
  process.exit(1);
}

const srv = await serve(dist);
const browser = await chromium.launch({ args: CHROME_ARGS });

async function open(query, w, h) {
  const page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
  page.setDefaultTimeout(180000);
  page.on('pageerror', (e) => {
    console.error('page error:', e.message);
    process.exit(1);
  });
  page.on('console', (m) => m.type() === 'error' && console.error('console:', m.text()));
  await page.goto(`${srv.url}/?${query}`);
  return page;
}

try {
  if (opt('stills', false)) {
    const only = opt('only', '');
    for (const s of STILLS) {
      if (only && !String(only).split(',').includes(s.name)) continue;
      const page = await open(s.q, s.w, s.h);
      await page.waitForFunction(() => window.__ready, null, { timeout: 300000 });
      const file = path.join(root, 'src/assets/img', `${s.name}.jpg`);
      await page.screenshot({ path: file, type: 'jpeg', quality: 86 });
      console.log('still', s.name, `${s.w}x${s.h}`, Math.round(fs.statSync(file).size / 1024) + 'KB');
      await page.close();
    }
  }

  if (opt('frames', false) || opt('film', false)) {
    const page = await open('film', W, H);
    await page.waitForFunction(() => window.__filmReady, null, { timeout: 300000 });
    const film = await page.evaluate(() => ({ fps: window.__film.fps, duration: window.__film.duration, triggers: window.__film.triggers }));
    const fps = Number(opt('fps', film.fps));
    console.log('film', film.duration + 's', '@' + fps + 'fps', 'section triggers', JSON.stringify(film.triggers));

    if (opt('frames', false)) {
      const outDir = path.join(root, '.frames');
      fs.mkdirSync(outDir, { recursive: true });
      for (const t of String(opt('frames')).split(',').map(Number)) {
        await page.evaluate((x) => window.__film.seek(x), t);
        const file = path.join(outDir, `t${String(t).padStart(5, '0')}.png`);
        await page.screenshot({ path: file });
        console.log('frame', t, file);
      }
    }

    if (opt('film', false)) {
      // Frames go to disk first (resumable: existing frames are skipped), then
      // ffmpeg encodes them in one pass.
      const out = path.resolve(root, opt('out', 'media/vestavia-flyover.mp4'));
      const frameDir = path.join(root, '.frames', 'film');
      fs.mkdirSync(frameDir, { recursive: true });
      fs.mkdirSync(path.dirname(out), { recursive: true });
      const total = Math.round(film.duration * fps);
      const name = (i) => path.join(frameDir, `f${String(i).padStart(5, '0')}.jpg`);
      const t0 = Date.now();
      let rendered = 0;
      for (let i = 0; i < total; i++) {
        if (fs.existsSync(name(i)) && fs.statSync(name(i)).size > 0) continue;
        await page.evaluate((x) => window.__film.seek(x), i / fps);
        const buf = await page.screenshot({ type: 'jpeg', quality: 94 });
        fs.writeFileSync(name(i) + '.tmp', buf);
        fs.renameSync(name(i) + '.tmp', name(i));
        rendered++;
        if (rendered % 15 === 0 || i === total - 1) {
          const el = (Date.now() - t0) / 1000;
          console.log(`frame ${i + 1}/${total}  ${(el / rendered).toFixed(2)}s/frame  eta ${Math.round((el / rendered) * (total - i - 1) / 60)}min`);
        }
      }
      const ff = spawn('ffmpeg', [
        '-y', '-loglevel', 'error', '-framerate', String(fps), '-i', path.join(frameDir, 'f%05d.jpg'),
        '-c:v', 'libx264', '-preset', 'slow', '-crf', '19', '-pix_fmt', 'yuv420p', '-tune', 'film',
        '-movflags', '+faststart', out,
      ], { stdio: 'inherit' });
      await new Promise((r) => ff.on('close', r));
      console.log('wrote', out, Math.round(fs.statSync(out).size / 1024) + 'KB');
    }
  }
} finally {
  await browser.close();
  srv.close();
}
