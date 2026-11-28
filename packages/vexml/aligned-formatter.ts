import {
	type AlignmentTickContexts,
	BarNote,
	Formatter,
	Fraction,
	ModifierContext,
	type Stave,
	TickContext,
	type Voice,
} from 'vexflow/core';

/*
 * Formatter subclass that keeps mid-measure BarNotes from shifting subsequent
 * notes' ticks (Behind Bars p. 176). VexFlow's Formatter advances its tick
 * cursor by BarNote's intrinsic 'b' duration (64 ticks) even though BarNote sets
 * ignoreTicks = true, so a barline in one part steals the tick context of the
 * simultaneous note in another part and pushes every later note in its own voice
 * out of alignment.
 *
 * Here, each BarNote gets its own tick context just before the beat it precedes
 * without advancing the voice's tick cursor, so simultaneous notes across parts
 * (and across voices on the same staff) keep sharing the same tick context while
 * each mid-measure barline still reserves horizontal room to the left of its
 * downbeat.
 */
export class AlignedFormatter extends Formatter {
	override createModifierContexts(voices: Voice[]): void {
		if (!hasMidBarNote(voices)) {
			super.createModifierContexts(voices);
			return;
		}
		const resolutionMultiplier = Formatter.getResolutionMultiplier(voices);
		const tickToContextMap = new Map<
			Stave | undefined,
			Record<number, ModifierContext>
		>();
		const contexts: ModifierContext[] = [];
		for (const voice of voices) {
			const ticksUsed = new Fraction(0, resolutionMultiplier);
			for (const tickable of voice.getTickables()) {
				if (tickable instanceof BarNote) {
					continue;
				}
				const integerTicks = ticksUsed.numerator;
				const stave = tickable.getStave();
				let staveMap = tickToContextMap.get(stave);
				if (!staveMap) {
					staveMap = {};
					tickToContextMap.set(stave, staveMap);
				}
				let modifierContext = staveMap[integerTicks];
				if (!modifierContext) {
					modifierContext = new ModifierContext();
					contexts.push(modifierContext);
					staveMap[integerTicks] = modifierContext;
				}
				tickable.addToModifierContext(modifierContext);
				ticksUsed.add(tickable.getTicks());
			}
		}
		this.modifierContexts.push({
			map: tickToContextMap,
			array: contexts,
			resolutionMultiplier,
		});
	}

	override createTickContexts(voices: Voice[]): AlignmentTickContexts {
		if (!hasMidBarNote(voices)) {
			return super.createTickContexts(voices);
		}
		const tickToContextMap: Record<number, TickContext> = {};
		const tickList: number[] = [];
		const tickContexts: TickContext[] = [];
		const resolutionMultiplier = Formatter.getResolutionMultiplier(voices);
		voices.forEach((voice, voiceIndex) => {
			const ticksUsed = new Fraction(0, resolutionMultiplier);
			let barSlot = 0;
			for (const tickable of voice.getTickables()) {
				const integerTicks = ticksUsed.numerator;
				if (tickable instanceof BarNote) {
					// Place the barline strictly before the beat it precedes (without advancing
					// ticksUsed) so simultaneous notes at integerTicks stay in the same context.
					const barTick = integerTicks - 0.5 + barSlot * 0.01;
					barSlot++;
					let barContext = tickToContextMap[barTick];
					if (!barContext) {
						barContext = new TickContext({ tickID: barTick });
						tickContexts.push(barContext);
						tickToContextMap[barTick] = barContext;
						tickList.push(barTick);
					}
					barContext.addTickable(tickable, voiceIndex);
					continue;
				}
				barSlot = 0;
				let tickContext = tickToContextMap[integerTicks];
				if (!tickContext) {
					tickContext = new TickContext({ tickID: integerTicks });
					tickContexts.push(tickContext);
					tickToContextMap[integerTicks] = tickContext;
					tickList.push(integerTicks);
				}
				tickContext.addTickable(tickable, voiceIndex);
				ticksUsed.add(tickable.getTicks());
			}
		});
		const sortedList = tickList.sort((a, b) => a - b);
		const sortedContexts = sortedList
			.map((tick) => tickToContextMap[tick])
			.filter((ctx): ctx is TickContext => ctx !== undefined);
		const contexts: AlignmentTickContexts = {
			map: tickToContextMap,
			array: tickContexts,
			list: sortedList,
			resolutionMultiplier,
		};
		TickContext.linkTimeline(sortedContexts);
		for (const context of tickContexts) {
			context.tContexts = tickContexts;
		}
		this.tickContexts = contexts;
		return contexts;
	}
}

function hasMidBarNote(voices: readonly Voice[]): boolean {
	return voices.some((voice) =>
		voice.getTickables().some((tickable) => tickable instanceof BarNote),
	);
}
