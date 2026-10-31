import { beforeEach, describe, expect, it } from 'bun:test';
import { MDOMParser, MElement } from '@stringsync/mdom';
import { NodeFs } from 'core/system';
import { MeasureSlicer } from './measure-slicer';

describe('standalone slice state', () => {
	let slicer: MeasureSlicer;
	let slicerAt2And4: MeasureSlicer;

	beforeEach(() => {
		slicer = new MeasureSlicer('2');
		slicerAt2And4 = new MeasureSlicer('2,4');
	});

	it.each([
		['wedge', 'crescendo', 'spread="0" line-type="dashed"'],
		['wedge', 'diminuendo', 'spread="14"'],
		['pedal', 'start', 'line="yes" sign="no"'],
		['pedal', 'sostenuto', 'line="yes"'],
		['octave-shift', 'down', 'size="8"'],
		['octave-shift', 'up', 'size="15"'],
		['dashes', 'start', 'dash-length="6"'],
		['bracket', 'start', 'line-end="down" line-type="dashed"'],
	])('reopens and closes inherited %s %s', (tag, start, attributes) => {
		const source = score(
			direction(
				`<${tag} type="${start}" number="2" id="source" default-x="45" default-y="-20" ${attributes}/>`,
			) + NOTE,
			NOTE,
			direction(
				`<${tag} type="stop" number="2"${tag === 'bracket' ? ' line-end="none"' : ''}/>`,
			) + NOTE,
		);
		const xml = slicer.slice(source);
		const bar = firstMeasure(xml);
		expect(types(bar, tag)).toEqual([start, 'stop']);
		expect(marks(bar, tag).map((mark) => mark.getAttribute('number'))).toEqual([
			'2',
			'2',
		]);
		expect(xml).toContain('placement="below"');
		expect(xml).toContain('default-y="-20"');
		expect(xml).not.toContain('id="source"');
		expect(xml).not.toContain('default-x="45"');
		expect(bar.notes[0]?.pitch?.octave).toBe(5);
		expect(bar.notes[0]?.duration).toBe(4);
	});

	it('does not duplicate endpoints within an intact passage', () => {
		const xml = new MeasureSlicer('1-3').slice(
			score(
				direction('<wedge type="crescendo"/>') + NOTE,
				NOTE,
				NOTE + direction('<wedge type="stop"/>'),
			),
		);
		expect(xml.match(/<wedge/g)).toHaveLength(2);
	});

	it('tracks numbers and staff independently, honoring changes and continuations', () => {
		const xml = new MeasureSlicer('3').slice(
			score(
				direction('<wedge type="crescendo" number="1"/>') +
					direction('<wedge type="diminuendo" number="2"/>') +
					direction('<wedge type="diminuendo" number="1"/>', '2') +
					direction('<pedal type="start" line="yes"/>') +
					NOTE,
				direction('<wedge type="stop" number="2"/>') +
					direction('<wedge type="continue" number="1"/>') +
					direction('<pedal type="change" line="yes"/>') +
					NOTE,
				NOTE,
			),
		);
		const bar = firstMeasure(xml);
		expect(types(bar, 'wedge').sort()).toEqual(
			['crescendo', 'diminuendo', 'stop', 'stop'].sort(),
		);
		expect(types(bar, 'pedal')).toEqual(['start', 'stop']);
		expect(
			marks(bar, 'staff')
				.map((mark) => mark.text)
				.sort(),
		).toEqual(['1', '1', '1', '1', '2', '2']);
	});

	it('restores each disconnected run from its own source state', () => {
		const xml = slicerAt2And4.slice(
			score(
				direction('<octave-shift type="down" size="8"/>') + NOTE,
				NOTE,
				direction('<octave-shift type="stop"/>') +
					direction('<pedal type="start" line="yes"/>') +
					NOTE,
				NOTE,
			),
		);
		const bars = measures(xml);
		expect(bars.map((bar) => types(bar, 'octave-shift'))).toEqual([
			['down', 'stop'],
			[],
		]);
		expect(bars.map((bar) => types(bar, 'pedal'))).toEqual([
			[],
			['start', 'stop'],
		]);
	});

	it('closes at the longest voice before the right barline', () => {
		const xml = slicer.slice(
			score(
				direction('<pedal type="start" line="yes"/>') + NOTE,
				NOTE +
					'<backup><duration>4</duration></backup>' +
					NOTE.replace('<duration>4</duration>', '<duration>1</duration>') +
					'<barline><bar-style>light-heavy</bar-style></barline>',
			),
		);
		expect(xml).toContain('<offset>3</offset>');
		expect(xml.indexOf('type="stop"')).toBeLessThan(xml.indexOf('<barline'));
	});

	it.each(['slash', 'beat-repeat', 'measure-repeat'])(
		'reopens %s and resets it across omitted source stops',
		(tag) => {
			const mark = `<${tag} type="start"${tag === 'slash' ? ' use-stems="yes"' : ''}>${tag === 'measure-repeat' ? '2' : ''}</${tag}>`;
			const xml = slicerAt2And4.slice(
				score(
					style(mark) + NOTE,
					NOTE,
					style(`<${tag} type="stop"/>`) + NOTE,
					NOTE,
				),
			);
			const bars = measures(xml);
			expect(bars.map((bar) => types(bar, tag))).toEqual([['start'], ['stop']]);
			expect(xml).toContain('color="#123456"');
			expect(xml).toContain('number="1"');
		},
	);

	it('applies opening source style changes after inherited state', () => {
		const xml = slicer.slice(
			score(
				style('<slash type="start" use-stems="yes"/>') + NOTE,
				style('<slash type="stop"/>') + NOTE,
			),
		);
		expect(measures(xml).map((bar) => types(bar, 'slash'))).toEqual([
			['start', 'stop'],
		]);
	});

	it('reopens a pedal resumed after a source discontinuation', () => {
		const xml = new MeasureSlicer('4').slice(
			score(
				direction('<pedal type="start" line="yes"/>') + NOTE,
				direction('<pedal type="discontinue" line="yes"/>') + NOTE,
				direction('<pedal type="resume" line="yes"/>') + NOTE,
				NOTE,
			),
		);
		expect(measures(xml).map((bar) => types(bar, 'pedal'))).toEqual([
			['start', 'stop'],
		]);
	});

	it('honors numbered overrides of an all-staves measure style', () => {
		const source = score(
			`<attributes><measure-style><slash type="start"/></measure-style></attributes>${NOTE}`,
			style('<slash type="stop"/>', '2') + NOTE,
			NOTE,
		).replace('</time>', '</time><staves>2</staves>');
		const xml = new MeasureSlicer('3').slice(source);
		expect(
			measures(xml).flatMap((bar) =>
				marks(bar, 'measure-style').map((mark) => [
					mark.getAttribute('number'),
					mark.child('slash')?.getAttribute('type'),
				]),
			),
		).toEqual([['1', 'start']]);
	});

	it('clips inherited and retained multiple rests to contiguous retained columns', () => {
		const source = score(
			style('<multiple-rest use-symbols="yes">5</multiple-rest>') + NOTE,
			NOTE,
			NOTE,
			NOTE,
			NOTE,
			NOTE,
		);
		expect(
			measures(new MeasureSlicer('1-2,4-6').slice(source)).map((bar) =>
				marks(bar, 'multiple-rest').map((mark) => mark.text),
			),
		).toEqual([['2'], [], ['2'], [], []]);
		expect(
			measures(new MeasureSlicer('3').slice(source)).flatMap((bar) =>
				marks(bar, 'multiple-rest').map((mark) => mark.text),
			),
		).toEqual(['1']);
	});

	it('preserves note-anchored ties and slurs without reattaching them', () => {
		const tied = NOTE.replace(
			'<type>whole</type>',
			'<tie type="stop"/><type>whole</type><notations><tied type="stop"/><slur type="stop" number="2" placement="above"/></notations>',
		);
		const xml = slicer.slice(score(NOTE, tied));
		expect(xml).toContain('<tie type="stop"/>');
		expect(xml).toContain('<tied type="stop"/>');
		expect(xml).toContain('<slur type="stop" number="2" placement="above"/>');
		expect(xml).not.toContain('type="start"');
	});

	it('raw keeps only original markup across both cuts', () => {
		const source = score(
			direction('<wedge type="crescendo"/>') +
				style('<slash type="start"/>') +
				NOTE,
			`${NOTE}<barline><repeat direction="backward"/></barline>`,
		);
		const xml = new MeasureSlicer('2', 'raw').slice(source);
		expect(xml).not.toContain('<wedge');
		// Raw retains the existing signature materialization, including measure styles.
		expect(xml).toContain('<slash type="start"/>');
		expect(xml).toContain('<repeat');
	});

	it('retains octave, pedal and hairpin state while linearizing a repeat boundary', async () => {
		const source = await new NodeFs().read(
			new URL('./__data__/slice-spanners.musicxml', import.meta.url).pathname,
		);
		const xml = new MeasureSlicer('2-3').slice(source);
		expect(xml).not.toContain('<repeat');
		const bar = firstMeasure(xml);
		expect(types(bar, 'octave-shift')).toEqual(['down']);
		expect(types(bar, 'pedal')).toEqual(['start']);
		expect(types(bar, 'wedge')).toEqual(['crescendo']);
		expect(
			measures(xml).map((bar) =>
				bar.notes.map((note) => [
					note.pitch?.step,
					note.pitch?.octave,
					note.duration,
				]),
			),
		).toEqual(
			measures(source)
				.slice(1)
				.map((bar) =>
					bar.notes.map((note) => [
						note.pitch?.step,
						note.pitch?.octave,
						note.duration,
					]),
				),
		);
	});
});

const NOTE =
	'<note><pitch><step>C</step><octave>5</octave></pitch><duration>4</duration><type>whole</type></note>';
function score(...bars: string[]) {
	return `<score-partwise version="4.0"><part-list><score-part id="P1"><part-name>Music</part-name></score-part></part-list><part id="P1">${bars.map((bar, index) => `<measure number="${index + 1}">${index === 0 ? '<attributes><divisions>1</divisions><time><beats>4</beats><beat-type>4</beat-type></time><clef><sign>G</sign><line>2</line></clef></attributes>' : ''}${bar}</measure>`).join('')}</part></score-partwise>`;
}
function direction(mark: string, staff = '1') {
	return `<direction placement="below"><direction-type>${mark}</direction-type><staff>${staff}</staff></direction>`;
}
function style(mark: string, staff = '1') {
	return `<attributes><measure-style number="${staff}" color="#123456">${mark}</measure-style></attributes>`;
}
function measures(xml: string) {
	return new MDOMParser().parseFromString(xml).score.parts[0]?.measures ?? [];
}
function marks(element: MElement, tag: string): MElement[] {
	return element.children.flatMap((child) =>
		child instanceof MElement
			? [...(child.tag === tag ? [child] : []), ...marks(child, tag)]
			: [],
	);
}
function types(element: MElement, tag: string) {
	return marks(element, tag).map((mark) => mark.getAttribute('type'));
}

function firstMeasure(xml: string) {
	const [measure] = measures(xml);
	if (!measure) {
		throw new Error('slice has no opening measure');
	}
	return measure;
}
