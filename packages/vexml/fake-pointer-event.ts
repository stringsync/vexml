export interface FakePointerEventOptions {
	ctrlKey?: boolean;
	metaKey?: boolean;
	pointerId?: number;
	pointerType?: string;
	button?: number;
	/* Defaults to no buttons held on pointerup and pointercancel, the primary button otherwise. */
	buttons?: number;
}

/* A pointer event carrying just the fields the editing controller reads. Test-only. */
export class FakePointerEvent extends Event {
	readonly ctrlKey: boolean;
	readonly metaKey: boolean;
	readonly pointerId: number;
	readonly pointerType: string;
	readonly button: number;
	readonly buttons: number;
	readonly isPrimary = true;

	constructor(
		type: string,
		readonly clientX: number,
		readonly clientY: number,
		opts: FakePointerEventOptions = {},
	) {
		super(type, { cancelable: true });
		this.ctrlKey = opts.ctrlKey ?? false;
		this.metaKey = opts.metaKey ?? false;
		this.pointerId = opts.pointerId ?? 1;
		this.pointerType = opts.pointerType ?? 'mouse';
		this.button = opts.button ?? 0;
		this.buttons =
			opts.buttons ??
			(type === 'pointerup' || type === 'pointercancel' ? 0 : 1);
	}
}
