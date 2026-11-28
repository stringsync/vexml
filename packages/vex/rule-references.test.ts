import { describe, expect, it } from 'bun:test';
import {
	cropMusescoreSvg,
	cropVerovioSvg,
	mapFlatStaffIndex,
	parseMusescoreGeometry,
	parseVerovioGeometry,
	partStaffCounts,
} from './rule-reference-geometry';

describe('partStaffCounts and mapFlatStaffIndex', () => {
	it('reads staff counts per part from MusicXML', () => {
		const xml = `
			<score-partwise>
				<part id="P1"><measure number="1"><attributes><staves>2</staves></attributes></measure></part>
				<part id="P2"><measure number="1"><attributes></attributes></measure></part>
			</score-partwise>
		`;
		expect(partStaffCounts(xml)).toEqual([2, 1]);
		expect(mapFlatStaffIndex(0, [2, 1])).toEqual({ part: 0, staff: 1 });
		expect(mapFlatStaffIndex(1, [2, 1])).toEqual({ part: 0, staff: 2 });
		expect(mapFlatStaffIndex(2, [2, 1])).toEqual({ part: 1, staff: 1 });
	});
});

describe('parseVerovioGeometry and cropVerovioSvg', () => {
	const sampleSvg = [
		'<svg width="1020px" height="298px" xmlns="http://www.w3.org/2000/svg">',
		'  <svg class="definition-scale" viewBox="0 0 17000 4960">',
		'    <g class="page-margin" transform="translate(500, 500)">',
		'      <g id="m1" class="measure">',
		'        <g id="s1" class="staff">',
		'          <path d="M1000 540 L5000 540" stroke-width="13" />',
		'          <path d="M1000 720 L5000 720" stroke-width="13" />',
		'          <path d="M1000 900 L5000 900" stroke-width="13" />',
		'          <path d="M1000 1080 L5000 1080" stroke-width="13" />',
		'          <path d="M1000 1260 L5000 1260" stroke-width="13" />',
		'          <g class="layer"><path d="M1200 360 L1400 360" /></g>',
		'        </g>',
		'      </g>',
		'    </g>',
		'  </svg>',
		'</svg>',
	].join('\n');

	it('extracts staff lines offset by page-margin translate', () => {
		const geom = parseVerovioGeometry([sampleSvg], [1]);
		expect(geom.pages).toEqual([{ width: 17000, height: 4960 }]);
		expect(geom.measures).toEqual([
			{ page: 0, index: 0, system: 0, x: 1500, w: 4000 },
		]);
		expect(geom.staves).toEqual([
			{
				page: 0,
				part: 0,
				measure: 0,
				staff: 1,
				lines: [1040, 1220, 1400, 1580, 1760],
				x: 1500,
				w: 4000,
			},
		]);
	});

	it('rewrites outer size and inner viewBox with a white backdrop', () => {
		const out = cropVerovioSvg(sampleSvg, {
			x: 1410,
			y: 320,
			w: 900,
			h: 2160,
			space: 180,
		});
		expect(out).toContain('width="900"');
		expect(out).toContain('height="2160"');
		expect(out).toContain('viewBox="1410 320 900 2160"');
		expect(out).toContain('fill="#ffffff"');
	});
});

describe('parseMusescoreGeometry and cropMusescoreSvg', () => {
	const sampleSvg = [
		'<svg width="215.9mm" height="279.4mm" viewBox="0 0 10200 13200" xmlns="http://www.w3.org/2000/svg">',
		'  <polyline class="StaffLines" points="1200,2000 9000,2000" />',
		'  <polyline class="StaffLines" points="1200,2080 9000,2080" />',
		'  <polyline class="StaffLines" points="1200,2160 9000,2160" />',
		'  <polyline class="StaffLines" points="1200,2240 9000,2240" />',
		'  <polyline class="StaffLines" points="1200,2320 9000,2320" />',
		'</svg>',
	].join('\n');
	const sampleMpos = `
		<score><elements>
			<element id="0" x="14400" y="24000" sx="24000" sy="3840" page="0" />
			<element id="1" x="38400" y="24000" sx="24000" sy="3840" page="0" />
		</elements></score>
	`;

	it('scales mpos boxes to SVG coordinates and pairs them with staff lines', () => {
		const geom = parseMusescoreGeometry([sampleSvg], sampleMpos, [1]);
		expect(geom.measures).toEqual([
			{ page: 0, index: 0, system: 0, x: 1200, w: 2000 },
			{ page: 0, index: 1, system: 0, x: 3200, w: 2000 },
		]);
		expect(geom.staves[0]).toEqual({
			page: 0,
			part: 0,
			measure: 0,
			staff: 1,
			lines: [2000, 2080, 2160, 2240, 2320],
			x: 1200,
			w: 2000,
		});
	});

	it('rewrites root svg dimensions and viewBox for cropping', () => {
		const out = cropMusescoreSvg(sampleSvg, {
			x: 1160,
			y: 1680,
			w: 400,
			h: 960,
			space: 80,
		});
		expect(out).toContain('width="400"');
		expect(out).toContain('height="960"');
		expect(out).toContain('viewBox="1160 1680 400 960"');
	});
});
