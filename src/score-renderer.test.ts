import { describe, expect, it } from 'bun:test';
import type { MDocument } from '@stringsync/mdom';
import type { FontConfig } from './config';
import { DEFAULT_CONFIG } from './config';
import { ElementFactory } from './elements/element-factory';
import { NoopFontLoader } from './engraving/fonts';
import { LayoutPlanner } from './engraving/layout-planner';
import { NoteTranslator } from './engraving/note-translator';
import { ScoreDrawer } from './engraving/score-drawer';
import { ScoreReader } from './engraving/score-reader';
import { SpannerBuilder } from './engraving/spanner-builder';
import type { Rect } from './geometry';
import type { Layer, LayerKind } from './host/stage';
import { SequenceFactory } from './playback/sequence-factory';
import type { ScoreParser } from './score-parser';
import { type RenderStage, ScoreRenderer } from './score-renderer';
import { FakeScroller } from './testing/fake-scroller';

// Separate fake classes fulfilling the injected seams (preferred over mocks).

// A headless stage: no DOM. The empty-parts path never touches container/base, so inert
// placeholders are enough; the Host surface mirrors score.test.ts's fake.
class FakeStage implements RenderStage {
	readonly container = {} as HTMLDivElement;
	readonly base = {} as HTMLCanvasElement;
	readonly events = new EventTarget();
	readonly scroll = { left: 0, top: 0 };
	readonly scroller = new FakeScroller();
	disposed = false;
	toScoreSpace(clientX: number, clientY: number): { x: number; y: number } {
		return { x: clientX, y: clientY };
	}
	observeResize(): () => void {
		return () => {};
	}
	observeScroll(): () => void {
		return () => {};
	}
	createLayer(_kind: LayerKind, _zIndex?: number): Layer {
		return {
			ctx: {} as CanvasRenderingContext2D,
			dispose() {},
		};
	}
	clientRectOf(rect: Rect): DOMRect {
		return { x: rect.x, y: rect.y, width: rect.w, height: rect.h } as DOMRect;
	}
	viewportRect(): DOMRect {
		return { x: 0, y: 0, width: 0, height: 0 } as DOMRect;
	}
	relayoutLayers(): void {}
	dispose(): void {
		this.disposed = true;
	}
}

class FakeScoreParser implements ScoreParser {
	parses = 0;
	async parse(): Promise<MDocument> {
		this.parses++;
		return { score: { parts: [] } } as unknown as MDocument;
	}
}

// A FontLoader that records its calls, to pin the fonts-before-parse ordering.
class RecordingFontLoader extends NoopFontLoader {
	calls: Array<FontConfig | undefined> = [];
	override load(
		container: HTMLElement,
		config?: FontConfig,
	): { notation: string; text: string } {
		this.calls.push(config);
		return super.load(container, config);
	}
}

function renderer(overrides?: { minLastSystemFill?: number }) {
	const config = { ...DEFAULT_CONFIG, ...overrides };
	const stage = new FakeStage();
	const fontLoader = new RecordingFontLoader();
	const parser = new FakeScoreParser();
	const translator = new NoteTranslator();
	const reader = new ScoreReader();
	const scoreRenderer = new ScoreRenderer(
		config,
		stage,
		fontLoader,
		parser,
		new LayoutPlanner(translator, reader),
		new ScoreDrawer(config, translator, reader, new SpannerBuilder()),
		new ElementFactory(),
		new SequenceFactory(reader),
	);
	return { scoreRenderer, stage, fontLoader, parser };
}

describe('ScoreRenderer', () => {
	it('rejects an out-of-range minLastSystemFill before doing any work', async () => {
		for (const minLastSystemFill of [-0.1, 1.1]) {
			const { scoreRenderer, fontLoader, parser } = renderer({
				minLastSystemFill,
			});
			await expect(scoreRenderer.render('<xml/>')).rejects.toThrow(RangeError);
			expect(fontLoader.calls).toHaveLength(0);
			expect(parser.parses).toBe(0);
		}
	});

	it('loads fonts (with the config fonts) before parsing', async () => {
		const { scoreRenderer, fontLoader, parser } = renderer();
		await scoreRenderer.render('<xml/>');
		expect(fontLoader.calls).toEqual([DEFAULT_CONFIG.fonts]);
		expect(parser.parses).toBe(1);
	});

	it('an empty-parts document renders an empty Score without drawing', async () => {
		const { scoreRenderer } = renderer();
		// FakeStage's base/container are inert placeholders: any layout or draw attempt
		// on the empty-parts path would crash on them, so resolving proves it was skipped.
		const score = await scoreRenderer.render('<xml/>');
		expect(score.getDurationMs()).toBe(0);
		expect(score.getDurationBeats()).toBe(0);
		expect(score.getMeasureCount()).toBe(0);
		expect(score.getElements().all()).toEqual([]);
		expect(score.getTimeAt({ x: 0, y: 0 })).toBeNull();
	});

	it('the returned Score owns the stage: dispose tears it down', async () => {
		const { scoreRenderer, stage } = renderer();
		const score = await scoreRenderer.render('<xml/>');
		score.dispose();
		expect(stage.disposed).toBe(true);
	});
});
