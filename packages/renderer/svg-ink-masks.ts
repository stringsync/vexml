import type { InkMask } from './ink-mask';

/** Rasterizes exclusive SVG element groups. Ancestor transforms and inherited styles
 * are retained, but a parent's mask never includes a separately attributed child. */
export class SvgInkMasks {
	constructor(private readonly container: Element) {}

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
				for (const defs of Array.from(svg.querySelectorAll(':scope > defs'))) {
					clone.appendChild(defs.cloneNode(true));
				}
				const style = document.createElementNS(
					'http://www.w3.org/2000/svg',
					'style',
				);
				style.textContent = styles;
				clone.appendChild(style);
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
				const image = new Image();
				image.src = `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(new XMLSerializer().serializeToString(clone))))}`;
				await image.decode();
				const canvas = document.createElement('canvas');
				canvas.width = right - left;
				canvas.height = bottom - top;
				const context = canvas.getContext('2d');
				if (!context) {
					throw new Error('ink masks: no SVG raster context');
				}
				context.drawImage(
					image,
					(rootRect.left - shot.left) * ratio - left,
					(rootRect.top - shot.top) * ratio - top,
					rootRect.width * ratio,
					rootRect.height * ratio,
				);
				const rgba = context.getImageData(
					0,
					0,
					canvas.width,
					canvas.height,
				).data;
				const runs: number[] = [];
				let start = -1;
				for (let i = 0; i <= canvas.width * canvas.height; i++) {
					const ink =
						i < canvas.width * canvas.height && (rgba[i * 4 + 3] ?? 0) >= 128;
					if (ink && start < 0) {
						start = i;
					} else if (!ink && start >= 0) {
						runs.push(start, i - start);
						start = -1;
					}
				}
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
				masks.push({
					id: identity(owner),
					ancestors,
					parent: parent ? identity(parent) : undefined,
					kind: SvgInkMasks.kind(cls),
					x: left,
					y: top,
					width: canvas.width,
					height: canvas.height,
					runs,
				});
			}
		}
		return masks;
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
