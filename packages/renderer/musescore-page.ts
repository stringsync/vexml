import { registerPage } from './page-registry';
import { SvgInkMasks } from './svg-ink-masks';

/** Keeps MuseScore's SVG and its independent masks on one common capture grid. */
class MusescorePage {
	async mount(input: {
		svg: string;
		boxes: Array<{ x: number; y: number; w: number; h: number }>;
	}) {
		const container = document.getElementById('screenshot');
		if (!container) {
			throw new Error('MuseScore capture container missing');
		}
		container.innerHTML = input.svg;
		const svg = container.querySelector('svg');
		if (!svg) {
			throw new Error('MuseScore exported no SVG');
		}
		await document.fonts.ready;
		const scale = 130 / 96;
		// MuseScore's cropped export can leave staves and clefs outside its viewBox.
		// Expand the viewport itself: overflow alone still clips SVG image masks.
		const bounds = svg.getBBox();
		// getBBox excludes strokes; leave the capture's margin around the geometry.
		const margin = 10 / scale;
		const originX = bounds.x - margin;
		const originY = bounds.y - margin;
		const width = bounds.width + 2 * margin;
		const height = bounds.height + 2 * margin;
		svg.setAttribute('viewBox', `${originX} ${originY} ${width} ${height}`);
		svg.setAttribute('width', String(width * scale));
		svg.setAttribute('height', String(height * scale));
		const masks = await new SvgInkMasks(container).capture();
		const nonblank = masks.filter((mask) => mask.runs.length > 0);
		const left = Math.min(...nonblank.map((mask) => mask.x));
		const top = Math.min(...nonblank.map((mask) => mask.y));
		const right = Math.max(...nonblank.map((mask) => mask.x + mask.width));
		const bottom = Math.max(...nonblank.map((mask) => mask.y + mask.height));
		let dx = 0;
		let dy = 0;
		if (nonblank.length) {
			dx = 10 - left;
			dy = 10 - top;
			container.style.width = `${right - left + 20}px`;
			container.style.height = `${bottom - top + 20}px`;
			svg.style.position = 'relative';
			svg.style.left = `${dx}px`;
			svg.style.top = `${dy}px`;
			for (const mask of masks) {
				mask.x += dx;
				mask.y += dy;
			}
		}
		const measures = input.boxes.map((box) => ({
			x: (box.x - originX) * scale + dx,
			y: (box.y - originY) * scale + dy,
			w: box.w * scale,
			h: box.h * scale,
		}));
		return { masks, measures };
	}
}
registerPage(new MusescorePage());
