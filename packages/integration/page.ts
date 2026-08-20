import {
	type CursorController,
	type Note,
	render,
	type Score,
	type TabPosition,
} from '@stringsync/vexml';

// The browser half of the tests: the <script> of index.html, the page renderer.ts drives.
// A test's `fn` crosses into the page as source text (Function#toString), so it cannot
// close over test-scope values or Node imports — anything a test needs in the page lives
// here, on `window`. The helpers hold the loops and scans so the tests themselves stay
// straight-line: render, call a helper, assert on literals.

declare global {
	interface Window {
		render: typeof render;
		/** Hover-scan the canvas, then toggle the given decoration on every target found. */
		decorateAllTargets(
			score: Score,
			container: HTMLDivElement,
			mode: 'color' | 'halo',
		): number;
		/** Dispatch pointerdown down the canvas's vertical center line and report the hits. */
		sweepPointerDown(
			score: Score,
			container: HTMLDivElement,
		): {
			types: string[];
			firstPoint: { x: number; y: number };
			pointCount: number;
			width: number;
		};
		/** Add a content and a viewport layer, shrink the container, and report both sizings. */
		viewportLayerResize(
			score: Score,
			container: HTMLDivElement,
		): Promise<{
			before: {
				contentW: number;
				baseW: number;
				viewportW: number;
				clientW: number;
			};
			after: { viewportW: number; clientW: number; resizes: number };
		}>;
		/** Outline every measure box on a content layer and list the notes/frets escaping theirs. */
		measureBoxViolations(score: Score): string[];
		/** Each sequence step's start time, rounded to whole ms. */
		stepStartsMs(score: Score): number[];
		/** Each sequence step's measure index, in playback (jump) order. */
		stepMeasureIndexes(score: Score): Array<number | undefined>;
		/** Each sequence step's start beat and the sorted pitches sounding through it. */
		stepBeats(
			score: Score,
		): Array<{ startBeat: number | undefined; active: Array<string | null> }>;
		/** Classify every adjacent step pair into started/sustained/stopped pitch lists. */
		sequenceTransitions(score: Score): {
			length: number;
			transitions: Array<{
				started: Array<string | null>;
				sustained: Array<string | null>;
				stopped: Array<string | null>;
			}>;
		};
		/** The sorted pitches of the cursor's currently highlighted elements. */
		highlightedPitches(cursor: CursorController): Array<string | null>;
		/** Color every note the cursor highlights, on every change, until disposed. */
		colorHighlightedOnChange(cursor: CursorController, color: string): void;
		/** Walk the cursor over the whole piece and aggregate every grace note encountered. */
		graceNoteStats(score: Score): {
			count: number;
			minX: number;
			minW: number;
			missingPitch: number;
			missingFret: number;
		};
	}
}

window.render = render;

window.decorateAllTargets = (score, container, mode) => {
	const canvas = container.querySelector('canvas');
	if (!canvas) {
		throw new Error('canvas not found');
	}
	// Hover the whole canvas to collect every decoratable target under the pointer
	// (noteheads and tab frets), deduped by identity.
	const targets = new Set<Note | TabPosition>();
	score.events.on('pointermove', (e) => {
		if (e.target?.type === 'note' || e.target?.type === 'tab-position') {
			targets.add(e.target as Note | TabPosition);
		}
	});
	const rect = canvas.getBoundingClientRect();
	for (let dy = 2; dy < rect.height; dy += 4) {
		for (let dx = 2; dx < rect.width; dx += 4) {
			canvas.dispatchEvent(
				new PointerEvent('pointermove', {
					clientX: rect.left + dx,
					clientY: rect.top + dy,
					bubbles: true,
				}),
			);
		}
	}
	for (const target of targets) {
		if (mode === 'color') {
			target.color.on('#2962ff');
		} else {
			target.halo.on('rgba(41, 98, 255, 0.35)');
		}
	}
	return targets.size;
};

window.sweepPointerDown = (score, container) => {
	const canvas = container.querySelector('canvas');
	if (!canvas) {
		throw new Error('canvas not found');
	}
	const types = new Set<string>();
	const points: Array<{ x: number; y: number }> = [];
	score.events.on('pointerdown', (e) => {
		if (e.target) {
			types.add(e.target.type);
		}
		points.push({ x: e.point.x, y: e.point.y });
	});
	// Scan down the vertical center line so the stave is crossed wherever the crop
	// places it — robust to the exact engraved height.
	const rect = canvas.getBoundingClientRect();
	const cx = rect.left + rect.width / 2;
	for (let dy = 4; dy < rect.height; dy += 4) {
		canvas.dispatchEvent(
			new PointerEvent('pointerdown', {
				clientX: cx,
				clientY: rect.top + dy,
				bubbles: true,
			}),
		);
	}
	return {
		types: [...types],
		firstPoint: points[0] ?? { x: -1, y: -1 },
		pointCount: points.length,
		width: rect.width,
	};
};

window.viewportLayerResize = async (score, container) => {
	const base = container.querySelector('canvas');
	if (!base) {
		throw new Error('base canvas not found');
	}
	const content = score.addLayer('content');
	const viewport = score.addLayer('viewport');
	const before = {
		contentW: parseFloat(content.ctx.canvas.style.width),
		baseW: parseFloat(base.style.getPropertyValue('--vexml-width')),
		viewportW: parseFloat(viewport.ctx.canvas.style.width),
		clientW: container.clientWidth,
	};

	// Shrink the container and wait for the resize to propagate to the viewport layer.
	let resizes = 0;
	const settled = new Promise<void>((resolve) => {
		score.events.on('resize', () => {
			resizes++;
			if (
				parseFloat(viewport.ctx.canvas.style.width) === container.clientWidth &&
				container.clientWidth < before.clientW
			) {
				resolve();
			}
		});
	});
	container.style.width = '300px';
	await Promise.race([settled, new Promise<void>((r) => setTimeout(r, 3000))]);

	return {
		before,
		after: {
			viewportW: parseFloat(viewport.ctx.canvas.style.width),
			clientW: container.clientWidth,
			resizes,
		},
	};
};

window.measureBoxViolations = (score) => {
	// Outline every measure box on a content layer (score space) for visual review.
	const layer = score.addLayer('content');
	layer.ctx.strokeStyle = '#e53935';
	layer.ctx.lineWidth = 1;

	const bad: string[] = [];
	for (const box of score.getElements().measureBoxes()) {
		const r = box.rect;
		layer.ctx.strokeRect(r.x, r.y, r.w, r.h);
		// Every notehead and its tab fret must sit inside the box.
		for (const measure of box.getMeasures()) {
			for (const voice of measure.getVoices()) {
				for (const note of voice.getNotes()) {
					if (!r.containsRect(note.rect)) {
						bad.push(
							`note ${note.getPitch()} escapes measure ${box.getNumber()}`,
						);
					}
					const tab = note.getTabPosition();
					if (tab && !r.containsRect(tab.rect)) {
						bad.push(
							`fret ${tab.getFret()} escapes measure ${box.getNumber()}`,
						);
					}
				}
			}
		}
	}
	return bad;
};

window.stepStartsMs = (score) => {
	const seq = score.getSequence();
	const steps: number[] = [];
	for (let i = 0; i < seq.length; i++) {
		steps.push(Math.round(seq.getStep(i)?.startMs ?? -1));
	}
	return steps;
};

window.stepMeasureIndexes = (score) => {
	const seq = score.getSequence();
	const order: Array<number | undefined> = [];
	for (let i = 0; i < seq.length; i++) {
		order.push(seq.getStep(i)?.measureIndex);
	}
	return order;
};

window.stepBeats = (score) => {
	const seq = score.getSequence();
	const steps = [];
	for (let i = 0; i < seq.length; i++) {
		const step = seq.getStep(i);
		steps.push({
			startBeat: step?.startBeat,
			active: (step?.active ?? []).map((n) => n.getPitch()).sort(),
		});
	}
	return steps;
};

window.sequenceTransitions = (score) => {
	const seq = score.getSequence();
	const pitches = (notes: ReadonlyArray<{ getPitch(): string | null }>) =>
		notes.map((n) => n.getPitch()).sort();
	const transitions = [];
	for (let i = 1; i < seq.length; i++) {
		const t = seq.classify(i - 1, i);
		transitions.push({
			started: pitches(t.started),
			sustained: pitches(t.sustained),
			stopped: pitches(t.stopped),
		});
	}
	return { length: seq.length, transitions };
};

window.highlightedPitches = (cursor) =>
	cursor
		.getHighlightedElements()
		.map((n) => n.getPitch())
		.sort();

window.colorHighlightedOnChange = (cursor, color) => {
	cursor.events.on('change', (e) => {
		for (const n of e.highlighted) {
			n.color.on(color);
		}
	});
};

window.graceNoteStats = (score) => {
	const cursor = score.createCursor();
	const found: Array<{
		pitch: string | null;
		hasFret: boolean;
		x: number;
		w: number;
	}> = [];
	cursor.events.on('change', (e) => {
		for (const n of e.started) {
			for (const g of n.getGraceNotes()) {
				found.push({
					pitch: g.getPitch(),
					hasFret: g.getTabPosition() !== null,
					x: g.rect.x,
					w: g.rect.w,
				});
			}
		}
	});
	const duration = score.getDurationMs();
	for (let t = 0; t <= duration; t += duration / 200) {
		cursor.seekMs(t);
	}
	return {
		count: found.length,
		minX: Math.min(...found.map((g) => g.x)),
		minW: Math.min(...found.map((g) => g.w)),
		missingPitch: found.filter((g) => g.pitch === null).length,
		missingFret: found.filter((g) => !g.hasFret).length,
	};
};
