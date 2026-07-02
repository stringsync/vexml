import { describe, expect, it } from 'bun:test';
import { MDOMParser, MElement } from '@stringsync/mdom';
import type { ChordFrame } from '../engraving/chord-diagram-glyph';
import { Rect } from '../geometry';
import type { Viewport } from '../host/stage';
import { ChordDiagram } from './chord-diagram';
import {
	type Decoratable,
	type Decoration,
	isHighlightable,
	isPlayable,
} from './element';

class FakeViewport implements Viewport {
	clientRectOf(rect: Rect): DOMRect {
		return { x: rect.x, y: rect.y, width: rect.w, height: rect.h } as DOMRect;
	}
	toScoreSpace(clientX: number, clientY: number): { x: number; y: number } {
		return { x: clientX, y: clientY };
	}
}

class FakeDecoration implements Decoration {
	readonly active = new Map<Decoratable, string>();
	set(target: Decoratable, color: string | null): void {
		if (color === null) {
			this.active.delete(target);
		} else {
			this.active.set(target, color);
		}
	}
	has(target: Decoratable): boolean {
		return this.active.has(target);
	}
}

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

function fixture() {
	const mdoc = new MDOMParser().parseFromString(XML);
	const source = mdoc.score.parts[0]?.measures[0]?.children.find(
		(c): c is MElement => c instanceof MElement && c.tag === 'harmony',
	);
	if (!source) {
		throw new Error('fixture: missing harmony');
	}
	const frame: ChordFrame = {
		chord: [
			[1, 0],
			[2, 1],
			[3, 0],
		],
	};
	const decorations = {
		color: new FakeDecoration(),
		halo: new FakeDecoration(),
	};
	const diagram = new ChordDiagram(
		new Rect(40, 5, 75, 90),
		new FakeViewport(),
		{
			source,
			frame,
			title: 'C',
			decorations,
		},
	);
	return { diagram, source, frame, decorations };
}

describe('ChordDiagram', () => {
	it('exposes its title, frame, and harmony source', () => {
		const { diagram, source, frame } = fixture();
		expect(diagram.type).toBe('chord-diagram');
		expect(diagram.getTitle()).toBe('C');
		expect(diagram.getFrame()).toBe(frame);
		expect(diagram.getSources()).toEqual([source]);
	});

	it('is highlightable but not playable', () => {
		const { diagram } = fixture();
		expect(isHighlightable(diagram)).toBe(true);
		expect(isPlayable(diagram)).toBe(false);
	});

	it('color toggle delegates to its decoration', () => {
		const { diagram, decorations } = fixture();
		diagram.color.on('#2962ff');
		expect(decorations.color.active.get(diagram)).toBe('#2962ff');
		expect(diagram.color.active).toBe(true);
	});
});
