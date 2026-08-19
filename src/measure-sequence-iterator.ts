import type { Jump } from './sequence';

type RepeatEnd = { measureIndex: number; startIndex: number; times: number };
type VoltaEnding = {
	/* The measure range the ending covers; playback jumps from `endIndex`, not from every one. */
	startIndex: number;
	endIndex: number;
	times: number;
	/* The ending's own `<ending number>`, as its first pass — see Jump. Only used to spot the
	 * restart that separates one volta group from the next. */
	number: number;
	startPass: number;
	endPass: number;
};
type Volta = {
	startIndex: number;
	endings: VoltaEnding[];
	totalPasses: number;
};
type Structure = {
	repeatEndsByMeasure: Map<number, RepeatEnd>;
	voltas: Volta[];
	endingByMeasure: Map<number, { volta: Volta; ending: VoltaEnding }>;
};

/**
 * Iterates measure indices in playback order, expanding repeats and voltas: iterate it to get the
 * order a player would visit the measures in, with repeated stretches appearing as often as they
 * are played.
 */
export class MeasureSequenceIterator implements Iterable<number> {
	constructor(
		private readonly measures: ReadonlyArray<{ index: number; jumps: Jump[] }>,
	) {}

	// Two phases: a pre-scan pairs `repeatend`s with their `repeatstart`s and groups
	// `repeatending` runs into voltas, then a linear walk back-jumps and skips exhausted
	// endings.
	[Symbol.iterator](): Iterator<number> {
		return this.walk(this.analyzeStructure())[Symbol.iterator]();
	}

	private analyzeStructure(): Structure {
		const repeatEndsByMeasure = new Map<number, RepeatEnd>();
		const voltas: Volta[] = [];
		const endingByMeasure = new Map<
			number,
			{ volta: Volta; ending: VoltaEnding }
		>();

		const startStack: number[] = [];
		let currentVolta: Volta | null = null;
		// The ending still being extended, i.e. one whose `last` measure hasn't been reached.
		let currentEnding: VoltaEnding | null = null;

		/* Finish the open volta group: its repeat block is done, so drop the block's start off the
		 * stack and leave the enclosing one (if any) exposed for the next group. */
		const closeVolta = (): void => {
			currentEnding = null;
			if (
				currentVolta !== null &&
				startStack.at(-1) === currentVolta.startIndex
			) {
				startStack.pop();
			}
			currentVolta = null;
		};

		for (const [i, measure] of this.measures.entries()) {
			for (const jump of measure.jumps) {
				if (jump.type === 'repeatstart') {
					startStack.push(i);
				}
			}

			const endingJump = this.findJump(measure.jumps, 'repeatending');
			if (endingJump) {
				// Nested blocks put two volta groups back to back with no plain measure between them,
				// so "the group ends at the first measure carrying no ending" can't see the seam. The
				// numbering does: endings within one group climb (1., 2., 3.), so a run whose number
				// doesn't is the enclosing block's first ending, not another of this block's.
				const previous = currentVolta?.endings.at(-1);
				if (
					currentEnding === null &&
					previous !== undefined &&
					endingJump.number <= previous.number
				) {
					closeVolta();
				}
				if (currentVolta === null) {
					currentVolta = {
						startIndex: startStack.at(-1) ?? 0,
						endings: [],
						totalPasses: 0,
					};
					voltas.push(currentVolta);
				}
				let ending: VoltaEnding | null = currentEnding;
				if (ending === null) {
					ending = {
						startIndex: i,
						endIndex: i,
						times: endingJump.times,
						number: endingJump.number,
						startPass: 0,
						endPass: 0,
					};
					currentVolta.endings.push(ending);
				} else {
					ending.endIndex = i;
				}
				currentEnding = endingJump.last ? null : ending;
				endingByMeasure.set(i, { volta: currentVolta, ending });
				// A `repeatend` co-located with a `repeatending` is intentionally dropped.
				continue;
			}

			if (currentVolta !== null) {
				closeVolta();
			}

			const endJump = this.findJump(measure.jumps, 'repeatend');
			if (endJump) {
				const startIndex = startStack.pop() ?? 0;
				repeatEndsByMeasure.set(i, {
					measureIndex: i,
					startIndex,
					times: endJump.times,
				});
			}
		}

		// Close any volta that runs to the end of the score.
		if (
			currentVolta !== null &&
			startStack.at(-1) === currentVolta.startIndex
		) {
			startStack.pop();
		}

		for (const volta of voltas) {
			// A `repeatending` with `times: 0` on the LAST ending is the standard "discontinue" volta: it
			// plays once on the final pass with no back-jump. Treat it as `times: 1` for pass ranges.
			const last = volta.endings.at(-1);
			let pass = 1;
			for (const ending of volta.endings) {
				const effective =
					ending === last && ending.times === 0 ? 1 : ending.times;
				ending.startPass = pass;
				ending.endPass = pass + effective - 1;
				pass += effective;
			}
			const sum = pass - 1;
			// A single-ending volta whose ending has a back-jump needs an implicit final pass for the
			// run-past-the-now-exhausted-ending step. Other shapes exit on their final ending naturally.
			const needsImplicitFinalPass =
				volta.endings.length === 1 && last !== undefined && last.times > 0;
			volta.totalPasses = needsImplicitFinalPass ? sum + 1 : sum;
		}

		return { repeatEndsByMeasure, voltas, endingByMeasure };
	}

	private walk(structure: Structure): number[] {
		const result: number[] = [];
		const remainingBackJumps = new Map<number, number>();
		const voltaPass = new Map<Volta, number>();

		let i = 0;
		while (i < this.measures.length) {
			const measure = this.measures[i];
			if (!measure) {
				break;
			}

			const endingHit = structure.endingByMeasure.get(i);
			if (endingHit) {
				const pass = voltaPass.get(endingHit.volta) ?? 1;
				if (
					pass < endingHit.ending.startPass ||
					pass > endingHit.ending.endPass
				) {
					i++;
					continue;
				}
			}

			result.push(measure.index);

			if (endingHit) {
				const { volta, ending } = endingHit;
				// Mid-run: the ending spans more measures, so keep playing before deciding.
				if (i < ending.endIndex) {
					i++;
					continue;
				}
				const nextPass = (voltaPass.get(volta) ?? 1) + 1;
				if (nextPass > volta.totalPasses) {
					voltaPass.delete(volta);
					i++;
				} else {
					voltaPass.set(volta, nextPass);
					this.resetNestedState(
						structure,
						remainingBackJumps,
						voltaPass,
						volta.startIndex,
						i,
					);
					i = volta.startIndex;
				}
				continue;
			}

			const repeatEnd = structure.repeatEndsByMeasure.get(i);
			if (repeatEnd) {
				if (repeatEnd.times === 0) {
					i++;
					continue;
				}
				const remaining = remainingBackJumps.get(i) ?? repeatEnd.times;
				if (remaining > 0) {
					remainingBackJumps.set(i, remaining - 1);
					this.resetNestedState(
						structure,
						remainingBackJumps,
						voltaPass,
						repeatEnd.startIndex,
						i,
					);
					i = repeatEnd.startIndex;
				} else {
					remainingBackJumps.delete(i);
					i++;
				}
				continue;
			}

			i++;
		}

		return result;
	}

	/* Reset repeat-ends and voltas nested strictly inside a range being jumped back over, so their
	 * counters re-initialize on the next pass through the outer block. */
	private resetNestedState(
		structure: Structure,
		remainingBackJumps: Map<number, number>,
		voltaPass: Map<Volta, number>,
		startIndex: number,
		endIndex: number,
	): void {
		for (const measureIndex of structure.repeatEndsByMeasure.keys()) {
			if (measureIndex > startIndex && measureIndex < endIndex) {
				remainingBackJumps.delete(measureIndex);
			}
		}
		for (const volta of structure.voltas) {
			if (volta.startIndex > startIndex && volta.startIndex < endIndex) {
				voltaPass.delete(volta);
			}
		}
	}

	private findJump<K extends Jump['type']>(
		jumps: Jump[],
		type: K,
	): Extract<Jump, { type: K }> | undefined {
		return jumps.find(
			(jump): jump is Extract<Jump, { type: K }> => jump.type === type,
		);
	}
}
