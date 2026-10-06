export interface FakeClickEventOptions {
	shiftKey?: boolean;
	ctrlKey?: boolean;
}

/* A click carrying just the fields the editing controller reads. Test-only. */
export class FakeClickEvent extends Event {
	readonly shiftKey: boolean;
	readonly ctrlKey: boolean;
	readonly metaKey = false;
	readonly pointerId = 1;

	constructor(
		readonly clientX: number,
		readonly clientY: number,
		opts: FakeClickEventOptions = {},
	) {
		super('click');
		this.shiftKey = opts.shiftKey ?? false;
		this.ctrlKey = opts.ctrlKey ?? false;
	}
}
