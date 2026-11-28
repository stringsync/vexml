import type { Note, Technical } from '@stringsync/mdom';
import type { ScoreReader } from './score-reader';

/*
 * A <harmonic>'s <base-pitch>, <touching-pitch> or <sounding-pitch> says which pitch the
 * note names. Only the touching pitch is where the finger lightly touches, so only it takes
 * the diamond; the base pitch is the stopped or open string and the sounding pitch is what
 * is heard, and both keep a normal head. When none of the three pitch children is present,
 * a bare <harmonic/> (used for vocal falsetto and sounding natural harmonics) keeps a normal
 * head with a harmonic circle above, while <harmonic><natural/></harmonic> or
 * <harmonic><artificial/></harmonic> defaults to the touching-pitch diamond.
 */
export type HarmonicPitch = 'base' | 'touching' | 'sounding';

const HARMONIC_PITCH_TAGS: Record<string, HarmonicPitch> = {
	'base-pitch': 'base',
	'touching-pitch': 'touching',
	'sounding-pitch': 'sounding',
};

export function harmonicPitchOf(harmonic: Technical): HarmonicPitch {
	for (const [tag, pitch] of Object.entries(HARMONIC_PITCH_TAGS)) {
		if (harmonic.child(tag)) {
			return pitch;
		}
	}
	if (!harmonic.child('natural') && !harmonic.child('artificial')) {
		return 'sounding';
	}
	return 'touching';
}

export function harmonicPitch(
	note: Note,
	reader: ScoreReader,
): HarmonicPitch | null {
	const harmonic = harmonicMark(note, reader);
	if (!harmonic) {
		return null;
	}
	return harmonicPitchOf(harmonic);
}

/** Whether the note's head is the harmonic diamond. */
export function isDiamondHarmonic(note: Note, reader: ScoreReader): boolean {
	return harmonicPitch(note, reader) === 'touching';
}

function harmonicMark(note: Note, reader: ScoreReader): Technical | null {
	return (
		reader.technicalsOf(note).find((t) => t.technicalType === 'harmonic') ??
		null
	);
}
