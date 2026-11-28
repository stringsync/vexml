import {
	BoundingBox,
	Dot,
	Font,
	Metrics,
	Modifier,
	Renderer,
	StaveNote,
	TextBracket,
} from 'vexflow/core';

/* How far left of the first notehead the octave numeral starts, in stave spaces. */
const NUMERAL_LEFT_OFFSET = 0.35;
/* Target ink height of the octave numeral, in stave spaces (Behind Bars p. 28). */
const NUMERAL_HEIGHT_SPACES = 1.5;
/* Ratio of the optional suffix ("va", "vb", "ma", "mb") to the numeral font size. */
const SUFFIX_FONT_SCALE = 0.65;
/* Gap between the label's right edge and the start of the extension line (px). */
const LABEL_LINE_GAP = 3;
/* Clearance past the last notehead (including dots) before the end corner, in stave spaces. */
const END_CLEARANCE_SPACES = 0.25;
/* Horizontal leg length of the closing right-angle corner, in stave spaces. */
const CORNER_STUB_SPACES = 0.5;
/* Air between the last dash and the solid end corner (px). */
const CORNER_DASH_GAP = 3;

/*
 * An ottava bracket (<octave-shift>) engraved to Behind Bars defaults (pp. 28–31):
 * an italic numeral 1½ stave spaces high just left of the first note, its extension
 * line aligned with the numeral's outer edge (top above, base below), and a solid
 * right-angle end corner just past the last notehead and its dots (including on a
 * single-note shift). Also supports a SMuFL glyph label when a document's
 * `<appearance><glyph type="octave-shift-...">` names one.
 */
export class OttavaBracket extends TextBracket {
	private customGlyph = false;
	private customBaseline: number | undefined;
	private customEndX: number | undefined;

	/* Label the bracket with `glyph` in the notation font, in place of the numeral and suffix. */
	useGlyph(glyph: string, notationFont: string): this {
		this.customGlyph = true;
		this.textElement.setFont(notationFont, Metrics.get('fontSize'));
		this.textElement.setText(glyph);
		this.superscriptElement.setText('');
		return this;
	}

	/* Extend the dashed line to a system-end barline without a closing end corner. */
	runToBarline(x: number): this {
		this.customEndX = x;
		this.renderOptions.showBracket = false;
		return this;
	}

	override setLayoutBaseline(y?: number): void {
		this.customBaseline = y;
		super.setLayoutBaseline(y);
	}

	override getBoundingBox(): BoundingBox {
		const { textX, y, superX, superY, startX, endX, lineY, bracketHeight } =
			this.layout();
		const pad = this.renderOptions.lineWidth / 2;
		const height = this.renderOptions.showBracket ? bracketHeight : 0;
		return this.textElement
			.getTextInk(textX, y)
			.mergeWith(this.superscriptElement.getTextInk(superX, superY))
			.mergeWith(
				new BoundingBox(
					Math.min(startX, endX) - pad,
					Math.min(lineY, lineY + height) - pad,
					Math.abs(endX - startX) + 2 * pad,
					Math.abs(height) + 2 * pad,
				),
			);
	}

	override draw(): void {
		const ctx = this.checkContext();
		this.setRendered();
		const {
			textX,
			y,
			superX,
			superY,
			startX,
			endX,
			lineY,
			bracketHeight,
			cornerStub,
		} = this.layout();
		this.textElement.renderText(ctx, textX, y);
		if (this.superscriptElement.getText().length > 0) {
			this.superscriptElement.renderText(ctx, superX, superY);
		}
		if (this.renderOptions.dashed) {
			if (this.renderOptions.showBracket) {
				const cornerX = Math.max(startX, endX - cornerStub);
				const dashEnd = cornerX - CORNER_DASH_GAP;
				if (dashEnd > startX) {
					Renderer.drawDashedLine(
						ctx,
						startX,
						lineY,
						dashEnd,
						lineY,
						this.renderOptions.dash,
					);
				}
				ctx.beginPath();
				ctx.moveTo(cornerX, lineY);
				ctx.lineTo(endX, lineY);
				ctx.lineTo(endX, lineY + bracketHeight);
				ctx.stroke();
			} else {
				Renderer.drawDashedLine(
					ctx,
					startX,
					lineY,
					endX,
					lineY,
					this.renderOptions.dash,
				);
			}
		} else {
			ctx.beginPath();
			ctx.moveTo(startX, lineY);
			ctx.lineTo(endX, lineY);
			if (this.renderOptions.showBracket) {
				ctx.lineTo(endX, lineY + bracketHeight);
			}
			ctx.stroke();
		}
	}

	/* Scale the numeral so its ink stands 1½ stave spaces high, keeping custom glyphs untouched. */
	private syncFont(space: number): void {
		if (this.customGlyph) {
			return;
		}
		const { family, size, weight, style } = this.fontInfo;
		const basePx = Font.convertSizeToPixelValue(size);
		this.textElement.setFont(family, `${basePx}px`, weight, style);
		const metrics = this.textElement.getTextMetrics();
		const inkHeight =
			metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent;
		const scaledPx =
			inkHeight > 0
				? basePx * ((NUMERAL_HEIGHT_SPACES * space) / inkHeight)
				: basePx;
		this.textElement.setFont(family, `${scaledPx}px`, weight, style);
		this.superscriptElement.setFont(
			family,
			`${scaledPx * SUFFIX_FONT_SCALE}px`,
			weight,
			style,
		);
	}

	private layout(): {
		textX: number;
		y: number;
		superX: number;
		superY: number;
		startX: number;
		endX: number;
		lineY: number;
		bracketHeight: number;
		cornerStub: number;
	} {
		const stave = this.start.checkStave();
		const space = stave.getSpacingBetweenLines();
		this.syncFont(space);
		const top = this.position === TextBracket.Position.TOP;
		// TextBracket adds Tables.TEXT_HEIGHT_OFFSET_HACK (1) to a below-stave line.
		const defaultY = top
			? stave.getYForTopText(this.line)
			: stave.getYForBottomText(this.line + 1);
		const y = this.customBaseline ?? defaultY;
		const textX = this.start.getAbsoluteX() - NUMERAL_LEFT_OFFSET * space;
		const mainWidth = this.textElement.getWidth();
		const mainMetrics = this.textElement.getTextMetrics();
		const mainTop = y - mainMetrics.actualBoundingBoxAscent;
		const mainBottom = y + mainMetrics.actualBoundingBoxDescent;

		const hasSuper = this.superscriptElement.getText().length > 0;
		const superWidth = hasSuper ? this.superscriptElement.getWidth() : 0;
		const superMetrics = hasSuper
			? this.superscriptElement.getTextMetrics()
			: null;
		const superX = textX + mainWidth + 1;
		let superY = y;
		if (superMetrics) {
			superY = top
				? mainTop + superMetrics.actualBoundingBoxAscent
				: mainBottom - superMetrics.actualBoundingBoxDescent;
		}

		const halfLine = this.renderOptions.lineWidth / 2;
		const lineY = top ? mainTop + halfLine : mainBottom - halfLine;
		const startX =
			textX + mainWidth + (hasSuper ? 1 + superWidth : 0) + LABEL_LINE_GAP;
		const cornerStub = CORNER_STUB_SPACES * space;
		const endX =
			this.customEndX !== undefined
				? Math.max(startX, this.customEndX)
				: Math.max(
						this.stopRightEdge() + END_CLEARANCE_SPACES * space,
						startX + cornerStub,
					);
		const bracketHeight = this.renderOptions.bracketHeight * this.position;
		return {
			textX,
			y,
			superX,
			superY,
			startX,
			endX,
			lineY,
			bracketHeight,
			cornerStub,
		};
	}

	/* Rightmost x of the stop note's noteheads and any duration dots attached to it. */
	private stopRightEdge(): number {
		let right = this.stop.getAbsoluteX() + this.stop.getGlyphWidth();
		if (this.stop instanceof StaveNote) {
			for (const head of this.stop.noteHeads) {
				const box = head.isRendered() ? head.getBoundingBox() : undefined;
				if (box) {
					right = Math.max(right, box.getX() + box.getW());
				}
			}
			for (const mod of this.stop.getModifiers()) {
				if (mod.getCategory() === Dot.CATEGORY) {
					const pos = this.stop.getModifierStartXY(
						Modifier.Position.RIGHT,
						mod.checkIndex(),
						{ forceFlagRight: true },
					);
					right = Math.max(right, pos.x + mod.getXShift() + mod.getWidth());
				}
			}
		}
		return right;
	}
}
