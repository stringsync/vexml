import type { NoteHead, StaveNoteStruct } from 'vexflow/core';
import { UnisonHead } from './unison-head';
import { VexmlStaveNote } from './vexml-stave-note';

const HEAD_GAP = 4;

/* Keep source indices for ties, editing, and per-head modifiers. Only the head positions change. */
export class AlteredUnisonNote extends VexmlStaveNote {
	constructor(
		struct: StaveNoteStruct,
		private readonly groups: readonly number[][],
	) {
		super(struct);
		this.reset();
	}

	override buildNoteHeads(): NoteHead[] {
		const heads = super.buildNoteHeads();
		for (const group of this.groups ?? []) {
			const nativeX = group
				.map((index) => heads[index]?.getDisplacementX() ?? 0)
				.reduce((nearest, x) =>
					Math.abs(x) < Math.abs(nearest) ? x : nearest,
				);
			for (const [rank, index] of group.entries()) {
				const head = heads[index];
				if (!head) {
					continue;
				}
				// The first head stays in line with the other staves.
				const placed = new UnisonHead(
					{
						duration: this.duration,
						noteType: this.getNoteType(),
						stemDirection: this.getStemDirection(),
						customGlyphCode: head.getText(),
						line: head.getLine(),
					},
					nativeX !== 0 || rank !== 0,
					() => nativeX + this.distance(group, rank),
				);
				placed.fontInfo = this.fontInfo;
				this.children = this.children.filter((child) => child !== head);
				this.addChild(placed);
				heads[index] = placed;
			}
		}
		return heads;
	}

	private distance(group: readonly number[], to: number): number {
		const heads = this.noteHeads;
		let width = 0;
		for (let rank = 0; rank < to; rank++) {
			width += heads[group[rank] ?? -1]?.getWidth() ?? 0;
		}
		return width;
	}

	override calcNoteDisplacements(): void {
		super.calcNoteDisplacements();
		if (!this.groups?.length) {
			return;
		}
		const heads = this.noteHeads;
		const left = Math.min(0, ...heads.map((head) => head.getDisplacementX()));
		const right = Math.max(
			0,
			...heads.map((head) => head.getDisplacementX() + head.getWidth()),
		);
		this.setLeftDisplacedHeadPx(-left);
		this.setRightDisplacedHeadPx(
			Math.max(0, right + HEAD_GAP - this.getGlyphWidth()),
		);
	}

	override preFormat(): void {
		if (this.preFormatted) {
			return;
		}
		this.calcNoteDisplacements();
		super.preFormat();
	}
}
