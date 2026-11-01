import { GROUND_Y, WORLD_H, WORLD_W } from "./types";

export type Cam = { x: number; y: number; zoom: number; user: boolean };

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}

export function clampCamera(cam: Cam, cssW: number, cssH: number) {
  const viewW = cssW / cam.zoom;
  const viewH = cssH / cam.zoom;
  const minX = -80;
  const maxX = WORLD_W - viewW + 80;
  cam.x = maxX < minX ? (WORLD_W - viewW) / 2 : clamp(cam.x, minX, maxX);
  const minY = -140;
  const maxY = WORLD_H - viewH + 40;
  cam.y = maxY < minY ? GROUND_Y - viewH * 0.44 : clamp(cam.y, minY, maxY);
}

export function frameCamera(cam: Cam, cssW: number, cssH: number, focusX: number) {
  cam.zoom = Math.max(0.72, Math.min(1.15, cssH / 1040));
  const viewW = cssW / cam.zoom;
  const viewH = cssH / cam.zoom;
  cam.x = focusX - viewW / 2;
  cam.y = GROUND_Y - viewH * 0.44;
  clampCamera(cam, cssW, cssH);
}
