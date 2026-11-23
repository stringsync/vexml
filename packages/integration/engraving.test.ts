import { describe, expect, it } from 'bun:test';
import type { VexmlContext } from '@vexml/renderer';
import { testing } from './setup';

// Geometry example, not an extracted rule: an original treble 4/4 measure.
// - M1: E4, G4, B4, D5 quarters ascend in pitch and move right in time.
// No explicit stems or positioning: the renderer supplies the defaults.
describe('ascending notehead placement', () => {
	it.concurrent('places ascending noteheads above and after their predecessors', async () => {
		const { result, image } = await testing.eval(
			'engraving/notehead-order.musicxml',
			{},
			collectNoteheadPositions,
		);
		expect(result).toEqual({
			count: 4,
			movesRight: [true, true, true],
			movesUp: [true, true, true],
		});
		expect(image).toMatchScreenshot('engraving_notehead_order.png');
	});
});

// Serialized into the browser: keep this function self-contained. Future rules
// return only the facts their assertions need; add no probe until one needs it.
function collectNoteheadPositions({ score }: VexmlContext) {
	const positions = score
		.getElements()
		.measureBoxes()
		.flatMap((box) =>
			box
				.getMeasures()
				.flatMap((measure) =>
					measure
						.getVoices()
						.flatMap((voice) =>
							voice
								.getNotes()
								.map((note) => ({ x: note.rect.x, y: note.rect.y })),
						),
				),
		);
	return {
		count: positions.length,
		movesRight: positions
			.slice(1)
			.map((point, index) => point.x > (positions[index]?.x ?? Infinity)),
		movesUp: positions
			.slice(1)
			.map((point, index) => point.y < (positions[index]?.y ?? -Infinity)),
	};
}
