import {
	STRING_NUMBER_DIGIT_RISE,
	STRING_NUMBER_FONT_SIZE,
	STRING_NUMBER_RADIUS,
	STRING_NUMBER_RING_WIDTH,
	TECHNICAL_ROW_GAP,
} from './constants';
import { TechnicalAnnotation } from './technical-annotation';

/* A <string> indicator: the string's number in a ring. */
export class StringNumberAnnotation extends TechnicalAnnotation {
	constructor(number: string, below: boolean) {
		super(number, below);
		this.setFontSize(STRING_NUMBER_FONT_SIZE);
	}

	override rowHeight(): number {
		return 2 * STRING_NUMBER_RADIUS + TECHNICAL_ROW_GAP;
	}

	/* The ring fills its whole row, so its center is one radius up from the row's bottom. */
	private ringCenterY(): number {
		return this.baselineY - STRING_NUMBER_RADIUS;
	}

	/* The digit sits inside the ring, not on the row's baseline. */
	protected override textBaselineY(): number {
		return this.ringCenterY() + STRING_NUMBER_DIGIT_RISE;
	}

	override draw(): void {
		super.draw();
		const ctx = this.checkContext();
		ctx.beginPath();
		ctx.arc(
			this.getX() + this.getWidth() / 2,
			this.ringCenterY(),
			STRING_NUMBER_RADIUS,
			0,
			2 * Math.PI,
			false,
		);
		ctx.setLineWidth(STRING_NUMBER_RING_WIDTH);
		ctx.stroke();
	}
}
