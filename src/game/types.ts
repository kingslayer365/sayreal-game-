export const WORLD_W = 3000;
export const WORLD_H = 1000;
export const GROUND_Y = 740;
export const WALL_L = 96;
export const WALL_R = WORLD_W - 96;
export const MAX_ENTITIES = 32;

export type Shape =
  | "dragon"
  | "beast"
  | "bird"
  | "fish"
  | "serpent"
  | "bug"
  | "person"
  | "blade"
  | "bomb"
  | "shield"
  | "orb"
  | "gem"
  | "star"
  | "heart"
  | "blob"
  | "tree"
  | "castle"
  | "vehicle";

export type Element =
  | "fire"
  | "water"
  | "earth"
  | "air"
  | "lightning"
  | "ice"
  | "shadow"
  | "light"
  | "poison"
  | "metal"
  | "nature"
  | "void"
  | "neutral";

export type Palette = { fill: string; accent: string; ink: string; glow: string };

export const PALETTE: Record<Exclude<Element, "neutral">, Palette> = {
  fire: { fill: "#ef6a3a", accent: "#ffd7a8", ink: "#641f10", glow: "#ff9a55" },
  water: { fill: "#3c93d4", accent: "#e5f6ff", ink: "#14344c", glow: "#8fd0ff" },
  earth: { fill: "#a07848", accent: "#f0d7b0", ink: "#3a2916", glow: "#d2b48a" },
  air: { fill: "#d5e4ee", accent: "#ffffff", ink: "#3d5566", glow: "#eef7ff" },
  lightning: { fill: "#f0c84a", accent: "#fff6c8", ink: "#5a4308", glow: "#ffe98a" },
  ice: { fill: "#b7e6f6", accent: "#ffffff", ink: "#1e4c62", glow: "#e7f8ff" },
  shadow: { fill: "#3c3558", accent: "#cbbef0", ink: "#120e1c", glow: "#8b78c4" },
  light: { fill: "#ffe3a4", accent: "#fffdf6", ink: "#6a5016", glow: "#fff1c8" },
  poison: { fill: "#78be46", accent: "#e9ffb8", ink: "#243810", glow: "#b6f078" },
  metal: { fill: "#c5ced8", accent: "#f5f8fb", ink: "#2a313c", glow: "#e6eef6" },
  nature: { fill: "#3e9a52", accent: "#d8f5c4", ink: "#14321a", glow: "#8ed98a" },
  void: { fill: "#3a2a62", accent: "#ddd4ff", ink: "#120c22", glow: "#9a82e6" },
};

export const NEUTRALS: Palette[] = [
  { fill: "#d4885c", accent: "#ffe1c8", ink: "#4a2c1c", glow: "#f0b48a" },
  { fill: "#d4a054", accent: "#fff0d0", ink: "#4a3414", glow: "#f0cc88" },
  { fill: "#6ea88a", accent: "#e5fff2", ink: "#1a3830", glow: "#b4e6d0" },
  { fill: "#6e92a8", accent: "#e4f2fb", ink: "#1c3040", glow: "#b4d0e4" },
  { fill: "#c46e6e", accent: "#ffdede", ink: "#4a2020", glow: "#f0b0b0" },
  { fill: "#c4a27a", accent: "#fff1de", ink: "#3e2e1c", glow: "#ecd2b0" },
  { fill: "#8d74a4", accent: "#f3eaff", ink: "#2c2038", glow: "#d0c0e8" },
  { fill: "#5f8f78", accent: "#e7fff4", ink: "#163028", glow: "#b7dccb" },
];

export type Blueprint = {
  name: string
  shape: Shape
  variant: string
  element: Element
  hp: number
  atk: number
  def: number
  spd: number
  mass: number
  radius: number
  flies: boolean
  explodes: boolean
  aura: boolean
  heals: boolean
  magnet: boolean
  gravity: boolean
  ranged: boolean
  immovable: boolean
  revive: boolean
  aggressive: boolean
  slowAura: boolean
  seed: number
  fill: string
  accent: string
  ink: string
  glow: string
};

export type Entity = {
  id: number
  name: string
  x: number
  y: number
  vx: number
  vy: number
  facing: number
  hp: number
  flash: number
  land: number
  age: number
  intro: number
  attackCd: number
  burnCd: number
  wet: number
  slow: number
  didRevive: boolean
  exploded: boolean
  dead: boolean
  foes: number[]
  seed: number
  wander: number
  wanderDir: number
  magnetUsed: number
  hoverY: number
  bp: Blueprint
};

export type Weld = { a: number; b: number };

export type Particle = {
  x: number
  y: number
  vx: number
  vy: number
  life: number
  max: number
  size: number
  color: string
  gravity: number
};

export type Bolt = {
  x: number
  y: number
  vx: number
  vy: number
  life: number
  dmg: number
  owner: number
  r: number
  color: string
};

export type Ring = { x: number; y: number; life: number; max: number; r: number; color: string };

export type Floater = { x: number; y: number; text: string; life: number; max: number };

export type SoundName =
  | "summon"
  | "link"
  | "fuse"
  | "hit"
  | "die"
  | "explode"
  | "heal"
  | "deny"
  | "throw"
  | "land";

export type WorldEvent =
  | { type: "log"; text: string }
  | { type: "sound"; name: SoundName }
  | { type: "haptic"; ms: number };

export type Card = {
  id: number
  name: string
  hp: number
  maxHp: number
  atk: number
  def: number
  spd: number
  traits: string[]
  links: string[]
  foe: string | null
};

export type SaveFile = {
  version: 1
  entities: Array<{
    name: string
    x: number
    y: number
    vx: number
    vy: number
    facing: number
    hp: number
    seed: number
    foes: number[]
    magnetUsed: number
    hoverY: number
    didRevive: boolean
    bp: Blueprint
  }>
  welds: Array<[number, number]>
};
