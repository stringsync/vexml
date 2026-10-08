import { describe, expect, it } from 'bun:test';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Metrics, MetricsDefaults } from 'vexflow/core';
import { MetricsPatch } from './metrics-patch';

describe('MetricsPatch', () => {
	it('is still needed: vexflow clones every font and style it hands out', async () => {
		// When this fails, vexflow stopped cloning: delete MetricsPatch and this test.
		const core = fileURLToPath(import.meta.resolve('vexflow/core'));
		const metrics = await Bun.file(
			path.resolve(path.dirname(core), '../src/metrics.js'),
		).text();
		expect(metrics).toContain('return structuredClone(font);');
		expect(metrics).toContain('return structuredClone(style);');
	});

	it('hands each caller its own copy of the same font and style', () => {
		new MetricsPatch().install();
		const font = Metrics.getFontInfo('Accidental');
		const resolved = { ...font };
		// Accidental resizes its own fontInfo in place; the next one must not see that.
		font.size = 1;
		expect(Metrics.getFontInfo('Accidental')).toEqual(resolved);
		const style = Metrics.getStyle('Stem');
		expect(Metrics.getStyle('Stem')).not.toBe(style);
		expect(Metrics.getStyle('Stem')).toEqual(style);
	});

	it('re-resolves a cleared key', () => {
		new MetricsPatch().install();
		const color = MetricsDefaults.Stem.strokeStyle;
		try {
			expect(Metrics.getStyle('Stem').strokeStyle).toBe(color);
			MetricsDefaults.Stem.strokeStyle = '#ff0000';
			Metrics.clear('Stem');
			expect(Metrics.getStyle('Stem').strokeStyle).toBe('#ff0000');
		} finally {
			MetricsDefaults.Stem.strokeStyle = color;
			Metrics.clear('Stem');
		}
	});
});
