import type { InkMask } from '@vexml/renderer';
import { Rect } from 'webappwiz/geometry';
import type { Finding } from './render-lint';

/** Compares independently rasterized elements. Bounding boxes only choose candidates;
 * a finding requires a pixel opaque in both masks. */
export class InkCollisions {
	private readonly masks: Array<{ source: InkMask; box: Rect; order: number }>;

	constructor(masks: readonly InkMask[]) {
		this.masks = masks
			.map((source) => ({
				source,
				box: new Rect(source.x, source.y, source.width, source.height),
			}))
			.sort((a, b) => a.box.left - b.box.left)
			.map((mask, order) => ({ ...mask, order }))
			// A vertical sweep leaves completed systems behind on long scores.
			.sort((a, b) => a.box.top - b.box.top);
	}

	findings(): Finding[] {
		const found: Array<{ first: number; second: number; finding: Finding }> =
			[];
		for (const [i, a] of this.masks.entries()) {
			for (let j = i + 1; j < this.masks.length; j++) {
				const b = this.masks[j];
				if (!b || b.box.top >= a.box.bottom) {
					break;
				}
				const candidate = a.box.intersection(b.box);
				if (!candidate || allowed(a.source, b.source)) {
					continue;
				}
				const box = intersection(a.source, b.source, candidate);
				if (box) {
					// Preserve the historical left-to-right finding/message order.
					const [first, second] = a.order < b.order ? [a, b] : [b, a];
					found.push({
						first: first.order,
						second: second.order,
						finding: {
							kind: 'collision',
							message: `${first.source.kind} ink overlaps ${second.source.kind} ink`,
							box,
						},
					});
				}
			}
		}
		return found
			.sort((a, b) => a.first - b.first || a.second - b.second)
			.map(({ finding }) => finding);
	}
}

/** Compare sorted row spans without expanding a sparse owner to a full bitmap. */
function intersection(a: InkMask, b: InkMask, candidate: Rect): Rect | null {
	const aa = spans(a, candidate);
	const bb = spans(b, candidate);
	let av = aa.next();
	let bv = bb.next();
	let left = Infinity,
		top = Infinity,
		right = -Infinity,
		bottom = -Infinity;
	while (!av.done && !bv.done) {
		const [ay, al, ar] = av.value;
		const [by, bl, br] = bv.value;
		if (ay === by && al < br && bl < ar) {
			left = Math.min(left, Math.max(al, bl));
			right = Math.max(right, Math.min(ar, br));
			top = Math.min(top, ay);
			bottom = Math.max(bottom, ay + 1);
		}
		if (ay < by || (ay === by && ar <= br)) {
			av = aa.next();
		} else {
			bv = bb.next();
		}
	}
	return left < right ? new Rect(left, top, right - left, bottom - top) : null;
}

function* spans(
	mask: InkMask,
	candidate: Rect,
): Generator<[number, number, number]> {
	const first = (candidate.top - mask.y) * mask.width;
	const last = (candidate.bottom - mask.y) * mask.width;
	// Skip runs above the candidate, including those of score-wide parents.
	let lo = 0,
		hi = mask.runs.length / 2;
	while (lo < hi) {
		const mid = Math.floor((lo + hi) / 2);
		if ((mask.runs[mid * 2] ?? 0) + (mask.runs[mid * 2 + 1] ?? 0) <= first) {
			lo = mid + 1;
		} else {
			hi = mid;
		}
	}
	for (let i = lo * 2; i < mask.runs.length; i += 2) {
		const start = mask.runs[i] ?? 0;
		if (start >= last) {
			break;
		}
		const end = Math.min(last, start + (mask.runs[i + 1] ?? 0));
		for (let at = Math.max(first, start); at < end; ) {
			const row = Math.floor(at / mask.width);
			const next = Math.min(end, (row + 1) * mask.width);
			const left = Math.max(candidate.left, mask.x + at - row * mask.width);
			const right = Math.min(candidate.right, mask.x + next - row * mask.width);
			if (left < right) {
				yield [mask.y + row, left, right];
			}
			at = next;
		}
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
