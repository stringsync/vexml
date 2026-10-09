import { Rect } from 'webappwiz/geometry';
import type { ConfigInput } from './config';
import { TILE_BUDGET, TILE_SIZE } from './constants';
import { Ink } from './ink';
import { PaintDecoder } from './paint-decoder';
import { PaintedScore } from './painted-score';
import { ScoreBox } from './score-box';
import {
	type ScoreSnapshot,
	SNAPSHOT_FORMAT,
	SNAPSHOT_VERSION,
} from './score-snapshot';
import { SnapshotFingerprint } from './snapshot-fingerprint';
import { SnapshotMismatchError } from './snapshot-mismatch-error';
import { TiledSurface } from './tiled-surface';

/*
 * Draws a snapshot's engraving into a container as render's Stage would, with none of what
 * render needs to make a Score of it: the same box, sized and scaled the same, its tiles at the
 * same device pixels, so the Stage of a later render over the same container adopts them as
 * they are (see Stage.engrave). Only the tiles in or near view are painted when the score is
 * too big to paint whole, as the Stage does. A sticky panoramic fold waits for render.
 */
export class SnapshotPainter {
	constructor(private readonly config: ConfigInput) {}

	paint(snapshot: ScoreSnapshot, container: HTMLDivElement): PaintedScore {
		this.check(snapshot);
		const config = this.config;
		const box = ScoreBox.open(container, {
			height: config.height,
			maxHeight: config.maxHeight,
			width: config.width,
			maxWidth: config.maxWidth,
			backgroundColor: config.backgroundColor,
			// As render derives it (see render.ts).
			fit:
				config.layout?.type !== 'panoramic' &&
				config.width == null &&
				config.maxWidth == null,
		});
		const engraving = snapshot.engraving;
		if (!engraving) {
			return new PaintedScore(box, null);
		}
		const ink = new Ink(
			config.fonts?.notation?.color ?? null,
			config.fonts?.text?.color ?? null,
		);
		const { width, height, origin, scale } = engraving;
		box.size(width, height, scale);
		const dpr = (config.pixelRatio ?? (window.devicePixelRatio || 1)) * scale;
		const surface = new TiledSurface(box.base, {
			scale: dpr,
			tileSize: TILE_SIZE,
			budget: TILE_BUDGET,
			ink,
		});
		const ops = new PaintDecoder(snapshot.paint, snapshot.outlines).decode(
			engraving.ops,
		);
		surface.load(ops, width, height, {
			x: Math.round(origin[0] * dpr) / dpr,
			y: -Math.round(-origin[1] * dpr) / dpr,
		});
		const shown = box.renderedSize();
		surface.fit(shown.width, shown.height);
		surface.show(this.view(box, width, height));
		box.mark(ScoreBox.paintKey(SnapshotFingerprint.of(snapshot), dpr, ink));
		return new PaintedScore(box, surface);
	}

	private check(snapshot: ScoreSnapshot): void {
		if (snapshot?.format !== SNAPSHOT_FORMAT) {
			throw new SnapshotMismatchError(
				'format',
				'paint: the input is not a vexml score snapshot',
			);
		}
		if (snapshot.version !== SNAPSHOT_VERSION) {
			throw new SnapshotMismatchError(
				'version',
				`paint: the snapshot is version ${snapshot.version}, this vexml reads ${SNAPSHOT_VERSION}`,
			);
		}
	}

	// The score-px region in or near view, as Stage.updateView measures it: what shows through
	// the window and the scroll box, and a view's worth on every side.
	private view(box: ScoreBox, width: number, height: number): Rect {
		const r = box.base.getBoundingClientRect();
		const sx = r.width / (width || 1);
		const sy = r.height / (height || 1);
		const port = (
			this.config.scrollContainer ?? box.container
		).getBoundingClientRect();
		const x0 = Math.max(port.left, 0);
		const y0 = Math.max(port.top, 0);
		const w = Math.max(0, Math.min(port.right, window.innerWidth) - x0);
		const h = Math.max(0, Math.min(port.bottom, window.innerHeight) - y0);
		return sx > 0 && sy > 0
			? new Rect(
					(x0 - w - r.left) / sx,
					(y0 - h - r.top) / sy,
					(3 * w) / sx,
					(3 * h) / sy,
				)
			: Rect.zero();
	}
}
