import { describe, expect, it } from 'bun:test';
import { PNG } from 'pngjs';
import { Rect } from 'webappwiz/geometry';
import { FakeJev } from './fake-jev';
import type { Engine } from './lint';
import { SemanticLint } from './semantic-lint';

describe('SemanticLint', () => {
	it('flags only the outlier when the other two renderers agree', async () => {
		const client = new FakeJev([{ same: 0.1 }, { same: 0.2 }, { same: 0.99 }]);
		const result = await new SemanticLint(client).measure(
			'pickup',
			EMPTY,
			renders(['vexml', 'osmd', 'alphatab']),
		);
		expect(result.findings.vexml).toEqual([
			expect.objectContaining({
				kind: 'differs',
				measures: ['pickup'],
				box: new Rect(10, 20, 30, 40),
			}),
		]);
		expect(result.findings.osmd).toEqual([]);
		expect(result.findings.alphatab).toEqual([]);
		expect(result.votes).toHaveLength(3);
	});
	it('does not choose a reference when two renderers disagree', async () => {
		const result = await new SemanticLint(
			new FakeJev([{ same: 0.01 }]),
		).measure('1', EMPTY, renders(['vexml', 'osmd']));
		expect(result.findings).toEqual({ vexml: [], osmd: [] });
	});
	it('does not flag either side of a two versus two split', async () => {
		const client = new FakeJev([
			{ same: 0.99 },
			{ same: 0.1 },
			{ same: 0.1 },
			{ same: 0.1 },
			{ same: 0.1 },
			{ same: 0.99 },
		]);
		const result = await new SemanticLint(client).measure(
			'1',
			EMPTY,
			renders(['vexml', 'osmd', 'alphatab', 'musescore']),
		);
		expect(result.findings).toEqual({
			vexml: [],
			osmd: [],
			alphatab: [],
			musescore: [],
		});
		expect(result.votes).toHaveLength(6);
	});
	it('leaves uncertain votes alone', async () => {
		const result = await new SemanticLint(
			new FakeJev([{ same: 0.1 }, { same: 0.5 }, { same: 0.99 }]),
		).measure('1', EMPTY, renders(['vexml', 'osmd', 'alphatab']));
		expect(result.findings).toEqual({ vexml: [], osmd: [], alphatab: [] });
	});
	it('checks XML presence even with one renderer, retaining the probability', async () => {
		const xml = EMPTY.replace(
			'<measure number="1"/>',
			'<measure number="1"><note><rest/><type>quarter</type><notations><fermata/></notations></note></measure>',
		);
		const client = new FakeJev([{ q0: 0.99, q1: 0.05 }]);
		const result = await new SemanticLint(client).measure(
			'X',
			xml,
			renders(['vexml']),
		);
		expect(result.findings.vexml).toEqual([
			expect.objectContaining({
				kind: 'missing',
				measures: ['X'],
				message: expect.stringContaining('fermata'),
			}),
		]);
		expect(result.presence.vexml).toEqual([
			expect.objectContaining({ probability: 0.99 }),
			expect.objectContaining({ probability: 0.05 }),
		]);
	});
});

const EMPTY =
	'<score-partwise><part-list><score-part id="P1"><part-name>Test</part-name></score-part></part-list><part id="P1"><measure number="1"/></part></score-partwise>';

function renders(engines: Engine[]) {
	const png = PNG.sync.write(new PNG({ width: 30, height: 40 }));
	return engines.map((engine) => ({
		engine,
		png,
		box: new Rect(10, 20, 30, 40),
	}));
}
