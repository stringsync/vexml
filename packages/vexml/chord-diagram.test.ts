import { beforeEach, describe, expect, it } from 'bun:test';
import { type Harmony, MDOMParser } from '@stringsync/mdom';
import { Rect } from 'webappwiz/geometry';
import { ChordDiagram } from './chord-diagram';
import type { ChordFrame } from './chord-diagram-glyph';
import { isHighlightable, isPlayable } from './element';
import { FakeDecorations } from './fake-decorations';
import { FakeViewport } from './fake-viewport';

describe('ChordDiagram', () => {
	let source: Harmony;
	let frame: ChordFrame;
	let decorations: FakeDecorations;
	let diagram: ChordDiagram;

	beforeEach(() => {
		const mdoc = new MDOMParser().parseFromString(XML);
		const harmony = mdoc.score.parts[0]?.measures[0]?.harmonies[0];
		if (!harmony) {
			throw new Error('fixture: missing harmony');
		}
		source = harmony;
		frame = {
			chord: [
				[1, 0],
				[2, 1],
				[3, 0],
			],
		};
		decorations = new FakeDecorations();
		diagram = new ChordDiagram(new Rect(40, 5, 75, 90), new FakeViewport(), {
			source,
			frame,
			title: 'C',
			decorations,
		});
	});

	it('exposes its title, frame, and harmony source', () => {
		expect(diagram.type).toBe('chord-diagram');
		expect(diagram.getTitle()).toBe('C');
		expect(diagram.getFrame()).toBe(frame);
		expect(diagram.getSources()).toEqual([source]);
	});

	it('is highlightable but not playable', () => {
		expect(isHighlightable(diagram)).toBe(true);
		expect(isPlayable(diagram)).toBe(false);
	});

	it('color toggle delegates to its decoration', () => {
		diagram.color.on('#2962ff');
		expect(decorations.color.active.get(diagram)).toBe('#2962ff');
		expect(diagram.color.active).toBe(true);
	});
});

const XML = `<?xml version="1.0"?>
<score-partwise version="4.0">
  <part-list><score-part id="P1"><part-name>M</part-name></score-part></part-list>
  <part id="P1">
    <measure number="1">
      <attributes><divisions>1</divisions></attributes>
      <harmony><root><root-step>C</root-step></root><kind>major</kind></harmony>
      <note><pitch><step>C</step><octave>4</octave></pitch><duration>1</duration><type>quarter</type></note>
    </measure>
  </part>
</score-partwise>`;
