"use client";

import { geoDistance, geoGraticule10, geoInterpolate, geoOrthographic, geoPath } from "d3-geo";
import { useEffect, useRef } from "react";
import { useRaf } from "@/components/arcade/useRaf";
import { useAppReducedMotion } from "@/components/ReducedMotionProvider";
import { countryAt, type Country, type Layer, type Line, type World } from "@/lib/world/world";

const DEG = 180 / Math.PI;
const MIN_ZOOM = 1;
const MAX_ZOOM = 14;
/**
 * Zoom from which the detailed map is drawn once the globe is still. It is too slow to redraw every frame, so a
 * moving globe always uses the coarse map; zoomed out, the countries it lacks are smaller than a pixel anyway.
 */
const DETAIL_ZOOM = 2;
const GRATICULE = geoGraticule10();

/** One colour per continent, so children see them as groups; each country gets its own shade of it. */
export const CONTINENT_COLOURS: Record<string, string> = {
  Africa: "#ffa94d",
  Asia: "#ffd43b",
  Europe: "#b197fc",
  "North America": "#69db7c",
  "South America": "#ff8787",
  Oceania: "#f783ac",
  Antarctica: "#f1f3f5",
};

function shade(hex: string, key: string): string {
  let h = 0;
  for (const ch of key) h = (h * 31 + ch.charCodeAt(0)) | 0;
  const amt = ((Math.abs(h) % 7) - 3) * 0.06;
  const n = parseInt(hex.slice(1), 16);
  const mix = (c: number) => Math.round(amt > 0 ? c + (255 - c) * amt : c * (1 + amt));
  return `rgb(${mix(n >> 16)}, ${mix((n >> 8) & 255)}, ${mix(n & 255)})`;
}

const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

/**
 * An accurate globe (orthographic projection of Natural Earth borders) on a canvas. Drag to spin, pinch, scroll or
 * use the buttons to zoom, tap a country to pick it. A picked country is flown to and centred.
 */
export function Globe({ world, selected, onSelect }: { world: World; selected: Country | null; onSelect: (c: Country | null) => void }) {
  const reduced = useAppReducedMotion();
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const view = useRef({ rot: [-20, -20] as [number, number], zoom: 1, w: 0, h: 0, dpr: 1 });
  const motion = useRef({ vx: 0, vy: 0, lastInput: 0, dirty: true, detailDrawn: false });
  const fly = useRef<{ from: [number, number]; to: [number, number]; z0: number; z1: number; t0: number; ms: number } | null>(null);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const gesture = useRef<{ x: number; y: number; t: number; moved: number; pinch: number; zoom: number } | null>(null);
  const colours = useRef(new Map<string, string>());

  const colourOf = (key: string) => {
    let c = colours.current.get(key);
    if (!c) {
      c = shade(CONTINENT_COLOURS[world.byKey.get(key)?.info.continent ?? ""] ?? "#ced4da", key);
      colours.current.set(key, c);
    }
    return c;
  };

  const projection = () => {
    const v = view.current;
    const r = (Math.min(v.w, v.h) / 2 - 6) * v.zoom;
    return geoOrthographic().scale(r).translate([v.w / 2, v.h / 2]).rotate([v.rot[0], v.rot[1]]).clipAngle(90);
  };

  const draw = (detail: boolean) => {
    const c = canvasRef.current;
    const ctx = c?.getContext("2d");
    const v = view.current;
    if (!c || !ctx || Math.min(v.w, v.h) < 20) return;
    ctx.setTransform(v.dpr, 0, 0, v.dpr, 0, 0);
    ctx.clearRect(0, 0, v.w, v.h);
    const proj = projection().precision(detail ? 0.4 : 1.2);
    const path = geoPath(proj, ctx);
    const r = proj.scale();

    const sea = ctx.createRadialGradient(v.w / 2 - r * 0.3, v.h / 2 - r * 0.3, r * 0.1, v.w / 2, v.h / 2, r);
    sea.addColorStop(0, "#74c0fc");
    sea.addColorStop(1, "#1864ab");
    ctx.beginPath();
    path({ type: "Sphere" });
    ctx.fillStyle = sea;
    ctx.fill();

    ctx.beginPath();
    path(GRATICULE);
    ctx.strokeStyle = "rgba(255,255,255,0.18)";
    ctx.lineWidth = 0.6;
    ctx.stroke();

    // Skip countries that cannot be in view: behind the globe or outside the zoomed-in window.
    const centre: [number, number] = [-v.rot[0], -v.rot[1]];
    const reach = Math.min(90, Math.asin(Math.min(1, Math.hypot(v.w, v.h) / 2 / r)) * DEG + 1);
    const inView = (cap: { centre: [number, number]; radius: number }) => geoDistance(centre, cap.centre) * DEG <= reach + cap.radius;
    const layer: Layer = detail ? world.detail : world.coarse;
    for (const s of layer.shapes) {
      if (!inView(s.cap)) continue;
      ctx.beginPath();
      path(s.shape);
      ctx.fillStyle = colourOf(s.key);
      ctx.fill();
    }
    const stroke = (lines: Line[], colour: string, width: number) => {
      ctx.beginPath();
      for (const l of lines) if (inView(l.cap)) path(l.line);
      ctx.strokeStyle = colour;
      ctx.lineWidth = width;
      ctx.stroke();
    };
    stroke(layer.borders, "rgba(255,255,255,0.9)", 0.8);
    stroke(layer.coast, "rgba(20,40,80,0.45)", 0.7);

    if (selected) {
      ctx.beginPath();
      path(selected.shape);
      ctx.fillStyle = "#fcc419";
      ctx.fill();
      ctx.strokeStyle = "#e8590c";
      ctx.lineWidth = 2;
      ctx.stroke();
      // Tiny countries get a ring so they can be seen at all.
      const p = geoDistance(centre, selected.centre) < Math.PI / 2 ? proj(selected.centre) : null;
      if (p && selected.size * (r / 90) < 10) {
        ctx.beginPath();
        ctx.arc(p[0], p[1], 14, 0, Math.PI * 2);
        ctx.strokeStyle = "#e8590c";
        ctx.lineWidth = 3;
        ctx.stroke();
      }
    }

    ctx.beginPath();
    path({ type: "Sphere" });
    ctx.strokeStyle = "rgba(255,255,255,0.5)";
    ctx.lineWidth = 2;
    ctx.stroke();
  };

  // Size the canvas to its box, sharp on high-density screens.
  useEffect(() => {
    const wrap = wrapRef.current;
    const c = canvasRef.current;
    if (!wrap || !c) return;
    const fit = () => {
      const v = view.current;
      v.dpr = Math.min(2, window.devicePixelRatio || 1);
      v.w = wrap.clientWidth;
      v.h = wrap.clientHeight;
      c.width = Math.round(v.w * v.dpr);
      c.height = Math.round(v.h * v.dpr);
      motion.current.dirty = true;
      motion.current.detailDrawn = false;
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(wrap);
    return () => ro.disconnect();
  }, []);

  // Fly to a newly picked country: along the great circle, easing in and out, zooming to fit it.
  useEffect(() => {
    if (!selected) {
      motion.current.dirty = true;
      return;
    }
    const v = view.current;
    const to: [number, number] = [-selected.centre[0], -selected.centre[1]];
    const z1 = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, 30 / Math.max(selected.size, 1)));
    if (reduced) {
      v.rot = to;
      v.zoom = z1;
      motion.current.dirty = true;
      return;
    }
    motion.current.vx = motion.current.vy = 0;
    fly.current = { from: [-v.rot[0], -v.rot[1]], to: selected.centre, z0: v.zoom, z1, t0: performance.now(), ms: 1300 };
  }, [selected, reduced]);

  useRaf((dt) => {
    const v = view.current;
    const m = motion.current;
    const now = performance.now();
    let moving = false;

    const f = fly.current;
    if (f) {
      const t = Math.min(1, (now - f.t0) / f.ms);
      const e = ease(t);
      const p = geoInterpolate(f.from, f.to)(e);
      v.rot = [-p[0], -p[1]];
      // Pull back a little mid-flight so the child sees where they are going.
      const dip = geoDistance(f.from, f.to) > 0.5 ? 1 - 0.45 * Math.sin(Math.PI * t) : 1;
      v.zoom = Math.max(MIN_ZOOM, (f.z0 + (f.z1 - f.z0) * e) * dip);
      moving = true;
      if (t >= 1) fly.current = null;
    } else if (!pointers.current.size && (Math.abs(m.vx) > 0.001 || Math.abs(m.vy) > 0.001)) {
      // Keep spinning after a flick, slowing down.
      v.rot = [v.rot[0] + m.vx * dt * 1000, Math.max(-89, Math.min(89, v.rot[1] + m.vy * dt * 1000))];
      m.vx *= 0.93;
      m.vy *= 0.93;
      moving = true;
    } else if (!selected && !reduced && !pointers.current.size && now - m.lastInput > 2500) {
      // A gentle idle spin until something is picked.
      v.rot = [v.rot[0] + 6 * dt, v.rot[1]];
      moving = dt > 0;
    }

    const detail = !moving && v.zoom >= DETAIL_ZOOM;
    if (moving || m.dirty || (detail && !m.detailDrawn)) {
      draw(detail);
      m.dirty = false;
      m.detailDrawn = detail;
    }
  });

  const setZoom = (z: number) => {
    view.current.zoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, z));
    fly.current = null;
    motion.current.lastInput = performance.now();
    motion.current.dirty = true;
  };

  const local = (e: React.PointerEvent) => {
    const r = e.currentTarget.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };

  const pick = (x: number, y: number) => {
    const proj = projection();
    const v = view.current;
    if (Math.hypot(x - v.w / 2, y - v.h / 2) > proj.scale()) return;
    const ll = proj.invert?.([x, y]);
    if (!ll) return;
    let hit = countryAt(world, ll as [number, number]);
    if (!hit) {
      // Small islands are hard to hit with a finger: take the nearest small country within reach.
      const centre: [number, number] = [-v.rot[0], -v.rot[1]];
      let best = 24;
      for (const c of world.countries) {
        if (c.size > 3 || geoDistance(centre, c.centre) > Math.PI / 2) continue;
        const p = proj(c.centre);
        const d = p ? Math.hypot(p[0] - x, p[1] - y) : Infinity;
        if (d < best) {
          best = d;
          hit = c;
        }
      }
    }
    onSelect(hit);
  };

  const onDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    const p = local(e);
    pointers.current.set(e.pointerId, p);
    fly.current = null;
    motion.current.vx = motion.current.vy = 0;
    motion.current.lastInput = performance.now();
    const pts = [...pointers.current.values()];
    gesture.current = {
      x: p.x,
      y: p.y,
      t: performance.now(),
      moved: pts.length > 1 ? Infinity : 0,
      pinch: pts.length > 1 ? Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y) : 0,
      zoom: view.current.zoom,
    };
  };

  const onMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const prev = pointers.current.get(e.pointerId);
    const g = gesture.current;
    if (!prev || !g) return;
    const p = local(e);
    pointers.current.set(e.pointerId, p);
    const v = view.current;
    const m = motion.current;
    m.lastInput = performance.now();
    const pts = [...pointers.current.values()];
    if (pts.length > 1) {
      const d = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      if (g.pinch) setZoom((g.zoom * d) / g.pinch);
      return;
    }
    const dx = p.x - prev.x;
    const dy = p.y - prev.y;
    g.moved += Math.hypot(dx, dy);
    const perPx = DEG / ((Math.min(v.w, v.h) / 2 - 6) * v.zoom);
    v.rot = [v.rot[0] + dx * perPx, Math.max(-89, Math.min(89, v.rot[1] - dy * perPx))];
    const dtMs = Math.max(8, e.timeStamp - (g.t || e.timeStamp));
    g.t = e.timeStamp;
    m.vx = (dx * perPx) / dtMs;
    m.vy = (-dy * perPx) / dtMs;
    m.dirty = true;
  };

  const onUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const g = gesture.current;
    const p = local(e);
    pointers.current.delete(e.pointerId);
    if (g && !pointers.current.size && g.moved < 8) {
      motion.current.vx = motion.current.vy = 0;
      pick(p.x, p.y);
    }
    if (!pointers.current.size) gesture.current = null;
  };

  const onKey = (e: React.KeyboardEvent) => {
    const v = view.current;
    const step = 10 / v.zoom;
    const keys: Record<string, () => void> = {
      ArrowLeft: () => (v.rot = [v.rot[0] + step, v.rot[1]]),
      ArrowRight: () => (v.rot = [v.rot[0] - step, v.rot[1]]),
      ArrowUp: () => (v.rot = [v.rot[0], Math.max(-89, v.rot[1] - step)]),
      ArrowDown: () => (v.rot = [v.rot[0], Math.min(89, v.rot[1] + step)]),
      "+": () => setZoom(v.zoom * 1.5),
      "=": () => setZoom(v.zoom * 1.5),
      "-": () => setZoom(v.zoom / 1.5),
    };
    if (!keys[e.key]) return;
    e.preventDefault();
    keys[e.key]();
    fly.current = null;
    motion.current.lastInput = performance.now();
    motion.current.dirty = true;
  };

  return (
    <div ref={wrapRef} className="absolute inset-0">
      <canvas
        ref={canvasRef}
        tabIndex={0}
        role="img"
        aria-label="Globe of the world. Drag to spin, tap a country to learn about it."
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
        onWheel={(e) => setZoom(view.current.zoom * Math.exp(-e.deltaY * 0.0015))}
        onKeyDown={onKey}
        className="absolute inset-0 h-full w-full touch-none rounded-3xl focus-visible:outline-4 focus-visible:outline-kid-yellow"
      />
      <div className="absolute right-2 bottom-2 flex flex-col gap-2">
        <button type="button" aria-label="Zoom in" onClick={() => setZoom(view.current.zoom * 1.6)} className="h-14 w-14 rounded-full bg-surface text-4xl leading-none font-extrabold shadow-md active:scale-90">
          +
        </button>
        <button type="button" aria-label="Zoom out" onClick={() => setZoom(view.current.zoom / 1.6)} className="h-14 w-14 rounded-full bg-surface text-4xl leading-none font-extrabold shadow-md active:scale-90">
          −
        </button>
      </div>
    </div>
  );
}
