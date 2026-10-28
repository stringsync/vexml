import { Rect } from 'webappwiz/geometry';
import type { Barline } from './barline';
import { ColorStyle } from './color-style';
import type { EditingPresentation, EditingView } from './editing-view';
import { HaloStyle } from './halo-style';
import type { Layer } from './layer';
import type { Measure } from './measure';
import type { Note } from './note';
import type { System } from './system';

export interface SelectionOverlayOptions {
	/** Selected note color, also used translucently for the cursor halo and selection region. */
	color?: string;
	/** Cursor halo outline color; defaults to the selection color. */
	focusColor?: string;
	/** Step-entry caret color; defaults to the focus color. */
	caretColor?: string;
	/** Step-entry caret width in score pixels. Defaults to 2. */
	caretWidth?: number;
}

/* How far a measure or barline's shading reaches past its staff lines. */
const STRUCTURE_PAD = 4;

/** Shared halo geometry on editing-owned layers, independent of hover and playback. */
export class SelectionOverlay implements EditingView {
	private previous: Rect[] = [];
	private previousFocus: Rect[] = [];
	private previousCaret: Rect | null = null;
	private readonly halo = new HaloStyle();
	private readonly color = new ColorStyle();
	constructor(
		private readonly layer: Layer,
		// scry-ignore named-options-last: SelectionOverlay is published, and callers pass focusLayer
		// third; moving it into opts would break `new SelectionOverlay(layer, opts, focusLayer)`.
		private readonly opts: SelectionOverlayOptions = {},
		private readonly focusLayer: Layer = layer,
	) {}

	render(state: EditingPresentation): void {
		// Nothing to erase and nothing to draw: leave the layers untouched (a lazy one stays unmade).
		if (
			this.previous.length === 0 &&
			this.previousFocus.length === 0 &&
			!this.previousCaret &&
			!state.marquee &&
			!state.focus &&
			!state.caret &&
			state.selected.length === 0 &&
			state.measures.length === 0 &&
			!state.barline &&
			!state.structuralFocus
		) {
			return;
		}
		const caretWidth = this.opts.caretWidth ?? 2;
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
		if (this.previousCaret) {
			this.focusLayer.ctx.clearRect(
				this.previousCaret.x - caretWidth / 2 - 1,
				this.previousCaret.y - 1,
				caretWidth + 2,
				this.previousCaret.h + 2,
			);
			this.previousCaret = null;
		}
		ctx.save();
		const color = this.opts.color ?? '#155dfc';
		ctx.fillStyle = color;
		ctx.globalAlpha = 0.1;
		const regions = state.marquee
			? [state.marquee]
			: [
					...this.regions(state.selected),
					...this.measureRegions(state.measures),
				];
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
						this.opts.focusColor ?? color,
					);
					this.previousFocus.push(this.halo.bounds(element));
				}
			}
		}
		if (state.caret) {
			foreground.fillStyle =
				this.opts.caretColor ?? this.opts.focusColor ?? color;
			foreground.fillRect(
				state.caret.x - caretWidth / 2,
				state.caret.y,
				caretWidth,
				state.caret.h,
			);
			this.previousCaret = state.caret;
		}
		if (state.barline) {
			const rect = this.padded(state.barline);
			ctx.globalAlpha = 0.24;
			ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
			this.previous.push(rect);
		}
		if (state.structuralFocus) {
			const rect = this.padded(state.structuralFocus);
			foreground.fillStyle = this.opts.focusColor ?? color;
			this.outline(foreground, rect, 2);
			this.previousFocus.push(rect);
		}
		foreground.restore();
		ctx.globalAlpha = 1;
		if (state.marquee) {
			const rect = state.marquee;
			ctx.fillStyle = color;
			this.outline(ctx, rect, 1);
		}
		ctx.restore();
	}

	dispose(): void {
		this.layer.dispose();
		if (this.focusLayer !== this.layer) {
			this.focusLayer.dispose();
		}
	}

	/** A frame `width` thick inside `rect`. */
	private outline(
		ctx: CanvasRenderingContext2D,
		rect: Rect,
		width: number,
	): void {
		ctx.fillRect(rect.x, rect.y, rect.w, width);
		ctx.fillRect(rect.x, rect.bottom - width, rect.w, width);
		ctx.fillRect(rect.x, rect.y, width, rect.h);
		ctx.fillRect(rect.right - width, rect.y, width, rect.h);
	}

	private padded(element: Measure | Barline): Rect {
		const r = element.rect;
		return new Rect(r.x, r.y - STRUCTURE_PAD, r.w, r.h + 2 * STRUCTURE_PAD);
	}

	/** One band per score line, so a range across a system break shades each line's bars only. */
	private measureRegions(measures: readonly Measure[]): Rect[] {
		const systems = new Map<System, Rect>();
		for (const measure of measures) {
			const system = measure.getBox().getSystem();
			const rect = this.padded(measure);
			systems.set(system, systems.get(system)?.union(rect) ?? rect);
		}
		return [...systems.values()];
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
