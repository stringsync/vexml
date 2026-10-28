import type { InkMask } from './ink-mask';

type Tile = {
	clone: SVGSVGElement;
	mask: InkMask;
	x: number;
	y: number;
	left: number;
	top: number;
	width: number;
	height: number;
	atlasX: number;
	atlasY: number;
};

/** Rasterizes exclusive SVG element groups. Ancestor transforms and inherited styles
 * are retained, but a parent's mask never includes a separately attributed child. */
export class SvgInkMasks {
	constructor(private readonly container: Element) {}

	private tiles: Tile[] = [];
	private cursorX = 0;
	private cursorY = 0;
	private rowHeight = 0;

	async capture(): Promise<InkMask[]> {
		await document.fonts.ready;
		const shot = (
			document.getElementById('screenshot') ?? this.container
		).getBoundingClientRect();
		const ratio = window.devicePixelRatio;
		const masks: InkMask[] = [];
		const identities = new Map<Element, number>();
		let next = 0;
		const identity = (element: Element): number => {
			let id = identities.get(element);
			if (id === undefined) {
				id = next++;
				identities.set(element, id);
			}
			return id;
		};
		const styles = Array.from(document.styleSheets)
			.flatMap((sheet) => {
				try {
					return Array.from(sheet.cssRules).map((rule) => rule.cssText);
				} catch {
					return [];
				}
			})
			.join('\n');
		for (const svg of Array.from(this.container.querySelectorAll('svg'))) {
			const groups = new Map<Element, SVGGraphicsElement[]>();
			for (const leaf of Array.from(
				svg.querySelectorAll<SVGGraphicsElement>(
					'path,text,line,rect,circle,ellipse,polygon,polyline,use',
				),
			)) {
				if (
					leaf.closest('defs,clipPath,mask,symbol') ||
					leaf.parentElement?.closest('text')
				) {
					continue;
				}
				const owner =
					leaf.closest('[class^="ink-"], [class^="vf-"], g[class]') ?? leaf;
				// alphaTab's styling-only .at group is not a notation identity.
				const attributed = owner.classList.contains('at')
					? (owner.parentElement?.closest('[class^="ink-"]') ?? leaf)
					: owner;
				const list = groups.get(attributed) ?? [];
				list.push(leaf);
				groups.set(attributed, list);
			}
			const rootRect = svg.getBoundingClientRect();
			for (const [owner, leaves] of groups) {
				const rects = leaves.map((leaf) => leaf.getBoundingClientRect());
				// DOM geometry excludes strokes; retain wide strokes and miter joins too.
				const padding = Math.max(
					2,
					...leaves.map((leaf) => {
						const style = getComputedStyle(leaf);
						if (style.stroke === 'none') {
							return 0;
						}
						const matrix = leaf.getScreenCTM();
						const scale =
							style.vectorEffect === 'non-scaling-stroke' || !matrix
								? 1
								: Math.hypot(matrix.a, matrix.b, matrix.c, matrix.d);
						return (
							Math.ceil(
								(Number.parseFloat(style.strokeWidth) *
									scale *
									Math.max(1, Number.parseFloat(style.strokeMiterlimit)) *
									ratio) /
									2,
							) + 1
						);
					}),
				);
				const left =
					Math.floor(
						(Math.min(...rects.map((r) => r.left)) - shot.left) * ratio,
					) - padding;
				const top =
					Math.floor(
						(Math.min(...rects.map((r) => r.top)) - shot.top) * ratio,
					) - padding;
				const right =
					Math.ceil(
						(Math.max(...rects.map((r) => r.right)) - shot.left) * ratio,
					) + padding;
				const bottom =
					Math.ceil(
						(Math.max(...rects.map((r) => r.bottom)) - shot.top) * ratio,
					) + padding;
				if (right <= left || bottom <= top) {
					continue;
				}
				const clone = svg.cloneNode(false) as SVGSVGElement;
				clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
				clone.setAttribute('width', String(rootRect.width));
				clone.setAttribute('height', String(rootRect.height));
				// An SVG image clips at its root even when overflow is visible. Keep
				// that boundary now that the root lives inside an atlas viewport.
				clone.style.setProperty('overflow', 'hidden', 'important');
				for (const defs of Array.from(svg.querySelectorAll(':scope > defs'))) {
					clone.appendChild(defs.cloneNode(true));
				}
				const parents = new Map<Element, Element>([[svg, clone]]);
				const copyParent = (element: Element): Element => {
					const known = parents.get(element);
					if (known) {
						return known;
					}
					const copy = element.cloneNode(false) as Element;
					parents.set(element, copy);
					copyParent(element.parentElement ?? svg).appendChild(copy);
					return copy;
				};
				for (const leaf of leaves) {
					const copy = leaf.cloneNode(true) as SVGGraphicsElement;
					const computed = getComputedStyle(leaf);
					for (const property of [
						'fill',
						'fill-opacity',
						'stroke',
						'stroke-opacity',
						'stroke-width',
						'stroke-dasharray',
						'stroke-linecap',
						'stroke-linejoin',
						'font-family',
						'font-size',
						'font-weight',
						'font-style',
						'letter-spacing',
						'text-anchor',
						'dominant-baseline',
						'opacity',
						'visibility',
					]) {
						copy.style.setProperty(
							property,
							computed.getPropertyValue(property),
						);
					}
					copyParent(leaf.parentElement ?? svg).appendChild(copy);
				}
				const width = right - left;
				const height = bottom - top;
				const cls =
					owner.getAttribute('class')?.split(/\s+/)[0] ?? owner.tagName;
				const parent = owner.parentElement?.closest(
					'[class^="ink-"], [class^="vf-"], g[class]',
				);
				const ancestors: number[] = [];
				let ancestor: Element | null = owner.parentElement;
				while (ancestor && ancestor !== svg) {
					if (ancestor.matches('[class^="ink-"], [class^="vf-"], g[class]')) {
						ancestors.push(identity(ancestor));
					}
					ancestor = ancestor.parentElement;
				}
				const mask: InkMask = {
					id: identity(owner),
					ancestors,
					parent: parent ? identity(parent) : undefined,
					kind: SvgInkMasks.kind(cls),
					x: left,
					y: top,
					width,
					height,
					runs: [],
				};
				masks.push(mask);
				await this.enqueue(
					clone,
					left - (rootRect.left - shot.left) * ratio,
					top - (rootRect.top - shot.top) * ratio,
					mask,
					styles,
					ratio,
				);
			}
			// Definitions can reuse IDs in another root. Never pack different roots
			// together, where url(#id) could resolve against another score system.
			await this.flush(styles, ratio);
		}
		for (const mask of masks) {
			const spans: Array<[number, number]> = [];
			for (let i = 0; i < mask.runs.length; i += 2) {
				spans.push([mask.runs[i] ?? 0, mask.runs[i + 1] ?? 0]);
			}
			spans.sort((a, b) => a[0] - b[0]);
			mask.runs = [];
			for (const [start, length] of spans) {
				const end = mask.runs.length;
				if (
					end &&
					(mask.runs[end - 2] ?? 0) + (mask.runs[end - 1] ?? 0) === start
				) {
					mask.runs[end - 1] = (mask.runs[end - 1] ?? 0) + length;
				} else {
					mask.runs.push(start, length);
				}
			}
		}
		return masks;
	}

	private async enqueue(
		clone: SVGSVGElement,
		x: number,
		y: number,
		mask: InkMask,
		styles: string,
		ratio: number,
	): Promise<void> {
		// Leave a pixel on each side for fractional drawImage translation. Each
		// image and readback stays within 1024 squared pixels, even for huge owners.
		for (let top = 0; top < mask.height; top += 1022) {
			for (let left = 0; left < mask.width; left += 1022) {
				const width = Math.min(1022, mask.width - left);
				const height = Math.min(1022, mask.height - top);
				if (this.cursorX + width + 2 > 1024) {
					this.cursorY += this.rowHeight;
					this.cursorX = 0;
					this.rowHeight = 0;
				}
				if (this.cursorY + height + 2 > 1024) {
					await this.flush(styles, ratio);
				}
				this.tiles.push({
					clone,
					mask,
					x,
					y,
					left,
					top,
					width,
					height,
					atlasX: this.cursorX,
					atlasY: this.cursorY,
				});
				this.cursorX += width + 2;
				this.rowHeight = Math.max(this.rowHeight, height + 2);
			}
		}
	}

	private async flush(styles: string, ratio: number): Promise<void> {
		if (!this.tiles.length) {
			return;
		}
		const atlas = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
		atlas.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
		atlas.setAttribute('width', '1024');
		atlas.setAttribute('height', String(this.cursorY + this.rowHeight));
		atlas.style.setProperty('width', '1024px', 'important');
		atlas.style.setProperty(
			'height',
			`${this.cursorY + this.rowHeight}px`,
			'important',
		);
		const style = document.createElementNS(
			'http://www.w3.org/2000/svg',
			'style',
		);
		style.textContent = styles;
		atlas.appendChild(style);
		for (const job of this.tiles) {
			// Preserve the original viewport (including percentage geometry and
			// preserveAspectRatio) inside a clipped viewport for this owner's tile.
			const tile = document.createElementNS(
				'http://www.w3.org/2000/svg',
				'svg',
			);
			tile.setAttribute('x', String(job.atlasX));
			tile.setAttribute('y', String(job.atlasY));
			tile.setAttribute('width', String(job.width + 2));
			tile.setAttribute('height', String(job.height + 2));
			tile.style.setProperty('width', `${job.width + 2}px`, 'important');
			tile.style.setProperty('height', `${job.height + 2}px`, 'important');
			tile.style.setProperty('overflow', 'hidden', 'important');
			tile.setAttribute(
				'viewBox',
				`${(Math.floor(job.x) + job.left - 1) / ratio} ${(Math.floor(job.y) + job.top - 1) / ratio} ${(job.width + 2) / ratio} ${(job.height + 2) / ratio}`,
			);
			tile.appendChild(job.clone.cloneNode(true));
			atlas.appendChild(tile);
		}
		const image = new Image();
		const canvas = document.createElement('canvas');
		const context = canvas.getContext('2d');
		if (!context) {
			throw new Error('ink masks: no SVG raster context');
		}
		try {
			// Font data is parsed once per atlas instead of once per glyph.
			image.src = `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(new XMLSerializer().serializeToString(atlas))))}`;
			await image.decode();
			for (const job of this.tiles) {
				canvas.width = job.width;
				canvas.height = job.height;
				context.drawImage(
					image,
					job.atlasX,
					job.atlasY,
					job.width + 2,
					job.height + 2,
					Math.floor(job.x) - job.x - 1,
					Math.floor(job.y) - job.y - 1,
					job.width + 2,
					job.height + 2,
				);
				const rgba = context.getImageData(0, 0, job.width, job.height).data;
				for (let row = 0; row < job.height; row++) {
					let start = -1;
					for (let col = 0; col <= job.width; col++) {
						const ink =
							col < job.width &&
							(rgba[(row * job.width + col) * 4 + 3] ?? 0) >= 128;
						if (ink && start < 0) {
							start = col;
						} else if (!ink && start >= 0) {
							job.mask.runs.push(
								(job.top + row) * job.mask.width + job.left + start,
								col - start,
							);
							start = -1;
						}
					}
				}
			}
		} finally {
			image.removeAttribute('src');
			canvas.width = 0;
			canvas.height = 0;
			this.tiles = [];
			this.cursorX = 0;
			this.cursorY = 0;
			this.rowHeight = 0;
		}
	}

	private static kind(cls: string): string {
		const symbol = Number(/MusicFontGlyph-(\d+)$/.exec(cls)?.[1]);
		if (symbol >= 0xe050 && symbol <= 0xe07f) {
			return 'clef';
		}
		if (symbol >= 0xe080 && symbol <= 0xe09f) {
			return 'timesignature';
		}
		if (symbol >= 0xe0a0 && symbol <= 0xe0ff) {
			return 'notehead';
		}
		if (symbol >= 0xe240 && symbol <= 0xe25f) {
			return 'flag';
		}
		if (symbol >= 0xe260 && symbol <= 0xe2ff) {
			return 'accidental';
		}
		if (symbol >= 0xe4e0 && symbol <= 0xe4ff) {
			return 'rest';
		}
		if (symbol === 0xe1e7) {
			return 'dot';
		}
		const name = cls
			.replace(/^(?:ink-|vf-)/, '')
			.replace(/Glyph.*$/, '')
			.toLowerCase();
		if (/notehead|scorenote|^note$/.test(name)) {
			return 'notehead';
		}
		if (/staffline|staff$|stave$|^measure$|barrenderer/.test(name)) {
			return 'stave';
		}
		if (/^ledgers$/.test(name)) {
			return 'stavenote';
		}
		if (/^number$/.test(name)) {
			return 'timesignature';
		}
		if (/beam/.test(name)) {
			return 'beam';
		}
		if (/stem/.test(name)) {
			return 'stem';
		}
		if (/tie/.test(name)) {
			return 'tie';
		}
		if (/barline/.test(name)) {
			return 'stavebarline';
		}
		if (/clef/.test(name)) {
			return 'clef';
		}
		if (/accidental|keysignature/.test(name)) {
			return 'keysignature';
		}
		return name;
	}
}
