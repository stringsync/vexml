import type { Layer, LayerKind } from './layer';
import { RecordingContext } from './recording-context';

export interface FakeLayerOptions {
	kind?: LayerKind;
	zIndex?: number;
}

/* Fake fulfilling the Layer seam (preferred over mocks); records its disposal and the placement it
 * was created with, and paints onto a RecordingContext a test can read back through `recording`.
 * Test-only — excluded from the published package via package.json "files". */
export class FakeLayer implements Layer {
	readonly kind: LayerKind;
	readonly zIndex: number | undefined;
	readonly recording = new RecordingContext();
	readonly ctx = this.recording.ctx;
	disposed = false;

	constructor(opts: FakeLayerOptions = {}) {
		this.kind = opts.kind ?? 'content';
		this.zIndex = opts.zIndex;
	}

	dispose(): void {
		this.disposed = true;
	}
}
