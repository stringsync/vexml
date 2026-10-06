export interface FakeKeyEventOptions {
	shiftKey?: boolean;
	ctrlKey?: boolean;
	isComposing?: boolean;
}

/* A keydown carrying just the fields the editing controller reads. Test-only. */
export class FakeKeyEvent extends Event {
	readonly shiftKey: boolean;
	readonly ctrlKey: boolean;
	readonly isComposing: boolean;
	readonly altKey = false;
	readonly metaKey = false;

	constructor(
		readonly key: string,
		opts: FakeKeyEventOptions = {},
	) {
		super('keydown', { cancelable: true });
		this.shiftKey = opts.shiftKey ?? false;
		this.ctrlKey = opts.ctrlKey ?? false;
		this.isComposing = opts.isComposing ?? false;
	}
}
