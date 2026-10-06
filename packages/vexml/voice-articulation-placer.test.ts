import { describe, expect, it } from 'bun:test';
import { Modifier, StaveNote, Voice } from 'vexflow';
import { NoteheadArticulation } from './notehead-articulation';
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
});
