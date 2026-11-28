import { PNG } from 'pngjs';
import type { Box } from './engraving-ink';
import { formatSpaces } from './engraving-marks';
import type { Engraving } from './engraving-model';
import { must, quarters } from './engraving-render';

export function distance(
	e: Engraving,
	measure: number,
	left: number,
	right: number,
	label: string,
	y = (e.lines(measure)[0] ?? 0) - 7,
): number {
	const spaces = quarters(right - left, e.space(measure));
	e.marks.measure({
		kind: 'bracket',
		from: { x: left, y },
		to: { x: right, y },
		label: formatSpaces(spaces),
		note: `${label}: ${formatSpaces(spaces)} stave spaces`,
	});
	return spaces;
}

export function markBox(e: Engraving, box: Box, label: string): void {
	e.marks.measure({
		kind: 'box',
		from: { x: box.x, y: box.y },
		to: { x: box.x + box.w, y: box.y + box.h },
		label,
		note: label,
	});
}

export function barX(e: Engraving, measure: number): number {
	const rect = e.measureRect(measure);
	return rect.x + rect.w;
}

// The renderer can draw barlines in a connector or on a stave. Read the finished pixels
// in either case. Requiring nearly the full vertical span excludes note stems and dots.
export function strokes(
	e: Engraving,
	expectedX: number,
	top: number,
	bottom: number,
	radius = 16,
): Box[] {
	const png = PNG.sync.read(must(e.image, 'render'));
	const y1 = Math.ceil(top + e.shift.y + 2);
	const y2 = Math.floor(bottom + e.shift.y - 2);
	const x1 = Math.max(0, Math.floor(expectedX + e.shift.x - radius));
	const x2 = Math.min(png.width - 1, Math.ceil(expectedX + e.shift.x + radius));
	const boxes: Box[] = [];
	for (let x = x1; x <= x2; x++) {
		let dark = 0;
		for (let y = y1; y <= y2; y++) {
			const offset = (y * png.width + x) * 4;
			if (
				(png.data[offset] ?? 255) < 160 &&
				(png.data[offset + 3] ?? 0) > 128
			) {
				dark++;
			}
		}
		if (dark < (y2 - y1 + 1) * 0.9) {
			continue;
		}
		const left = x - e.shift.x;
		const last = boxes.at(-1);
		if (last && last.x + last.w === left) {
			last.w++;
		} else {
			boxes.push({ x: left, y: top, w: 1, h: bottom - top });
		}
	}
	return boxes;
}

// The mean red value of a stroke's lightest column over its span: 0 is solid black, and a
// stroke smeared across a pixel boundary reads in the grey 80s to 130s.
export function strokeShade(e: Engraving, box: Box): number {
	const png = PNG.sync.read(must(e.image, 'render'));
	const y1 = Math.ceil(box.y + e.shift.y + 2);
	const y2 = Math.floor(box.y + box.h + e.shift.y - 2);
	let lightest = 0;
	for (let x = box.x; x < box.x + box.w; x++) {
		let sum = 0;
		for (let y = y1; y <= y2; y++) {
			sum += png.data[(y * png.width + Math.round(x + e.shift.x)) * 4] ?? 255;
		}
		lightest = Math.max(lightest, sum / (y2 - y1 + 1));
	}
	return lightest;
}

export function boundaryStrokes(e: Engraving, measure: number): Box[] {
	const [top, , , , bottom] = e.lines(measure);
	return strokes(
		e,
		barX(e, measure),
		must(top, 'top line'),
		must(bottom, 'bottom line'),
		// A final barline's thin stroke sits 11px inside the measure's right edge.
		12,
	);
}

function symbols(e: Engraving, measure: number, ...kinds: string[]): Box[] {
	return kinds
		.flatMap((kind) => e.inMeasure(kind, measure))
		.map(({ box }) => box)
		.filter((box) => box.w > 0)
		.sort((a, b) => a.x - b.x);
}

export function symbol(e: Engraving, measure: number, ...kinds: string[]): Box {
	const boxes = symbols(e, measure, ...kinds);
	const first = must(boxes[0], kinds.join(' or '));
	const right = Math.max(...boxes.map(edge));
	return { ...first, w: right - first.x };
}

function edge(box: Box): number {
	return box.x + box.w;
}

export function centre(box: Box): number {
	return box.x + box.w / 2;
}

export function openingHead(e: Engraving, measure: number): Box {
	return must(e.headsIn(measure)[0], 'first note').head;
}

export function gap(
	e: Engraving,
	measure: number,
	left: Box,
	right: Box,
	label: string,
): number {
	return distance(e, measure, edge(left), right.x, label);
}

export function rhythmGaps(e: Engraving, measure: number): number[] {
	const events = [...e.headsIn(measure), ...e.restsIn(measure)].sort(
		(a, b) => centre(a.head) - centre(b.head),
	);
	return events
		.slice(0, -1)
		.map((event, index) =>
			distance(
				e,
				measure,
				centre(event.head),
				centre(must(events[index + 1], 'next event').head),
				`M${measure + 1} after ${event.beats} quarter-note beats`,
			),
		);
}

// The renderer's notehead mask includes its accidental. Find the ink to the left
// of the head among the masks that also cover that pitch's head.
export function accidentalEdge(e: Engraving, measure: number, head: Box): Box {
	const masks = symbols(e, measure, 'notehead').filter(
		(box) =>
			box.x < head.x - 2 &&
			edge(box) >= centre(head) &&
			box.y <= head.y + head.h / 2 &&
			box.y + box.h >= head.y + head.h / 2,
	);
	return must(masks[0], 'note mask including accidental');
}
