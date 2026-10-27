"use client";

import { useEffect, useRef } from "react";

/**
 * Albatros particle background v2: load choreography (scatter -> logo
 * scan-print behind a white scanline -> 1s hold -> constellation),
 * red/blue-only palette, living idle field, scroll-linked
 * disperse + full-page parallax stream. Fixed canvas, z-index 0,
 * pointer-events none. See Background/README.md for integration.
 */

export interface ParticleBackgroundProps {
  density?: number; // particle count multiplier (base 320)
  dotSize?: number; // dot radius multiplier
  redMix?: number; // share of red dots 0..0.3
  speed?: number; // choreography speed multiplier
  linkIntensity?: number; // 0..1
  glow?: number; // 0..1
  markSrc?: string; // logo mark png (transparent) for the mark phase
  onRevealReady?: (fast: boolean) => void; // fire hero content reveal
  onChoreographyStart?: () => void; // hold released, logo scan-print begins
  intro?: boolean; // false = start at the resting constellation (no mark assembly)
  navKey?: string; // current route key (pathname); changes when a navigation commits
}

interface Dot {
  seed: number;
  sx: number; sy: number; // scatter position
  rx: number; ry: number; // resting (stratified grid)
  mx: number; my: number; // mark position
  sat: { x: number; y: number; col: number[]; sx: number; sy: number; hfx: number; strand: number }[] | null; // helix+mark satellites
  x: number; y: number; px: number; py: number;
  vx: number; vy: number;
  ux: number; uy: number;
  r: number; pulse: number;
  strand: number; hfx: number;
  colF: number[]; colH: number[]; colM: number[];
}

const NAVY = [12, 27, 58], BLUE = [46, 84, 156], BLUEL = [92, 127, 180],
  TEAL = [62, 143, 166], RED = [208, 24, 31], WHITE = [255, 255, 255];
const D = [0.5, 0.001, 0.001, 1.0, 1.0, 0.8]; // fade-in, (skipped), (skipped), scan-print, hold, spread (s at speed=1)
const CUM = D.reduce<number[]>((a, d) => (a.push((a[a.length - 1] || 0) + d), a), []);
const TOTAL = CUM[CUM.length - 1];
const JIT = 5, VORTEX_SPEED = 0.9;
// Longest the intro will wait at the end of the fade-in for the mark PNG to
// sample before it gives up and skips straight to the ambient field. Keeps a
// cold load (slow PNG) from stalling the choreography indefinitely.
const HOLD_CAP_MS = 2500;

const mix = (a: number[], b: number[], m: number) =>
  [a[0] + (b[0] - a[0]) * m, a[1] + (b[1] - a[1]) * m, a[2] + (b[2] - a[2]) * m];
const ei = (x: number) => (x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2);
const rgba = (c: number[], a: number) =>
  `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a.toFixed(3)})`;

export default function ParticleBackground({
  density = 1.35,
  dotSize = 1.05,
  redMix = 0.12,
  speed = 1,
  linkIntensity = 0.55,
  glow = 0.55,
  markSrc = "/images/albatros-helix-mark3.png",
  onRevealReady,
  onChoreographyStart,
  intro = true,
  navKey,
}: ParticleBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // Timestamp until which the field yields the main thread. Set on a click that
  // may start a navigation and cleared when the new route commits (see the
  // navKey effect). A ref so both the rAF loop and that effect can touch it.
  const navPauseUntilRef = useRef(0);
  const revealRef = useRef(onRevealReady);
  revealRef.current = onRevealReady;
  const startRef = useRef(onChoreographyStart);
  startRef.current = onChoreographyStart;

  // When the route commits (navKey changes), the navigation that a click paused
  // for is done. Resume the field two frames later so the new route has painted
  // first. Skips the very first mount (nothing was navigating).
  const firstNav = useRef(true);
  useEffect(() => {
    if (firstNav.current) { firstNav.current = false; return; }
    let a = requestAnimationFrame(() => {
      a = requestAnimationFrame(() => { navPauseUntilRef.current = 0; });
    });
    return () => cancelAnimationFrame(a);
  }, [navKey]);

  useEffect(() => {
    const cv = canvasRef.current;
    if (!cv) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let W = window.innerWidth, H = window.innerHeight;
    let ps: Dot[] = [];
    // adaptive quality: heuristic start, one-way downgrade on sustained slow frames
    let quality = 1, ftAcc = 0, ftN = 0;
    const hc = navigator.hardwareConcurrency || 8;
    const dm = (navigator as any).deviceMemory || 8;
    if (hc <= 4 || dm <= 4) quality = 0.7;
    if (hc <= 2 || dm <= 2) quality = 0.5;
    let markPts: { fx: number; fy: number; col: number[] }[] | null = null;
    // No intro (inner routes) behaves exactly like the skip path from frame 0:
    // ph starts at TOTAL, so build() places every dot at its resting position
    // and the loop renders only the ambient constellation. Reduced motion has
    // always taken the same shortcut.
    const playIntro = intro && !reduced;
    let ph = playIntro ? 0 : TOTAL, hrot = 0, disp = 0, scrollY = 0;
    let lastPhase = -1, revealed = false, last = 0, raf = 0;
    let started = false, holdStart = -1;
    const mouse = { x: -9999, y: -9999 };

    const sizeCanvas = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, quality < 1 ? 1 : 1.5);
      cv.width = W * dpr; cv.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const build = () => {
      // Scale the dot count with screen area below the desktop breakpoint so a phone
      // is not several times denser per pixel than a laptop. >=1024px is unchanged.
      const areaScale = W >= 1024 ? 1 : Math.min(1, Math.max(0.4, (W * H) / (1440 * 900)));
      const n = Math.max(40, Math.round(320 * density * quality * areaScale));
      const cols = Math.ceil(n / 2);
      const idle = ph >= TOTAL;
      ps = [];
      for (let i = 0; i < n; i++) {
        let colF: number[];
        if (Math.random() < redMix) colF = RED;
        else {
          const r2 = Math.random();
          colF = r2 < 0.32 ? NAVY : r2 < 0.72 ? BLUE : r2 < 0.86 ? BLUEL : TEAL;
        }
        const strand = i % 2;
        const gc = 8, gr = 5, cell = i % (gc * gr);
        const p: Dot = {
          seed: Math.random(),
          sx: Math.random() * W, sy: Math.random() * H,
          rx: ((cell % gc) + 0.1 + Math.random() * 0.8) * (W / gc),
          ry: (((cell / gc) | 0) + 0.1 + Math.random() * 0.8) * (H / gr),
          mx: W / 2, my: H * 0.5, sat: null,
          x: 0, y: 0, px: 0, py: 0,
          vx: (Math.random() - 0.5) * 0.35, vy: (Math.random() - 0.5) * 0.35,
          ux: 0, uy: 0,
          r: 1.7 + Math.random() * 1.5, pulse: Math.random() * 6.3,
          strand, hfx: cols > 1 ? (i >> 1) / (cols - 1) : 0,
          colF, colH: strand ? RED : BLUE, colM: colF,
        };
        if (markPts) {
          const mp = markPts;
          const mw = (W >= 1024 ? Math.min(780, W * 0.6) : Math.min(600, W * 0.88)), mh = (mw * 1188) / 2720;
          const pick = (idx: number) => {
            const pt = mp[idx % mp.length];
            return {
              x: W / 2 + (pt.fx - 0.5) * mw + (Math.random() - 0.5) * 2.5,
              y: H * 0.5 + (pt.fy - 0.5) * mh + (Math.random() - 0.5) * 2.5,
              col: pt.col,
              sx: Math.random() * W, sy: Math.random() * H,
              hfx: Math.random(), strand: Math.random() < 0.5 ? 1 : 0,
            };
          };
          const m0 = pick(i * 7919);
          p.mx = m0.x; p.my = m0.y; p.colM = m0.col;
          p.sat = [pick(i * 7919 + 2711), pick(i * 7919 + 5413), pick(i * 7919 + 1237), pick(i * 7919 + 8117)];
          if (quality < 0.7) p.sat = p.sat.slice(0, 2);
        }
        p.x = idle ? p.rx : p.sx;
        p.y = idle ? p.ry : p.sy;
        const dx = p.rx - W / 2, dy = p.ry - H / 2, dd = Math.hypot(dx, dy) || 1;
        p.ux = dx / dd; p.uy = dy / dd;
        ps.push(p);
      }
    };

    const reveal = (fast: boolean) => {
      if (revealed) return;
      revealed = true;
      revealRef.current?.(fast);
    };

    const skip = () => {
      if (ph >= TOTAL) return;
      ph = TOTAL;
      for (const p of ps) { p.x = p.rx; p.y = p.ry; }
      reveal(true);
    };

    const step = (now: number) => {
      // Yield the main thread while a navigation the click may have started is in
      // flight. The A/B test proved the per-frame draw + link computation
      // otherwise starves React's render of the new route, so the click
      // registered but the route never committed (the "navbar needs several
      // clicks" bug). The pause is cleared the moment the new route commits (the
      // navKey effect), so it lasts exactly as long as the navigation, not a
      // fixed guess that is too short for heavy pages or slow devices.
      if (now < navPauseUntilRef.current) { last = now; raf = requestAnimationFrame(step); return; }
      const rawDt = Math.min(0.05, (now - (last || now)) / 1000);
      const dt = rawDt * speed;
      last = now;
      ftAcc += rawDt; ftN++;
      if (ftN >= 90) {
        const avg = ftAcc / ftN;
        ftAcc = 0; ftN = 0;
        // Keep measuring throughout, but defer any quality rebuild until the
        // intro choreography has finished. build() resets every particle to
        // scatter, so downgrading mid-intro (early frames are the slowest,
        // exactly during the intro) snaps the whole field and breaks the logo.
        if (ph >= TOTAL && avg > 0.024 && quality > 0.4) {
          quality = Math.max(0.4, quality * 0.75);
          sizeCanvas();
          build();
        }
      }
      ph += dt;
      // Do not start the logo scan-print until the mark PNG has been sampled.
      // Until markPts is set every dot uses the fallback centre and collapses
      // into one blob, so hold at the end of the fade-in phase if it is late.
      // The hold is capped at HOLD_CAP_MS: if the PNG is still not sampled by
      // then (a slow cold load), give up on the logo and skip to the ambient
      // field rather than stall the intro forever.
      if (!markPts && ph > CUM[0]) {
        ph = CUM[0];
        if (holdStart < 0) holdStart = now;
        if (now - holdStart > HOLD_CAP_MS) skip(); // ph -> TOTAL; frame falls through to ambient
      }
      const t = ph;
      let phase = 6;
      for (let i = 0; i < 6; i++) if (t < CUM[i]) { phase = i; break; }
      if (phase !== lastPhase) {
        for (const p of ps) { p.px = p.x; p.py = p.y; }
        lastPhase = phase;
      }
      // The hold has released and the logo scan-print is actually beginning:
      // signal the hero so it can start its reveal failsafe from HERE, not from
      // mount (a long cold-load hold used to push the ~2.8s choreography past a
      // mount-based failsafe, revealing the hero over a still-forming logo).
      if (phase >= 3 && !started) { started = true; startRef.current?.(); }
      if (phase >= 1 && phase <= 2) hrot += dt * 1.7 * VORTEX_SPEED;
      const mw = (W >= 1024 ? Math.min(780, W * 0.6) : Math.min(600, W * 0.88)), mkL = W / 2 - mw / 2, mh = (mw * 1188) / 2720;
      if (phase >= 5 && !revealed) reveal(false);

      ctx.clearRect(0, 0, W, H);
      const pr = (i: number) => (t - (i ? CUM[i - 1] : 0)) / D[i];
      const parX = mouse.x > -999 ? (mouse.x - W / 2) / (W / 2) : 0;
      const parY = mouse.y > -999 ? (mouse.y - H / 2) / (H / 2) : 0;
      const fieldLike = phase === 0 || phase >= 5;

      type DrawDot = { ox: number; oy: number; col: number[]; alpha: number; rad: number; z: number; boost: number };
      const draw: DrawDot[] = [];

      for (const p of ps) {
        p.pulse += dt * 1.2;
        let alpha: number, col: number[], rad: number, z = 0;
        if (phase === 0) {
          const e = Math.min(1, pr(0));
          p.x = p.sx + Math.sin(p.pulse + p.seed * 9) * 6;
          p.y = p.sy + Math.cos(p.pulse * 0.8 + p.seed * 7) * 6;
          alpha = e * 0.5; col = p.colF; rad = p.r;
        } else if (phase === 1 || phase === 2) {
          // skipped (near-zero duration): straight from field to logo
          col = p.colF; alpha = 0.5; rad = p.r;
        } else if (phase === 3) {
          const prog = Math.min(1, pr(3));
          const e = ei(Math.max(0, Math.min(1, prog * 1.7 - ((p.mx - mkL) / mw) * 0.7)));
          p.x = p.px + (p.mx - p.px) * e; p.y = p.py + (p.my - p.py) * e;
          col = mix(p.colF, p.colM, e); alpha = 0.5 + 0.25 * e; rad = p.r * (1.15 - 0.15 * e);
        } else if (phase === 4) {
          p.x = p.mx + Math.sin(p.pulse * 1.3 + p.seed * 11) * JIT * 0.12;
          p.y = p.my + Math.cos(p.pulse + p.seed * 5) * JIT * 0.12;
          col = p.colM; alpha = 0.85; rad = p.r;
        } else if (phase === 5) {
          const e = ei(Math.min(1, pr(5)));
          p.x = p.px + (p.rx - p.px) * e; p.y = p.py + (p.ry - p.py) * e;
          col = mix(p.colM, p.colF, e); alpha = 0.85 - e * 0.4; rad = p.r;
        } else {
          p.x += p.vx * dt * 60; p.y += p.vy * dt * 60;
          if (p.x < 0 || p.x > W) p.vx *= -1;
          if (p.y < 0 || p.y > H) p.vy *= -1;
          col = p.colF;
          alpha = (p.colF[0] > 150 ? 0.55 : 0.42) + 0.1 * Math.sin(p.pulse);
          rad = p.r * (0.85 + 0.25 * Math.sin(p.pulse));
        }

        let ox = p.x, oy = p.y, boost = 0;
        if (fieldLike || phase === 6) {
          ox += parX * p.seed * 12; oy += parY * p.seed * 8;
          const md = Math.hypot(ox - mouse.x, oy - mouse.y);
          // Tight cursor cluster: only genuinely nearby dots connect, so the
          // red cursor lines stay short (a small local cluster following the
          // pointer, not a wide net). Threshold and falloff divisor match.
          if (md < 75) boost = 1 - md / 75;
        }
        if (disp > 0) {
          ox += Math.sin(p.seed * 9.4) * disp * 60;
          alpha *= 1 - disp * 0.5;
          rad *= 1 - disp * 0.45;
        }
        // scroll-linked parallax stream, normalized to page length: over the FULL page
        // each dot travels 0.6-1.8 viewport heights, so long pages animate end to end
        if (phase === 6 && scrollY > 0) {
          const docH = Math.max(1, document.documentElement.scrollHeight - H);
          const sp = scrollY / docH;
          oy = oy - sp * H * (0.6 + 1.2 * p.seed);
          oy = ((oy % H) + H) % H;
          ox += Math.sin(sp * 6.3 + p.seed * 12) * 26 * disp;
        }
        alpha = Math.min(1, alpha + boost * 0.4);
        rad = rad * dotSize * (1 + boost * 0.8);
        draw.push({ ox, oy, col, alpha, rad, z, boost });

        if (p.sat && phase >= 3 && phase <= 5) {
          for (const st of p.sat) {
            let sx2: number, sy2: number, sc: number[], sa: number;
            const sr = p.r * 0.8;
            if (phase === 3) {
              const e = ei(Math.max(0, Math.min(1, Math.min(1, pr(3)) * 1.7 - ((st.x - mkL) / mw) * 0.7)));
              sx2 = st.sx + (st.x - st.sx) * e; sy2 = st.sy + (st.y - st.sy) * e;
              sc = st.col; sa = 0.75 * e;
            } else if (phase === 4) {
              sx2 = st.x; sy2 = st.y; sc = st.col; sa = 0.85;
            } else {
              const sf = Math.max(0, 1 - pr(5) * 10);
              if (sf <= 0.02) continue;
              sx2 = st.x; sy2 = st.y; sc = st.col; sa = 0.85 * sf;
            }
            draw.push({ ox: sx2, oy: sy2, col: sc, alpha: sa, rad: sr * dotSize, z: 0, boost: 0 });
          }
        }
      }

      // links via spatial hash (field states only)
      if ((fieldLike || phase === 6) && linkIntensity > 0.02) {
        const la = phase === 5 ? ei(Math.min(1, pr(5))) : phase === 0 ? Math.min(1, pr(0)) * 0.5 : 1;
        const cell = 90;
        const grid = new Map<string, number[]>();
        draw.forEach((d, i) => {
          const k = `${(d.ox / cell) | 0},${(d.oy / cell) | 0}`;
          const b = grid.get(k);
          if (b) b.push(i); else grid.set(k, [i]);
        });
        ctx.lineWidth = 1;
        for (let i = 0; i < draw.length; i++) {
          const a = draw[i];
          const gx = (a.ox / cell) | 0, gy = (a.oy / cell) | 0;
          for (let nx = gx; nx <= gx + 1; nx++)
            for (let ny = gy - 1; ny <= gy + 1; ny++) {
              if (nx === gx && ny < gy) continue;
              const bucket = grid.get(`${nx},${ny}`);
              if (!bucket) continue;
              for (const j of bucket) {
                if (j <= i) continue;
                const b = draw[j];
                const dx = a.ox - b.ox, dy = a.oy - b.oy, d2 = dx * dx + dy * dy;
                if (d2 < 8100) {
                  const d = Math.sqrt(d2);
                  ctx.strokeStyle = rgba(BLUE, (1 - d / 90) * 0.3 * linkIntensity * la * Math.min(a.alpha + 0.3, 1));
                  ctx.beginPath(); ctx.moveTo(a.ox, a.oy); ctx.lineTo(b.ox, b.oy); ctx.stroke();
                }
              }
            }
          if (a.boost > 0 && phase === 6 && disp < 0.3) {
            ctx.strokeStyle = rgba(RED, a.boost * 0.45 * linkIntensity);
            ctx.beginPath(); ctx.moveTo(a.ox, a.oy); ctx.lineTo(mouse.x, mouse.y); ctx.stroke();
          }
        }
      }

      // half-transparent white scanline: dots snap into place behind it
      if (phase === 3) {
        const x = mkL + Math.min(1, pr(3)) * mw;
        const bandY = H * 0.5 - mh / 2 - 10, bandH = mh + 20;
        const g = ctx.createLinearGradient(x - 34, 0, x, 0);
        g.addColorStop(0, "rgba(255,255,255,0)"); g.addColorStop(1, "rgba(255,255,255,0.5)");
        ctx.fillStyle = g; ctx.fillRect(x - 34, bandY, 34, bandH);
        ctx.fillStyle = "rgba(255,255,255,0.75)"; ctx.fillRect(x, bandY, 1.5, bandH);
      }

      if (phase === 1 || phase === 2) draw.sort((a, b) => a.z - b.z);
      for (const d of draw) {
        if (d.alpha <= 0.005) continue;
        if (quality >= 0.6 && glow > 0.03 && d.rad > 1) {
          ctx.beginPath();
          ctx.fillStyle = rgba(d.col, d.alpha * 0.1 * glow);
          ctx.arc(d.ox, d.oy, d.rad * 3.2, 0, 6.3); ctx.fill();
        }
        ctx.beginPath();
        ctx.fillStyle = rgba(d.col, d.alpha);
        ctx.arc(d.ox, d.oy, d.rad, 0, 6.3); ctx.fill();
      }

      raf = requestAnimationFrame(step);
    };

    const onMouse = (e: MouseEvent) => { mouse.x = e.clientX; mouse.y = e.clientY; };
    const onScroll = () => {
      disp = Math.min(1, Math.max(0, window.scrollY / (H * 1.4)));
      scrollY = window.scrollY;
      if (ph < TOTAL && window.scrollY > 8) skip();
    };
    // Skip the intro on a click, EXCEPT on interactive elements. A click on a
    // nav link, button or form control is a navigation/action, not an intent to
    // skip the intro. Firing the one-time reveal state update on that same click
    // re-renders the whole app tree the field provider wraps and races the
    // click's own navigation, dropping it. That collision is the real cause of
    // the "navbar links need several clicks right after opening" bug (the intro
    // still auto-reveals via the choreography, so nothing is lost by ignoring
    // these clicks; a click on empty background still skips).
    const INTERACTIVE = "a,button,input,textarea,select,label,summary,[role='button'],[role='link'],[onclick]";
    const onClick = (e: MouseEvent) => {
      const t = e.target as Element | null;
      const interactive = t && typeof t.closest === "function" && t.closest(INTERACTIVE);
      if (interactive) {
        // A click on a link/button/control may start a client navigation (or a
        // heavy re-render): pause the field so that work is not starved. The
        // navKey effect clears this the instant the new route commits; the cap
        // is only a backstop for clicks that turn out not to navigate. Not
        // calling skip() here avoids the reveal state update racing the click's
        // own navigation, which was the original multi-click bug.
        navPauseUntilRef.current = performance.now() + 2500;
        return;
      }
      // A click on empty background is an intent to skip the intro.
      skip();
    };
    const onResize = () => { W = window.innerWidth; H = window.innerHeight; sizeCanvas(); build(); };

    sizeCanvas();
    build();
    // Without the intro there is nothing to wait for: content must never gate
    // on a choreography that will not run, so the reveal fires immediately.
    if (!playIntro) reveal(true);

    // sample the mark png into normalized points (only needed by the intro's
    // scan-print phases; skipped entirely when the intro does not play)
    if (playIntro) {
      const img = new Image();
      img.onload = () => {
        const w = 240, h = Math.max(1, Math.round((w * img.height) / img.width));
        const c = document.createElement("canvas");
        c.width = w; c.height = h;
        const x = c.getContext("2d");
        if (!x) return;
        x.drawImage(img, 0, 0, w, h);
        const d = x.getImageData(0, 0, w, h).data;
        const pts: { fx: number; fy: number; col: number[] }[] = [];
        for (let py = 0; py < h; py += 2)
          for (let px = 0; px < w; px += 2) {
            const o = (py * w + px) * 4;
            if (d[o + 3] > 110) pts.push({ fx: px / w, fy: py / h, col: [d[o], d[o + 1], d[o + 2]] });
          }
        if (pts.length) { markPts = pts; build(); }
      };
      img.src = markSrc;
    }

    window.addEventListener("mousemove", onMouse);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("click", onClick);
    window.addEventListener("resize", onResize);
    raf = requestAnimationFrame(step);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("mousemove", onMouse);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("click", onClick);
      window.removeEventListener("resize", onResize);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [density, dotSize, redMix, speed, linkIntensity, glow, markSrc, intro]);

  return (
    <>
      <canvas
        ref={canvasRef}
        aria-hidden
        style={{ position: "fixed", inset: 0, width: "100vw", height: "100vh", zIndex: 0, pointerEvents: "none" }}
      />
      <div
        aria-hidden
        style={{
          position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none",
          background: "radial-gradient(ellipse 70% 55% at 50% 38%, rgba(46,84,156,0.06) 0%, transparent 70%)",
        }}
      />
    </>
  );
}
