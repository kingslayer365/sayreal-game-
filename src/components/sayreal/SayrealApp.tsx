import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";
import {
  Hand,
  Link2,
  LocateFixed,
  Merge,
  ScrollText,
  Sparkles,
  Swords,
  Trash2,
  Unlink,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import { GameAudio } from "@/game/audio";
import { frameCamera, clampCamera, type Cam } from "@/game/camera";
import { render } from "@/game/render";
import { WORLD_W, type Card, type SaveFile } from "@/game/types";
import { World } from "@/game/world";

const SAVE_KEY = "sayreal.v1";
const MUTE_KEY = "sayreal.mute";

const CHIPS = ["Dragon", "Ice wolf", "Knight", "Castle", "Bomb", "Magnet", "Phoenix", "Pizza", "Storm", "Ninja"];

const SURPRISES = [
  "tiny dragon",
  "ice wolf",
  "knight with shield",
  "cat and dog",
  "dragon vs knight",
  "flaming sword",
  "phoenix",
  "magnet",
  "pizza",
  "robot",
  "kraken",
  "wizard",
  "bomb",
  "love",
  "castle",
  "storm",
  "ninja",
  "slime",
  "ufo",
  "ancient tree",
  "golden knight",
  "shadow cat",
  "healing potion",
];

const LAWS: Array<[string, string]> = [
  ["Say it", "Any word drops in with a body, a weight, and a temper. Try cat and dog, knight with shield, or dragon vs wolf."],
  ["Link", "Chained things move, fly, and get thrown as one. A hard yank can snap the chain."],
  ["Fuse", "The first shape stays. The second lends its power, and their names melt together."],
  ["Fight", "They chase until one falls. The winner catches a breath."],
  ["Fire", "Burns whatever it touches, unless you link them first."],
  ["Water", "Puts fire out."],
  ["Ice", "Slows whatever it overlaps."],
  ["Magnet", "Pulls things close and grabs them."],
  ["Bomb", "Sits quiet, then bursts when thrown hard or when it strikes."],
  ["Love & potions", "Mend whoever stands beside them."],
];

type Mode = "move" | "link" | "fuse" | "fight";

type Hud = { log: string; count: number; card: Card | null };

type Gesture = {
  id: number;
  x: number;
  y: number;
  cx: number;
  cy: number;
  last: number;
  hit: number | null;
  drag: boolean;
};

function cardKey(card: Card | null) {
  if (!card) return "";
  return `${card.id}:${card.hp}:${card.maxHp}:${card.foe ?? ""}:${card.links.join(",")}`;
}

export function SayrealApp() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const worldRef = useRef<World | null>(null);
  const audioRef = useRef<GameAudio | null>(null);
  const camRef = useRef<Cam>({ x: 0, y: 0, zoom: 1, user: false });
  const sizeRef = useRef({ w: 1, h: 1, dpr: 1 });
  const modeRef = useRef<Mode>("move");
  const selectedRef = useRef<number | null>(null);
  const pendingRef = useRef<number | null>(null);
  const begunRef = useRef(false);
  const saveRef = useRef<() => void>(() => {});
  const pointerRef = useRef<Gesture | null>(null);
  const clearTimer = useRef(0);

  const [booted, setBooted] = useState(false);
  const [begun, setBegun] = useState(false);
  const [mode, setMode] = useState<Mode>("move");
  const [selected, setSelected] = useState<number | null>(null);
  const [pending, setPending] = useState<number | null>(null);
  const [draft, setDraft] = useState("");
  const [hud, setHud] = useState<Hud>({ log: "", count: 0, card: null });
  const [laws, setLaws] = useState(false);
  const [muted, setMuted] = useState(false);
  const [clearArmed, setClearArmed] = useState(false);

  modeRef.current = mode;
  selectedRef.current = selected;
  pendingRef.current = pending;
  begunRef.current = begun;

  saveRef.current = () => {
    window.clearTimeout(clearTimer.current);
    const timer = window.setTimeout(() => {
      const world = worldRef.current;
      if (!world || !begunRef.current) return;
      try {
        localStorage.setItem(SAVE_KEY, JSON.stringify(world.serialize()));
      } catch {
        /* quota */
      }
    }, 200);
    clearTimer.current = timer;
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const world = new World();
    world.reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    worldRef.current = world;
    const audio = new GameAudio();
    audioRef.current = audio;
    try {
      if (localStorage.getItem(MUTE_KEY) === "1") {
        audio.muted = true;
        setMuted(true);
      }
      const raw = localStorage.getItem(SAVE_KEY);
      if (raw) world.restore(JSON.parse(raw) as SaveFile);
    } catch {
      /* ignore broken save */
    }
    const opening = world.countLiving() ? "Your world is still here." : "";
    setHud({ log: opening, count: world.countLiving(), card: null });
    setBooted(true);

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const w = Math.max(1, rect.width);
      const h = Math.max(1, rect.height);
      const pw = Math.round(w * dpr);
      const ph = Math.round(h * dpr);
      if (canvas.width !== pw || canvas.height !== ph) {
        canvas.width = pw;
        canvas.height = ph;
      }
      sizeRef.current = { w, h, dpr };
      if (!camRef.current.user) frameCamera(camRef.current, w, h, WORLD_W / 2);
      else clampCamera(camRef.current, w, h);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    let raf = 0;
    let last = performance.now();
    let acc = 0;
    let uiAcc = 0;
    let lastLog = opening;
    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (!document.hidden) {
        acc += dt;
        let steps = 0;
        while (acc >= 1 / 60 && steps < 4) {
          world.step(1 / 60);
          acc -= 1 / 60;
          steps += 1;
        }
        const events = world.drain();
        let logged = false;
        for (const ev of events) {
          if (ev.type === "log") {
            lastLog = ev.text;
            logged = true;
          } else if (ev.type === "sound") audio.play(ev.name);
          else if (ev.type === "haptic" && typeof navigator.vibrate === "function") navigator.vibrate(ev.ms);
        }
        uiAcc += dt;
        if (logged || uiAcc > 0.12) {
          uiAcc = 0;
          if (selectedRef.current != null && !world.byId(selectedRef.current)) {
            selectedRef.current = null;
            setSelected(null);
          }
          if (pendingRef.current != null && !world.byId(pendingRef.current)) {
            pendingRef.current = null;
            setPending(null);
          }
          const card = selectedRef.current != null ? world.describe(selectedRef.current) : null;
          const count = world.countLiving();
          setHud((prev) => {
            const log = logged ? lastLog : prev.log;
            if (prev.log === log && prev.count === count && cardKey(prev.card) === cardKey(card)) return prev;
            return { log, count, card };
          });
        }
      } else {
        acc = 0;
      }
      const ctx = canvas.getContext("2d");
      const size = sizeRef.current;
      if (ctx) {
        render(
          ctx,
          world,
          camRef.current,
          size.w,
          size.h,
          size.dpr,
          selectedRef.current,
          pendingRef.current,
          begunRef.current,
        );
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const cam = camRef.current;
      const rect = canvas.getBoundingClientRect();
      const sx = e.clientX - rect.left;
      const sy = e.clientY - rect.top;
      const beforeX = cam.x + sx / cam.zoom;
      const beforeY = cam.y + sy / cam.zoom;
      const next = Math.max(0.55, Math.min(1.7, cam.zoom * (e.deltaY > 0 ? 0.92 : 1.08)));
      cam.zoom = next;
      cam.x = beforeX - sx / next;
      cam.y = beforeY - sy / next;
      cam.user = true;
      clampCamera(cam, rect.width, rect.height);
    };
    canvas.addEventListener("wheel", onWheel, { passive: false });

    const onKey = (e: KeyboardEvent) => {
      audio.unlock();
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (!begunRef.current) return;
      if (e.key === "1") setMode("move");
      else if (e.key === "2") setMode("link");
      else if (e.key === "3") setMode("fuse");
      else if (e.key === "4") setMode("fight");
      else if (e.key === "Escape") {
        pendingRef.current = null;
        setPending(null);
      } else if ((e.key === "Backspace" || e.key === "Delete") && selectedRef.current != null) {
        e.preventDefault();
        const res = world.dismiss(selectedRef.current);
        selectedRef.current = null;
        pendingRef.current = null;
        setSelected(null);
        setPending(null);
        setHud((h) => ({ ...h, log: res.text, count: world.countLiving(), card: null }));
        saveRef.current();
      }
    };
    window.addEventListener("keydown", onKey);
    const onVis = () => audio.resume();
    document.addEventListener("visibilitychange", onVis);
    const onPtr = () => audio.unlock();
    window.addEventListener("pointerdown", onPtr);

    (window as unknown as { __sayreal?: { count: () => number; names: () => string[]; welds: () => number } }).__sayreal =
      {
        count: () => worldRef.current?.countLiving() ?? 0,
        names: () => worldRef.current?.entities.filter((en) => !en.dead).map((en) => en.name) ?? [],
        welds: () => worldRef.current?.welds.length ?? 0,
      };

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      canvas.removeEventListener("wheel", onWheel);
      window.removeEventListener("keydown", onKey);
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("pointerdown", onPtr);
    };
  }, []);

  function focusWorldX() {
    const canvas = canvasRef.current;
    if (!canvas) return WORLD_W / 2;
    const rect = canvas.getBoundingClientRect();
    return camRef.current.x + rect.width / (2 * camRef.current.zoom);
  }

  function publish(text: string | null, select: number | null) {
    const world = worldRef.current;
    if (!world) return;
    if (select != null) {
      selectedRef.current = select;
      setSelected(select);
    }
    setHud((h) => ({
      log: text ?? h.log,
      count: world.countLiving(),
      card: selectedRef.current != null ? world.describe(selectedRef.current) : select == null ? null : h.card,
    }));
  }

  function doSummon(text: string) {
    const world = worldRef.current;
    if (!world) return;
    const res = world.summon(text, focusWorldX());
    if (!res.ok) {
      setHud((h) => ({ ...h, log: res.text }));
      audioRef.current?.play("deny");
      return;
    }
    pendingRef.current = null;
    setPending(null);
    const id = res.ids[res.ids.length - 1] ?? null;
    publish(res.text, id);
    setDraft("");
    saveRef.current();
  }

  function act(id: number) {
    const world = worldRef.current;
    if (!world) return;
    const current = modeRef.current;
    if (current === "move") {
      pendingRef.current = null;
      setPending(null);
      publish(null, id);
      return;
    }
    const first = pendingRef.current;
    if (first == null) {
      pendingRef.current = id;
      setPending(id);
      publish(null, id);
      return;
    }
    if (first === id) {
      pendingRef.current = null;
      setPending(null);
      return;
    }
    const res =
      current === "link" ? world.link(first, id) : current === "fuse" ? world.fuse(first, id) : world.duel(first, id);
    pendingRef.current = null;
    setPending(null);
    if (!res.ok) {
      setHud((h) => ({ ...h, log: res.text }));
      audioRef.current?.play("deny");
      return;
    }
    const next = current === "fuse" ? (res.ids[0] ?? null) : first;
    publish(res.text, next);
    saveRef.current();
  }

  function toWorld(clientX: number, clientY: number) {
    const canvas = canvasRef.current;
    const cam = camRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: cam.x + (clientX - rect.left) / cam.zoom,
      y: cam.y + (clientY - rect.top) / cam.zoom,
    };
  }

  function onPointerDown(e: ReactPointerEvent<HTMLCanvasElement>) {
    if (!begunRef.current) return;
    const world = worldRef.current;
    if (!world) return;
    e.preventDefault();
    const p = toWorld(e.clientX, e.clientY);
    const hit = world.entityAt(p.x, p.y);
    pointerRef.current = {
      id: e.pointerId,
      x: e.clientX,
      y: e.clientY,
      cx: e.clientX,
      cy: e.clientY,
      last: performance.now(),
      hit: hit?.id ?? null,
      drag: false,
    };
    if (hit && modeRef.current === "move") world.beginGrab(hit.id, p.x, p.y);
    e.currentTarget.setPointerCapture(e.pointerId);
  }

  function onPointerMove(e: ReactPointerEvent<HTMLCanvasElement>) {
    const world = worldRef.current;
    const gesture = pointerRef.current;
    if (!world || !gesture || gesture.id !== e.pointerId) {
      if (world && begunRef.current) {
        const p = toWorld(e.clientX, e.clientY);
        const hit = world.entityAt(p.x, p.y);
        e.currentTarget.style.cursor = hit ? (modeRef.current === "move" ? "grab" : "pointer") : "default";
      }
      return;
    }
    const dist = Math.hypot(e.clientX - gesture.x, e.clientY - gesture.y);
    if (!gesture.drag && dist > 8) gesture.drag = true;
    const p = toWorld(e.clientX, e.clientY);
    if (gesture.drag && gesture.hit != null && modeRef.current === "move") {
      const now = performance.now();
      const dt = Math.min(0.05, (now - gesture.last) / 1000);
      gesture.last = now;
      world.drag(p.x, p.y, dt || 0.016);
      e.currentTarget.style.cursor = "grabbing";
    } else if (gesture.drag && gesture.hit == null) {
      const cam = camRef.current;
      cam.x -= (e.clientX - gesture.cx) / cam.zoom;
      cam.y -= (e.clientY - gesture.cy) / cam.zoom;
      gesture.cx = e.clientX;
      gesture.cy = e.clientY;
      cam.user = true;
      const rect = e.currentTarget.getBoundingClientRect();
      clampCamera(cam, rect.width, rect.height);
    }
  }

  function onPointerUp(e: ReactPointerEvent<HTMLCanvasElement>) {
    const world = worldRef.current;
    const gesture = pointerRef.current;
    if (!world || !gesture || gesture.id !== e.pointerId) return;
    pointerRef.current = null;
    if (gesture.drag && gesture.hit != null && modeRef.current === "move") {
      world.endGrab();
      saveRef.current();
      return;
    }
    if (gesture.drag) return;
    if (gesture.hit == null) {
      if (modeRef.current === "move") {
        selectedRef.current = null;
        pendingRef.current = null;
        setSelected(null);
        setPending(null);
        setHud((h) => ({ ...h, card: null }));
      } else {
        pendingRef.current = null;
        setPending(null);
      }
      return;
    }
    act(gesture.hit);
  }

  function begin() {
    audioRef.current?.unlock();
    begunRef.current = true;
    setBegun(true);
    if (!window.matchMedia("(pointer: coarse)").matches) inputRef.current?.focus();
  }

  function center() {
    const canvas = canvasRef.current;
    const world = worldRef.current;
    if (!canvas || !world) return;
    const rect = canvas.getBoundingClientRect();
    let x = WORLD_W / 2;
    const sel = selectedRef.current != null ? world.byId(selectedRef.current) : undefined;
    if (sel) x = sel.x;
    else {
      const living = world.entities.filter((en) => !en.dead);
      if (living.length) x = living.reduce((sum, en) => sum + en.x, 0) / living.length;
    }
    camRef.current.user = false;
    frameCamera(camRef.current, rect.width, rect.height, x);
  }

  function toggleMute() {
    const next = !muted;
    setMuted(next);
    audioRef.current?.setMuted(next);
    try {
      localStorage.setItem(MUTE_KEY, next ? "1" : "0");
    } catch {
      /* ignore */
    }
  }

  function clearWorld() {
    if (!clearArmed) {
      setClearArmed(true);
      window.setTimeout(() => setClearArmed(false), 2400);
      return;
    }
    worldRef.current?.clear();
    selectedRef.current = null;
    pendingRef.current = null;
    setSelected(null);
    setPending(null);
    setClearArmed(false);
    setHud({ log: "The world is empty.", count: 0, card: null });
    saveRef.current();
  }

  const hint =
    mode === "move"
      ? "Drag to throw. Tap to inspect."
      : mode === "link"
        ? pending
          ? "Now tap what to chain it to."
          : "Tap two things to chain them."
        : mode === "fuse"
          ? pending
            ? "Now tap what melts into it."
            : "Tap what stays, then what melts into it."
          : pending
            ? "Now tap its rival."
            : "Tap a fighter, then its rival.";

  const card = hud.card;

  return (
    <main className="relative h-dvh w-full overflow-hidden bg-bg text-fg">
      <canvas
        ref={canvasRef}
        className="absolute inset-0 h-full w-full touch-none"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onContextMenu={(e) => e.preventDefault()}
        aria-label="The living world"
      />
      <p className="sr-only" aria-live="polite">
        {hud.log}
      </p>

      {begun && (
        <>
          <header className="safe-top pointer-events-none absolute inset-x-0 top-0 z-20 flex items-start justify-between gap-3 px-3 sm:px-4">
            <div className="pointer-events-auto pt-3">
              <h1 className="font-display text-3xl leading-none font-semibold tracking-tight">Sayreal</h1>
              <p className="mt-1 text-sm text-muted">{hud.count} real</p>
            </div>
            <div className="pointer-events-auto flex items-center gap-2 pt-3">
              <IconButton label={laws ? "Close laws" : "World laws"} pressed={laws} onClick={() => setLaws((v) => !v)}>
                {laws ? <X className="size-5" /> : <ScrollText className="size-5" />}
              </IconButton>
              <IconButton label="Center view" onClick={center}>
                <LocateFixed className="size-5" />
              </IconButton>
              <IconButton label={muted ? "Unmute" : "Mute"} pressed={muted} onClick={toggleMute}>
                {muted ? <VolumeX className="size-5" /> : <Volume2 className="size-5" />}
              </IconButton>
              <button
                type="button"
                className={`flex h-11 items-center justify-center rounded-xl border border-border px-3 ${clearArmed ? "bg-primary text-primary-fg" : "bg-surface/90 text-fg"}`}
                onClick={clearWorld}
                aria-label={clearArmed ? "Confirm clear world" : "Clear world"}
              >
                {clearArmed ? "Clear?" : <Trash2 className="size-5" />}
              </button>
            </div>
          </header>

          {laws && (
            <section className="absolute top-20 right-3 left-3 z-20 max-h-[50dvh] overflow-y-auto rounded-2xl border border-border bg-surface/95 p-4 sm:left-auto sm:w-96">
              <h2 className="font-display text-xl">How the world behaves</h2>
              <ul className="mt-3 flex flex-col gap-3">
                {LAWS.map(([title, body]) => (
                  <li key={title}>
                    <p className="text-sm font-medium">{title}</p>
                    <p className="text-sm text-muted">{body}</p>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <footer className="safe-bottom pointer-events-none absolute inset-x-0 bottom-0 z-20 px-3 sm:px-4">
            <div className="pointer-events-auto mx-auto flex w-full max-w-3xl flex-col gap-2 pb-3">
              {card && (
                <div className="rounded-2xl border border-border bg-surface/95 p-3">
                  <div className="flex items-center gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-display text-xl leading-tight">{card.name}</p>
                      <p className="text-sm text-muted">
                        {card.hp}/{card.maxHp}
                        {card.foe ? ` · fighting ${card.foe}` : ""}
                        {card.links.length ? ` · with ${card.links.join(", ")}` : ""}
                      </p>
                      <div className="mt-2 h-2 overflow-hidden rounded-full bg-surface-2">
                        <div
                          className="h-full bg-primary"
                          style={{ width: `${Math.max(0, Math.min(100, (card.hp / card.maxHp) * 100))}%` }}
                        />
                      </div>
                    </div>
                    <IconButton
                      label="Unlink"
                      onClick={() => {
                        const world = worldRef.current;
                        if (!world || selected == null) return;
                        const res = world.unlink(selected);
                        publish(res.text, selected);
                        if (res.ok) saveRef.current();
                        else audioRef.current?.play("deny");
                      }}
                    >
                      <Unlink className="size-5" />
                    </IconButton>
                    <IconButton
                      label="Remove"
                      onClick={() => {
                        const world = worldRef.current;
                        if (!world || selected == null) return;
                        const res = world.dismiss(selected);
                        selectedRef.current = null;
                        pendingRef.current = null;
                        setSelected(null);
                        setPending(null);
                        setHud({ log: res.text, count: world.countLiving(), card: null });
                        saveRef.current();
                      }}
                    >
                      <Trash2 className="size-5" />
                    </IconButton>
                  </div>
                  <div className="mt-2 hidden gap-2 sm:flex">
                    <Stat label="ATK" value={card.atk} />
                    <Stat label="DEF" value={card.def} />
                    <Stat label="SPD" value={card.spd} />
                    {card.traits.map((trait) => (
                      <span key={trait} className="rounded-full border border-border px-2 py-1 text-xs text-muted">
                        {trait}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="rounded-2xl border border-border bg-surface/95 p-3">
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {CHIPS.map((chip) => (
                    <button
                      key={chip}
                      type="button"
                      className="h-9 shrink-0 rounded-full border border-border bg-surface-2 px-3 text-sm"
                      onClick={() => doSummon(chip)}
                    >
                      {chip}
                    </button>
                  ))}
                </div>
                <form
                  className="flex gap-2"
                  onSubmit={(e) => {
                    e.preventDefault();
                    doSummon(draft);
                  }}
                >
                  <label className="sr-only" htmlFor="summon-input">
                    Say anything
                  </label>
                  <input
                    id="summon-input"
                    ref={inputRef}
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    maxLength={48}
                    autoComplete="off"
                    autoCorrect="off"
                    spellCheck={false}
                    placeholder="Say anything"
                    className="h-12 min-w-0 flex-1 rounded-xl border border-border bg-surface-2 px-3 text-base text-fg outline-none placeholder:text-muted"
                  />
                  <button type="submit" id="summon-btn" className="h-12 shrink-0 rounded-xl bg-primary px-4 font-medium text-primary-fg">
                    Make real
                  </button>
                </form>
                <div className="mt-2 grid grid-cols-4 gap-2">
                  <ModeButton id="mode-move" label="Move" active={mode === "move"} onClick={() => { setMode("move"); setPending(null); pendingRef.current = null; }}>
                    <Hand className="size-4" />
                  </ModeButton>
                  <ModeButton id="mode-link" label="Link" active={mode === "link"} onClick={() => setMode("link")}>
                    <Link2 className="size-4" />
                  </ModeButton>
                  <ModeButton id="mode-fuse" label="Fuse" active={mode === "fuse"} onClick={() => setMode("fuse")}>
                    <Merge className="size-4" />
                  </ModeButton>
                  <ModeButton id="mode-fight" label="Fight" active={mode === "fight"} onClick={() => setMode("fight")}>
                    <Swords className="size-4" />
                  </ModeButton>
                </div>
                <div className="mt-2 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm">{hud.log || "The world is listening."}</p>
                    <p className="truncate text-sm text-muted">{hint}</p>
                  </div>
                  <button
                    type="button"
                    className="flex h-11 shrink-0 items-center gap-1 rounded-xl border border-border bg-surface-2 px-3 text-sm"
                    onClick={() => doSummon(SURPRISES[Math.floor(Math.random() * SURPRISES.length)] ?? "dragon")}
                  >
                    <Sparkles className="size-4" />
                    Surprise
                  </button>
                </div>
              </div>
            </div>
          </footer>
        </>
      )}

      {!begun && (
        <div className="absolute inset-0 z-30 flex items-center justify-center overflow-y-auto bg-bg/55 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-border bg-surface p-6 shadow-lg">
            <p className="text-sm font-medium tracking-wide text-muted">A living sandbox</p>
            <h1 className="mt-1 font-display text-5xl leading-none font-semibold tracking-tight">Sayreal</h1>
            <p className="mt-4 text-base leading-relaxed text-fg">
              Type any word and it becomes real — with a body, a weight, and a temper. Then stick things together, fuse them, or make them fight.
            </p>
            <ol className="mt-5 flex flex-col gap-3">
              <Step icon={<Sparkles className="size-5" />} title="Say it" body="Dragon, castle, pizza, or cat and dog." />
              <Step icon={<Link2 className="size-5" />} title="Shape it" body="Link two, or fuse them into one new thing." />
              <Step icon={<Swords className="size-5" />} title="Clash" body="Point a fighter at a rival. Try dragon vs knight." />
            </ol>
            <button
              id="begin-btn"
              type="button"
              disabled={!booted}
              onClick={begin}
              className="mt-6 h-12 w-full rounded-xl bg-primary font-medium text-primary-fg disabled:opacity-50"
            >
              {hud.count > 0 ? "Return to your world" : "Begin"}
            </button>
            <p className="mt-3 text-center text-sm text-muted">Your world stays on this device.</p>
          </div>
        </div>
      )}
    </main>
  );
}

function Step({ icon, title, body }: { icon: ReactNode; title: string; body: string }) {
  return (
    <li className="flex items-center gap-3">
      <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-surface-2 text-primary">{icon}</span>
      <span>
        <span className="block text-sm font-medium">{title}</span>
        <span className="block text-sm text-muted">{body}</span>
      </span>
    </li>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <span className="rounded-full bg-surface-2 px-2 py-1 text-xs">
      <span className="text-muted">{label}</span> {value}
    </span>
  );
}

function IconButton({
  label,
  onClick,
  children,
  pressed,
}: {
  label: string;
  onClick: () => void;
  children: ReactNode;
  pressed?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={pressed}
      onClick={onClick}
      className={`flex size-11 items-center justify-center rounded-xl border border-border ${pressed ? "bg-primary text-primary-fg" : "bg-surface/90 text-fg"}`}
    >
      {children}
    </button>
  );
}

function ModeButton({
  id,
  label,
  active,
  onClick,
  children,
}: {
  id: string;
  label: string;
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      id={id}
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`flex h-11 items-center justify-center gap-1 rounded-xl text-sm font-medium ${active ? "bg-primary text-primary-fg" : "bg-surface-2 text-fg"}`}
    >
      {children}
      <span>{label}</span>
    </button>
  );
}
