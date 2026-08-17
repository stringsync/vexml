import { DefaultDecoration } from './elements/decoration/default-decoration';
import { ColorStyle } from './elements/decoration-style/color-style';
import type { Element } from './elements/element';
import { ElementIndex } from './elements/element-index';
import { FakeHitTester } from './elements/hit-tester/fake-hit-tester';
import type { HitTester } from './elements/hit-tester/hit-tester';
import { MeasureBox } from './elements/measure-box';
import { System } from './elements/system';
import { ScoreReader } from './engraving/score-reader';
import type { Rect } from './geometry';
import { FakeHost } from './host/host/fake-host';
import type { Viewport } from './host/viewport/viewport';
import { SequenceFactory } from './playback/sequence-factory';
import { Score } from './score';

/* An empty timeline: these tests exercise events/layers/hover, not playback. */
export const EMPTY_SEQUENCE = new SequenceFactory(
	new ScoreReader(),
	[],
).createFromInput({
	measures: [],
	notes: [],
});

// Wrap a HitTester into the ElementIndex Score takes; these tests don't enumerate.
export function elementIndex(hitTester: HitTester): ElementIndex {
	return new ElementIndex(
		hitTester,
		new Map(),
		new Map(),
		new Map(),
		[],
		[],
		[],
	);
}

// A bare hit-target measure box: an empty system, no per-part measures.
export function measureBox(rect: Rect): MeasureBox {
	return new MeasureBox(
		rect,
		viewport,
		'1',
		0,
		[],
		new System(rect, viewport, 0, []),
		[],
	);
}

// A bare EventTarget has no DOM tree, so a synthetic Event with the coords the handler reads is
// enough to drive a pointer event through.
export class FakePointerEvent extends Event {
	constructor(
		type: string,
		readonly clientX: number,
		readonly clientY: number,
	) {
		super(type);
	}
}

export const viewport: Viewport = {
	clientRectOf: (r) => ({ x: r.x, y: r.y, width: r.w, height: r.h }) as DOMRect,
	toScoreSpace: (x, y) => ({ x, y }),
};

export function fixture(target: Element | null) {
	const host = new FakeHost();
	const index = new FakeHitTester(target);
	const decoration = new DefaultDecoration(host, new ColorStyle());
	const score = new Score(
		host,
		elementIndex(index),
		[decoration],
		EMPTY_SEQUENCE,
		host.scroller,
	);
	return { host, index, decoration, score };
}
