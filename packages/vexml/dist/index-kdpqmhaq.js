import {
  Rect2,
  Affine,
  SNAPSHOT_VERSION2,
  PaintReplayer
} from "./index-6pn8cpem.js";
// ../core/disposable/disposables.ts
class disposables {
  constructor() {}
  static noop() {
    return disposables.callback(() => {});
  }
  static callback(dispose) {
    return { dispose };
  }
  static nullable(resource) {
    return resource ?? disposables.noop();
  }
}
// ../core/disposable/disposer.ts
class Disposer {
  resources = [];
  _disposed = false;
  get disposed() {
    return this._disposed;
  }
  use(resource) {
    this.assertOpen();
    this.resources.push(resource);
    return resource;
  }
  adopt(value, dispose) {
    this.assertOpen();
    this.resources.push(disposables.callback(() => dispose(value)));
    return value;
  }
  defer(onDispose) {
    this.assertOpen();
    this.resources.push(disposables.callback(onDispose));
  }
  dispose() {
    if (this._disposed) {
      return;
    }
    this._disposed = true;
    let resource = this.resources.pop();
    while (resource) {
      resource.dispose();
      resource = this.resources.pop();
    }
  }
  assertOpen() {
    if (this._disposed) {
      throw new Error("cannot register a resource on a disposed Disposer");
    }
  }
}
// snapshot-fingerprint.ts
class SnapshotFingerprint {
  bits = new Float64Array(1);
  words = new Uint32Array(this.bits.buffer);
  a = 2166136261;
  b = 16777619;
  static of(snapshot) {
    const hash = new SnapshotFingerprint;
    hash.text(JSON.stringify([snapshot.paint, snapshot.outlines]));
    hash.stream(snapshot.engraving?.ops ?? []);
    return hash.digest();
  }
  stream(items) {
    this.mix(items.length);
    for (const item of items) {
      this.item(item);
    }
  }
  item(item) {
    if (typeof item === "number") {
      this.bits[0] = item;
      this.mix(this.words[0] ?? 0);
      this.mix(this.words[1] ?? 0);
    } else if (typeof item === "string") {
      this.text(item);
    } else if (Array.isArray(item)) {
      this.stream(item);
    } else if (item === null) {
      this.mix(1);
    } else {
      this.mix(item ? 2 : 3);
    }
  }
  text(text) {
    this.mix(text.length);
    for (let i = 0;i < text.length; i++) {
      this.mix(text.charCodeAt(i));
    }
  }
  mix(word) {
    this.a = Math.imul(this.a ^ word, 16777619);
    this.b = Math.imul(this.b ^ word, 1540483477) ^ this.b >>> 15;
  }
  digest() {
    return `${(this.a >>> 0).toString(36)}.${(this.b >>> 0).toString(36)}`;
  }
}

// snapshot-mismatch-error.ts
class SnapshotMismatchError2 extends Error {
  reason;
  name = "SnapshotMismatchError";
  constructor(reason, message) {
    super(message);
    this.reason = reason;
  }
}

// score-box.ts
class ScoreBox {
  container;
  base;
  priors = [];
  painted = null;
  disposer = new Disposer;
  constructor(container, base) {
    this.container = container;
    this.base = base;
    this.disposer.defer(() => this.base.remove());
  }
  static open(container, opts) {
    const marked = container.querySelector(`:scope > .vexml-canvas[${PAINT_KEY}]`);
    const box = new ScoreBox(container, marked ?? document.createElement("div"));
    if (marked) {
      box.takeOver(marked);
    }
    box.build(opts);
    return box;
  }
  static paintKey(fingerprint, density, ink) {
    return JSON.stringify([
      SNAPSHOT_VERSION2,
      fingerprint,
      density,
      ink.notation,
      ink.text
    ]);
  }
  get isPainted() {
    return this.base.hasAttribute(PAINT_KEY);
  }
  takePainted() {
    const painted = this.painted;
    this.painted = null;
    return painted;
  }
  mark(key) {
    this.base.setAttribute(PAINT_KEY, key);
    this.base.setAttribute(PAINT_PRIORS, JSON.stringify(this.priors));
  }
  setStyle(prop, value) {
    if (!this.priors.some(([p]) => p === prop)) {
      const prior = this.container.style.getPropertyValue(prop);
      this.priors.push([prop, prior]);
      this.disposer.defer(() => this.container.style.setProperty(prop, prior));
    }
    this.container.style.setProperty(prop, value);
  }
  size(width, height, scale) {
    const style = this.base.style;
    style.setProperty("--vexml-width", `${width}px`);
    style.setProperty("--vexml-height", `${height}px`);
    style.setProperty("--vexml-aspect", `${width / height}`);
    style.setProperty("--vexml-scale", `${scale}`);
  }
  renderedSize() {
    const style = getComputedStyle(this.base);
    return {
      width: parseFloat(style.width) || 0,
      height: parseFloat(style.height) || 0
    };
  }
  dispose() {
    this.disposer.dispose();
  }
  takeOver(base) {
    const key = base.getAttribute(PAINT_KEY) ?? "";
    const priors = parsePriors(base.getAttribute(PAINT_PRIORS));
    base.removeAttribute(PAINT_KEY);
    base.removeAttribute(PAINT_PRIORS);
    for (const [prop, value] of priors) {
      this.container.style.setProperty(prop, value);
    }
    const plane = base.querySelector(":scope > .vexml-tiles");
    if (plane) {
      this.painted = { key, plane };
      this.disposer.defer(() => plane.remove());
    }
  }
  build(opts) {
    const container = this.container;
    if (!container.style.position) {
      this.setStyle("position", "relative");
    }
    if (!container.style.isolation) {
      this.setStyle("isolation", "isolate");
    }
    this.setStyle("-webkit-user-select", "none");
    this.setStyle("-webkit-touch-callout", "none");
    if (opts.height != null) {
      this.setStyle("height", `${opts.height}px`);
    }
    if (opts.maxHeight != null) {
      this.setStyle("max-height", `${opts.maxHeight}px`);
    }
    if (opts.width != null) {
      this.setStyle("width", `${opts.width}px`);
    }
    if (opts.maxWidth != null) {
      this.setStyle("max-width", `${opts.maxWidth}px`);
    }
    if (opts.height != null || opts.maxHeight != null) {
      this.setStyle("overflow-y", "auto");
    }
    if (opts.width != null || opts.maxWidth != null) {
      this.setStyle("overflow-x", "auto");
    }
    if (opts.backgroundColor) {
      this.setStyle("background-color", opts.backgroundColor);
    }
    if (opts.fit) {
      this.setStyle("text-align", "center");
    }
    const base = this.base;
    base.className = opts.fit ? "vexml-canvas vexml-fit" : "vexml-canvas";
    base.style.display = "inline-block";
    base.style.position = "relative";
    base.style.overflow = "hidden";
    ensureStylesheet();
    if (base.parentNode !== container) {
      container.appendChild(base);
    }
    if (!base.querySelector(":scope > .vexml-strut")) {
      base.appendChild(strut());
    }
  }
}
var PAINT_KEY = "data-vexml-paint";
var PAINT_PRIORS = "data-vexml-priors";
function parsePriors(json) {
  try {
    const priors = JSON.parse(json ?? "[]");
    return Array.isArray(priors) ? priors.filter((p) => Array.isArray(p) && typeof p[0] === "string" && typeof p[1] === "string") : [];
  } catch {
    return [];
  }
}
function strut() {
  const strut = document.createElement("canvas");
  strut.className = "vexml-strut";
  strut.width = 0;
  strut.height = 0;
  strut.style.display = "block";
  strut.style.width = "calc(var(--vexml-width) * var(--vexml-scale, 1))";
  strut.style.maxWidth = "100%";
  strut.style.height = "0";
  return strut;
}
function ensureStylesheet() {
  if (document.head.querySelector("style[data-vexml-canvas-style]")) {
    return;
  }
  const style = document.createElement("style");
  style.setAttribute("data-vexml-canvas-style", "");
  style.textContent = ":where(.vexml-canvas){width:calc(var(--vexml-width) * var(--vexml-scale, 1));height:calc(var(--vexml-height) * var(--vexml-scale, 1));aspect-ratio:var(--vexml-aspect);vertical-align:top}" + ":where(.vexml-canvas.vexml-fit){width:auto;max-width:100%;height:auto;aspect-ratio:var(--vexml-aspect)}";
  document.head.appendChild(style);
}

// tile-budget.ts
class TileBudget {
  limit;
  areas = new Map;
  total = 0;
  constructor(limit) {
    this.limit = limit;
  }
  get used() {
    return this.total;
  }
  use(key, area) {
    this.total -= this.areas.get(key) ?? 0;
    this.areas.delete(key);
    this.areas.set(key, area);
    this.total += area;
  }
  drop(key) {
    this.total -= this.areas.get(key) ?? 0;
    this.areas.delete(key);
  }
  trim(keep) {
    const freed = [];
    for (const [key, area] of this.areas) {
      if (this.total <= this.limit) {
        break;
      }
      if (!keep.has(key)) {
        freed.push(key);
        this.areas.delete(key);
        this.total -= area;
      }
    }
    return freed;
  }
}

// tile-grid.ts
class TileGrid {
  width;
  height;
  tileSize;
  origin;
  cols;
  rows;
  lists;
  seq = 0;
  constructor(width, height, tileSize, origin = { x: 0, y: 0 }) {
    this.width = width;
    this.height = height;
    this.tileSize = tileSize;
    this.origin = origin;
    this.cols = width > 0 ? Math.ceil(width / tileSize) : 0;
    this.rows = height > 0 ? Math.ceil(height / tileSize) : 0;
    this.lists = Array.from({ length: this.cols * this.rows }, () => []);
  }
  get size() {
    return this.lists.length;
  }
  grown(height) {
    const grid = new TileGrid(this.width, height, this.tileSize, this.origin);
    for (const [i, list] of this.lists.entries()) {
      grid.lists[i] = list;
    }
    grid.seq = this.seq;
    return grid;
  }
  tileRect(index) {
    const x = index % this.cols * this.tileSize;
    const y = Math.floor(index / this.cols) * this.tileSize;
    return new Rect2(x, y, Math.min(this.tileSize, this.width - x), Math.min(this.tileSize, this.height - y));
  }
  tilesIn(region) {
    const x0 = Math.max(0, region.x);
    const y0 = Math.max(0, region.y);
    const x1 = Math.min(this.width, region.right);
    const y1 = Math.min(this.height, region.bottom);
    if (x1 <= x0 || y1 <= y0) {
      return [];
    }
    const T = this.tileSize;
    const tiles = [];
    for (let row = Math.floor(y0 / T);row <= Math.ceil(y1 / T) - 1; row++) {
      for (let col = Math.floor(x0 / T);col <= Math.ceil(x1 / T) - 1; col++) {
        tiles.push(row * this.cols + col);
      }
    }
    return tiles;
  }
  append(op) {
    const tiles = op.bounds ? this.tilesIn(op.bounds.translate(this.origin.x, this.origin.y)) : this.lists.map((_, i) => i);
    const filed = { op, seq: this.seq++ };
    const cleared = op.call.kind === "clearRect" ? this.cleared(op) : null;
    for (const tile of tiles) {
      let list = this.list(tile);
      if (cleared) {
        const rect = this.tileRect(tile);
        list = list.filter((f) => !this.covers(cleared, f.op, rect));
        this.lists[tile] = list;
        if (cleared.containsRect(rect)) {
          continue;
        }
      }
      list.push(filed);
    }
    return tiles;
  }
  ops(tile) {
    return this.list(tile).map((f) => f.op);
  }
  isEmpty(tile) {
    return this.list(tile).length === 0;
  }
  opsIn(region) {
    const seen = new Set;
    for (const tile of this.tilesIn(region)) {
      for (const filed of this.list(tile)) {
        seen.add(filed);
      }
    }
    return [...seen].sort((a, b) => a.seq - b.seq).map((f) => f.op);
  }
  clear() {
    for (const list of this.lists) {
      list.length = 0;
    }
  }
  list(tile) {
    const list = this.lists[tile];
    if (!list) {
      throw new RangeError(`vexml: no tile ${tile}`);
    }
    return list;
  }
  cleared(op) {
    const { call, state } = op;
    if (call.kind !== "clearRect" || !state.matrix.isAxisAligned) {
      return null;
    }
    let box = state.matrix.mapBox(call.x, call.y, call.x + call.w, call.y + call.h);
    for (const clip of state.clips) {
      if (!clip.rect || !box) {
        return null;
      }
      box = box.intersection(clip.rect);
    }
    return box?.translate(this.origin.x, this.origin.y) ?? null;
  }
  covers(cleared, op, tile) {
    if (!op.bounds) {
      return false;
    }
    const part = op.bounds.translate(this.origin.x, this.origin.y).intersection(tile);
    return !part || cleared.containsRect(part);
  }
}

// tiled-surface.ts
class TiledSurface {
  host;
  opts;
  plane;
  tiles = new Map;
  budget;
  grid;
  view = null;
  whole = true;
  shown = { sx: 1, sy: 1 };
  density;
  adoptable = new Map;
  constructor(host, opts) {
    this.host = host;
    this.opts = opts;
    this.plane = document.createElement("div");
    this.plane.className = "vexml-tiles";
    const style = this.plane.style;
    style.position = "absolute";
    style.left = "0";
    style.top = "0";
    style.pointerEvents = "none";
    host.prepend(this.plane);
    this.density = opts.scale;
    this.budget = new TileBudget(opts.budget);
    this.grid = new TileGrid(0, 0, opts.tileSize);
  }
  get scale() {
    return this.density;
  }
  rescale(scale) {
    for (const tile of [...this.tiles.keys()]) {
      this.close(tile);
    }
    this.density = scale;
    this.refresh();
  }
  get width() {
    return this.grid.width;
  }
  get height() {
    return this.grid.height;
  }
  get painted() {
    return this.tiles.size;
  }
  resize(width, height, origin) {
    for (const tile of [...this.tiles.keys()]) {
      this.close(tile);
    }
    this.grid = new TileGrid(width, height, this.opts.tileSize, origin);
    this.placePlane();
  }
  grow(height) {
    if (height <= this.grid.height) {
      return;
    }
    const lastRow = this.grid.rows - 1;
    for (const tile of [...this.tiles.keys()]) {
      if (Math.floor(tile / this.grid.cols) === lastRow) {
        this.close(tile);
      }
    }
    this.grid = this.grid.grown(height);
    this.placePlane();
    this.refresh();
  }
  load(ops, width, height, origin) {
    this.resize(width, height, origin);
    for (const op of ops) {
      this.grid.append(op);
    }
    this.refresh();
  }
  fit(width, height) {
    const sx = scaleOf(width, this.width);
    const sy = scaleOf(height, this.height);
    if (sx === this.shown.sx && sy === this.shown.sy) {
      return;
    }
    this.shown = { sx, sy };
    this.placePlane();
    for (const [index, tile] of this.tiles) {
      this.place(index, tile.canvas);
    }
  }
  show(view) {
    this.view = view;
    this.refresh();
    this.discard();
  }
  adopt(plane) {
    plane.querySelectorAll(`:scope > canvas[${TILE_INDEX}]`).forEach((canvas) => {
      this.adoptable.set(Number(canvas.getAttribute(TILE_INDEX)), canvas);
    });
  }
  paint(op) {
    let opened = false;
    for (const index of this.grid.append(op)) {
      const tile = this.tiles.get(index);
      if (tile) {
        tile.replayer.replay(op);
      } else if (this.wants(index)) {
        this.open(index);
        opened = true;
      }
    }
    if (opened && this.budget.used > this.budget.limit) {
      this.refresh();
    }
  }
  read(sx, sy, sw, sh) {
    const canvas = document.createElement("canvas");
    canvas.width = sw;
    canvas.height = sh;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      throw new Error("vexml: 2D context unavailable");
    }
    const s = this.scale;
    const base = Affine.translate(-sx, -sy).multiply(Affine.scale(s)).multiply(Affine.translate(this.grid.origin.x, this.grid.origin.y));
    const replayer = new PaintReplayer(ctx, base, { scale: s, device: { x: sx, y: sy } }, { ink: this.opts.ink });
    for (const op of this.grid.opsIn(new Rect2(sx / s, sy / s, sw / s, sh / s))) {
      replayer.replay(op);
    }
    replayer.finish();
    const data = ctx.getImageData(0, 0, sw, sh);
    canvas.width = 0;
    canvas.height = 0;
    return data;
  }
  reset() {
    for (const tile of [...this.tiles.keys()]) {
      this.close(tile);
    }
    this.grid.clear();
  }
  paintInto(ctx, region, scale = this.scale) {
    const ops = this.grid.opsIn(region);
    if (ops.some((op) => op.call.kind === "clearRect")) {
      this.composite(ctx, region, ops, scale);
    } else {
      this.replay(ctx, region, ops, scale);
    }
  }
  dispose() {
    this.reset();
    this.discard();
    this.plane.remove();
  }
  composite(ctx, region, ops, scale) {
    const t = ctx.getTransform();
    const box = new Affine(t.a, t.b, t.c, t.d, t.e, t.f).mapBox(region.x, region.y, region.right, region.bottom);
    const x0 = Math.max(0, Math.floor(box.x));
    const y0 = Math.max(0, Math.floor(box.y));
    const x1 = Math.min(ctx.canvas.width, Math.ceil(box.right));
    const y1 = Math.min(ctx.canvas.height, Math.ceil(box.bottom));
    if (x1 <= x0 || y1 <= y0) {
      return;
    }
    const canvas = document.createElement("canvas");
    canvas.width = x1 - x0;
    canvas.height = y1 - y0;
    const scratch = canvas.getContext("2d");
    if (!scratch) {
      return;
    }
    scratch.setTransform(t.a, t.b, t.c, t.d, t.e - x0, t.f - y0);
    this.replay(scratch, region, ops, scale);
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(canvas, x0, y0);
    ctx.restore();
    canvas.width = 0;
    canvas.height = 0;
  }
  replay(ctx, region, ops, scale) {
    const t = ctx.getTransform();
    const base = new Affine(t.a, t.b, t.c, t.d, t.e, t.f).multiply(Affine.translate(this.grid.origin.x, this.grid.origin.y));
    ctx.save();
    ctx.beginPath();
    ctx.rect(region.x, region.y, region.w, region.h);
    ctx.clip();
    const replayer = new PaintReplayer(ctx, base, { scale, device: null }, { ink: this.opts.ink });
    for (const op of ops) {
      replayer.replay(op);
    }
    replayer.finish();
    ctx.restore();
  }
  refresh() {
    const filled = [];
    let area = 0;
    for (let index = 0;index < this.grid.size; index++) {
      if (!this.grid.isEmpty(index)) {
        filled.push(index);
        area += this.areaOf(index);
      }
    }
    this.whole = area <= this.budget.limit;
    const wanted = filled.filter((index) => this.wants(index));
    for (const index of wanted) {
      if (this.tiles.has(index)) {
        this.budget.use(index, this.areaOf(index));
      } else {
        this.open(index);
      }
    }
    for (const index of this.budget.trim(new Set(wanted))) {
      this.close(index);
    }
  }
  wants(index) {
    if (this.grid.isEmpty(index)) {
      return false;
    }
    if (this.whole) {
      return true;
    }
    return this.view?.intersects(this.grid.tileRect(index)) ?? false;
  }
  open(index) {
    const rect = this.grid.tileRect(index);
    const s = this.scale;
    const x0 = Math.round(rect.x * s);
    const y0 = Math.round(rect.y * s);
    const width = Math.round(rect.right * s) - x0;
    const height = Math.round(rect.bottom * s) - y0;
    const adopted = this.adoptable.get(index);
    this.adoptable.delete(index);
    const painted = adopted?.width === width && adopted.height === height;
    if (adopted && !painted) {
      free(adopted);
    }
    let canvas;
    if (adopted && painted) {
      canvas = adopted;
    } else {
      canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
    }
    canvas.style.position = "absolute";
    canvas.style.display = "block";
    canvas.setAttribute(TILE_INDEX, String(index));
    this.place(index, canvas);
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      throw new Error("vexml: 2D context unavailable for a tile");
    }
    const base = new Affine(s, 0, 0, s, -x0, -y0).multiply(Affine.translate(this.grid.origin.x, this.grid.origin.y));
    const replayer = new PaintReplayer(ctx, base, { scale: s, device: { x: x0, y: y0 } }, { ink: this.opts.ink });
    if (!painted) {
      for (const op of this.grid.ops(index)) {
        replayer.replay(op);
      }
    }
    this.plane.appendChild(canvas);
    this.tiles.set(index, { canvas, replayer });
    this.budget.use(index, canvas.width * canvas.height);
  }
  placePlane() {
    const { sx, sy } = this.shown;
    this.plane.style.width = `${this.grid.width * sx}px`;
    this.plane.style.height = `${this.grid.height * sy}px`;
  }
  place(index, canvas) {
    const rect = this.grid.tileRect(index);
    const s = this.scale;
    const { sx, sy } = this.shown;
    const x0 = Math.round(rect.x * s);
    const y0 = Math.round(rect.y * s);
    const style = canvas.style;
    style.left = `${x0 / s * sx}px`;
    style.top = `${y0 / s * sy}px`;
    style.width = `${canvas.width / s * sx}px`;
    style.height = `${canvas.height / s * sy}px`;
  }
  close(index) {
    const tile = this.tiles.get(index);
    if (!tile) {
      return;
    }
    free(tile.canvas);
    this.tiles.delete(index);
    this.budget.drop(index);
  }
  discard() {
    for (const canvas of this.adoptable.values()) {
      free(canvas);
    }
    this.adoptable.clear();
  }
  areaOf(index) {
    const rect = this.grid.tileRect(index);
    return Math.round(rect.w * this.scale) * Math.round(rect.h * this.scale);
  }
}
var TILE_INDEX = "data-vexml-tile";
function free(canvas) {
  canvas.remove();
  canvas.width = 0;
  canvas.height = 0;
}
var FIT_TOLERANCE = 0.0001;
function scaleOf(shown, intrinsic) {
  return intrinsic <= 0 || Math.abs(shown / intrinsic - 1) < FIT_TOLERANCE ? 1 : shown / intrinsic;
}

export { disposables, Disposer, SnapshotFingerprint, SnapshotMismatchError2, ScoreBox, TiledSurface };
