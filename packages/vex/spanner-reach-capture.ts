import type { InkMask, VexmlContext } from '@vexml/renderer';
import type { PxBox, SourceSpan } from './spanner-reach';

/** What the page hands back: the ink, the source spanners and where the systems are. */
export interface ReachCapture {
	masks: InkMask[];
	spans: SourceSpan[];
	systems: Array<{ index: number; box: PxBox }>;
	/** The capture's device pixel ratio, which the tolerances scale by. */
	ratio: number;
}

// Runs in the browser via toString(), so it stays self-contained: no closing over module
// scope. Reads the spanners off the MusicXML the score was rendered from, then places each
// end on the note the render drew.
export function reachCapture({ score, inkMasks }: VexmlContext): ReachCapture {
	// Snapshotting the ink finishes a progressive render before measuring it.
	const masks = inkMasks();
	const origin = document.getElementById('screenshot')?.getBoundingClientRect();
	const ratio = window.devicePixelRatio;
	const boxOf = (element: { getBoundingClientRect(): DOMRect }): PxBox => {
		const rect = element.getBoundingClientRect();
		return {
			x: (rect.x - (origin?.x ?? 0)) * ratio,
			y: (rect.y - (origin?.y ?? 0)) * ratio,
			w: rect.width * ratio,
			h: rect.height * ratio,
		};
	};
	const index = score.getElements();
	const placed = new Map<
		unknown,
		{
			box: PxBox;
			system: number;
			measure: unknown;
			beat: number;
			staff: string;
		}
	>();
	for (const note of index.notes()) {
		const source = note.getSources()[0];
		if (!source || note.isGrace()) {
			continue;
		}
		placed.set(source, {
			box: boxOf(note),
			system: note.getMeasure().getBox().getSystem().getIndex(),
			measure: source.measure,
			beat: source.measureBeat ?? 0,
			staff: source.staff,
		});
	}
	const spans: SourceSpan[] = [];
	const noteSpan = (
		kind: 'slur' | 'tie',
		marker: { note: unknown; partner: { note: unknown } | null },
		measure: string,
	) => {
		const start = placed.get(marker.note);
		const stop = placed.get(marker.partner?.note);
		if (start && stop) {
			spans.push({
				kind,
				measure,
				start: { box: start.box, system: start.system },
				stop: { box: stop.box, system: stop.system },
			});
		}
	};
	for (const note of index.notes()) {
		const source = note.getSources()[0];
		if (!source || note.isGrace()) {
			continue;
		}
		const measure = source.measure.number;
		for (const slur of source.slurs) {
			if (slur.slurType === 'start') {
				noteSpan('slur', slur, measure);
			}
		}
		for (const tie of source.ties) {
			if (tie.tieType === 'start') {
				noteSpan('tie', tie, measure);
			}
		}
	}
	// A hairpin hangs off a direction, so each end lands on the same-staff note vexml draws it on.
	const nearest = (measure: unknown, staff: string, beat: number) => {
		let best: (typeof placed extends Map<unknown, infer V> ? V : never) | null =
			null;
		for (const candidate of placed.values()) {
			if (candidate.measure !== measure || candidate.staff !== staff) {
				continue;
			}
			// Vexml opens and closes a hairpin on the first note at or after its beat, or the last
			// before it when none follows.
			const after = candidate.beat >= beat;
			const bestAfter = best !== null && best.beat >= beat;
			const closer = after
				? !bestAfter || candidate.beat < (best?.beat ?? 0)
				: !bestAfter && candidate.beat > (best?.beat ?? 0);
			if (!best || closer) {
				best = candidate;
			}
		}
		return best;
	};
	for (const measure of index.measures()) {
		for (const source of measure.getSources()) {
			for (const direction of source.directions) {
				for (const wedge of direction.wedges) {
					const partner = wedge.partner;
					if (
						(wedge.wedgeType !== 'crescendo' &&
							wedge.wedgeType !== 'diminuendo') ||
						!partner
					) {
						continue;
					}
					const start = nearest(
						source,
						direction.staff,
						wedge.measureBeat ?? 0,
					);
					const stop = nearest(
						partner.measure,
						partner.direction.staff,
						partner.measureBeat ?? 0,
					);
					if (start && stop) {
						spans.push({
							kind: 'hairpin',
							measure: source.number,
							start: { box: start.box, system: start.system },
							stop: { box: stop.box, system: stop.system },
						});
					}
				}
			}
		}
	}
	const systems = index.systems().map((system) => ({
		index: system.getIndex(),
		box: boxOf(system),
	}));
	return { masks, spans, systems, ratio };
}
