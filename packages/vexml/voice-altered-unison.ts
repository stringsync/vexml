import {
	Accidental,
	Metrics,
	type ModifierContext,
	type StaveNote,
	Stem,
} from 'vexflow/core';

type StaveNoteWithAlters = StaveNote & {
	keyAlters?: readonly (number | undefined)[];
	formatterRightShiftOverlap?: number;
};

type AlteredUnisonPair = {
	upIndex: number;
	downIndex: number;
};

/**
 * Separate the heads of a double-stemmed altered unison and place the right
 * voice's accidental between the two heads so each sign clearly belongs to its
 * own voice (Behind Bars p. 91). Returns true when handled.
 */
export function offsetAlteredUnison(
	context: ModifierContext,
	members: ReturnType<ModifierContext['getMembers']>,
	second: StaveNote,
	up: StaveNote,
	down: StaveNote,
	tieRight: StaveNote | null,
	formatPair: (
		context: ModifierContext,
		members: ReturnType<ModifierContext['getMembers']>,
		second: StaveNote,
		right: StaveNote,
		shift: number,
	) => void,
): boolean {
	const pairs = alteredUnisonPairs(up, down);
	if (pairs.length === 0) {
		return false;
	}
	const upAccs = pairs
		.map(({ upIndex }) => accidentalAt(up, upIndex))
		.filter((acc): acc is Accidental => acc !== undefined);
	const downAccs = pairs
		.map(({ downIndex }) => accidentalAt(down, downIndex))
		.filter((acc): acc is Accidental => acc !== undefined);
	const right =
		tieRight ?? (upAccs.length > 0 && downAccs.length === 0 ? up : down);
	const left = right === up ? down : up;
	const rightAccs = right === up ? upAccs : downAccs;

	const pad = Metrics.get('Accidental.noteheadAccidentalPadding');
	const accGap = Metrics.get('Accidental.accidentalSpacing');
	const leftRight = left.getGlyphWidth() + left.getRightDisplacedHeadPx();
	const rightLeftDisplaced = right.getLeftDisplacedHeadPx();

	let shift: number;
	if (rightAccs.length > 0) {
		const maxAccWidth = Math.max(...rightAccs.map((acc) => acc.getWidth()));
		// Leave a little extra clearance when both stems face inward between the heads.
		const gapBeforeAcc = accGap + (left === up ? 1 : 0);
		shift =
			leftRight + gapBeforeAcc + maxAccWidth + 2 + pad + rightLeftDisplaced;
	} else {
		shift =
			Math.max(up.getVoiceShiftWidth(), down.getVoiceShiftWidth()) +
			2 +
			(left === up ? 2 * Stem.WIDTH : 0);
	}

	const accMembers = context.getMembers(Accidental.CATEGORY);
	const removed: { index: number; acc: Accidental }[] = [];
	for (const acc of rightAccs) {
		const index = accMembers.indexOf(acc);
		if (index >= 0) {
			accMembers.splice(index, 1);
			removed.push({ index, acc });
		}
	}
	try {
		formatPair(context, members, second, right, shift);
		(right as StaveNoteWithAlters).formatterRightShiftOverlap = shift;
	} finally {
		for (let i = removed.length - 1; i >= 0; i--) {
			const entry = removed[i];
			if (entry) {
				accMembers.splice(entry.index, 0, entry.acc);
			}
		}
	}
	for (const acc of rightAccs) {
		acc.setXShift(pad + rightLeftDisplaced - shift);
	}
	return true;
}

function alteredUnisonPairs(
	up: StaveNote,
	down: StaveNote,
): AlteredUnisonPair[] {
	const upProps = up.getKeyProps();
	const downProps = down.getKeyProps();
	const upAlters = (up as StaveNoteWithAlters).keyAlters;
	const downAlters = (down as StaveNoteWithAlters).keyAlters;
	const pairs: AlteredUnisonPair[] = [];
	for (let u = 0; u < upProps.length; u++) {
		const upLine = upProps[u]?.line;
		if (upLine === undefined) {
			continue;
		}
		for (let d = 0; d < downProps.length; d++) {
			if (downProps[d]?.line !== upLine) {
				continue;
			}
			const upAlter = upAlters?.[u];
			const downAlter = downAlters?.[d];
			if (upAlter !== undefined && downAlter !== undefined) {
				if (upAlter !== downAlter) {
					pairs.push({ upIndex: u, downIndex: d });
				}
			} else {
				const upAcc = accidentalAt(up, u);
				const downAcc = accidentalAt(down, d);
				if (upAcc && downAcc && upAcc.type !== downAcc.type) {
					pairs.push({ upIndex: u, downIndex: d });
				}
			}
		}
	}
	return pairs;
}

function accidentalAt(note: StaveNote, index: number): Accidental | undefined {
	return note
		.getModifiers()
		.find(
			(mod): mod is Accidental =>
				mod instanceof Accidental && mod.getIndex() === index,
		);
}
