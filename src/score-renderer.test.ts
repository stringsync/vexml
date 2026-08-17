import { describe, expect, it } from 'bun:test';
import { DEFAULT_CONFIG } from './config';
import { renderer } from './score-renderer-harness';

describe('ScoreRenderer', () => {
	it('rejects a negative minLastSystemFill before doing any work', async () => {
		const { scoreRenderer, fontLoader, parser } = renderer({
			minLastSystemFill: -0.1,
		});
		await expect(scoreRenderer.render('<xml/>')).rejects.toThrow(RangeError);
		expect(fontLoader.calls).toHaveLength(0);
		expect(parser.parses).toBe(0);
	});

	it('rejects a minLastSystemFill above 1 before doing any work', async () => {
		const { scoreRenderer, fontLoader, parser } = renderer({
			minLastSystemFill: 1.1,
		});
		await expect(scoreRenderer.render('<xml/>')).rejects.toThrow(RangeError);
		expect(fontLoader.calls).toHaveLength(0);
		expect(parser.parses).toBe(0);
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
