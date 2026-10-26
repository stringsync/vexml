import type { InkMask } from '@vexml/renderer';
import { Rect } from 'webappwiz/geometry';
import { InkMap } from './ink-map';
import type { Finding } from './render-lint';

/** Compares independently rasterized elements. Bounding boxes only choose candidates;
 * a finding requires a pixel opaque in both masks. */
export class InkCollisions {
	private readonly masks: Array<{ source: InkMask; box: Rect; ink: InkMap }>;

	constructor(masks: readonly InkMask[]) {
		this.masks = masks
			.map((source) => {
				const pixels = new Uint8Array(source.width * source.height);
				for (let i = 0; i < source.runs.length; i += 2) {
					const start = source.runs[i] ?? 0;
					pixels.fill(1, start, start + (source.runs[i + 1] ?? 0));
				}
				return {
					source,
					box: new Rect(source.x, source.y, source.width, source.height),
					ink: new InkMap(source.width, source.height, pixels),
				};
			})
			.sort((a, b) => a.box.left - b.box.left);
	}

	findings(): Finding[] {
		const findings: Finding[] = [];
		for (const [i, a] of this.masks.entries()) {
			for (let j = i + 1; j < this.masks.length; j++) {
				const b = this.masks[j];
				if (!b || b.box.left >= a.box.right) {
					break;
				}
				if (allowed(a.source, b.source)) {
					continue;
				}
				const candidate = a.box.intersection(b.box);
				if (!candidate) {
					continue;
				}
				let left = Infinity;
				let top = Infinity;
				let right = -Infinity;
				let bottom = -Infinity;
				for (let y = candidate.top; y < candidate.bottom; y++) {
					for (let x = candidate.left; x < candidate.right; x++) {
						if (
							!a.ink.isInk(x - a.box.x, y - a.box.y) ||
							!b.ink.isInk(x - b.box.x, y - b.box.y)
						) {
							continue;
						}
						left = Math.min(left, x);
						top = Math.min(top, y);
						right = Math.max(right, x + 1);
						bottom = Math.max(bottom, y + 1);
					}
				}
				if (left < right) {
					findings.push({
						kind: 'collision',
						message: `${a.source.kind} ink overlaps ${b.source.kind} ink`,
						box: new Rect(left, top, right - left, bottom - top),
					});
				}
			}
		}
		return findings;
	}
}

function allowed(a: InkMask, b: InkMask): boolean {
	if (
		a.id === b.id ||
		a.parent === b.id ||
		b.parent === a.id ||
		a.ancestors?.includes(b.id) ||
		b.ancestors?.includes(a.id)
	) {
		return true;
	}
	if (a.kind === 'notehead' && b.kind === 'notehead') {
		if (a.parent !== undefined && a.parent === b.parent) {
			return true;
		}
		if (
			a.x === b.x &&
			a.y === b.y &&
			a.width === b.width &&
			a.height === b.height &&
			a.runs.length === b.runs.length &&
			a.runs.every((value, i) => value === b.runs[i])
		) {
			return true;
		}
	}
	const alias: Record<string, string> = {
		curve: 'slur',
		gracenote: 'stavenote',
		stavetie: 'tie',
	};
	const pair = [alias[a.kind] ?? a.kind, alias[b.kind] ?? b.kind]
		.sort()
		.join(':');
	return ALLOWED.has(pair);
}

// These contacts construct notation; other pairs must have disjoint opaque ink.
const ALLOWED = new Set([
	'accidental:stave',
	'stave:stave',
	'stavebarline:staveconnector',
	'staveconnector:tie',
	'staveconnector:stavetie',
	'staveconnector:stavenote',
	'slur:staveconnector',
	'dot:notehead',
	'glissando:stavebarline',
	'glissando:stavenote',
	'repeat-wing:stave',
	'repeat-wing:stavebarline',
	'repeat-wing:staveconnector',
	'beam:stave',
	'flag:notehead',
	'flag:stave',
	'flag:stem',
	'glissando:stave',
	'measure-style:stave',
	'measure-style:stem',
	'measure-style:stavebarline',
	'multi-rest:stave',
	'notehead:stavenote',
	'notehead:tie',
	'rest:stave',
	'slide:stave',
	'slur:stave',
	'slur:stavebarline',
	'stave:staveconnector',
	'stave:stavetie',
	'stave:tie',
	'stave:time-signature',
	'stavebarline:stavebarline',
	'stavebarline:tie',
	'staveconnector:staveconnector',
	'stavenote:stavenote',
	'stavenote:stem',
	'stem:stem',
	'stem:tie',
	'beam:stem',
	'notehead:stem',
	'notehead:stavetie',
	'notehead:stave',
	'clef:stave',
	'keysignature:stave',
	'stave:stavebarline',
	'stave:stavenote',
	'stave:stem',
	'stave:tabnote',
	'stave:timesignature',
]);
