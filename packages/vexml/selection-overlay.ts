import type { Rect } from 'webappwiz/geometry';
import { ColorStyle } from './color-style';
import type { EditingPresentation, EditingView } from './editing-view';
import { HaloStyle } from './halo-style';
import type { Layer } from './layer';
import type { Note } from './note';
import type { System } from './system';

export interface SelectionOverlayOptions {
	/** Selected note color, also used translucently for the cursor halo and selection region. */
	color?: string;
	/** Cursor halo outline color; defaults to the selection color. */
	focusColor?: string;
}

/** Shared halo geometry on editing-owned layers, independent of hover and playback. */
export class SelectionOverlay implements EditingView {
	private previous: Rect[] = [];
	private previousFocus: Rect[] = [];
	private readonly halo = new HaloStyle();
	private readonly color = new ColorStyle();
	constructor(
		private readonly layer: Layer,
		private readonly options: SelectionOverlayOptions = {},
		private readonly focusLayer: Layer = layer,
	) {}

	render(state: EditingPresentation): void {
		const ctx = this.layer.ctx;
		for (const rect of this.previous) {
			ctx.clearRect(rect.x - 1, rect.y - 1, rect.w + 2, rect.h + 2);
		}
		this.previous = [];
		for (const rect of this.previousFocus) {
			this.focusLayer.ctx.clearRect(
				rect.x - 1,
				rect.y - 1,
				rect.w + 2,
				rect.h + 2,
			);
		}
		this.previousFocus = [];
		ctx.save();
		const color = this.options.color ?? '#155dfc';
		ctx.fillStyle = color;
		ctx.globalAlpha = 0.1;
		const regions = state.marquee
			? [state.marquee]
			: this.regions(state.selected);
		for (const rect of regions) {
			ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
			this.previous.push(rect);
		}
		const foreground = this.focusLayer.ctx;
		foreground.save();
		foreground.globalAlpha = 1;
		const colored = new Set([
			...state.selected,
			...(state.focus ? [state.focus] : []),
		]);
		for (const note of colored) {
			for (const element of [note, note.getTabPosition()]) {
				if (element) {
					this.color.draw(foreground, element, color);
					this.previousFocus.push(this.color.bounds(element));
				}
			}
		}
		if (state.focus) {
			for (const element of [state.focus, state.focus.getTabPosition()]) {
				if (element) {
					ctx.globalAlpha = 0.24;
					this.halo.draw(ctx, element, color);
					this.previous.push(this.halo.bounds(element));
					foreground.globalAlpha = 1;
					this.halo.drawOutline(
						foreground,
						element,
						this.options.focusColor ?? color,
					);
					this.previousFocus.push(this.halo.bounds(element));
				}
			}
		}
		foreground.restore();
		ctx.globalAlpha = 1;
		if (state.marquee) {
			const rect = state.marquee;
			ctx.fillStyle = color;
			ctx.fillRect(rect.x, rect.y, rect.w, 1);
			ctx.fillRect(rect.x, rect.bottom - 1, rect.w, 1);
			ctx.fillRect(rect.x, rect.y, 1, rect.h);
			ctx.fillRect(rect.right - 1, rect.y, 1, rect.h);
		}
		ctx.restore();
	}

	dispose(): void {
		this.layer.dispose();
		if (this.focusLayer !== this.layer) {
			this.focusLayer.dispose();
		}
	}

	/** Separate enclosures per score line avoid shading the gap between wrapped systems. */
	private regions(notes: readonly Note[]): Rect[] {
		if (notes.length < 2) {
			return [];
		}
		const systems = new Map<System, Rect>();
		for (const note of notes) {
			const system = note.getMeasure().getBox().getSystem();
			for (const element of [note, note.getTabPosition()]) {
				if (element) {
					const rect = this.halo.bounds(element);
					systems.set(system, systems.get(system)?.union(rect) ?? rect);
				}
			}
		}
		return [...systems.values()];
	}
}
