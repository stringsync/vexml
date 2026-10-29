import type { PaintElement, PaintOp } from './paint-op';
import type { PaintSink } from './paint-sink';

/* Where a {@link PaintList} stood, for {@link PaintList.rewind}. */
export interface PaintListMark {
	ops: number;
	groups: number;
	nextElement: number;
}

/* A sink that only keeps the ops, in order: what the engraving is drawn into before its final
 * size and crop are known, then loaded into a surface whole. */
export class PaintList implements PaintSink {
	readonly scale = 1;
	readonly ops: PaintOp[] = [];
	private readonly groups: Array<{ element: PaintElement; explicit: boolean }> =
		[];
	private nextElement = 0;

	/** Attribute subsequent ops to this notation identity until closeGroup() is called. */
	openGroup(kind: string): undefined {
		const parent = this.groups.at(-1)?.element;
		const explicit = kind.startsWith('vexml-');
		this.groups.push({
			element: {
				id: this.nextElement++,
				kind: kind.replace(/^vexml-/, ''),
				parent: parent?.id,
				ancestors: this.groups.map((group) => group.element.id),
			},
			explicit,
		});
		return undefined;
	}

	closeGroup(): void {
		this.groups.pop();
	}

	paint(op: PaintOp): void {
		let element: PaintElement | undefined =
			(this.groups.findLast((group) => group.explicit) ?? this.groups.at(-1))
				?.element ??
			(op.call.kind === 'fillText' || op.call.kind === 'strokeText'
				? { id: this.nextElement++, kind: 'text' }
				: { id: this.nextElement++, kind: 'path' });
		if (
			element?.kind === 'notehead' &&
			(op.call.kind === 'fillText' || op.call.kind === 'strokeText')
		) {
			const glyph = op.call.text.codePointAt(0) ?? 0;
			if (glyph >= 0xe4e0 && glyph <= 0xe4ff) {
				element = { ...element, kind: 'rest' };
			}
		}
		this.ops.push(element ? { ...op, element } : op);
	}

	read(): ImageData {
		throw new Error(
			'vexml: the engraving cannot be read back while it is drawn',
		);
	}

	/* The group depth and element counter as they are now, for {@link rewind}; the ops are marked by length. */
	mark(): PaintListMark {
		return {
			ops: this.ops.length,
			groups: this.groups.length,
			nextElement: this.nextElement,
		};
	}

	/* Back to `mark`: later ops go and so do the ids they took, so what is kept depends on nothing discarded. */
	rewind(mark: PaintListMark): void {
		this.ops.length = mark.ops;
		this.groups.length = mark.groups;
		this.nextElement = mark.nextElement;
	}

	reset(): void {
		this.ops.length = 0;
		this.groups.length = 0;
		this.nextElement = 0;
	}
}
