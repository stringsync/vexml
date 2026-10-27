import type { Part } from '@stringsync/mdom';
import type { MeasureNumbering } from './config';
import type {
	MeasureNumberingMark,
	ScoreReader,
	SystemRelation,
} from './score-reader';
import type { StavePlan } from './stave-plan';

export type MeasureNumberPlanOptions = {
	mode: MeasureNumbering;
};

/*
 * Which staves print a measure's number. A configured mode numbers the system's top stave on
 * its own cadence. 'document' follows each part's `<print><measure-numbering>`, carried forward
 * from where it is set, and its `system` attribute picks the part (the system's top or bottom,
 * the part itself, or both) whose stave shows it; a document that sets none numbers like
 * 'system'. Fixed for a render, so each part's marks are read once.
 */
export class MeasureNumberPlan {
	// Part index -> measure index -> the mark in effect there (null before the first).
	private readonly marks: (MeasureNumberingMark | null)[][];
	private readonly followsDocument: boolean;
	private readonly mode: MeasureNumbering;

	constructor(
		reader: ScoreReader,
		private readonly staves: StavePlan,
		private readonly parts: Part[],
		opts: MeasureNumberPlanOptions,
	) {
		const { mode } = opts;
		this.mode = mode;
		this.marks = parts.map((part) => {
			let current: MeasureNumberingMark | null = null;
			return part.measures.map((measure) => {
				current = reader.measureNumberingOf(measure) ?? current;
				return current;
			});
		});
		this.followsDocument =
			mode === 'document' &&
			this.marks.some((marks) => marks.some((mark) => mark !== null));
	}

	/** Whether the stave for `staffNumber` of `parts[partIndex]` prints measure `m`'s number. */
	numbers(
		partIndex: number,
		staffNumber: string,
		m: number,
		isSystemStart: boolean,
	): boolean {
		if (!this.followsDocument) {
			const top = this.topStave(m);
			return (
				top?.partIndex === partIndex &&
				top.staffNumber === staffNumber &&
				this.onCadence(m, isSystemStart)
			);
		}
		return this.marks.some((marks, from) => {
			const mark = marks[m];
			if (!mark || !this.shows(mark, from, m, isSystemStart)) {
				return false;
			}
			return this.targets(mark, from, m).some(
				(target) =>
					target.partIndex === partIndex && target.staffNumber === staffNumber,
			);
		});
	}

	/** The configured cadence; 'document' with nothing in the document numbers each system. */
	private onCadence(m: number, isSystemStart: boolean): boolean {
		switch (this.mode) {
			case 'none':
				return false;
			case 'document':
			case 'system':
				return isSystemStart;
			case 'every':
				return true;
			case 'every-2':
				return isSystemStart || m % 2 === 0;
			case 'every-3':
				return isSystemStart || m % 3 === 0;
		}
	}

	/** A document mark's cadence. An implicit measure (a pickup) never shows its number. */
	private shows(
		mark: MeasureNumberingMark,
		partIndex: number,
		m: number,
		isSystemStart: boolean,
	): boolean {
		if (this.parts[partIndex]?.measures[m]?.isImplicit) {
			return false;
		}
		switch (mark.value) {
			case 'none':
				return false;
			case 'measure':
				return true;
			case 'system':
				return isSystemStart;
		}
	}

	/*
	 * The staves a mark from `parts[from]` numbers. An absent `system` reads as only-top, the
	 * number belonging to the system, which is how scores print it and what keeps a mark every
	 * part repeats from numbering every part. The top and bottom parts take their own top
	 * stave; the declaring part takes the `staff` the mark names when it shows that one.
	 */
	private targets(
		mark: MeasureNumberingMark,
		from: number,
		m: number,
	): { partIndex: number; staffNumber: string }[] {
		const relation: SystemRelation = mark.system ?? 'only-top';
		const own = this.ownStave(from, m, mark.staff);
		const top = this.topStave(m);
		const bottom = this.bottomStave(m);
		const targets = {
			'only-top': [top],
			'only-bottom': [bottom],
			'also-top': [own, top],
			'also-bottom': [own, bottom],
			none: [own],
		}[relation];
		return targets.filter((target) => target !== null);
	}

	private ownStave(
		partIndex: number,
		m: number,
		staff: string | null,
	): { partIndex: number; staffNumber: string } | null {
		const visible = this.visibleOf(partIndex, m);
		const staffNumber =
			staff !== null && visible.includes(staff) ? staff : visible[0];
		return staffNumber ? { partIndex, staffNumber } : null;
	}

	private topStave(
		m: number,
	): { partIndex: number; staffNumber: string } | null {
		for (let partIndex = 0; partIndex < this.parts.length; partIndex++) {
			const own = this.ownStave(partIndex, m, null);
			if (own) {
				return own;
			}
		}
		return null;
	}

	private bottomStave(
		m: number,
	): { partIndex: number; staffNumber: string } | null {
		for (let partIndex = this.parts.length - 1; partIndex >= 0; partIndex--) {
			const own = this.ownStave(partIndex, m, null);
			if (own) {
				return own;
			}
		}
		return null;
	}

	/** The staves the part draws in measure `m`: none when it has no such measure. */
	private visibleOf(partIndex: number, m: number): string[] {
		const part = this.parts[partIndex];
		return part?.measures[m] ? this.staves.visibleNumbers(part) : [];
	}
}
