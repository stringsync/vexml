import { Disposer, type Resource } from 'webappwiz/disposable';
import { ColorStyle } from './color-style';
import type { Decorations } from './decoration';
import { DefaultDecoration } from './default-decoration';
import { HaloStyle } from './halo-style';
import type { LayerHost } from './layer-host';

/*
 * The production Decorations: the pair of stores a rendered score's elements wire their toggles
 * to, each painting its own overlay layer on the host — the color over the score, the halo
 * behind it.
 *
 * The two are one object because they share a lifetime: both layers belong to the score that made
 * them, and disposing this releases both.
 */
export class DefaultDecorations implements Decorations, Resource {
	readonly color: DefaultDecoration;
	readonly halo: DefaultDecoration;

	private readonly disposer = new Disposer();

	constructor(host: LayerHost) {
		this.color = this.disposer.use(
			new DefaultDecoration(host, new ColorStyle()),
		);
		this.halo = this.disposer.use(new DefaultDecoration(host, new HaloStyle()));
	}

	dispose(): void {
		this.disposer.dispose();
	}
}
