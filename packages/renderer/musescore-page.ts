import { registerPage } from './page-registry';
import { SvgInkMasks } from './svg-ink-masks';

/** Keeps MuseScore's SVG and its independent masks on one common capture grid. */
class MusescorePage {
	async mount(input: { svg: string }) {
		const container = document.getElementById('screenshot');
		if (!container) {
			throw new Error('MuseScore capture container missing');
		}
		container.innerHTML = input.svg;
		const svg = container.querySelector('svg');
		if (!svg) {
			throw new Error('MuseScore exported no SVG');
		}
		const rect = svg.getBoundingClientRect();
		svg.setAttribute('width', String((rect.width * 130) / 96));
		svg.setAttribute('height', String((rect.height * 130) / 96));
		const masks = await new SvgInkMasks(container).capture();
		const nonblank = masks.filter((mask) => mask.runs.length > 0);
		const left = Math.min(...nonblank.map((mask) => mask.x));
		const top = Math.min(...nonblank.map((mask) => mask.y));
		const right = Math.max(...nonblank.map((mask) => mask.x + mask.width));
		const bottom = Math.max(...nonblank.map((mask) => mask.y + mask.height));
		if (nonblank.length) {
			container.style.width = `${right - left + 20}px`;
			container.style.height = `${bottom - top + 20}px`;
			svg.style.position = 'relative';
			svg.style.left = `${10 - left}px`;
			svg.style.top = `${10 - top}px`;
			for (const mask of masks) {
				mask.x += 10 - left;
				mask.y += 10 - top;
			}
		}
		return { masks };
	}
}
registerPage(new MusescorePage());
