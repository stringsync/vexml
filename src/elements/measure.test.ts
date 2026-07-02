import { describe, expect, it } from 'bun:test';
import { MDOMParser } from '@stringsync/mdom';
import { Rect } from '../geometry';
import type { Viewport } from '../host/stage';
import { isHighlightable, isPlayable } from './element';
import { Measure } from './measure';

class FakeViewport implements Viewport {
	clientRectOf(rect: Rect): DOMRect {
		return { x: rect.x, y: rect.y, width: rect.w, height: rect.h } as DOMRect;
	}
	toScoreSpace(clientX: number, clientY: number): { x: number; y: number } {
		return { x: clientX, y: clientY };
	}
}

const XML = `<?xml version="1.0"?>
<score-partwise version="4.0">
  <part-list><score-part id="P1"><part-name>M</part-name></score-part></part-list>
  <part id="P1">
    <measure number="1">
      <attributes><divisions>1</divisions></attributes>
      <note><pitch><step>C</step><octave>4</octave></pitch><duration>1</duration><type>quarter</type></note>
    </measure>
  </part>
</score-partwise>`;

function fixture() {
	const mdoc = new MDOMParser().parseFromString(XML);
	const mmeasure = mdoc.score.parts[0]?.measures[0];
	if (!mmeasure) {
		throw new Error('fixture: missing measure');
	}
	return new Measure(new Rect(0, 0, 200, 100), new FakeViewport(), '1', 0, [
		mmeasure,
	]);
}

describe('Measure', () => {
	it('exposes its printed number and stable index', () => {
		const measure = fixture();
		expect(measure.getNumber()).toBe('1');
		expect(measure.getIndex()).toBe(0);
		expect(measure.type).toBe('measure');
	});

	it('getSources returns the mdom measures it spans', () => {
		const measure = fixture();
		expect(measure.getSources()).toHaveLength(1);
		expect(measure.getSources()[0]?.tag).toBe('measure');
	});

	it('is neither highlightable nor playable in v1', () => {
		const measure = fixture();
		expect(isHighlightable(measure)).toBe(false);
		expect(isPlayable(measure)).toBe(false);
	});
});
