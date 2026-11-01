import { blendBodies, fuseTitle, manifest, planSummon, traitList } from "./manifest";
import {
  GROUND_Y,
  MAX_ENTITIES,
  WALL_L,
  WALL_R,
  type Blueprint,
  type Bolt,
  type Card,
  type Entity,
  type Floater,
  type Particle,
  type Ring,
  type SaveFile,
  type SoundName,
  type Weld,
  type WorldEvent,
} from "./types";

type Result = { ok: true; text: string; ids: number[] } | { ok: false; text: string; ids: number[] };

const empty = (text: string): Result => ({ ok: false, text, ids: [] });

export class World {
  entities: Entity[] = [];
  welds: Weld[] = [];
  particles: Particle[] = [];
  bolts: Bolt[] = [];
  rings: Ring[] = [];
  floaters: Floater[] = [];
  trauma = 0;
  hitstop = 0;
  time = 0;
  reduceMotion = false;
  nextId = 1;
  private events: WorldEvent[] = [];
  grabId: number | null = null;
  private grabOffX = 0;
  private grabOffY = 0;
  private holdX = 0;
  private holdY = 0;
  private holdVx = 0;
  private holdVy = 0;

  drain(): WorldEvent[] {
    const ev = this.events;
    this.events = [];
    return ev;
  }

  byId(id: number): Entity | undefined {
    return this.entities.find((e) => e.id === id && !e.dead);
  }

  countLiving(): number {
    return this.entities.reduce((n, e) => n + (e.dead ? 0 : 1), 0);
  }

  describe(id: number): Card | null {
    const e = this.byId(id);
    if (!e) return null;
    const links = this.groupOf(id)
      .filter((n) => n !== id)
      .map((n) => this.byId(n)?.name)
      .filter((n): n is string => Boolean(n));
    let foe: string | null = null;
    for (const fid of e.foes) {
      const f = this.byId(fid);
      if (f) {
        foe = f.name;
        break;
      }
    }
    return {
      id: e.id,
      name: e.name,
      hp: Math.max(0, Math.round(e.hp)),
      maxHp: e.bp.hp,
      atk: e.bp.atk,
      def: e.bp.def,
      spd: Math.round(e.bp.spd * 10),
      traits: traitList(e.bp),
      links,
      foe,
    };
  }

  summon(raw: string, focusX: number): Result {
    const plan = planSummon(raw);
    if (!plan) return empty("Say a word first.");
    const parts = plan.type === "single" ? [plan.text] : plan.type === "link" ? plan.parts : [...plan.left, ...plan.right];
    if (this.countLiving() + parts.length > MAX_ENTITIES) return empty("The world is full. Remove something first.");

    const spawnAt = (text: string, x: number, facing: number) => {
      const bp = manifest(text, this.nextId * 997);
      if (!bp) return null;
      return this.spawnBlueprint(bp, x, facing);
    };

    if (plan.type === "single") {
      const e = spawnAt(plan.text, focusX, Math.random() < 0.5 ? -1 : 1);
      if (!e) return empty("That didn't take shape.");
      this.log(`${e.name} is real.`);
      this.sound("summon");
      this.ring(e.x, e.y, e.bp.radius * 3.2, e.bp.glow);
      return { ok: true, text: `${e.name} is real.`, ids: [e.id] };
    }

    if (plan.type === "link") {
      const gap = 110;
      const start = focusX - ((plan.parts.length - 1) * gap) / 2;
      const made: Entity[] = [];
      plan.parts.forEach((part, i) => {
        const e = spawnAt(part, start + i * gap, 1);
        if (e) made.push(e);
      });
      if (made.length < 2) return empty("Need two real things to link.");
      for (let i = 1; i < made.length; i++) {
        const prev = made[i - 1];
        const cur = made[i];
        if (prev && cur) this.addWeld(prev.id, cur.id, false);
      }
      const names = made.map((e) => e.name).join(" and ");
      this.log(`Linked ${names}.`);
      this.sound("link");
      return { ok: true, text: `Linked ${names}.`, ids: made.map((e) => e.id) };
    }

    const gap = 92;
    const leftOrigin = focusX - 180;
    const rightOrigin = focusX + 180;
    const left = this.placeRow(plan.left, leftOrigin, 1, gap);
    const right = this.placeRow(plan.right, rightOrigin, -1, gap);
    if (!left.length || !right.length) return empty("That fight never started.");
    for (let i = 1; i < left.length; i++) {
      const a = left[i - 1];
      const b = left[i];
      if (a && b) this.addWeld(a.id, b.id, false);
    }
    for (let i = 1; i < right.length; i++) {
      const a = right[i - 1];
      const b = right[i];
      if (a && b) this.addWeld(a.id, b.id, false);
    }
    const a0 = left[0];
    const b0 = right[0];
    if (!a0 || !b0) return empty("That fight never started.");
    this.duel(a0.id, b0.id, false);
    const text = `${a0.name} is fighting ${b0.name}.`;
    this.log(text);
    this.sound("summon");
    return { ok: true, text, ids: [a0.id, b0.id] };
  }

  link(aId: number, bId: number): Result {
    if (aId === bId) return empty("Pick two different things.");
    const a = this.byId(aId);
    const b = this.byId(bId);
    if (!a || !b) return empty("That one is already gone.");
    if (this.sameGroup(aId, bId)) return empty(`${a.name} is already linked to ${b.name}.`);
    if (this.groupOf(aId).length + this.groupOf(bId).length > 8) return empty("That chain is as long as it can get.");
    this.addWeld(aId, bId, false);
    this.clearCombatBetween(aId, bId);
    const text = `Linked ${a.name} and ${b.name}.`;
    this.log(text);
    this.sound("link");
    this.burst(b.x, b.y, a.bp.glow, 10, 80, 0.35);
    return { ok: true, text, ids: [aId, bId] };
  }

  unlink(id: number): Result {
    const e = this.byId(id);
    if (!e) return empty("Nothing selected.");
    const before = this.welds.length;
    this.welds = this.welds.filter((w) => w.a !== id && w.b !== id);
    if (this.welds.length === before) return empty(`Nothing is linked to ${e.name}.`);
    const text = `Unlinked ${e.name}.`;
    this.log(text);
    this.sound("link");
    return { ok: true, text, ids: [id] };
  }

  fuse(aId: number, bId: number): Result {
    if (aId === bId) return empty("Pick two different things.");
    const a = this.byId(aId);
    const b = this.byId(bId);
    if (!a || !b) return empty("That one is already gone.");
    const name = fuseTitle(a.name, b.name);
    const bp = blendBodies(a.bp, b.bp, name, (a.seed ^ b.seed ^ this.nextId) >>> 0);
    const x = (a.x + b.x) / 2;
    const y = Math.min(a.y, b.y);
    const vx = (a.vx + b.vx) / 2;
    const vy = (a.vy + b.vy) / 2 - 40;
    this.burst(x, y, a.bp.glow, 16, 160, 0.5);
    this.burst(x, y, b.bp.accent, 12, 120, 0.45);
    this.discard(a);
    this.discard(b);
    const e = this.spawnBlueprint(bp, x, a.facing, y);
    e.vx = vx;
    e.vy = vy;
    e.y = Math.min(y, GROUND_Y - e.bp.radius - 10);
    this.ring(e.x, e.y, e.bp.radius * 3.4, e.bp.glow);
    this.addTrauma(0.35);
    if (!this.reduceMotion) this.hitstop = Math.max(this.hitstop, 0.05);
    const text = `${a.name} and ${b.name} became ${e.name}.`;
    this.log(text);
    this.sound("fuse");
    this.events.push({ type: "haptic", ms: 12 });
    return { ok: true, text, ids: [e.id] };
  }

  duel(aId: number, bId: number, announce = true): Result {
    if (aId === bId) return empty("Pick two different things.");
    const a = this.byId(aId);
    const b = this.byId(bId);
    if (!a || !b) return empty("That one is already gone.");
    if (this.sameGroup(aId, bId)) return empty("Unlink them before they can fight.");
    const ga = this.groupOf(aId);
    const gb = this.groupOf(bId);
    const mobile = [...ga, ...gb].some((id) => {
      const e = this.byId(id);
      return e && !e.bp.immovable;
    });
    if (!mobile && ga.length + gb.length > 0) {
      const bothStuck = [...ga, ...gb].every((id) => this.byId(id)?.bp.immovable);
      if (bothStuck) return empty("Neither one can reach the other.");
    }
    for (const id of ga) {
      const e = this.byId(id);
      if (e) e.foes = gb.slice();
    }
    for (const id of gb) {
      const e = this.byId(id);
      if (e) e.foes = ga.slice();
    }
    if (a.x <= b.x) {
      a.facing = 1;
      b.facing = -1;
    } else {
      a.facing = -1;
      b.facing = 1;
    }
    const text = `${a.name} is fighting ${b.name}.`;
    if (announce) {
      this.log(text);
      this.sound("summon");
    }
    return { ok: true, text, ids: [aId, bId] };
  }

  dismiss(id: number): Result {
    const e = this.byId(id);
    if (!e) return empty("Nothing selected.");
    const name = e.name;
    this.burst(e.x, e.y, e.bp.accent, 14, 100, 0.4);
    this.discard(e);
    const text = `${name} is gone.`;
    this.log(text);
    this.sound("die");
    return { ok: true, text, ids: [] };
  }

  clear() {
    this.entities = [];
    this.welds = [];
    this.bolts = [];
    this.grabId = null;
    this.log("The world is empty.");
    this.sound("deny");
  }

  beginGrab(id: number, wx: number, wy: number) {
    const e = this.byId(id);
    if (!e) return;
    this.grabId = id;
    this.grabOffX = e.x - wx;
    this.grabOffY = e.y - wy;
    this.holdX = e.x;
    this.holdY = e.y;
    this.holdVx = 0;
    this.holdVy = 0;
  }

  drag(wx: number, wy: number, dt: number) {
    if (this.grabId == null) return;
    const nx = wx + this.grabOffX;
    const ny = wy + this.grabOffY;
    const safe = Math.max(0.008, dt);
    this.holdVx = (nx - this.holdX) / safe;
    this.holdVy = (ny - this.holdY) / safe;
    this.holdX = nx;
    this.holdY = ny;
  }

  endGrab() {
    if (this.grabId == null) return;
    const group = this.groupOf(this.grabId);
    const sp = Math.hypot(this.holdVx, this.holdVy);
    const max = 980;
    const scale = sp > max ? max / sp : 1;
    for (const id of group) {
      const e = this.byId(id);
      if (!e) continue;
      e.vx = this.holdVx * scale;
      e.vy = this.holdVy * scale;
    }
    if (sp > 240) this.sound("throw");
    this.grabId = null;
  }

  entityAt(x: number, y: number): Entity | null {
    const sorted = this.entities.filter((e) => !e.dead).sort((a, b) => a.y - b.y);
    for (let i = sorted.length - 1; i >= 0; i--) {
      const e = sorted[i];
      if (!e) continue;
      const dx = x - e.x;
      const dy = y - e.y;
      const reach = e.bp.radius + 10;
      if (dx * dx + dy * dy <= reach * reach) return e;
      if (dy < 0 && Math.abs(dx) < e.bp.radius + 24 && y > e.y - e.bp.radius - 40) return e;
    }
    return null;
  }

  step(dt: number) {
    this.time += dt;
    this.trauma = Math.max(0, this.trauma - dt * 1.65);
    this.updatePresentation(dt);
    if (this.hitstop > 0) {
      this.hitstop -= dt;
      return;
    }

    const held = this.grabId != null ? new Set(this.groupOf(this.grabId)) : null;

    for (const e of this.entities) {
      if (e.dead) continue;
      e.age += dt;
      e.attackCd = Math.max(0, e.attackCd - dt);
      e.burnCd = Math.max(0, e.burnCd - dt);
      e.wet = Math.max(0, e.wet - dt);
      e.slow = Math.max(0, e.slow - dt);
      if (held?.has(e.id)) continue;

      const foe = this.nearestFoe(e);
      if (e.foes.length && !foe) e.foes = [];

      if (foe && !e.bp.immovable) {
        const dx = foe.x - e.x;
        const dy = foe.y - e.y;
        const dist = Math.hypot(dx, dy) || 1;
        const dirx = dx / dist;
        const diry = dy / dist;
        e.facing = dirx >= 0 ? 1 : -1;
        let approach = dirx;
        if (e.bp.ranged && !e.bp.explodes) {
          if (dist < e.bp.radius + foe.bp.radius + 70) approach = -dirx;
          else if (dist < e.bp.radius + foe.bp.radius + 160) approach = 0;
        }
        const accel = (e.bp.flies ? 760 : 620) * e.bp.spd;
        e.vx += approach * accel * dt;
        if (e.bp.flies) {
          e.hoverY = Math.max(120, Math.min(GROUND_Y - e.bp.radius - 8, foe.y));
          e.vy += diry * accel * 0.55 * dt;
        }
        if (e.bp.ranged && !e.bp.explodes && dist < 420 && dist > e.bp.radius + foe.bp.radius + 24 && e.attackCd <= 0) {
          this.shoot(e, foe, dirx, diry);
        } else if (dist < e.bp.radius + foe.bp.radius + 3 && e.attackCd <= 0) {
          this.strike(e, foe);
        }
      } else if (!e.bp.immovable && !e.foes.length) {
        e.wander -= dt;
        if (e.wander <= 0) {
          e.wander = 1.4 + Math.random() * 2.4;
          e.wanderDir = Math.random() < 0.5 ? -1 : 1;
        }
        if (e.x < WALL_L + 160) e.wanderDir = 1;
        if (e.x > WALL_R - 160) e.wanderDir = -1;
        e.vx += e.wanderDir * 28 * e.bp.spd * dt;
        if (Math.abs(e.vx) > 28) e.facing = e.vx > 0 ? 1 : -1;
      }

      if (e.bp.flies) {
        const bob = this.reduceMotion ? 0 : Math.sin(this.time * 1.6 + e.seed) * 10;
        const goal = e.hoverY + bob;
        e.vy += (goal - e.y) * 11 * dt;
        e.vy *= Math.exp(-1.7 * dt);
        e.vx *= Math.exp(-0.45 * dt);
      } else {
        e.vy += 1900 * dt;
        e.vx *= Math.exp(e.foes.length ? -0.25 * dt : -1.5 * dt);
      }

      if (e.bp.immovable) {
        e.vx *= Math.exp(-14 * dt);
        e.vy *= Math.exp(-8 * dt);
      }

      const maxV = (90 + e.bp.spd * 170) * (e.slow > 0 ? 0.55 : 1);
      const sp = Math.hypot(e.vx, e.vy);
      if (sp > maxV) {
        e.vx = (e.vx / sp) * maxV;
        e.vy = (e.vy / sp) * maxV;
      }

      e.x += e.vx * dt;
      e.y += e.vy * dt;
      this.bounds(e);
    }

    this.forces(dt, held);
    for (let k = 0; k < 3; k++) this.collide();
    for (let k = 0; k < 4; k++) this.springs(held);
    this.auras(dt);
    this.attractions(dt, held);
    this.boltsStep(dt);
    for (const e of this.entities) {
      if (!e.dead && !held?.has(e.id)) this.bounds(e);
    }
    this.pinHeld(held);
    this.cleanup();
  }

  serialize(): SaveFile {
    const living = this.entities.filter((e) => !e.dead);
    const index = new Map(living.map((e, i) => [e.id, i]));
    return {
      version: 1,
      entities: living.map((e) => ({
        name: e.name,
        x: e.x,
        y: e.y,
        vx: e.vx,
        vy: e.vy,
        facing: e.facing,
        hp: e.hp,
        seed: e.seed,
        foes: e.foes.map((id) => index.get(id)).filter((n): n is number => n != null),
        magnetUsed: e.magnetUsed,
        hoverY: e.hoverY,
        didRevive: e.didRevive,
        bp: e.bp,
      })),
      welds: this.welds
        .map((w) => [index.get(w.a), index.get(w.b)] as const)
        .filter((pair): pair is [number, number] => pair[0] != null && pair[1] != null),
    };
  }

  restore(data: SaveFile) {
    if (data.version !== 1 || !Array.isArray(data.entities)) return;
    this.entities = [];
    this.welds = [];
    this.bolts = [];
    this.grabId = null;
    const made: Array<Entity | null> = [];
    for (const row of data.entities.slice(0, MAX_ENTITIES)) {
      if (!row?.bp || typeof row.name !== "string") {
        made.push(null);
        continue;
      }
      const e = this.spawnBlueprint(row.bp, row.x, row.facing || 1, row.y);
      e.name = row.name;
      e.bp = { ...row.bp, name: row.name };
      e.hp = Math.min(e.bp.hp, row.hp);
      e.vx = row.vx || 0;
      e.vy = row.vy || 0;
      e.seed = row.seed || e.seed;
      e.hoverY = row.hoverY || e.hoverY;
      e.didRevive = Boolean(row.didRevive);
      e.magnetUsed = row.magnetUsed || 0;
      e.intro = 1;
      e.foes = [];
      made.push(e);
    }
    made.forEach((e, i) => {
      const row = data.entities[i];
      if (!e || !row?.foes) return;
      e.foes = row.foes.flatMap((idx) => {
        const id = made[idx]?.id;
        return id == null ? [] : [id];
      });
    });
    for (const [ia, ib] of data.welds ?? []) {
      const a = made[ia];
      const b = made[ib];
      if (a && b) this.welds.push({ a: a.id, b: b.id });
    }
  }

  private placeRow(parts: string[], origin: number, facing: number, gap: number): Entity[] {
    const start = origin - ((parts.length - 1) * gap) / 2;
    const made: Entity[] = [];
    parts.forEach((part, i) => {
      const bp = manifest(part, this.nextId * 997);
      if (!bp) return;
      const e = this.spawnBlueprint(bp, start + i * gap, facing);
      e.facing = facing;
      made.push(e);
      this.ring(e.x, e.y, e.bp.radius * 2.6, e.bp.glow);
    });
    return made;
  }

  private spawnBlueprint(bp: Blueprint, x: number, facing: number, y?: number): Entity {
    const r = bp.radius;
    const px = clamp(x, WALL_L + r + 8, WALL_R - r - 8);
    const flies = bp.flies;
    const hoverY = GROUND_Y - r - 100 - (bp.seed % 36);
    const py = y ?? (flies ? hoverY - 70 : GROUND_Y - r - 200);
    const e: Entity = {
      id: this.nextId++,
      name: bp.name,
      x: px,
      y: py,
      vx: 0,
      vy: flies ? 90 : 0,
      facing: facing >= 0 ? 1 : -1,
      hp: bp.hp,
      flash: 0,
      land: 0,
      age: 0,
      intro: 0,
      attackCd: 0.25,
      burnCd: 0,
      wet: 0,
      slow: 0,
      didRevive: false,
      exploded: false,
      dead: false,
      foes: [],
      seed: bp.seed,
      wander: Math.random() * 1.5,
      wanderDir: facing >= 0 ? 1 : -1,
      magnetUsed: 0,
      hoverY,
      bp,
    };
    this.entities.push(e);
    return e;
  }

  private bounds(e: Entity) {
    const r = e.bp.radius;
    if (e.x < WALL_L + r) {
      e.x = WALL_L + r;
      if (e.vx < 0) e.vx = -e.vx * 0.25;
    } else if (e.x > WALL_R - r) {
      e.x = WALL_R - r;
      if (e.vx > 0) e.vx = -e.vx * 0.25;
    }
    if (e.y < 56 + r) {
      e.y = 56 + r;
      if (e.vy < 0) e.vy = Math.abs(e.vy) * 0.3;
    }
    if (!e.bp.flies && e.y > GROUND_Y - r) {
      const impact = e.vy;
      e.y = GROUND_Y - r;
      if (e.vy > 0) {
        e.vy = -e.vy * (e.bp.shape === "blob" ? 0.38 : 0.18);
        if (Math.abs(e.vy) < 60) e.vy = 0;
        if (impact > 220) {
          e.land = 1;
          this.burst(e.x, GROUND_Y, "#cbbba4", 5, 70, 0.3, 200);
          if (impact > 460) this.sound("land");
          if (e.bp.explodes && impact > 620 && e.age > 0.75) this.requestBoom(e, impact);
          if (impact > 480) this.addTrauma(Math.min(0.28, impact / 2800));
        }
      }
    } else if (e.bp.flies && e.y > GROUND_Y - r) {
      e.y = GROUND_Y - r;
      if (e.vy > 0) e.vy = 0;
    }
  }

  private forces(dt: number, held: Set<number> | null) {
    for (const e of this.entities) {
      if (e.dead || held?.has(e.id)) continue;
      if (e.bp.gravity) {
        for (const o of this.entities) {
          if (o === e || o.dead || o.bp.immovable || held?.has(o.id)) continue;
          if (this.sameGroup(e.id, o.id)) continue;
          const dx = e.x - o.x;
          const dy = e.y - o.y;
          const d = Math.hypot(dx, dy) || 1;
          if (d > 300) continue;
          const f = (1 - d / 300) * 520;
          o.vx += (dx / d) * f * dt;
          o.vy += (dy / d) * f * 0.45 * dt;
        }
      }
    }
  }

  private attractions(dt: number, held: Set<number> | null) {
    for (const e of this.entities) {
      if (e.dead || !e.bp.magnet) continue;
      for (const o of this.entities) {
        if (o === e || o.dead || o.bp.immovable || held?.has(o.id)) continue;
        if (this.sameGroup(e.id, o.id)) continue;
        const dx = e.x - o.x;
        const dy = e.y - o.y;
        const d = Math.hypot(dx, dy) || 1;
        if (d > 260) continue;
        const f = (1 - d / 260) * 380;
        o.vx += (dx / d) * f * dt;
        o.vy += (dy / d) * f * 0.3 * dt;
        if (d < e.bp.radius + o.bp.radius + 10 && e.magnetUsed < 3 && this.groupOf(e.id).length < 8) {
          this.addWeld(e.id, o.id, true);
          e.magnetUsed += 1;
        }
      }
    }
  }

  private collide() {
    const list = this.entities.filter((e) => !e.dead);
    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        const a = list[i];
        const b = list[j];
        if (!a || !b || a.dead || b.dead) continue;
        let dx = b.x - a.x;
        let dy = b.y - a.y;
        let dist = Math.hypot(dx, dy);
        const min = a.bp.radius + b.bp.radius;
        if (dist >= min) continue;
        if (dist < 0.001) {
          dx = 1;
          dy = 0;
          dist = 1;
        }
        const nx = dx / dist;
        const ny = dy / dist;
        const overlap = min - dist;
        const ma = a.bp.immovable ? a.bp.mass * 10 : a.bp.mass;
        const mb = b.bp.immovable ? b.bp.mass * 10 : b.bp.mass;
        const inv = 1 / ma + 1 / mb;
        const corr = overlap / inv;
        a.x -= nx * (corr / ma);
        a.y -= ny * (corr / ma);
        b.x += nx * (corr / mb);
        b.y += ny * (corr / mb);
        const rel = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
        if (rel < 0) {
          const rest = a.bp.shape === "blob" || b.bp.shape === "blob" ? 0.35 : 0.16;
          const jImp = (-(1 + rest) * rel) / inv;
          a.vx -= (jImp * nx) / ma;
          a.vy -= (jImp * ny) / ma;
          b.vx += (jImp * nx) / mb;
          b.vy += (jImp * ny) / mb;
          const impact = -rel;
          if (impact > 280) {
            this.requestBoom(a, impact);
            this.requestBoom(b, impact);
          }
        }
      }
    }
  }

  private springs(held: Set<number> | null) {
    for (let w = this.welds.length - 1; w >= 0; w--) {
      const weld = this.welds[w];
      if (!weld) continue;
      const a = this.byId(weld.a);
      const b = this.byId(weld.b);
      if (!a || !b) {
        this.welds.splice(w, 1);
        continue;
      }
      let dx = b.x - a.x;
      let dy = b.y - a.y;
      let dist = Math.hypot(dx, dy);
      const rest = (a.bp.radius + b.bp.radius) * 0.98;
      if (dist < 0.001) {
        dx = 1;
        dy = 0;
        dist = 1;
      }
      if (!held && dist > rest * 4) {
        this.welds.splice(w, 1);
        this.log(`The link between ${a.name} and ${b.name} snapped.`);
        this.sound("deny");
        continue;
      }
      if (dist <= rest) continue;
      const nx = dx / dist;
      const ny = dy / dist;
      const ma = a.bp.immovable ? a.bp.mass * 8 : a.bp.mass;
      const mb = b.bp.immovable ? b.bp.mass * 8 : b.bp.mass;
      const invMass = ma + mb;
      const corr = (dist - rest) * 0.35;
      if (!held?.has(a.id)) {
        a.x += nx * corr * (mb / invMass);
        a.y += ny * corr * (mb / invMass);
      }
      if (!held?.has(b.id)) {
        b.x -= nx * corr * (ma / invMass);
        b.y -= ny * corr * (ma / invMass);
      }
      const rel = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
      const f = (dist - rest) * 8 + rel * 4;
      if (!held?.has(a.id)) {
        a.vx += (nx * f) / ma;
        a.vy += (ny * f) / ma;
      }
      if (!held?.has(b.id)) {
        b.vx -= (nx * f) / mb;
        b.vy -= (ny * f) / mb;
      }
    }
  }

  private auras(dt: number) {
    const list = this.entities.filter((e) => !e.dead);
    for (let i = 0; i < list.length; i++) {
      const e = list[i];
      if (!e || e.age < 0.4) continue;
      if (e.bp.slowAura) {
        for (const o of list) {
          if (!o || o === e || this.sameGroup(e.id, o.id)) continue;
          const d = Math.hypot(e.x - o.x, e.y - o.y);
          if (d < 170) o.slow = Math.max(o.slow, 0.22);
        }
      }
      if (e.bp.heals) {
        for (const o of list) {
          if (!o || o === e || o.hp >= o.bp.hp) continue;
          if (e.foes.includes(o.id)) continue;
          const d = Math.hypot(e.x - o.x, e.y - o.y);
          if (d < e.bp.radius + o.bp.radius + 48) {
            o.hp = Math.min(o.bp.hp, o.hp + 16 * dt);
          }
        }
      }
      for (let j = i + 1; j < list.length; j++) {
        const o = list[j];
        if (!o || e.dead || o.dead) continue;
        const d = Math.hypot(e.x - o.x, e.y - o.y);
        if (d > e.bp.radius + o.bp.radius + 2) continue;
        if (this.sameGroup(e.id, o.id)) continue;
        this.pairTouch(e, o);
        this.pairTouch(o, e);
      }
    }
  }

  private pairTouch(a: Entity, b: Entity) {
    if (a.dead || b.dead) return;
    if (a.bp.element === "water" && b.bp.element === "fire" && b.wet <= 0) {
      b.wet = 1.15;
      this.hurt(b, 8 + a.bp.atk * 0.25, a);
      this.burst(b.x, b.y - 10, "#e7f6ff", 8, 50, 0.35, -20);
      return;
    }
    if (a.bp.element === "ice" && b.bp.element !== "ice" && b.bp.element !== "fire") {
      b.slow = Math.max(b.slow, 0.28);
    }
    if (a.bp.aura && a.wet <= 0 && b.burnCd <= 0 && b.bp.element !== a.bp.element) {
      if (a.bp.element === "water") return;
      b.burnCd = 0.48;
      this.hurt(b, 5 + a.bp.atk * 0.18, a);
      this.burst(b.x, b.y, a.bp.glow, 4, 60, 0.25, a.bp.element === "poison" ? 40 : -30);
    }
  }

  private boltsStep(dt: number) {
    for (let i = this.bolts.length - 1; i >= 0; i--) {
      const b = this.bolts[i];
      if (!b) continue;
      b.life -= dt;
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      let hit = false;
      if (b.life <= 0 || b.y > GROUND_Y || b.x < WALL_L || b.x > WALL_R) hit = true;
      if (!hit) {
        for (const e of this.entities) {
          if (e.dead || e.id === b.owner || this.sameGroup(e.id, b.owner)) continue;
          const d = Math.hypot(e.x - b.x, e.y - b.y);
          if (d < e.bp.radius + b.r) {
            const owner = this.byId(b.owner);
            this.hurt(e, b.dmg, owner ?? null);
            this.burst(b.x, b.y, b.color, 6, 90, 0.25);
            hit = true;
            break;
          }
        }
      }
      if (hit) this.bolts.splice(i, 1);
    }
  }

  private pinHeld(held: Set<number> | null) {
    if (this.grabId == null || !held) return;
    const e = this.byId(this.grabId);
    if (!e) {
      this.grabId = null;
      return;
    }
    const dx = this.holdX - e.x;
    const dy = this.holdY - e.y;
    const sp = Math.hypot(this.holdVx, this.holdVy);
    const max = 980;
    const scale = sp > max ? max / sp : 1;
    for (const id of held) {
      const o = this.byId(id);
      if (!o) continue;
      o.x += dx;
      o.y += dy;
      o.vx = this.holdVx * scale;
      o.vy = this.holdVy * scale;
      this.bounds(o);
    }
  }

  private cleanup() {
    if (this.entities.some((e) => e.dead)) {
      const deadIds = new Set(this.entities.filter((e) => e.dead).map((e) => e.id));
      this.welds = this.welds.filter((w) => !deadIds.has(w.a) && !deadIds.has(w.b));
      for (const e of this.entities) e.foes = e.foes.filter((id) => !deadIds.has(id));
      this.entities = this.entities.filter((e) => !e.dead);
      if (this.grabId != null && deadIds.has(this.grabId)) this.grabId = null;
    }
  }

  private strike(a: Entity, b: Entity) {
    if (a.bp.explodes) {
      this.detonate(a);
      return;
    }
    const dmg = Math.max(1, a.bp.atk * (1 - b.bp.def / (b.bp.def + 28)));
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const dist = Math.hypot(dx, dy) || 1;
    b.vx += (dx / dist) * (70 + a.bp.atk * 2.4);
    b.vy -= 50;
    a.attackCd = 0.48;
    a.flash = 0.06;
    this.hurt(b, dmg, a);
    this.addTrauma(0.16);
    if (!this.reduceMotion) this.hitstop = Math.max(this.hitstop, 0.032);
  }

  private shoot(a: Entity, foe: Entity, dirx: number, diry: number) {
    if (this.bolts.length > 40) this.bolts.shift();
    const speed = 560;
    this.bolts.push({
      x: a.x + dirx * (a.bp.radius + 8),
      y: a.y + diry * 8,
      vx: dirx * speed,
      vy: diry * speed * 0.85,
      life: 0.85,
      dmg: Math.max(1, a.bp.atk * (1 - foe.bp.def / (foe.bp.def + 34))),
      owner: a.id,
      r: a.bp.variant === "laser" ? 4 : 6,
      color: a.bp.glow,
    });
    a.attackCd = 0.72;
    a.vx -= dirx * 36;
    this.sound("hit");
  }

  private hurt(e: Entity, dmg: number, src: Entity | null) {
    if (e.dead || e.exploded || dmg <= 0) return;
    e.hp -= dmg;
    e.flash = 0.12;
    this.floater(e.x, e.y - e.bp.radius, String(Math.max(1, Math.round(dmg))));
    this.sound("hit");
    if (e.hp > 0) return;
    if (e.bp.revive && !e.didRevive) {
      e.didRevive = true;
      e.hp = e.bp.hp * 0.55;
      this.floater(e.x, e.y - e.bp.radius - 16, "Returned");
      this.burst(e.x, e.y, e.bp.glow, 18, 140, 0.5);
      this.sound("heal");
      return;
    }
    if (e.bp.explodes) {
      this.detonate(e);
      return;
    }
    this.kill(e, src);
  }

  private kill(e: Entity, src: Entity | null) {
    if (e.dead) return;
    e.dead = true;
    e.hp = 0;
    this.burst(e.x, e.y, e.bp.fill, 16, 160, 0.5);
    this.burst(e.x, e.y, e.bp.accent, 8, 90, 0.4);
    this.ring(e.x, e.y, e.bp.radius * 2.4, e.bp.glow);
    this.log(`${e.name} fell.`);
    this.sound("die");
    this.addTrauma(0.22);
    if (src && !src.dead) {
      src.hp = Math.min(src.bp.hp, src.hp + src.bp.hp * 0.12);
      this.floater(src.x, src.y - src.bp.radius - 8, "Victory");
    }
  }

  private requestBoom(e: Entity, impact: number) {
    if (!e.bp.explodes || e.dead || e.exploded) return;
    if (impact < 300 && e.age < 0.35) return;
    this.detonate(e);
  }

  private detonate(e: Entity) {
    if (e.exploded) return;
    e.exploded = true;
    e.dead = true;
    e.hp = 0;
    const nuke = e.bp.variant === "nuke" ? 1.75 : 1;
    const radius = (150 + e.bp.radius * 1.4) * nuke;
    const dmg0 = (34 + e.bp.atk) * (nuke > 1 ? 1.45 : 1);
    this.burst(e.x, e.y, e.bp.glow, 26, 260, 0.55);
    this.burst(e.x, e.y, "#fff6e8", 10, 180, 0.35);
    this.ring(e.x, e.y, radius, e.bp.glow);
    this.addTrauma(nuke > 1 ? 0.85 : 0.55);
    if (!this.reduceMotion) this.hitstop = Math.max(this.hitstop, 0.06);
    this.sound("explode");
    this.events.push({ type: "haptic", ms: 18 });
    this.log(`${e.name} burst.`);
    const victims = this.entities.slice();
    for (const o of victims) {
      if (o === e || o.dead || o.exploded) continue;
      const dx = o.x - e.x;
      const dy = o.y - e.y;
      const d = Math.hypot(dx, dy) || 1;
      if (d > radius) continue;
      const falloff = 1 - d / radius;
      o.vx += (dx / d) * 280 * falloff;
      o.vy -= 120 * falloff;
      this.hurt(o, dmg0 * falloff, null);
    }
  }

  private discard(e: Entity) {
    e.dead = true;
    e.exploded = true;
    e.hp = 0;
    e.foes = [];
    this.welds = this.welds.filter((w) => w.a !== e.id && w.b !== e.id);
    for (const o of this.entities) o.foes = o.foes.filter((id) => id !== e.id);
  }

  private groupOf(id: number): number[] {
    const seen = new Set<number>();
    const stack = [id];
    while (stack.length) {
      const c = stack.pop();
      if (c == null || seen.has(c)) continue;
      seen.add(c);
      for (const w of this.welds) {
        if (w.a === c) stack.push(w.b);
        else if (w.b === c) stack.push(w.a);
      }
    }
    return [...seen];
  }

  private sameGroup(a: number, b: number): boolean {
    if (a === b) return true;
    return this.groupOf(a).includes(b);
  }

  private addWeld(a: number, b: number, quiet: boolean) {
    if (a === b || this.sameGroup(a, b)) return;
    this.welds.push({ a, b });
    if (!quiet) return;
    const A = this.byId(a);
    const B = this.byId(b);
    if (A && B) {
      this.sound("link");
      this.burst((A.x + B.x) / 2, (A.y + B.y) / 2, "#e89a3c", 6, 40, 0.25);
    }
  }

  private clearCombatBetween(a: number, b: number) {
    const ga = new Set(this.groupOf(a));
    const gb = new Set(this.groupOf(b));
    for (const e of this.entities) {
      if (ga.has(e.id)) e.foes = e.foes.filter((id) => !gb.has(id));
      if (gb.has(e.id)) e.foes = e.foes.filter((id) => !ga.has(id));
    }
  }

  private nearestFoe(e: Entity): Entity | null {
    let best: Entity | null = null;
    let bestD = Infinity;
    for (const id of e.foes) {
      const o = this.byId(id);
      if (!o) continue;
      const d = (o.x - e.x) ** 2 + (o.y - e.y) ** 2;
      if (d < bestD) {
        bestD = d;
        best = o;
      }
    }
    return best;
  }

  private updatePresentation(dt: number) {
    for (const e of this.entities) {
      e.intro = Math.min(1, e.intro + dt / 0.32);
      e.flash = Math.max(0, e.flash - dt);
      e.land = Math.max(0, e.land - dt * 2.8);
    }
    let i = 0;
    while (i < this.particles.length) {
      const p = this.particles[i];
      if (!p) break;
      p.life -= dt;
      p.vy += p.gravity * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (p.life <= 0) {
        this.particles[i] = this.particles[this.particles.length - 1] as Particle;
        this.particles.pop();
      } else i++;
    }
    i = 0;
    while (i < this.floaters.length) {
      const f = this.floaters[i];
      if (!f) break;
      f.life -= dt;
      f.y -= 36 * dt;
      if (f.life <= 0) {
        this.floaters[i] = this.floaters[this.floaters.length - 1] as Floater;
        this.floaters.pop();
      } else i++;
    }
    i = 0;
    while (i < this.rings.length) {
      const r = this.rings[i];
      if (!r) break;
      r.life -= dt;
      r.r += (r.max - r.r) * Math.min(1, dt * 6);
      if (r.life <= 0) {
        this.rings[i] = this.rings[this.rings.length - 1] as Ring;
        this.rings.pop();
      } else i++;
    }
  }

  private burst(x: number, y: number, color: string, n: number, speed: number, life: number, gravity = 280) {
    for (let k = 0; k < n; k++) {
      if (this.particles.length > 280) this.particles.shift();
      const a = Math.random() * Math.PI * 2;
      const s = speed * (0.35 + Math.random() * 0.75);
      this.particles.push({
        x,
        y,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s - Math.abs(speed) * 0.15,
        life: life * (0.6 + Math.random() * 0.5),
        max: life,
        size: 2 + Math.random() * 3,
        color,
        gravity,
      });
    }
  }

  private ring(x: number, y: number, max: number, color: string) {
    if (this.rings.length > 16) this.rings.shift();
    this.rings.push({ x, y, life: 0.45, max, r: 6, color });
  }

  private floater(x: number, y: number, text: string) {
    if (this.floaters.length > 24) this.floaters.shift();
    this.floaters.push({ x, y, text, life: 0.7, max: 0.7 });
  }

  private log(text: string) {
    this.events.push({ type: "log", text });
  }

  private sound(name: SoundName) {
    this.events.push({ type: "sound", name });
  }

  private addTrauma(n: number) {
    if (this.reduceMotion) return;
    this.trauma = Math.min(1, this.trauma + n);
  }
}

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}

