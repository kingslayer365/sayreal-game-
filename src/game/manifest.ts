import { MULTIWORD, archetypeByKey, canonical, compoundPair, type Archetype } from "./lexicon";
import { NEUTRALS, PALETTE, type Blueprint, type Element, type Shape } from "./types";

const STOP = new Set(["the", "a", "an", "of", "my", "your", "their", "his", "her", "its", "to", "from", "into", "some"]);

const MOD_KEYS = new Set([
  "tiny",
  "small",
  "mini",
  "little",
  "huge",
  "giant",
  "mega",
  "colossal",
  "big",
  "large",
  "ancient",
  "elder",
  "baby",
  "fast",
  "swift",
  "quick",
  "slow",
  "heavy",
  "iron",
  "steel",
  "gold",
  "golden",
  "flaming",
  "fiery",
  "burning",
  "frozen",
  "icy",
  "electric",
  "shock",
  "dark",
  "holy",
  "toxic",
  "robotic",
  "cyber",
  "red",
  "crimson",
  "scarlet",
  "blue",
  "azure",
  "green",
  "white",
  "black",
  "purple",
  "violet",
  "pink",
]);

const ACRONYMS = new Set(["ufo", "tnt"]);

const SHAPES: Shape[] = ["beast", "bird", "blob", "person", "orb", "gem", "star", "bug", "fish", "serpent", "dragon"];
const ELEMENTS: Element[] = [
  "fire",
  "water",
  "earth",
  "air",
  "lightning",
  "ice",
  "shadow",
  "light",
  "poison",
  "metal",
  "nature",
  "void",
  "neutral",
];

export type SummonPlan =
  | { type: "single"; text: string }
  | { type: "link"; parts: string[] }
  | { type: "duel"; left: string[]; right: string[] };

export function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function titleCase(s: string): string {
  const small = new Set(["a", "an", "the", "of", "and", "or", "in", "on", "with", "vs"]);
  return s
    .trim()
    .replace(/\s+/g, " ")
    .split(" ")
    .map((w, i) => {
      const l = w.toLowerCase();
      if (ACRONYMS.has(l)) return l.toUpperCase();
      if (i > 0 && small.has(l)) return l;
      return l.charAt(0).toUpperCase() + l.slice(1);
    })
    .join(" ");
}

function portmanteau(a: string, b: string): string {
  const vowels = /[aeiouy]/i;
  let i = Math.max(2, Math.ceil(a.length * 0.5));
  for (let k = 1; k < a.length - 1; k++) {
    if (vowels.test(a[k] ?? "")) {
      i = k + 1;
      break;
    }
  }
  let j = Math.floor(b.length * 0.45);
  for (let k = 1; k < b.length; k++) {
    if (vowels.test(b[k] ?? "")) {
      j = k;
      break;
    }
  }
  let raw = a.slice(0, i) + b.slice(j);
  raw = raw.replace(/(.)\1{2,}/gi, "$1$1");
  if (raw.length < 3) raw = a + b;
  return raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase();
}

export function fuseTitle(a: string, b: string): string {
  const A = a.trim().replace(/\s+/g, " ");
  const B = b.trim().replace(/\s+/g, " ");
  const wa = A.split(" ");
  const wb = B.split(" ");
  if (wa.length === 1 && wb.length === 1 && A.length + B.length < 22) return portmanteau(wa[0] ?? A, wb[0] ?? B);
  const words = [...wa, wb[wb.length - 1] ?? ""].filter(
    (w, i, arr) => w && arr.findIndex((x) => x.toLowerCase() === w.toLowerCase()) === i,
  );
  return titleCase(words.slice(-3).join(" ")).slice(0, 28);
}

export function planSummon(raw: string): SummonPlan | null {
  const text = raw.trim().replace(/\s+/g, " ");
  if (!/[a-z0-9]/i.test(text) || text.length > 64) return null;
  const vs = text.split(/\s+(?:vs\.?|versus|against)\s+/i).map((s) => s.trim()).filter(Boolean);
  if (vs.length === 2) {
    const left = splitAnd(vs[0] ?? "");
    const right = splitAnd(vs[1] ?? "");
    if (left.length && right.length && left.length + right.length <= 4) return { type: "duel", left, right };
  }
  const parts = splitAnd(text);
  if (parts.length >= 2) return { type: "link", parts: parts.slice(0, 3) };
  return { type: "single", text };
}

function splitAnd(s: string): string[] {
  return s
    .split(/\s+(?:and|with|plus)\s+/i)
    .map((x) => x.trim())
    .filter((x) => /[a-z0-9]/i.test(x))
    .slice(0, 3);
}

function normalize(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/t-rex/g, "trex")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function blankFrom(base: Partial<Blueprint> & Pick<Blueprint, "name" | "seed">): Blueprint {
  return {
    name: base.name,
    shape: base.shape ?? "blob",
    variant: base.variant ?? "wild",
    element: base.element ?? "neutral",
    hp: base.hp ?? 80,
    atk: base.atk ?? 8,
    def: base.def ?? 2,
    spd: base.spd ?? 1,
    mass: base.mass ?? 8,
    radius: base.radius ?? 28,
    flies: base.flies ?? false,
    explodes: base.explodes ?? false,
    aura: base.aura ?? false,
    heals: base.heals ?? false,
    magnet: base.magnet ?? false,
    gravity: base.gravity ?? false,
    ranged: base.ranged ?? false,
    immovable: base.immovable ?? false,
    revive: base.revive ?? false,
    aggressive: base.aggressive ?? false,
    slowAura: base.slowAura ?? false,
    seed: base.seed,
    fill: "#d4a054",
    accent: "#fff0d0",
    ink: "#4a3414",
    glow: "#f0cc88",
  };
}

function fromArchetype(a: Archetype, name: string, seed: number): Blueprint {
  return blankFrom({
    name,
    seed,
    shape: a.shape,
    variant: a.variant,
    element: a.element,
    hp: a.hp,
    atk: a.atk,
    def: a.def,
    spd: a.spd,
    mass: a.mass,
    radius: a.radius,
    flies: a.flies,
    explodes: a.explodes,
    aura: a.aura,
    heals: a.heals,
    magnet: a.magnet,
    gravity: a.gravity,
    ranged: a.ranged,
    immovable: a.immovable,
    revive: a.revive,
    aggressive: a.aggressive,
    slowAura: a.slowAura,
  });
}

function paint(bp: Blueprint): Blueprint {
  if (bp.shape === "bomb") {
    return { ...bp, fill: "#2a303a", accent: "#e7edf4", ink: "#101318", glow: "#e89a3c" };
  }
  if (bp.variant === "food" && bp.element === "neutral") {
    return { ...bp, fill: "#e39a4a", accent: "#fff0d0", ink: "#5a3214", glow: "#ffd7a1" };
  }
  if (bp.variant === "robot" && bp.element === "neutral") {
    const p = PALETTE.metal;
    return { ...bp, ...p };
  }
  if (bp.element === "neutral") {
    const p = NEUTRALS[bp.seed % NEUTRALS.length] ?? NEUTRALS[0];
    return { ...bp, ...p };
  }
  const p = PALETTE[bp.element];
  return { ...bp, ...p };
}

function clampStats(bp: Blueprint): Blueprint {
  bp.hp = Math.round(Math.max(24, Math.min(520, bp.hp)));
  bp.atk = Math.round(Math.max(1, Math.min(64, bp.atk)));
  bp.def = Math.round(Math.max(0, Math.min(40, bp.def)));
  bp.radius = Math.max(14, Math.min(90, bp.radius));
  bp.mass = Math.max(1, Math.min(280, bp.mass));
  bp.spd = Math.max(0.25, Math.min(2.2, bp.spd));
  if (bp.flies) bp.immovable = false;
  return bp;
}

function applyMod(bp: Blueprint, token: string) {
  const k = canonical(token);
  const color: Partial<Record<string, Element>> = {
    red: "fire",
    crimson: "fire",
    scarlet: "fire",
    blue: "water",
    azure: "water",
    green: "nature",
    white: "light",
    black: "shadow",
    purple: "void",
    violet: "void",
    pink: "light",
  };
  const tint = color[k];
  if (tint) bp.element = tint;
  switch (k) {
    case "tiny":
    case "small":
    case "mini":
    case "little":
      bp.radius *= 0.64;
      bp.hp *= 0.68;
      bp.mass *= 0.5;
      bp.atk *= 0.78;
      break;
    case "huge":
    case "giant":
    case "mega":
    case "colossal":
    case "big":
    case "large":
      bp.radius *= 1.42;
      bp.hp *= 1.65;
      bp.mass *= 2;
      bp.atk *= 1.18;
      break;
    case "baby":
      bp.radius *= 0.58;
      bp.hp *= 0.5;
      bp.atk *= 0.5;
      bp.mass *= 0.4;
      bp.spd *= 1.08;
      break;
    case "ancient":
    case "elder":
      bp.hp *= 1.4;
      bp.atk *= 1.15;
      bp.def *= 1.1;
      break;
    case "fast":
    case "swift":
    case "quick":
      bp.spd *= 1.5;
      break;
    case "slow":
      bp.spd *= 0.62;
      break;
    case "heavy":
      bp.mass *= 1.9;
      bp.spd *= 0.72;
      bp.hp *= 1.12;
      break;
    case "iron":
    case "steel":
      bp.element = "metal";
      bp.def *= 1.5;
      bp.hp *= 1.18;
      break;
    case "gold":
    case "golden":
      bp.element = "light";
      bp.hp *= 1.12;
      break;
    case "flaming":
    case "fiery":
    case "burning":
      bp.element = "fire";
      bp.aura = true;
      break;
    case "frozen":
    case "icy":
      bp.element = "ice";
      break;
    case "electric":
    case "shock":
      bp.element = "lightning";
      bp.ranged = true;
      break;
    case "dark":
      bp.element = "shadow";
      break;
    case "holy":
      bp.element = "light";
      bp.heals = true;
      break;
    case "toxic":
      bp.element = "poison";
      bp.aura = true;
      break;
    case "robotic":
    case "cyber":
      if (bp.element === "neutral") bp.element = "metal";
      bp.def *= 1.2;
      if (bp.shape === "person" || bp.shape === "vehicle") bp.variant = "robot";
      break;
    default:
      break;
  }
}

function procedural(raw: string, name: string, seed: number): Blueprint {
  const h = hashString(raw) ^ seed;
  const shape = SHAPES[h % SHAPES.length] ?? "beast";
  const element = ELEMENTS[(h >>> 5) % ELEMENTS.length] ?? "neutral";
  const len = Math.min(24, raw.length);
  return blankFrom({
    name,
    seed: h,
    shape,
    variant: "wild",
    element,
    hp: 70 + (h % 80) + len * 2,
    atk: 8 + ((h >>> 8) % 14),
    def: (h >>> 16) % 8,
    spd: 0.75 + ((h >>> 20) % 70) / 100,
    mass: 6 + (h % 10),
    radius: 26 + (h % 16) + (len > 16 ? 6 : 0),
    flies: shape === "bird" || shape === "dragon" || (h & 15) === 0,
    aggressive: (h & 3) === 0,
    ranged: shape === "orb" && (h & 7) === 1,
  });
}

function fold(matches: Archetype[], name: string, seed: number): Blueprint {
  const body = matches[matches.length - 1];
  if (!body) return procedural(name, name, seed);
  const bp = fromArchetype(body, name, seed);
  for (let i = 0; i < matches.length - 1; i++) {
    const m = matches[i];
    if (!m) continue;
    if (m.element !== "neutral") bp.element = m.element;
    bp.aura = bp.aura || m.aura;
    bp.heals = bp.heals || m.heals;
    bp.ranged = bp.ranged || m.ranged;
    bp.magnet = bp.magnet || m.magnet;
    bp.gravity = bp.gravity || m.gravity;
    bp.revive = bp.revive || m.revive;
    bp.explodes = bp.explodes || m.explodes;
    bp.aggressive = bp.aggressive || m.aggressive;
    bp.slowAura = bp.slowAura || m.slowAura;
    bp.flies = bp.flies || m.flies;
    bp.hp += m.hp * 0.18;
    bp.atk = Math.max(bp.atk, m.atk * 0.85);
    bp.def = Math.max(bp.def, m.def);
  }
  return bp;
}

export function manifest(raw: string, salt = 0): Blueprint | null {
  const trimmed = raw.trim().replace(/\s+/g, " ");
  if (!/[a-z0-9]/i.test(trimmed)) return null;
  const name = titleCase(trimmed).slice(0, 40);
  const seed = hashString(trimmed.toLowerCase()) ^ (salt >>> 0);
  let working = normalize(trimmed);
  const matches: Archetype[] = [];
  for (const m of MULTIWORD) {
    if (working.includes(m.key)) {
      matches.push(m);
      working = working.replace(m.key, " ");
    }
  }
  const tokens = working.split(" ").filter((t) => t && !STOP.has(t));
  const mods: string[] = [];
  const deferred: Archetype[] = [];
  const deferredTokens: string[] = [];
  for (const token of tokens) {
    const key = canonical(token);
    const arch = archetypeByKey(key);
    const isMod = MOD_KEYS.has(token) || MOD_KEYS.has(key);
    if (arch && isMod) {
      deferred.push(arch);
      deferredTokens.push(token);
    } else if (arch) {
      matches.push(arch);
    } else if (isMod) {
      mods.push(token);
    } else {
      const pair = compoundPair(token);
      if (pair) matches.push(pair[0], pair[1]);
    }
  }
  if (matches.length === 0) {
    for (const d of deferred) matches.push(d);
  } else {
    mods.push(...deferredTokens);
  }
  let bp = matches.length ? fold(matches, name, seed) : procedural(trimmed, name, seed);
  for (const mod of mods) applyMod(bp, mod);
  bp.seed = seed;
  bp = clampStats(bp);
  return paint(bp);
}

export function blendBodies(body: Blueprint, absorbed: Blueprint, name: string, seed: number): Blueprint {
  const element = absorbed.element !== "neutral" ? absorbed.element : body.element;
  const flies = body.flies || absorbed.flies;
  const bp = clampStats({
    ...body,
    name,
    element,
    flies,
    immovable: body.immovable && !flies,
    explodes: body.explodes || absorbed.explodes,
    aura: body.aura || absorbed.aura,
    heals: body.heals || absorbed.heals,
    magnet: body.magnet || absorbed.magnet,
    gravity: body.gravity || absorbed.gravity,
    ranged: body.ranged || absorbed.ranged,
    revive: body.revive || absorbed.revive,
    aggressive: body.aggressive || absorbed.aggressive,
    slowAura: body.slowAura || absorbed.slowAura,
    hp: Math.min(520, Math.round(body.hp + absorbed.hp * 0.55)),
    atk: Math.min(64, Math.round(body.atk + absorbed.atk * 0.45)),
    def: Math.min(40, Math.round(Math.max(body.def, absorbed.def) + Math.min(body.def, absorbed.def) * 0.25)),
    spd: Math.max(body.spd, absorbed.spd * 0.92),
    radius: Math.min(88, body.radius + absorbed.radius * 0.22),
    mass: Math.min(260, (body.mass + absorbed.mass) * 0.72),
    seed,
    fill: body.fill,
    accent: body.accent,
    ink: body.ink,
    glow: body.glow,
  });
  return paint(bp);
}

export function traitList(bp: Blueprint): string[] {
  const t: string[] = [];
  if (bp.element !== "neutral") t.push(bp.element);
  if (bp.flies) t.push("floats");
  if (bp.ranged) t.push("ranged");
  if (bp.explodes) t.push("explosive");
  if (bp.aura) t.push(bp.element === "poison" ? "toxic touch" : "burning touch");
  if (bp.heals) t.push("mends");
  if (bp.magnet) t.push("magnetic");
  if (bp.gravity) t.push("pulls");
  if (bp.immovable) t.push("rooted");
  if (bp.revive) t.push("returns once");
  if (bp.slowAura) t.push("slows time");
  if (bp.aggressive) t.push("fierce");
  return t;
}
