import { Dot, type StaveNote } from 'vexflow/core';

interface DotColumn {
	firstHead: number;
	top: number;
	bottom: number;
	bottomRow: number;
	count: number;
}

/** A chord dot keeps VexFlow's horizontal formatting and uses a chosen space row. */
export class ChordDot extends Dot {
	constructor(
		private readonly rowShift: number,
		private readonly columnDot?: ChordDot,
	) {
		super();
	}

	override setXShift(shift: number): this {
		// VexFlow formats equal-line dots in attachment order as one duration.
		return super.setXShift(this.columnDot?.getXShift() ?? shift);
	}

	override getInkBounds() {
		this.dotShiftY = this.rowShift;
		return super.getInkBounds();
	}

	override draw(): void {
		this.dotShiftY = this.rowShift;
		super.draw();
	}

	/** Place a unison pair or a run of adjacent notes, including across ledger lines. */
	static attach(
		note: StaveNote,
		dotsPerRow: number,
		placeAdjacentRows: boolean,
	): boolean {
		const heads = note
			.getKeyProps()
			.map(({ line }, index) => ({ line, index }))
			.sort((a, b) => a.line - b.line);
		const unison = heads.length === 2 && heads[0]?.line === heads[1]?.line;
		if (
			!unison &&
			(!placeAdjacentRows ||
				heads.some(({ line }, i) => line === heads[i - 1]?.line) ||
				!heads.some(({ line }, i) => heads[i - 1]?.line === line - 0.5))
		) {
			return false;
		}

		const columns = ChordDot.packColumns(
			heads.map(({ line }) => line),
			true,
		);

		for (const { firstHead, bottomRow, count } of columns) {
			const anchors = heads.slice(firstHead, firstHead + count);
			const firstRow: ChordDot[] = [];
			for (const [offset, { line, index }] of anchors.entries()) {
				for (let dot = 0; dot < dotsPerRow; dot++) {
					const modifier = new ChordDot(
						line - (bottomRow + offset),
						unison ? firstRow[dot] : undefined,
					);
					note.addModifier(modifier, index);
					if (unison && offset === 0) {
						firstRow.push(modifier);
					}
				}
			}
		}
		return true;
	}

	/** Pack sorted head lines into distinct half-integer staff spaces. */
	static spaceRows(sortedLines: number[]): number[] {
		const columns = ChordDot.packColumns(sortedLines, false);
		const rows: number[] = [];
		for (const { bottomRow, count } of columns) {
			for (let offset = 0; offset < count; offset++) {
				rows.push(bottomRow + offset);
			}
		}
		return rows;
	}

	private static packColumns(
		sortedLines: number[],
		clampDense: boolean,
	): DotColumn[] {
		const columns: DotColumn[] = [];
		for (const [head, line] of sortedLines.entries()) {
			let column = ChordDot.column(head, 1, line, line, clampDense);
			let previous = columns.at(-1);
			// If the centred rows reach a neighbouring group, fit them together.
			while (
				previous &&
				(column.bottom - previous.top <= 0.5 ||
					column.bottomRow < previous.bottomRow + previous.count)
			) {
				columns.pop();
				column = ChordDot.column(
					previous.firstHead,
					head - previous.firstHead + 1,
					previous.bottom,
					line,
					clampDense,
				);
				previous = columns.at(-1);
			}
			columns.push(column);
		}
		return columns;
	}

	private static column(
		firstHead: number,
		count: number,
		bottom: number,
		top: number,
		clampDense: boolean,
	): DotColumn {
		const idealBottom = (bottom + top - (count - 1)) / 2;
		// Rows are half-integer staff lines. On a tie, prefer the upper space.
		const bottomRow = Math.floor(idealBottom) + 0.5;
		const topRow = bottomRow + count - 1;
		if (clampDense && (bottom - bottomRow >= 2 || topRow - top >= 2)) {
			const firstInside = Math.ceil(bottom - 0.5) + 0.5;
			const lastInside = Math.floor(top - 0.5) + 0.5;
			return {
				firstHead,
				bottom,
				top,
				bottomRow: firstInside,
				count: lastInside - firstInside + 1,
			};
		}
		return { firstHead, bottom, top, bottomRow, count };
	}
}
