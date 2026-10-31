import type { Measure as MMeasure, Part as MPart } from '@stringsync/mdom';
import { Rect } from 'core/geometry';
import type { ElementIndex } from './element-index';

/** A step-entry insertion point. Onset is in quarter-note beats from the measure start. */
export interface EditingCaret {
	readonly part: MPart;
	readonly voice: string;
	readonly staff: number;
	readonly measure: MMeasure;
	readonly onset: number;
}

/** Resolve a document target against this render without changing the document. */
export function editingCaretRect(
	index: ElementIndex,
	target: EditingCaret,
): Rect | null {
	const measure = index
		.parts()
		.find((part) => part.getSources().includes(target.part))
		?.getMeasures()
		.find((candidate) => candidate.getSources().includes(target.measure));
	const stave = measure
		?.getStaves()
		.find((candidate) => candidate.getNumber() === target.staff);
	if (!stave) {
		return null;
	}

	const notes = target.measure.notes.flatMap((note) => {
		const onset = note.measureBeat;
		const element = index.noteLookup.get(note);
		return onset === null || !element ? [] : [{ onset, x: element.rect.x }];
	});
	const xByOnset = new Map<number, number>();
	for (const note of notes) {
		xByOnset.set(
			note.onset,
			Math.min(xByOnset.get(note.onset) ?? Infinity, note.x),
		);
	}
	const points = [...xByOnset]
		.map(([onset, x]) => ({ onset, x }))
		.sort((a, b) => a.onset - b.onset);
	const exact = points.find((point) => point.onset === target.onset);
	const previous = points.findLast((point) => point.onset < target.onset);
	const next = points.find((point) => point.onset > target.onset);
	const start = { onset: 0, x: stave.getNoteStartX() };
	const end = { onset: target.measure.endBeat, x: stave.getRect().right };
	const left = previous ?? start;
	const right = next ?? end;
	let x = exact?.x ?? start.x;
	if (!exact && right.onset > left.onset) {
		const ratio = (target.onset - left.onset) / (right.onset - left.onset);
		x = left.x + Math.max(0, Math.min(1, ratio)) * (right.x - left.x);
	} else if (!exact && target.onset > left.onset) {
		x = end.x;
	}
	const rect = stave.getRect();
	return new Rect(x, rect.y, 0, rect.h);
}
