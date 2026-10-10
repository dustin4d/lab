// Cascading entrance animations built on the Web Animations API.
// On the live site a group plays when it scrolls into view; in film mode the
// renderer seeks every group to an exact time so frames are deterministic.

const registry = new Set();
const played = new Set();
let reduced = false;
let filmMode = false;

export function configureMotion({ film = false } = {}) {
  filmMode = film;
  reduced = !film && typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
}

const EASE = 'cubic-bezier(.16,.84,.24,1)';

// "cast" elements fall onto the page from above the camera and land with a
// tightening shadow; "drop" is the headline word fall; the rest are supporting.
export const PRESETS = {
  drop: [
    { opacity: 0, transform: 'translate3d(0,-0.55em,0) rotateX(-75deg)', filter: 'blur(12px)' },
    { opacity: 1, transform: 'translate3d(0,0,0) rotateX(0deg)', filter: 'none' },
  ],
  cast: [
    { opacity: 0, transform: 'translate3d(0,-36px,0) scale(1.12)', filter: 'blur(10px)', boxShadow: '0 60px 80px -20px rgba(6,18,13,0)' },
    { opacity: 1, offset: 0.55 },
    { opacity: 1, transform: 'translate3d(0,0,0) scale(1)', filter: 'none', boxShadow: '0 24px 48px -24px rgba(6,18,13,.55)' },
  ],
  castFlat: [
    { opacity: 0, transform: 'translate3d(0,-36px,0) scale(1.12)', filter: 'blur(10px)' },
    { opacity: 1, offset: 0.55 },
    { opacity: 1, transform: 'translate3d(0,0,0) scale(1)', filter: 'none' },
  ],
  rise: [
    { opacity: 0, transform: 'translate3d(0,28px,0)' },
    { opacity: 1, transform: 'translate3d(0,0,0)' },
  ],
  fall: [
    { opacity: 0, transform: 'translate3d(0,-22px,0)' },
    { opacity: 1, transform: 'translate3d(0,0,0)' },
  ],
  fade: [{ opacity: 0 }, { opacity: 1 }],
  line: [
    { transform: 'scaleX(0)', opacity: 0.4 },
    { transform: 'scaleX(1)', opacity: 1 },
  ],
  card: [
    { opacity: 0, transform: 'translate3d(46px,-18px,0) rotateY(-24deg) scale(1.04)', filter: 'blur(8px)' },
    { opacity: 1, transform: 'translate3d(0,0,0) rotateY(0deg) scale(1)', filter: 'none' },
  ],
};

/**
 * Svelte action: `use:cascade={{ group: 'hero', delay: 120, preset: 'drop' }}`
 */
export function cascade(el, opts) {
  const { group = 'default', delay = 0, duration = 1000, preset = 'cast' } = opts || {};
  const anim = el.animate(PRESETS[preset], { duration, delay, easing: EASE, fill: 'both' });
  anim.pause();
  anim.currentTime = 0;
  const entry = { el, anim, group, end: delay + duration };
  registry.add(entry);
  if (reduced) anim.finish();
  else if (played.has(group) && !filmMode) anim.play();
  return {
    destroy() {
      anim.cancel();
      registry.delete(entry);
    },
  };
}

export function playGroup(group) {
  if (played.has(group)) return;
  played.add(group);
  for (const e of registry) {
    if (e.group !== group) continue;
    if (reduced) e.anim.finish();
    else e.anim.play();
  }
}

export function seekGroup(group, ms) {
  for (const e of registry) {
    if (e.group === group) e.anim.currentTime = Math.max(0, Math.min(ms, e.end));
  }
}

export function groups() {
  return [...new Set([...registry].map((e) => e.group))];
}

/**
 * Svelte action: plays a group when its section scrolls into view.
 * `use:revealOnScroll={'course'}`
 */
export function revealOnScroll(el, group) {
  if (filmMode) return {};
  const io = new IntersectionObserver(
    (entries) => {
      for (const en of entries) {
        if (en.isIntersecting) {
          playGroup(group);
          io.disconnect();
        }
      }
    },
    { rootMargin: '0px 0px -18% 0px', threshold: 0.05 },
  );
  io.observe(el);
  return { destroy: () => io.disconnect() };
}
