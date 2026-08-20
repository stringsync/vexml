import type { Score } from '@stringsync/vexml';

/** Attach the built-in bar view and seek `pct` of the way through the piece — a
 * deterministic spot independent of the note count. */
export function seekPlayhead(
	score: Score,
	_container: HTMLDivElement,
	pct: number,
) {
	const cursor = score.createCursor();
	cursor.sync(score.createPlayhead({ color: '#2962ff', widthPx: 3 }));
	cursor.seekMs(score.getDurationMs() * pct);
}

/** Like seekPlayhead, but also color everything the cursor highlights on the way. */
export function seekPlayheadColoring(
	score: Score,
	_container: HTMLDivElement,
	pct: number,
) {
	const cursor = score.createCursor();
	cursor.sync(score.createPlayhead({ color: '#2962ff', widthPx: 3 }));
	cursor.events.on('change', (e) => {
		for (const n of e.highlighted) {
			n.color.on('#155dfc');
		}
	});
	cursor.seekMs(score.getDurationMs() * pct);
}

/** Walk the cursor over every onset and aggregate every grace note encountered. */
export function graceNoteStats(score: Score) {
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
	for (const step of score.getSequence().getSteps()) {
		cursor.seekMs(step.startMs);
	}
	return {
		count: found.length,
		minX: Math.min(...found.map((g) => g.x)),
		minW: Math.min(...found.map((g) => g.w)),
		missingPitch: found.filter((g) => g.pitch === null).length,
		missingFret: found.filter((g) => !g.hasFret).length,
	};
}

/** Every step transition, classified: which pitches started, sustained, stopped. */
export function tieTransitions(score: Score) {
	const seq = score.getSequence();
	const pitches = (notes: ReadonlyArray<{ getPitch(): string | null }>) =>
		notes.map((n) => n.getPitch()).sort();
	const transitions = seq
		.getSteps()
		.slice(1)
		.map((step) => {
			const t = seq.classify(step.index - 1, step.index);
			return {
				started: pitches(t.started),
				sustained: pitches(t.sustained),
				stopped: pitches(t.stopped),
			};
		});
	return { length: seq.length, transitions };
}

/** Seek into the tied-to chord (75%), then to the end: what sounds, and what's left. */
export function tiedChordHighlight(score: Score) {
	const cursor = score.createCursor();
	const pitches = () =>
		cursor
			.getHighlightedElements()
			.map((n) => n.getPitch())
			.sort();
	const dur = score.getDurationMs();
	cursor.seekMs(dur * 0.75); // within the 2nd chord's step
	const sounding = pitches();
	cursor.seekMs(dur); // done
	return { sounding, whenDone: pitches().length };
}

/** The expanded playback order plus the un-expanded measure count and where M2's first
 * pass lands. */
export function repeatExpansion(score: Score) {
	const seq = score.getSequence();
	return {
		order: seq.getSteps().map((step) => step.measureIndex),
		measureCount: seq.getMeasureCount(),
		// A repeated measure's cursor lands on its first pass, not its last.
		firstStepOfM2: seq.getFirstStepOfMeasure(1),
	};
}

/** Just the expanded playback order, one measureIndex per step. */
export function stepMeasureIndexes(score: Score) {
	return score
		.getSequence()
		.getSteps()
		.map((step) => step.measureIndex);
}

/** Each step's start beat and the pitches sounding through it. */
export function stepActivePitches(score: Score) {
	return score
		.getSequence()
		.getSteps()
		.map((step) => ({
			startBeat: step.startBeat,
			active: step.active.map((n) => n.getPitch()).sort(),
		}));
}
