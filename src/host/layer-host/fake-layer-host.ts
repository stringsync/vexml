import { FakeLayer } from '../layer/fake-layer';
import type { Layer, LayerKind } from '../layer/layer';
import type { LayerHost } from './layer-host';

/* Fake fulfilling the LayerHost seam (preferred over mocks); keeps every layer it made, so a test
 * can read back what was painted on the one it cares about. Layers are looked up by kind because
 * that is what separates them: a decoration's ColorStyle draws on 'content' over the score while
 * its HaloStyle draws on 'background' behind it. Test-only — excluded from the published package
 * via package.json "files". */
export class FakeLayerHost implements LayerHost {
	readonly created: FakeLayer[] = [];

	createLayer(kind: LayerKind, zIndex?: number): Layer {
		const layer = new FakeLayer({ kind, zIndex });
		this.created.push(layer);
		return layer;
	}

	/* The most recent layer of a kind, or undefined if none was ever created. */
	layer(kind: LayerKind): FakeLayer | undefined {
		return this.created.findLast((layer) => layer.kind === kind);
	}

	/* What was painted on a kind's layer, in call order. Empty when no such layer exists, so a
	 * test asserting nothing was drawn does not have to check for the layer first. */
	ops(kind: LayerKind): string[] {
		return this.layer(kind)?.recording.ops ?? [];
	}
}
