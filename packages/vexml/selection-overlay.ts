import { Rect } from 'webappwiz/geometry';
import type { EditingPresentation, EditingView } from './editing-view';
import type { Layer } from './layer';

export interface SelectionOverlayOptions {
	/** Selection wash color, drawn translucently over the engraving. */
	color?: string;
	/** Focus outline color; defaults to the selection color. */
	focusColor?: string;
}

/** Selection washes and a focus outline, isolated on a score-owned drawing layer. */
export class SelectionOverlay implements EditingView {
	private previous: Rect[] = [];
	constructor(
		private readonly layer: Layer,
		private readonly options: SelectionOverlayOptions = {},
	) {}

	render(state: EditingPresentation): void {
		const ctx = this.layer.ctx;
		for (const rect of this.previous) {
			ctx.clearRect(rect.x - 1, rect.y - 1, rect.w + 2, rect.h + 2);
		}
		this.previous = [];
		ctx.save();
		ctx.fillStyle = this.options.color ?? '#155dfc';
		ctx.globalAlpha = 0.24;
		for (const note of state.selected) {
			for (const element of [note, note.getTabPosition()]) {
				if (!element) {
					continue;
				}
				const rect = this.padded(element.rect);
				ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
				this.previous.push(rect);
			}
		}
		ctx.globalAlpha = 1;
		ctx.fillStyle = this.options.focusColor ?? this.options.color ?? '#155dfc';
		const targets = state.focus
			? [state.focus.rect, state.focus.getTabPosition()?.rect]
			: [state.position];
		for (const target of targets) {
			if (!target) {
				continue;
			}
			const rect = this.padded(target);
			ctx.fillRect(rect.x, rect.y, rect.w, 2);
			ctx.fillRect(rect.x, rect.y + rect.h - 2, rect.w, 2);
			ctx.fillRect(rect.x, rect.y, 2, rect.h);
			ctx.fillRect(rect.x + rect.w - 2, rect.y, 2, rect.h);
			this.previous.push(rect);
		}
		if (state.marquee) {
			const rect = state.marquee;
			ctx.globalAlpha = 0.12;
			ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
			ctx.globalAlpha = 1;
			ctx.fillRect(rect.x, rect.y, rect.w, 1);
			ctx.fillRect(rect.x, rect.bottom - 1, rect.w, 1);
			ctx.fillRect(rect.x, rect.y, 1, rect.h);
			ctx.fillRect(rect.right - 1, rect.y, 1, rect.h);
			this.previous.push(rect);
		}
		ctx.restore();
	}

	dispose(): void {
		this.layer.dispose();
	}

	private padded(rect: Rect): Rect {
		return new Rect(rect.x - 3, rect.y - 3, rect.w + 6, rect.h + 6);
	}
}
