import {
  SnapshotFingerprint,
  SnapshotMismatchError2,
  ScoreBox,
  TiledSurface
} from "./index-kdpqmhaq.js";
import {
  Rect2,
  TILE_BUDGET,
  TILE_SIZE,
  Ink,
  SNAPSHOT_VERSION2,
  SNAPSHOT_FORMAT,
  PaintDecoder
} from "./index-6pn8cpem.js";

// painted-score.ts
class PaintedScore {
  box;
  surface;
  disposed = false;
  constructor(box, surface) {
    this.box = box;
    this.surface = surface;
  }
  dispose() {
    if (this.disposed) {
      return;
    }
    this.disposed = true;
    if (!this.box.isPainted) {
      return;
    }
    this.surface?.dispose();
    this.box.dispose();
  }
}

// snapshot-painter.ts
class SnapshotPainter {
  config;
  constructor(config) {
    this.config = config;
  }
  paint(snapshot, container) {
    this.check(snapshot);
    const config = this.config;
    const box = ScoreBox.open(container, {
      height: config.height,
      maxHeight: config.maxHeight,
      width: config.width,
      maxWidth: config.maxWidth,
      backgroundColor: config.backgroundColor,
      fit: config.layout?.type !== "panoramic" && config.width == null && config.maxWidth == null
    });
    const engraving = snapshot.engraving;
    if (!engraving) {
      return new PaintedScore(box, null);
    }
    const ink = new Ink(config.fonts?.notation?.color ?? null, config.fonts?.text?.color ?? null);
    const { width, height, origin, scale } = engraving;
    box.size(width, height, scale);
    const dpr = (config.pixelRatio ?? (window.devicePixelRatio || 1)) * scale;
    const surface = new TiledSurface(box.base, {
      scale: dpr,
      tileSize: TILE_SIZE,
      budget: TILE_BUDGET,
      ink
    });
    const ops = new PaintDecoder(snapshot.paint, snapshot.outlines).decode(engraving.ops);
    surface.load(ops, width, height, {
      x: Math.round(origin[0] * dpr) / dpr,
      y: -Math.round(-origin[1] * dpr) / dpr
    });
    const shown = box.renderedSize();
    surface.fit(shown.width, shown.height);
    surface.show(this.view(box, width, height));
    box.mark(ScoreBox.paintKey(SnapshotFingerprint.of(snapshot), dpr, ink));
    return new PaintedScore(box, surface);
  }
  check(snapshot) {
    if (snapshot?.format !== SNAPSHOT_FORMAT) {
      throw new SnapshotMismatchError2("format", "paint: the input is not a vexml score snapshot");
    }
    if (snapshot.version !== SNAPSHOT_VERSION2) {
      throw new SnapshotMismatchError2("version", `paint: the snapshot is version ${snapshot.version}, this vexml reads ${SNAPSHOT_VERSION2}`);
    }
  }
  view(box, width, height) {
    const r = box.base.getBoundingClientRect();
    const sx = r.width / (width || 1);
    const sy = r.height / (height || 1);
    const port = (this.config.scrollContainer ?? box.container).getBoundingClientRect();
    const x0 = Math.max(port.left, 0);
    const y0 = Math.max(port.top, 0);
    const w = Math.max(0, Math.min(port.right, window.innerWidth) - x0);
    const h = Math.max(0, Math.min(port.bottom, window.innerHeight) - y0);
    return sx > 0 && sy > 0 ? new Rect2((x0 - w - r.left) / sx, (y0 - h - r.top) / sy, 3 * w / sx, 3 * h / sy) : Rect2.zero();
  }
}

// paint.ts
function paint(snapshot, container, config = {}) {
  return new SnapshotPainter(config).paint(snapshot, container);
}
export {
  SNAPSHOT_VERSION2 as SNAPSHOT_VERSION,
  SnapshotMismatchError2 as SnapshotMismatchError,
  paint
};
