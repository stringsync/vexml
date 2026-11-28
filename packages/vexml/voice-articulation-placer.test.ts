import { describe, expect, it } from 'bun:test';
import { Modifier, StaveNote, Voice } from 'vexflow/core';
import { NoteheadArticulation } from './notehead-articulation';
import { StaveArticulation } from './stave-articulation';
import { StaveOrnament } from './stave-ornament';
import { StringNumberAnnotation } from './string-number-annotation';
import { VoiceArticulationPlacer } from './voice-articulation-placer';

describe('VoiceArticulationPlacer', () => {
	const note = (key: string, duration: string, stem: number) =>
		new StaveNote({ keys: [key], duration, stemDirection: stem });

	const accented = (key: string, stem: number) => {
		const n = note(key, 'h', stem);
		const accent = new NoteheadArticulation('a>').setSide(n);
		n.addModifier(accent);
		return { n, accent };
	};

	const voiceOf = (...notes: StaveNote[]) =>
		new Voice({ numBeats: 2, beatValue: 4 })
			.setStrict(false)
			.addTickables(notes);

	it('lifts an upper voice accent over its stem when the lower voice strikes just below', () => {
		const { n, accent } = accented('f/4', 1);
		new VoiceArticulationPlacer().place([
			voiceOf(n),
			voiceOf(note('d/4', 'h', -1)),
		]);
		expect(accent.getPosition()).toBe(Modifier.Position.ABOVE);
	});

	it('drops a lower voice accent under its stem when the upper voice strikes just above', () => {
		const { n, accent } = accented('b/4', -1);
		new VoiceArticulationPlacer().place([
			voiceOf(note('d/5', 'h', 1)),
			voiceOf(n),
		]);
		expect(accent.getPosition()).toBe(Modifier.Position.BELOW);
	});

	it('lifts an accent over its stem even when the other voice strikes far below', () => {
		const { n, accent } = accented('f/4', 1);
		new VoiceArticulationPlacer().place([
			voiceOf(n),
			voiceOf(note('g/3', 'h', -1)),
		]);
		expect(accent.getPosition()).toBe(Modifier.Position.ABOVE);
	});

	it('leaves an accent when the other voice sits on its stem side', () => {
		const { n, accent } = accented('f/4', 1);
		new VoiceArticulationPlacer().place([
			voiceOf(n),
			voiceOf(note('a/4', 'h', -1)),
		]);
		expect(accent.getPosition()).toBe(Modifier.Position.BELOW);
	});

	it('leaves an accent over another voice resting', () => {
		const { n, accent } = accented('f/4', 1);
		new VoiceArticulationPlacer().place([
			voiceOf(n),
			voiceOf(note('d/4', 'hr', -1)),
		]);
		expect(accent.getPosition()).toBe(Modifier.Position.BELOW);
	});

	it('places an unplaced lower-voice trill below the stave in double-stemmed writing', () => {
		const upper = note('e/5', 'h', 1);
		const upperTrill = new StaveOrnament('tr');
		upper.addModifier(upperTrill);

		const lower = note('g/4', 'h', -1);
		const lowerTrill = new StaveOrnament('tr');
		lower.addModifier(lowerTrill);

		new VoiceArticulationPlacer().place([voiceOf(upper), voiceOf(lower)]);
		expect(upperTrill.getPosition()).toBe(Modifier.Position.ABOVE);
		expect(lowerTrill.getPosition()).toBe(Modifier.Position.BELOW);
	});

	it('keeps an explicit placement="above" trill above the stave in the lower voice', () => {
		const upper = note('e/5', 'h', 1);
		const lower = note('g/4', 'h', -1);
		const explicitAbove = new StaveOrnament('tr', 'above');
		lower.addModifier(explicitAbove);

		new VoiceArticulationPlacer().place([voiceOf(upper), voiceOf(lower)]);
		expect(explicitAbove.getPosition()).toBe(Modifier.Position.ABOVE);
	});

	it('inverts a lower-voice default fermata below the stave in double-stemmed writing', () => {
		const upper = note('e/5', 'h', 1);
		const upperFermata = new StaveArticulation('a@a')
			.markFermata({ belowGlyph: '\uE4C1' })
			.setPosition(Modifier.Position.ABOVE);
		upper.addModifier(upperFermata);

		const lower = note('g/4', 'h', -1);
		const lowerFermata = new StaveArticulation('a@a')
			.markFermata({ belowGlyph: '\uE4C1' })
			.setPosition(Modifier.Position.ABOVE);
		lower.addModifier(lowerFermata);

		new VoiceArticulationPlacer().place([voiceOf(upper), voiceOf(lower)]);
		expect(upperFermata.getPosition()).toBe(Modifier.Position.ABOVE);
		expect(upperFermata.getText()).toBe('\uE4C0');
		expect(lowerFermata.getPosition()).toBe(Modifier.Position.BELOW);
		expect(lowerFermata.getText()).toBe('\uE4C1');
	});

	it('keeps an explicit upright fermata above the stave in the lower voice', () => {
		const upper = note('e/5', 'h', 1);
		const lower = note('g/4', 'h', -1);
		const explicitUpright = new StaveArticulation('a@a')
			.markFermata({ belowGlyph: '\uE4C1', explicitType: true })
			.setPosition(Modifier.Position.ABOVE);
		lower.addModifier(explicitUpright);

		new VoiceArticulationPlacer().place([voiceOf(upper), voiceOf(lower)]);
		expect(explicitUpright.getPosition()).toBe(Modifier.Position.ABOVE);
		expect(explicitUpright.getText()).toBe('\uE4C0');
	});

	it('places an unplaced lower-voice string number below the stave in double-stemmed writing', () => {
		const upper = note('a/4', 'h', 1);
		const upperString = new StringNumberAnnotation('1', false);
		upper.addModifier(upperString);

		const lower = note('d/4', 'h', -1);
		const lowerString = new StringNumberAnnotation('3', false);
		lower.addModifier(lowerString);

		new VoiceArticulationPlacer().place([voiceOf(upper), voiceOf(lower)]);
		expect(upperString.below).toBe(false);
		expect(lowerString.below).toBe(true);
	});

	it('keeps an explicit placement="above" string number above the stave in the lower voice', () => {
		const upper = note('a/4', 'h', 1);
		const lower = note('d/4', 'h', -1);
		const explicitAbove = new StringNumberAnnotation('3', false, true);
		lower.addModifier(explicitAbove);

		new VoiceArticulationPlacer().place([voiceOf(upper), voiceOf(lower)]);
		expect(explicitAbove.below).toBe(false);
	});

	it('places an unplaced lower-voice open-string mark below the stave in double-stemmed writing', () => {
		const upper = note('a/4', 'h', 1);
		const upperOpen = new StaveArticulation('ah')
			.setPosition(Modifier.Position.ABOVE)
			.markLowerVoiceBelow(false);
		upper.addModifier(upperOpen);

		const lower = note('d/4', 'h', -1);
		const lowerOpen = new StaveArticulation('ah')
			.setPosition(Modifier.Position.ABOVE)
			.markLowerVoiceBelow(false);
		lower.addModifier(lowerOpen);

		new VoiceArticulationPlacer().place([voiceOf(upper), voiceOf(lower)]);
		expect(upperOpen.getPosition()).toBe(Modifier.Position.ABOVE);
		expect(lowerOpen.getPosition()).toBe(Modifier.Position.BELOW);
	});

	it('keeps an explicit placement="above" open-string mark above the stave in the lower voice', () => {
		const upper = note('a/4', 'h', 1);
		const lower = note('d/4', 'h', -1);
		const explicitAbove = new StaveArticulation('ah')
			.setPosition(Modifier.Position.ABOVE)
			.markLowerVoiceBelow(true);
		lower.addModifier(explicitAbove);

		new VoiceArticulationPlacer().place([voiceOf(upper), voiceOf(lower)]);
		expect(explicitAbove.getPosition()).toBe(Modifier.Position.ABOVE);
	});

	it('keeps single-voice down-stem string numbers, open-string, and stopped marks above the stave', () => {
		const single = note('d/5', 'h', -1);
		const stringMark = new StringNumberAnnotation('2', false);
		const openMark = new StaveArticulation('ah')
			.setPosition(Modifier.Position.ABOVE)
			.markLowerVoiceBelow(false);
		const stoppedMark = new StaveArticulation('a+')
			.setPosition(Modifier.Position.ABOVE)
			.markLowerVoiceBelow(false);
		single.addModifier(stringMark);
		single.addModifier(openMark);
		single.addModifier(stoppedMark);

		new VoiceArticulationPlacer().place([voiceOf(single)]);
		expect(stringMark.below).toBe(false);
		expect(openMark.getPosition()).toBe(Modifier.Position.ABOVE);
		expect(stoppedMark.getPosition()).toBe(Modifier.Position.ABOVE);
	});

	it('places an unplaced lower-voice left-hand pizzicato + below the stave in double-stemmed writing', () => {
		const upper = note('c/5', 'h', 1);
		const upperPlus = new StaveArticulation('a+')
			.setPosition(Modifier.Position.ABOVE)
			.markLowerVoiceBelow(false);
		upper.addModifier(upperPlus);

		const lower = note('e/4', 'h', -1);
		const lowerPlus = new StaveArticulation('a+')
			.setPosition(Modifier.Position.ABOVE)
			.markLowerVoiceBelow(false);
		lower.addModifier(lowerPlus);

		new VoiceArticulationPlacer().place([voiceOf(upper), voiceOf(lower)]);
		expect(upperPlus.getPosition()).toBe(Modifier.Position.ABOVE);
		expect(lowerPlus.getPosition()).toBe(Modifier.Position.BELOW);
	});

	it('keeps an explicit placement="above" left-hand pizzicato + above the stave in the lower voice', () => {
		const upper = note('c/5', 'h', 1);
		const lower = note('e/4', 'h', -1);
		const explicitAbove = new StaveArticulation('a+')
			.setPosition(Modifier.Position.ABOVE)
			.markLowerVoiceBelow(true);
		lower.addModifier(explicitAbove);

		new VoiceArticulationPlacer().place([voiceOf(upper), voiceOf(lower)]);
		expect(explicitAbove.getPosition()).toBe(Modifier.Position.ABOVE);
	});
});
