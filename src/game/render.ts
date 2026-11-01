import { GROUND_Y, WALL_L, WALL_R, WORLD_W, type Entity } from "./types";
import type { World } from "./world";

export type Camera = { x: number; y: number; zoom: number };

const BEAST: Record<string, [number, number, number, number, number, number]> = {
  wolf: [0.75, 1, 1, 1, 1, 0.35],
  dog: [0.9, 0.85, 0.85, 0.95, 1, 0.3],
  cat: [1.25, 0.4, 1.15, 0.82, 0.9, 0.25],
  bear: [0.4, 0.45, 0.15, 1.25, 0.8, 0.15],
  fox: [1.15, 0.8, 1.35, 0.8, 0.95, 0.35],
  horse: [0.55, 1.05, 1.2, 1, 1.25, 1.15],
  bunny: [2, 0.25, 0.2, 0.75, 0.65, 0.15],
  dino: [0, 1.35, 1.45, 1.15, 1.15, 0.7],
  frog: [0.15, 0.2, 0, 1.15, 0.45, 0.05],
  pig: [0.45, 0.7, 0.25, 1.15, 0.6, 0.1],
  cow: [0.55, 0.7, 0.45, 1.3, 0.95, 0.35],
  sheep: [0.4, 0.35, 0.2, 1.2, 0.75, 0.15],
  monkey: [0.5, 0.35, 1.1, 0.85, 0.85, 0.25],
};

export function render(
  ctx: CanvasRenderingContext2D,
  world: World,
  cam: Camera,
  cssW: number,
  cssH: number,
  dpr: number,
  selected: number | null,
  pending: number | null,
  started: boolean,
) {
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const shake = world.reduceMotion ? 0 : world.trauma * world.trauma;
  sky(ctx, cssW, cssH, world.time);
  hills(ctx, cssW, cssH, cam.x, "#1a2233", 36, cssH * 0.62, 0.18);
  hills(ctx, cssW, cssH, cam.x, "#141a28", 28, cssH * 0.7, 0.32);

  ctx.save();
  ctx.translate(Math.sin(world.time * 41) * 14 * shake, Math.cos(world.time * 33) * 10 * shake);
  ctx.scale(cam.zoom, cam.zoom);
  ctx.translate(-cam.x, -cam.y);

  ground(ctx, world.time);
  pillars(ctx);

  if (started && world.countLiving() === 0) {
    ctx.save();
    ctx.fillStyle = "rgba(244,239,230,0.55)";
    ctx.font = "600 28px Fraunces, Palatino, serif";
    ctx.textAlign = "center";
    ctx.fillText("Say anything.", WORLD_W / 2, GROUND_Y - 120);
    ctx.restore();
  }

  const left = cam.x - 120;
  const right = cam.x + cssW / cam.zoom + 120;
  const top = cam.y - 140;
  const bottom = cam.y + cssH / cam.zoom + 80;

  for (const w of world.welds) {
    const a = world.byId(w.a);
    const b = world.byId(w.b);
    if (!a || !b) continue;
    chain(ctx, a, b, world.time);
  }

  const drawList = world.entities
    .filter((e) => !e.dead && e.x > left && e.x < right && e.y > top && e.y < bottom)
    .sort((a, b) => a.y - b.y);

  for (const e of drawList) shadow(ctx, e);
  for (const e of drawList) drawEntity(ctx, e, world.time, world.reduceMotion);
  for (const e of drawList) {
    if (e.id === selected || e.id === pending || e.hp < e.bp.hp - 0.5 || e.foes.length) {
      label(ctx, e, e.id === selected, e.id === pending, world.time);
    } else {
      label(ctx, e, false, false, world.time);
    }
  }

  for (const b of world.bolts) {
    ctx.save();
    ctx.translate(b.x, b.y);
    ctx.fillStyle = b.color;
    ctx.beginPath();
    ctx.arc(0, 0, b.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  for (const r of world.rings) {
    ctx.save();
    ctx.globalAlpha = Math.max(0, r.life / 0.45);
    ctx.strokeStyle = r.color;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(r.x, r.y, r.r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  for (const p of world.particles) {
    ctx.save();
    ctx.globalAlpha = Math.max(0, p.life / p.max);
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  ctx.font = "700 16px Outfit, system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  for (const f of world.floaters) {
    ctx.save();
    ctx.globalAlpha = Math.max(0, f.life / f.max);
    ctx.fillStyle = "#fff6e8";
    ctx.fillText(f.text, f.x, f.y);
    ctx.restore();
  }

  ctx.restore();

  const vignette = ctx.createRadialGradient(cssW / 2, cssH / 2, cssW * 0.2, cssW / 2, cssH / 2, cssW * 0.72);
  vignette.addColorStop(0, "rgba(14,17,24,0)");
  vignette.addColorStop(1, "rgba(14,17,24,0.45)");
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, cssW, cssH);
}

function sky(ctx: CanvasRenderingContext2D, w: number, h: number, time: number) {
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, "#121722");
  g.addColorStop(0.42, "#243044");
  g.addColorStop(0.7, "#6d4a52");
  g.addColorStop(0.86, "#e0a06a");
  g.addColorStop(1, "#c4845a");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);

  ctx.save();
  ctx.globalAlpha = 0.9;
  ctx.fillStyle = "#f4efe6";
  ctx.beginPath();
  ctx.arc(w * 0.78, h * 0.16, 26, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 0.18;
  ctx.beginPath();
  ctx.arc(w * 0.78, h * 0.16, 48, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  ctx.fillStyle = "#f4efe6";
  for (let i = 0; i < 32; i++) {
    const x = ((i * 97) % w) + Math.sin(time * 0.2 + i) * 4;
    const y = (i * 37) % (h * 0.42);
    ctx.globalAlpha = 0.15 + (i % 5) * 0.08;
    ctx.fillRect(x, y, i % 4 === 0 ? 2 : 1.4, i % 4 === 0 ? 2 : 1.4);
  }
  ctx.globalAlpha = 1;
}

function hills(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  camX: number,
  color: string,
  amp: number,
  base: number,
  parallax: number,
) {
  ctx.beginPath();
  ctx.moveTo(0, h);
  const shift = camX * parallax;
  for (let x = 0; x <= w; x += 10) {
    const wx = x + shift;
    const y = base + Math.sin(wx * 0.008) * amp + Math.sin(wx * 0.021 + 1.2) * amp * 0.45;
    ctx.lineTo(x, y);
  }
  ctx.lineTo(w, h);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
}

function ground(ctx: CanvasRenderingContext2D, time: number) {
  const dirt = ctx.createLinearGradient(0, GROUND_Y, 0, GROUND_Y + 280);
  dirt.addColorStop(0, "#3a342c");
  dirt.addColorStop(0.08, "#2a261f");
  dirt.addColorStop(1, "#16130f");
  ctx.fillStyle = dirt;
  ctx.fillRect(0, GROUND_Y, WORLD_W, 320);
  ctx.fillStyle = "rgba(232,154,60,0.55)";
  ctx.fillRect(0, GROUND_Y, WORLD_W, 3);
  ctx.strokeStyle = "rgba(244,239,230,0.05)";
  ctx.lineWidth = 2;
  for (let x = 0; x < WORLD_W; x += 56) {
    ctx.beginPath();
    ctx.moveTo(x, GROUND_Y + 18);
    ctx.lineTo(x + 8, GROUND_Y + 70);
    ctx.stroke();
  }
  ctx.globalAlpha = 0.15;
  ctx.fillStyle = "#e89a3c";
  for (let i = 0; i < 18; i++) {
    const x = (i * 170 + time * 12) % WORLD_W;
    ctx.fillRect(x, GROUND_Y - 8 - (i % 4) * 3, 2, 2);
  }
  ctx.globalAlpha = 1;
}

function pillars(ctx: CanvasRenderingContext2D) {
  for (const x of [WALL_L, WALL_R]) {
    ctx.fillStyle = "#2a313c";
    ctx.fillRect(x - 18, GROUND_Y - 220, 36, 220);
    ctx.fillStyle = "#e89a3c";
    ctx.globalAlpha = 0.8;
    ctx.fillRect(x - 22, GROUND_Y - 226, 44, 8);
    ctx.globalAlpha = 1;
    ctx.fillStyle = "#171c24";
    ctx.fillRect(x - 8, GROUND_Y - 150, 16, 22);
  }
}

function shadow(ctx: CanvasRenderingContext2D, e: Entity) {
  const lift = Math.max(0, GROUND_Y - (e.y + e.bp.radius));
  ctx.save();
  ctx.translate(e.x, GROUND_Y + 4);
  ctx.scale(1 + lift / 280, 1);
  ctx.globalAlpha = Math.max(0.08, 0.32 - lift / 700);
  ctx.fillStyle = "#120e0a";
  ctx.beginPath();
  ctx.ellipse(0, 0, e.bp.radius * 0.95, e.bp.radius * 0.28, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function chain(ctx: CanvasRenderingContext2D, a: Entity, b: Entity, time: number) {
  const mx = (a.x + b.x) / 2;
  const my = (a.y + b.y) / 2 + 16 + Math.sin(time * 3) * 2;
  ctx.save();
  ctx.strokeStyle = "#c9853a";
  ctx.lineWidth = 3;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(a.x, a.y);
  ctx.quadraticCurveTo(mx, my, b.x, b.y);
  ctx.stroke();
  ctx.fillStyle = "#f4efe6";
  for (let i = 1; i <= 3; i++) {
    const t = i / 4;
    const u = 1 - t;
    const x = u * u * a.x + 2 * u * t * mx + t * t * b.x;
    const y = u * u * a.y + 2 * u * t * my + t * t * b.y;
    ctx.beginPath();
    ctx.arc(x, y, 3.2, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function popScale(t: number, reduce: boolean) {
  if (reduce) return t > 0.05 ? 1 : t * 20;
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * (t - 1) ** 3 + c1 * (t - 1) ** 2;
}

function drawEntity(ctx: CanvasRenderingContext2D, e: Entity, time: number, reduce: boolean) {
  const intro = popScale(Math.min(1, e.intro), reduce);
  const sp = reduce ? 0 : Math.min(1, Math.hypot(e.vx, e.vy) / 800);
  const sx = (1 + e.land * 0.22) * (1 - sp * 0.05);
  const sy = (1 - e.land * 0.18) * (1 + sp * 0.08);
  ctx.save();
  ctx.translate(e.x, e.y);
  ctx.scale(e.facing * sx * intro, sy * intro);
  if (e.bp.variant === "ghost") ctx.globalAlpha = 0.78;
  switch (e.bp.shape) {
    case "dragon":
      drawDragon(ctx, e, time);
      break;
    case "beast":
      drawBeast(ctx, e, time);
      break;
    case "bird":
      drawBird(ctx, e, time);
      break;
    case "fish":
      drawFish(ctx, e, time);
      break;
    case "serpent":
      drawSerpent(ctx, e, time);
      break;
    case "bug":
      drawBug(ctx, e, time);
      break;
    case "person":
      drawPerson(ctx, e, time);
      break;
    case "blade":
      drawBlade(ctx, e, time);
      break;
    case "bomb":
      drawBomb(ctx, e, time);
      break;
    case "shield":
      drawShield(ctx, e);
      break;
    case "heart":
      drawHeart(ctx, e, time);
      break;
    case "tree":
      drawTree(ctx, e, time);
      break;
    case "castle":
      drawCastle(ctx, e, time);
      break;
    case "vehicle":
      drawVehicle(ctx, e, time);
      break;
    case "gem":
    case "star":
      drawGem(ctx, e, time);
      break;
    case "blob":
      if (e.bp.variant === "potion") drawPotion(ctx, e);
      else drawBlob(ctx, e, time);
      break;
    default:
      drawOrb(ctx, e, time);
      break;
  }
  ctx.restore();
}

function fillOf(ctx: CanvasRenderingContext2D, e: Entity, rad: number) {
  if (e.flash > 0.04) return "#fffaf3";
  const g = ctx.createRadialGradient(-rad * 0.35, -rad * 0.4, rad * 0.1, 0, 0, rad * 1.2);
  g.addColorStop(0, e.bp.accent);
  g.addColorStop(0.55, e.bp.fill);
  g.addColorStop(1, e.bp.ink);
  return g;
}

function ink(ctx: CanvasRenderingContext2D, e: Entity, rad: number) {
  ctx.strokeStyle = e.flash > 0.04 ? "#fffaf3" : e.bp.ink;
  ctx.lineWidth = Math.max(2, rad * 0.07);
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.stroke();
}

function eye(ctx: CanvasRenderingContext2D, e: Entity, x: number, y: number, s: number, time: number) {
  const blink = Math.sin(time * 0.8 + e.seed) > 0.97;
  if (blink) {
    ctx.strokeStyle = e.bp.ink;
    ctx.lineWidth = Math.max(1.5, s * 0.4);
    ctx.beginPath();
    ctx.moveTo(x - s, y);
    ctx.lineTo(x + s, y);
    ctx.stroke();
    return;
  }
  ctx.fillStyle = "#f7f3ea";
  ctx.beginPath();
  ctx.ellipse(x, y, s, s * 1.05, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = e.bp.ink;
  ctx.beginPath();
  ctx.arc(x + s * 0.18, y + (e.foes.length ? s * 0.05 : 0), s * 0.42, 0, Math.PI * 2);
  ctx.fill();
  if (e.foes.length) {
    ctx.strokeStyle = e.bp.ink;
    ctx.lineWidth = Math.max(1.4, s * 0.35);
    ctx.beginPath();
    ctx.moveTo(x - s, y - s * 0.8);
    ctx.lineTo(x + s * 0.8, y - s * 0.35);
    ctx.stroke();
  }
}

function drawDragon(ctx: CanvasRenderingContext2D, e: Entity, time: number) {
  const r = e.bp.radius;
  const flap = Math.sin(time * 7 + e.seed) * 0.6;
  ctx.fillStyle = fillOf(ctx, e, r);
  ctx.beginPath();
  ctx.ellipse(-r * 0.1, r * 0.05, r * 0.85, r * 0.48, 0, 0, Math.PI * 2);
  ctx.fill();
  ink(ctx, e, r);
  ctx.beginPath();
  ctx.moveTo(-r * 0.7, r * 0.1);
  ctx.quadraticCurveTo(-r * 1.35, r * 0.4, -r * 1.15, -r * 0.15 + Math.sin(time * 6) * 6);
  ctx.stroke();
  ctx.fillStyle = fillOf(ctx, e, r);
  ctx.beginPath();
  ctx.ellipse(r * 0.15, -r * 0.55, r * 0.55, r * 0.22, -0.5, 0, Math.PI * 2);
  ctx.fill();
  ink(ctx, e, r);
  ctx.beginPath();
  ctx.ellipse(r * 0.72, -r * 0.72, r * 0.38, r * 0.28, 0, 0, Math.PI * 2);
  ctx.fill();
  ink(ctx, e, r);
  ctx.fillStyle = e.bp.ink;
  ctx.beginPath();
  ctx.moveTo(r * 0.95, -r * 0.78);
  ctx.lineTo(r * 1.25, -r * 0.62);
  ctx.lineTo(r * 0.9, -r * 0.58);
  ctx.fill();
  eye(ctx, e, r * 0.78, -r * 0.78, r * 0.1, time);
  ctx.strokeStyle = e.bp.accent;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(r * 0.55, -r * 0.95);
  ctx.lineTo(r * 0.4, -r * 1.25);
  ctx.stroke();
  ctx.fillStyle = fillOf(ctx, e, r);
  wing(-r * 0.15, -r * 0.1, -0.9 + flap);
  wing(r * 0.05, -r * 0.15, -0.4 + flap);
  ctx.fillStyle = e.bp.accent;
  for (let i = 0; i < 3; i++) {
    ctx.globalAlpha = 0.35;
    ctx.beginPath();
    ctx.arc(-r * 0.2 + i * r * 0.22, r * 0.12, r * 0.08, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
  if (e.bp.element === "fire" && !e.flash) {
    ctx.fillStyle = e.bp.glow;
    ctx.beginPath();
    ctx.ellipse(r * 1.15, -r * 0.62, r * 0.12, r * 0.08 + Math.sin(time * 16) * 2, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  function wing(x: number, y: number, rot: number) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(-r * 0.2, -r * 0.85, -r * 0.95, -r * 0.35);
    ctx.quadraticCurveTo(-r * 0.4, -r * 0.1, 0, 0);
    ctx.fill();
    ink(ctx, e, r);
    ctx.restore();
  }
}

function drawBeast(ctx: CanvasRenderingContext2D, e: Entity, time: number) {
  const r = e.bp.radius;
  const preset = BEAST[e.bp.variant] ?? BEAST.wolf ?? [0.75, 1, 1, 1, 1, 0.35];
  const [ear, snout, tail, bulk, leg, neck] = preset;
  const walk = Math.sin(time * 11 + e.seed) * Math.min(1, Math.abs(e.vx) / 90);
  ctx.strokeStyle = e.flash > 0.04 ? "#fffaf3" : e.bp.ink;
  ctx.lineWidth = Math.max(2, r * 0.07);
  ctx.lineCap = "round";
  if (tail > 0.05) {
    ctx.beginPath();
    ctx.moveTo(-r * 0.75, r * 0.05);
    ctx.quadraticCurveTo(-r * (1.1 + tail * 0.3), -r * 0.35 * tail, -r * (0.9 + tail * 0.45), -r * 0.05 + Math.sin(time * 6) * 5);
    ctx.stroke();
  }
  ctx.fillStyle = fillOf(ctx, e, r);
  ctx.beginPath();
  ctx.ellipse(0, r * 0.08, r * 0.78 * bulk, r * 0.48 * bulk, 0, 0, Math.PI * 2);
  ctx.fill();
  ink(ctx, e, r);
  const hx = r * (0.62 + neck * 0.35);
  const hy = -r * (0.12 + neck * 0.55);
  ctx.beginPath();
  ctx.moveTo(r * 0.2, r * 0.05);
  ctx.quadraticCurveTo(hx * 0.6, hy, hx, hy);
  ctx.stroke();
  ctx.fillStyle = fillOf(ctx, e, r);
  ctx.beginPath();
  ctx.ellipse(hx, hy, r * (0.34 + snout * 0.06), r * 0.3, 0, 0, Math.PI * 2);
  ctx.fill();
  ink(ctx, e, r);
  if (ear > 1.5) {
    ctx.beginPath();
    ctx.ellipse(hx - r * 0.08, hy - r * 0.55, r * 0.1, r * 0.38, -0.1, 0, Math.PI * 2);
    ctx.fill();
    ink(ctx, e, r);
    ctx.beginPath();
    ctx.ellipse(hx + r * 0.16, hy - r * 0.52, r * 0.1, r * 0.34, 0.15, 0, Math.PI * 2);
    ctx.fill();
    ink(ctx, e, r);
  } else if (ear > 0.05) {
    ctx.beginPath();
    ctx.moveTo(hx - r * 0.18, hy - r * 0.12);
    ctx.lineTo(hx - r * 0.28, hy - r * (0.28 + ear * 0.28));
    ctx.lineTo(hx - r * 0.02, hy - r * 0.16);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(hx + r * 0.05, hy - r * 0.2);
    ctx.lineTo(hx + r * 0.12, hy - r * (0.34 + ear * 0.26));
    ctx.lineTo(hx + r * 0.24, hy - r * 0.12);
    ctx.fill();
  }
  ctx.beginPath();
  ctx.ellipse(hx + r * 0.28 * snout, hy + r * 0.06, r * 0.16 * Math.max(0.4, snout), r * 0.1, 0, 0, Math.PI * 2);
  ctx.fill();
  eye(ctx, e, hx + r * 0.08, hy - r * 0.04, r * 0.075, time);
  for (let i = 0; i < 4; i++) {
    const lx = -r * 0.4 + i * r * 0.28;
    const swing = (i % 2 === 0 ? walk : -walk) * r * 0.18;
    ctx.beginPath();
    ctx.moveTo(lx, r * 0.28);
    ctx.lineTo(lx + swing, r * (0.55 + leg * 0.35));
    ctx.stroke();
  }
  if (e.bp.variant === "dino") {
    ctx.beginPath();
    ctx.moveTo(r * 0.15, r * 0.15);
    ctx.lineTo(r * 0.45, r * 0.28);
    ctx.moveTo(r * 0.3, r * 0.12);
    ctx.lineTo(r * 0.55, r * 0.22);
    ctx.stroke();
  }
  if (e.bp.variant === "horse" && e.bp.element === "light") {
    ctx.strokeStyle = e.bp.accent;
    ctx.beginPath();
    ctx.moveTo(hx + r * 0.1, hy - r * 0.28);
    ctx.lineTo(hx + r * 0.02, hy - r * 0.7);
    ctx.stroke();
  }
}

function drawBird(ctx: CanvasRenderingContext2D, e: Entity, time: number) {
  const r = e.bp.radius;
  const flap = Math.sin(time * (e.bp.flies ? 10 : 4) + e.seed);
  ctx.fillStyle = fillOf(ctx, e, r);
  ctx.beginPath();
  ctx.ellipse(0, 0, r * 0.62, r * 0.4, 0, 0, Math.PI * 2);
  ctx.fill();
  ink(ctx, e, r);
  ctx.save();
  ctx.rotate(flap * 0.45);
  ctx.beginPath();
  ctx.ellipse(-r * 0.1, -r * 0.05, r * 0.78, r * 0.22, -0.4, 0, Math.PI * 2);
  ctx.fill();
  ink(ctx, e, r);
  ctx.restore();
  ctx.beginPath();
  ctx.ellipse(r * 0.55, -r * 0.18, r * 0.28, r * 0.24, 0, 0, Math.PI * 2);
  ctx.fill();
  ink(ctx, e, r);
  ctx.fillStyle = e.bp.element === "fire" ? e.bp.glow : e.bp.accent;
  ctx.beginPath();
  ctx.moveTo(r * 0.78, -r * 0.12);
  ctx.lineTo(r * 1.12, -r * 0.02);
  ctx.lineTo(r * 0.78, r * 0.08);
  ctx.fill();
  eye(ctx, e, r * 0.62, -r * 0.24, r * 0.07, time);
  ctx.strokeStyle = e.bp.ink;
  ctx.beginPath();
  ctx.moveTo(-r * 0.45, 0);
  ctx.quadraticCurveTo(-r * 0.8, -r * 0.2, -r * 0.95, r * 0.05 + flap * 4);
  ctx.stroke();
}

function drawFish(ctx: CanvasRenderingContext2D, e: Entity, time: number) {
  const r = e.bp.radius;
  const wag = Math.sin(time * 6 + e.seed) * 6;
  ctx.fillStyle = fillOf(ctx, e, r);
  ctx.beginPath();
  ctx.ellipse(0, 0, r * 0.85, r * 0.42, 0, 0, Math.PI * 2);
  ctx.fill();
  ink(ctx, e, r);
  ctx.beginPath();
  ctx.moveTo(-r * 0.7, 0);
  ctx.lineTo(-r * 1.15, -r * 0.32 + wag);
  ctx.lineTo(-r * 1.15, r * 0.32 + wag);
  ctx.closePath();
  ctx.fill();
  ink(ctx, e, r);
  eye(ctx, e, r * 0.45, -r * 0.08, r * 0.08, time);
}

function drawSerpent(ctx: CanvasRenderingContext2D, e: Entity, time: number) {
  const r = e.bp.radius;
  ctx.fillStyle = fillOf(ctx, e, r);
  for (let i = 6; i >= 0; i--) {
    const x = -r * 0.95 + i * r * 0.28;
    const y = Math.sin(time * 5 + i + e.seed) * r * 0.18;
    ctx.beginPath();
    ctx.arc(x, y, r * (0.22 + i * 0.015), 0, Math.PI * 2);
    ctx.fill();
    ink(ctx, e, r);
  }
  eye(ctx, e, r * 0.82, -r * 0.05, r * 0.07, time);
}

function drawBug(ctx: CanvasRenderingContext2D, e: Entity, time: number) {
  const r = e.bp.radius;
  ctx.fillStyle = fillOf(ctx, e, r);
  ctx.beginPath();
  ctx.ellipse(-r * 0.15, r * 0.05, r * 0.48, r * 0.36, 0, 0, Math.PI * 2);
  ctx.fill();
  ink(ctx, e, r);
  ctx.beginPath();
  ctx.arc(r * 0.4, -r * 0.05, r * 0.28, 0, Math.PI * 2);
  ctx.fill();
  ink(ctx, e, r);
  if (e.bp.flies) {
    ctx.globalAlpha = 0.45;
    ctx.beginPath();
    ctx.ellipse(0, -r * 0.25, r * 0.55, r * 0.22, Math.sin(time * 18) * 0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
  ctx.strokeStyle = e.bp.ink;
  ctx.lineWidth = 2;
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    ctx.moveTo(-r * 0.1 + i * r * 0.12, r * 0.2);
    ctx.lineTo(-r * 0.35 + i * r * 0.22, r * 0.55);
    ctx.stroke();
  }
  eye(ctx, e, r * 0.48, -r * 0.08, r * 0.06, time);
}

function drawPerson(ctx: CanvasRenderingContext2D, e: Entity, time: number) {
  const r = e.bp.radius;
  const v = e.bp.variant;
  if (v === "skeleton") {
    drawSkeleton(ctx, e, time);
    return;
  }
  const walk = Math.sin(time * 10 + e.seed) * Math.min(1, Math.abs(e.vx) / 80);
  ctx.strokeStyle = e.flash > 0.04 ? "#fffaf3" : e.bp.ink;
  ctx.lineWidth = Math.max(2, r * 0.08);
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(-r * 0.12, r * 0.15);
  ctx.lineTo(-r * 0.22 + walk * r * 0.2, r * 0.72);
  ctx.moveTo(r * 0.12, r * 0.15);
  ctx.lineTo(r * 0.22 - walk * r * 0.2, r * 0.72);
  ctx.stroke();
  ctx.fillStyle = fillOf(ctx, e, r);
  ctx.beginPath();
  ctx.roundRect(-r * 0.32, -r * 0.35, r * 0.64, r * 0.62, r * 0.16);
  ctx.fill();
  ink(ctx, e, r);
  ctx.beginPath();
  ctx.moveTo(-r * 0.28, -r * 0.1);
  ctx.lineTo(-r * 0.62, r * 0.18 + walk * r * 0.15);
  ctx.moveTo(r * 0.28, -r * 0.05);
  ctx.lineTo(r * 0.62, r * 0.2 - walk * r * 0.12);
  ctx.stroke();
  ctx.fillStyle = fillOf(ctx, e, r);
  ctx.beginPath();
  ctx.arc(0, -r * 0.58, r * 0.3, 0, Math.PI * 2);
  ctx.fill();
  ink(ctx, e, r);
  if (v === "robot") {
    ctx.fillStyle = e.bp.ink;
    ctx.fillRect(-r * 0.16, -r * 0.66, r * 0.32, r * 0.08);
    ctx.beginPath();
    ctx.moveTo(0, -r * 0.88);
    ctx.lineTo(0, -r * 1.05);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, -r * 1.08, r * 0.05, 0, Math.PI * 2);
    ctx.fill();
  } else if (v === "knight" || v === "samurai") {
    ctx.fillStyle = e.bp.accent;
    ctx.fillRect(-r * 0.28, -r * 0.78, r * 0.56, r * 0.18);
  } else if (v === "mage") {
    ctx.beginPath();
    ctx.moveTo(-r * 0.28, -r * 0.78);
    ctx.lineTo(0, -r * 1.35);
    ctx.lineTo(r * 0.28, -r * 0.78);
    ctx.fill();
  } else if (v === "ninja") {
    ctx.fillStyle = e.bp.ink;
    ctx.fillRect(-r * 0.28, -r * 0.52, r * 0.56, r * 0.16);
  } else if (v === "royal") {
    ctx.fillStyle = e.bp.glow;
    for (let i = -1; i <= 1; i++) {
      ctx.beginPath();
      ctx.moveTo(i * r * 0.16 - r * 0.07, -r * 0.82);
      ctx.lineTo(i * r * 0.16, -r * 1.05);
      ctx.lineTo(i * r * 0.16 + r * 0.07, -r * 0.82);
      ctx.fill();
    }
  } else if (v === "angel") {
    ctx.strokeStyle = e.bp.accent;
    ctx.beginPath();
    ctx.ellipse(0, -r * 0.98, r * 0.18, r * 0.06, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = fillOf(ctx, e, r);
    ctx.globalAlpha = 0.85;
    ctx.beginPath();
    ctx.ellipse(-r * 0.45, -r * 0.15, r * 0.4, r * 0.18, -0.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  } else if (v === "demon") {
    ctx.fillStyle = e.bp.ink;
    ctx.beginPath();
    ctx.moveTo(-r * 0.16, -r * 0.78);
    ctx.lineTo(-r * 0.28, -r * 1.12);
    ctx.lineTo(-r * 0.02, -r * 0.78);
    ctx.moveTo(r * 0.16, -r * 0.78);
    ctx.lineTo(r * 0.28, -r * 1.12);
    ctx.lineTo(r * 0.02, -r * 0.78);
    ctx.fill();
  } else if (v === "alien") {
    eye(ctx, e, -r * 0.1, -r * 0.6, r * 0.1, time);
    eye(ctx, e, r * 0.12, -r * 0.6, r * 0.1, time);
  }
  if (v !== "alien" && v !== "ninja") {
    eye(ctx, e, r * 0.1, -r * 0.6, r * 0.07, time);
  } else if (v === "ninja") {
    eye(ctx, e, r * 0.1, -r * 0.64, r * 0.055, time);
  }
  if (v === "knight") {
    ctx.fillStyle = e.bp.accent;
    ctx.beginPath();
    ctx.moveTo(r * 0.45, -r * 0.05);
    ctx.lineTo(r * 0.78, r * 0.05);
    ctx.lineTo(r * 0.7, r * 0.42);
    ctx.lineTo(r * 0.4, r * 0.32);
    ctx.fill();
    ink(ctx, e, r);
  }
  if (e.bp.ranged && v !== "mage") {
    ctx.strokeStyle = e.bp.ink;
    ctx.beginPath();
    ctx.moveTo(r * 0.4, -r * 0.05);
    ctx.lineTo(r * 0.95, -r * 0.2);
    ctx.stroke();
  }
  if (v === "mage") {
    ctx.strokeStyle = e.bp.ink;
    ctx.beginPath();
    ctx.moveTo(r * 0.45, -r * 0.2);
    ctx.lineTo(r * 0.7, r * 0.55);
    ctx.stroke();
    ctx.fillStyle = e.bp.glow;
    ctx.beginPath();
    ctx.arc(r * 0.48, -r * 0.28, r * 0.08, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawSkeleton(ctx: CanvasRenderingContext2D, e: Entity, time: number) {
  const r = e.bp.radius;
  const walk = Math.sin(time * 10) * Math.min(1, Math.abs(e.vx) / 80);
  ctx.strokeStyle = e.flash > 0.04 ? "#fffaf3" : e.bp.accent;
  ctx.lineWidth = Math.max(2, r * 0.07);
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.arc(0, -r * 0.55, r * 0.26, 0, Math.PI * 2);
  ctx.moveTo(0, -r * 0.3);
  ctx.lineTo(0, r * 0.25);
  ctx.moveTo(0, -r * 0.1);
  ctx.lineTo(-r * 0.4, r * 0.15);
  ctx.moveTo(0, -r * 0.1);
  ctx.lineTo(r * 0.4, r * 0.1);
  ctx.moveTo(0, r * 0.25);
  ctx.lineTo(-r * 0.2 + walk * r * 0.15, r * 0.75);
  ctx.moveTo(0, r * 0.25);
  ctx.lineTo(r * 0.2 - walk * r * 0.15, r * 0.75);
  ctx.stroke();
  eye(ctx, e, r * 0.08, -r * 0.58, r * 0.05, time);
}

function drawBlade(ctx: CanvasRenderingContext2D, e: Entity, time: number) {
  const r = e.bp.radius;
  const v = e.bp.variant;
  ctx.save();
  ctx.rotate(-0.7);
  if (v === "gun") {
    ctx.fillStyle = e.flash > 0.04 ? "#fffaf3" : e.bp.ink;
    ctx.fillRect(-r * 0.2, -r * 0.12, r * 0.9, r * 0.24);
    ctx.fillRect(-r * 0.15, 0, r * 0.18, r * 0.45);
    ctx.fillStyle = e.bp.glow;
    ctx.fillRect(r * 0.62, -r * 0.06, r * 0.16, r * 0.1);
  } else if (v === "axe" || v === "hammer") {
    ctx.strokeStyle = e.bp.ink;
    ctx.lineWidth = r * 0.1;
    ctx.beginPath();
    ctx.moveTo(-r * 0.1, r * 0.7);
    ctx.lineTo(r * 0.15, -r * 0.45);
    ctx.stroke();
    ctx.fillStyle = fillOf(ctx, e, r);
    ctx.beginPath();
    ctx.ellipse(r * 0.15, -r * 0.55, r * 0.42, r * 0.28, 0, 0, Math.PI * 2);
    ctx.fill();
    ink(ctx, e, r);
  } else if (v === "torch") {
    ctx.strokeStyle = e.bp.ink;
    ctx.lineWidth = r * 0.12;
    ctx.beginPath();
    ctx.moveTo(0, r * 0.7);
    ctx.lineTo(0, -r * 0.2);
    ctx.stroke();
    ctx.fillStyle = e.bp.glow;
    ctx.beginPath();
    ctx.ellipse(0, -r * 0.45, r * 0.18, r * (0.32 + Math.sin(time * 14) * 0.06), 0, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.fillStyle = e.flash > 0.04 ? "#fffaf3" : e.bp.accent;
    ctx.beginPath();
    ctx.moveTo(0, -r);
    ctx.lineTo(r * 0.16, -r * 0.15);
    ctx.lineTo(0, r * 0.05);
    ctx.lineTo(-r * 0.16, -r * 0.15);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = e.bp.ink;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = e.bp.ink;
    ctx.fillRect(-r * 0.28, 0, r * 0.56, r * 0.16);
    ctx.fillRect(-r * 0.08, r * 0.16, r * 0.16, r * 0.42);
  }
  ctx.restore();
}

function drawBomb(ctx: CanvasRenderingContext2D, e: Entity, time: number) {
  const r = e.bp.radius;
  ctx.fillStyle = fillOf(ctx, e, r);
  ctx.beginPath();
  ctx.arc(0, r * 0.05, r * 0.72, 0, Math.PI * 2);
  ctx.fill();
  ink(ctx, e, r);
  ctx.strokeStyle = e.bp.ink;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(r * 0.15, -r * 0.55);
  ctx.quadraticCurveTo(r * 0.45, -r * 0.9, r * 0.2, -r * 1.05);
  ctx.stroke();
  ctx.fillStyle = e.bp.glow;
  const spark = 0.5 + Math.sin(time * 18) * 0.5;
  ctx.globalAlpha = 0.6 + spark * 0.4;
  ctx.beginPath();
  ctx.arc(r * 0.2, -r * 1.05, r * 0.1, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
  eye(ctx, e, r * 0.18, r * 0.02, r * 0.08, time);
}

function drawShield(ctx: CanvasRenderingContext2D, e: Entity) {
  const r = e.bp.radius;
  ctx.fillStyle = fillOf(ctx, e, r);
  ctx.beginPath();
  ctx.moveTo(0, -r * 0.95);
  ctx.lineTo(r * 0.75, -r * 0.45);
  ctx.quadraticCurveTo(r * 0.85, r * 0.45, 0, r * 0.95);
  ctx.quadraticCurveTo(-r * 0.85, r * 0.45, -r * 0.75, -r * 0.45);
  ctx.closePath();
  ctx.fill();
  ink(ctx, e, r);
  ctx.strokeStyle = e.bp.accent;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(0, -r * 0.4);
  ctx.lineTo(0, r * 0.45);
  ctx.moveTo(-r * 0.28, 0);
  ctx.lineTo(r * 0.28, 0);
  ctx.stroke();
}

function drawHeart(ctx: CanvasRenderingContext2D, e: Entity, time: number) {
  const r = e.bp.radius * (1 + Math.sin(time * 4 + e.seed) * 0.04);
  ctx.fillStyle = fillOf(ctx, e, r);
  ctx.beginPath();
  ctx.moveTo(0, r * 0.75);
  ctx.bezierCurveTo(-r * 1.1, r * 0.15, -r * 0.85, -r * 0.75, 0, -r * 0.3);
  ctx.bezierCurveTo(r * 0.85, -r * 0.75, r * 1.1, r * 0.15, 0, r * 0.75);
  ctx.fill();
  ink(ctx, e, r);
  eye(ctx, e, -r * 0.18, -r * 0.05, r * 0.08, time);
  eye(ctx, e, r * 0.2, -r * 0.05, r * 0.08, time);
}

function drawTree(ctx: CanvasRenderingContext2D, e: Entity, time: number) {
  const r = e.bp.radius;
  ctx.fillStyle = "#6b4a2e";
  ctx.fillRect(-r * 0.12, r * 0.05, r * 0.24, r * 0.7);
  ctx.fillStyle = fillOf(ctx, e, r);
  if (e.bp.variant === "flower") {
    ctx.beginPath();
    ctx.arc(0, -r * 0.25, r * 0.38, 0, Math.PI * 2);
    ctx.fill();
    ink(ctx, e, r);
    ctx.fillStyle = e.bp.glow;
    ctx.beginPath();
    ctx.arc(0, -r * 0.25, r * 0.14, 0, Math.PI * 2);
    ctx.fill();
  } else if (e.bp.variant === "pine") {
    ctx.beginPath();
    ctx.moveTo(0, -r * 1.05);
    ctx.lineTo(r * 0.55, r * 0.15);
    ctx.lineTo(-r * 0.55, r * 0.15);
    ctx.closePath();
    ctx.fill();
    ink(ctx, e, r);
  } else if (e.bp.variant === "cactus") {
    ctx.fillRect(-r * 0.18, -r * 0.8, r * 0.36, r * 1.35);
    ctx.fillRect(-r * 0.55, -r * 0.2, r * 0.4, r * 0.16);
    ctx.fillRect(r * 0.15, -r * 0.45, r * 0.4, r * 0.16);
  } else {
    ctx.beginPath();
    ctx.arc(0, -r * 0.25, r * 0.55, 0, Math.PI * 2);
    ctx.arc(-r * 0.38, -r * 0.05, r * 0.38, 0, Math.PI * 2);
    ctx.arc(r * 0.4, -r * 0.02, r * 0.36, 0, Math.PI * 2);
    ctx.fill();
    ink(ctx, e, r);
    eye(ctx, e, r * 0.08, -r * 0.28, r * 0.07, time);
  }
}

function drawCastle(ctx: CanvasRenderingContext2D, e: Entity, time: number) {
  const r = e.bp.radius;
  const v = e.bp.variant;
  ctx.fillStyle = fillOf(ctx, e, r);
  if (v === "mountain") {
    ctx.beginPath();
    ctx.moveTo(0, -r);
    ctx.lineTo(r * 0.95, r * 0.75);
    ctx.lineTo(-r * 0.95, r * 0.75);
    ctx.closePath();
    ctx.fill();
    ink(ctx, e, r);
    return;
  }
  if (v === "tower") {
    ctx.fillRect(-r * 0.28, -r * 0.95, r * 0.56, r * 1.7);
    ctx.fillRect(-r * 0.4, -r * 1.05, r * 0.8, r * 0.16);
  } else if (v === "wall") {
    ctx.fillRect(-r, -r * 0.35, r * 2, r * 1.05);
  } else if (v === "house") {
    ctx.fillRect(-r * 0.7, -r * 0.15, r * 1.4, r * 0.9);
    ctx.beginPath();
    ctx.moveTo(-r * 0.9, -r * 0.15);
    ctx.lineTo(0, -r * 0.85);
    ctx.lineTo(r * 0.9, -r * 0.15);
    ctx.fill();
  } else {
    ctx.fillRect(-r * 0.75, -r * 0.25, r * 1.5, r * 1);
    for (let i = 0; i < 4; i++) ctx.fillRect(-r * 0.75 + i * r * 0.4, -r * 0.5, r * 0.22, r * 0.28);
    const wave = Math.sin(time * 4) * 0.4;
    ctx.strokeStyle = e.bp.glow;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(r * 0.15, -r * 0.55);
    ctx.lineTo(r * 0.15, -r * 0.95);
    ctx.lineTo(r * 0.55, -r * 0.8 + wave * 6);
    ctx.stroke();
  }
  ink(ctx, e, r);
  ctx.fillStyle = "#1a120c";
  ctx.fillRect(-r * 0.16, r * 0.15, r * 0.32, r * 0.45);
  eye(ctx, e, -r * 0.28, -r * 0.02, r * 0.07, time);
  eye(ctx, e, r * 0.28, -r * 0.02, r * 0.07, time);
}

function drawVehicle(ctx: CanvasRenderingContext2D, e: Entity, time: number) {
  const r = e.bp.radius;
  const v = e.bp.variant;
  ctx.fillStyle = fillOf(ctx, e, r);
  if (v === "plane" || v === "rocket") {
    ctx.beginPath();
    ctx.ellipse(0, 0, r * 0.95, r * 0.28, 0, 0, Math.PI * 2);
    ctx.fill();
    ink(ctx, e, r);
    ctx.beginPath();
    ctx.moveTo(-r * 0.1, 0);
    ctx.lineTo(-r * 0.2, -r * 0.65);
    ctx.lineTo(r * 0.25, 0);
    ctx.lineTo(-r * 0.2, r * 0.65);
    ctx.fill();
    if (v === "rocket") {
      ctx.fillStyle = e.bp.glow;
      ctx.beginPath();
      ctx.moveTo(-r * 0.95, -r * 0.12);
      ctx.lineTo(-r * 1.3 - Math.sin(time * 20) * 4, 0);
      ctx.lineTo(-r * 0.95, r * 0.12);
      ctx.fill();
    }
  } else if (v === "ufo") {
    ctx.beginPath();
    ctx.ellipse(0, r * 0.1, r * 0.9, r * 0.28, 0, 0, Math.PI * 2);
    ctx.fill();
    ink(ctx, e, r);
    ctx.beginPath();
    ctx.ellipse(0, -r * 0.15, r * 0.4, r * 0.32, 0, Math.PI, 0);
    ctx.fill();
    ink(ctx, e, r);
    eye(ctx, e, 0, -r * 0.1, r * 0.08, time);
  } else if (v === "ship") {
    ctx.beginPath();
    ctx.moveTo(-r, r * 0.15);
    ctx.quadraticCurveTo(0, r * 0.85, r, r * 0.15);
    ctx.lineTo(r * 0.7, -r * 0.05);
    ctx.lineTo(-r * 0.7, -r * 0.05);
    ctx.fill();
    ink(ctx, e, r);
    ctx.fillRect(-r * 0.08, -r * 0.7, r * 0.1, r * 0.65);
  } else if (v === "tank") {
    ctx.fillRect(-r * 0.9, -r * 0.05, r * 1.7, r * 0.5);
    ctx.fillRect(-r * 0.2, -r * 0.4, r * 0.7, r * 0.4);
    ctx.fillRect(r * 0.4, -r * 0.28, r * 0.7, r * 0.12);
    ink(ctx, e, r);
  } else {
    ctx.beginPath();
    ctx.roundRect(-r * 0.9, -r * 0.28, r * 1.7, r * 0.55, r * 0.12);
    ctx.fill();
    ink(ctx, e, r);
    ctx.fillStyle = "#9fd6f2";
    ctx.fillRect(r * 0.15, -r * 0.18, r * 0.42, r * 0.22);
    const spin = time * e.vx * 0.02;
    for (const wx of [-r * 0.5, r * 0.5]) {
      ctx.save();
      ctx.translate(wx, r * 0.32);
      ctx.rotate(spin);
      ctx.fillStyle = e.bp.ink;
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.22, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = e.bp.accent;
      ctx.beginPath();
      ctx.moveTo(-r * 0.16, 0);
      ctx.lineTo(r * 0.16, 0);
      ctx.stroke();
      ctx.restore();
    }
    if (v === "heli") {
      ctx.strokeStyle = e.bp.ink;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(-r * Math.cos(time * 16), -r * 0.55);
      ctx.lineTo(r * Math.cos(time * 16), -r * 0.55);
      ctx.stroke();
    }
  }
  if (v !== "ufo") eye(ctx, e, r * 0.15, -r * 0.05, r * 0.06, time);
}

function drawGem(ctx: CanvasRenderingContext2D, e: Entity, time: number) {
  const r = e.bp.radius;
  if (e.bp.shape === "star" || e.bp.variant === "sun" || e.bp.variant === "star" || e.bp.variant === "moon") {
    ctx.save();
    ctx.rotate(time * 0.4 + e.seed);
    ctx.fillStyle = fillOf(ctx, e, r);
    ctx.beginPath();
    const points = e.bp.variant === "sun" ? 10 : 5;
    for (let i = 0; i < points * 2; i++) {
      const a = (i / (points * 2)) * Math.PI * 2 - Math.PI / 2;
      const rad = i % 2 === 0 ? r * 0.9 : r * 0.4;
      const x = Math.cos(a) * rad;
      const y = Math.sin(a) * rad;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();
    ink(ctx, e, r);
    ctx.restore();
    eye(ctx, e, r * 0.08, 0, r * 0.08, time);
    return;
  }
  ctx.fillStyle = fillOf(ctx, e, r);
  ctx.beginPath();
  ctx.moveTo(0, -r * 0.95);
  ctx.lineTo(r * 0.72, -r * 0.25);
  ctx.lineTo(r * 0.5, r * 0.8);
  ctx.lineTo(-r * 0.5, r * 0.8);
  ctx.lineTo(-r * 0.72, -r * 0.25);
  ctx.closePath();
  ctx.fill();
  ink(ctx, e, r);
  ctx.strokeStyle = e.bp.accent;
  ctx.beginPath();
  ctx.moveTo(0, -r * 0.95);
  ctx.lineTo(0, r * 0.8);
  ctx.stroke();
  if (e.bp.magnet) {
    ctx.strokeStyle = e.bp.ink;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(0, r * 0.05, r * 0.28, Math.PI, 0);
    ctx.stroke();
  } else {
    eye(ctx, e, r * 0.05, 0, r * 0.07, time);
  }
}

function drawBlob(ctx: CanvasRenderingContext2D, e: Entity, time: number) {
  const r = e.bp.radius;
  ctx.fillStyle = fillOf(ctx, e, r);
  ctx.beginPath();
  const steps = 18;
  for (let i = 0; i <= steps; i++) {
    const a = (i / steps) * Math.PI * 2;
    const wob = 1 + Math.sin(time * 5 + i + e.seed) * 0.08;
    const x = Math.cos(a) * r * 0.78 * wob;
    const y = Math.sin(a) * r * 0.62 * wob + r * 0.08;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fill();
  ink(ctx, e, r);
  if (e.bp.variant === "food") {
    ctx.fillStyle = e.bp.glow;
    ctx.beginPath();
    ctx.ellipse(0, -r * 0.15, r * 0.35, r * 0.16, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  if (e.bp.variant === "shroom") {
    ctx.fillStyle = e.bp.ink;
    ctx.beginPath();
    ctx.arc(-r * 0.15, -r * 0.15, r * 0.08, 0, Math.PI * 2);
    ctx.arc(r * 0.18, -r * 0.02, r * 0.06, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = "rgba(255,255,255,0.35)";
  ctx.beginPath();
  ctx.ellipse(-r * 0.25, -r * 0.2, r * 0.16, r * 0.08, -0.6, 0, Math.PI * 2);
  ctx.fill();
  eye(ctx, e, -r * 0.16, r * 0.02, r * 0.08, time);
  eye(ctx, e, r * 0.2, r * 0.04, r * 0.08, time);
}

function drawPotion(ctx: CanvasRenderingContext2D, e: Entity) {
  const r = e.bp.radius;
  ctx.fillStyle = e.bp.ink;
  ctx.fillRect(-r * 0.12, -r * 0.95, r * 0.24, r * 0.22);
  ctx.fillStyle = fillOf(ctx, e, r);
  ctx.beginPath();
  ctx.moveTo(-r * 0.16, -r * 0.7);
  ctx.lineTo(-r * 0.48, r * 0.15);
  ctx.quadraticCurveTo(-r * 0.5, r * 0.8, 0, r * 0.8);
  ctx.quadraticCurveTo(r * 0.5, r * 0.8, r * 0.48, r * 0.15);
  ctx.lineTo(r * 0.16, -r * 0.7);
  ctx.closePath();
  ctx.fill();
  ink(ctx, e, r);
  ctx.fillStyle = "rgba(255,255,255,0.35)";
  ctx.fillRect(-r * 0.18, -r * 0.1, r * 0.08, r * 0.45);
}

function drawOrb(ctx: CanvasRenderingContext2D, e: Entity, time: number) {
  const r = e.bp.radius;
  ctx.fillStyle = fillOf(ctx, e, r);
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.78, 0, Math.PI * 2);
  ctx.fill();
  ink(ctx, e, r);
  ctx.save();
  ctx.rotate(time + e.seed);
  ctx.strokeStyle = e.bp.accent;
  ctx.globalAlpha = 0.8;
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.95, 0, Math.PI * 1.4);
  ctx.stroke();
  ctx.restore();
  ctx.globalAlpha = 1;
  for (let i = 0; i < 3; i++) {
    const a = time * 2 + (i * Math.PI * 2) / 3 + e.seed;
    ctx.fillStyle = e.bp.glow;
    ctx.beginPath();
    ctx.arc(Math.cos(a) * r * 0.95, Math.sin(a) * r * 0.95, r * 0.08, 0, Math.PI * 2);
    ctx.fill();
  }
  eye(ctx, e, r * 0.12, -r * 0.02, r * 0.1, time);
}

function label(ctx: CanvasRenderingContext2D, e: Entity, selected: boolean, pending: boolean, time: number) {
  const r = e.bp.radius;
  ctx.save();
  ctx.translate(e.x, e.y);
  if (selected || pending) {
    ctx.strokeStyle = "#e89a3c";
    ctx.lineWidth = pending ? 3 : 2;
    ctx.setLineDash([6, 6]);
    ctx.lineDashOffset = -time * 24;
    ctx.beginPath();
    ctx.arc(0, 0, r + 8, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
  }
  const name = e.name.length > 20 ? `${e.name.slice(0, 18)}…` : e.name;
  ctx.font = "600 13px Fraunces, Palatino, serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const w = ctx.measureText(name).width;
  const y = -r - 22;
  ctx.fillStyle = "rgba(14,17,24,0.78)";
  ctx.beginPath();
  ctx.roundRect(-w / 2 - 8, y - 10, w + 16, 20, 8);
  ctx.fill();
  ctx.fillStyle = "#f4efe6";
  ctx.fillText(name, 0, y);
  if (selected || e.hp < e.bp.hp - 0.5) {
    const bw = Math.max(28, r * 1.6);
    const pct = Math.max(0, e.hp / e.bp.hp);
    ctx.fillStyle = "rgba(14,17,24,0.7)";
    ctx.fillRect(-bw / 2, y + 14, bw, 4);
    ctx.fillStyle = "#e89a3c";
    ctx.fillRect(-bw / 2, y + 14, bw * pct, 4);
  }
  ctx.restore();
}
