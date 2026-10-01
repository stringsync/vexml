import type { PaintProbe } from './paint-probe';
import type { PaintState } from './paint-state';

/* Fake PaintProbe for tests, where bun has no canvas: every value is accepted as given, and text
 * measures `size` px of ink per character, rising `size` px above the baseline, where `size` is
 * the font's px size. Test-only, excluded from the published package via package.json "files". */
export class FakePaintProbe implements PaintProbe {
	normalize(_prop: string, value: unknown): unknown {
		return value;
	}

	measureText(state: PaintState, text: string): TextMetrics {
		const size = Number.parseFloat(
			/(\d+(?:\.\d+)?)px/.exec(String(state.props.font))?.[1] ?? '10',
		);
		const width = size * text.length;
		return {
			width,
			actualBoundingBoxLeft: 0,
			actualBoundingBoxRight: width,
			actualBoundingBoxAscent: size,
			actualBoundingBoxDescent: 0,
		} as TextMetrics;
	}

	isPointInPath(): boolean {
		return false;
	}

	createLinearGradient(): CanvasGradient {
		return { addColorStop() {} };
	}

	createRadialGradient(): CanvasGradient {
		return { addColorStop() {} };
	}

	createConicGradient(): CanvasGradient {
		return { addColorStop() {} };
	}

	createPattern(): CanvasPattern | null {
		return null;
	}

	createImageData(sw: number, sh: number): ImageData {
		return {
			width: sw,
			height: sh,
			data: new Uint8ClampedArray(sw * sh * 4),
		} as ImageData;
	}
}
