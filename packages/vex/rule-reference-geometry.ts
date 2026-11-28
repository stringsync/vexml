import type { PixelRect } from './rule-checks';

/** Multi-page geometry for a reference render, in the render's native units (SVG units or PNG px). */
export interface ReferenceGeometry {
	format: 'svg' | 'png';
	pages: { width: number; height: number }[];
	measures: {
		page: number;
		index: number;
		system: number;
		x: number;
		w: number;
	}[];
	staves: {
		page: number;
		part: number;
		measure: number;
		staff: number;
		lines: number[];
		x: number;
		w: number;
	}[];
}

/** Counts staves per `<part>` in a MusicXML document (default 1 per part). */
export function partStaffCounts(musicXML: string): number[] {
	const parts = [...musicXML.matchAll(/<part\b[^>]*>([\s\S]*?)<\/part>/g)];
	if (parts.length === 0) {
		return [1];
	}
	return parts.map(([, body = '']) => {
		const matches = [...body.matchAll(/<staves>\s*(\d+)\s*<\/staves>/g)];
		const max = matches.reduce(
			(best, m) => Math.max(best, Number(m[1] ?? 1)),
			1,
		);
		return Math.max(1, max);
	});
}

/** Maps a 0-based flat staff index across all parts to `{ part (0-based), staff (1-based) }`. */
export function mapFlatStaffIndex(
	flat: number,
	partStaves: readonly number[],
): { part: number; staff: number } {
	let remaining = flat;
	for (let part = 0; part < partStaves.length; part++) {
		const count = partStaves[part] ?? 1;
		if (remaining < count) {
			return { part, staff: remaining + 1 };
		}
		remaining -= count;
	}
	return { part: Math.max(0, partStaves.length - 1), staff: 1 };
}

/** Extracts measure and staff-line geometry from Verovio SVGs (in `definition-scale` units). */
export function parseVerovioGeometry(
	pages: readonly string[],
	partStaves: readonly number[],
): ReferenceGeometry {
	const pageBounds: { width: number; height: number }[] = [];
	const measures: ReferenceGeometry['measures'] = [];
	const staves: ReferenceGeometry['staves'] = [];
	let measureIndex = 0;

	for (let pageIdx = 0; pageIdx < pages.length; pageIdx++) {
		const svg = pages[pageIdx] ?? '';
		const vb = /class="definition-scale"[^>]*viewBox="([^"]+)"/.exec(svg)?.[1];
		const [, , vw = 17000, vh = 5000] = (vb ?? '')
			.trim()
			.split(/\s+/)
			.map(Number);
		pageBounds.push({ width: vw, height: vh });

		const marginMatch =
			/class="page-margin"[^>]*transform="translate\(\s*([^,\s]+)\s*,\s*([^)]+)\)"/.exec(
				svg,
			);
		const tx = marginMatch ? Number(marginMatch[1]) : 0;
		const ty = marginMatch ? Number(marginMatch[2]) : 0;

		const measureChunks = splitByClassTag(svg, 'measure');
		for (const mChunk of measureChunks) {
			const staffChunks = splitByClassTag(mChunk, 'staff');
			let minX = Infinity;
			let maxX = -Infinity;
			for (let sIdx = 0; sIdx < staffChunks.length; sIdx++) {
				const sChunk = staffChunks[sIdx] ?? '';
				const lines = extractVerovioStaffLines(sChunk);
				if (!lines) {
					continue;
				}
				const x = lines.x0 + tx;
				const w = lines.x1 - lines.x0;
				minX = Math.min(minX, x);
				maxX = Math.max(maxX, x + w);
				const mapped = mapFlatStaffIndex(sIdx, partStaves);
				staves.push({
					page: pageIdx,
					part: mapped.part,
					measure: measureIndex,
					staff: mapped.staff,
					lines: lines.ys.map((y) => y + ty),
					x,
					w,
				});
			}
			if (Number.isFinite(minX) && maxX > minX) {
				measures.push({
					page: pageIdx,
					index: measureIndex,
					system: 0,
					x: minX,
					w: maxX - minX,
				});
			}
			measureIndex++;
		}
	}

	return { format: 'svg', pages: pageBounds, measures, staves };
}

/** Extracts measure and staff-line geometry from MuseScore 4 SVGs + `.mpos` XML. */
export function parseMusescoreGeometry(
	pages: readonly string[],
	mpos: string,
	partStaves: readonly number[],
): ReferenceGeometry {
	const totalStaves = Math.max(
		1,
		partStaves.reduce((sum, n) => sum + n, 0),
	);
	const pageBounds: { width: number; height: number }[] = [];
	const pageSystems: { top: number; staves: number[][] }[][] = [];

	for (const svg of pages) {
		const vb = /viewBox="([^"]+)"/.exec(svg)?.[1];
		const [, , vw = 10200, vh = 13200] = (vb ?? '')
			.trim()
			.split(/\s+/)
			.map(Number);
		pageBounds.push({ width: vw, height: vh });
		const staffGroups = extractMusescoreStaffGroups(svg);
		const systems: { top: number; staves: number[][] }[] = [];
		for (let i = 0; i < staffGroups.length; i += totalStaves) {
			const slice = staffGroups.slice(i, i + totalStaves);
			const top = slice[0]?.[0];
			if (top !== undefined) {
				systems.push({ top, staves: slice });
			}
		}
		pageSystems.push(systems);
	}

	const elements = [
		...mpos.matchAll(
			/<element\b[^>]*?\bx="([^"]+)"[^>]*?\by="([^"]+)"[^>]*?\bsx="([^"]+)"[^>]*?\bsy="([^"]+)"[^>]*?\bpage="([^"]+)"/g,
		),
	].map(([, x, y, sx, sy, page]) => ({
		x: Number(x),
		y: Number(y),
		sx: Number(sx),
		sy: Number(sy),
		page: Number(page),
	}));

	const firstElem = elements[0];
	const firstTop = pageSystems[firstElem?.page ?? 0]?.[0]?.top;
	const scale =
		firstElem && firstTop && firstTop > 0 ? firstElem.y / firstTop : 12;

	const measures: ReferenceGeometry['measures'] = [];
	const staves: ReferenceGeometry['staves'] = [];

	for (let index = 0; index < elements.length; index++) {
		const elem = elements[index];
		if (!elem) {
			continue;
		}
		const systems = pageSystems[elem.page] ?? [];
		const mx = elem.x / scale;
		const my = elem.y / scale;
		const mw = elem.sx / scale;

		let bestSystem = systems[0];
		let bestDist = Infinity;
		for (const sys of systems) {
			const dist = Math.abs(sys.top - my);
			if (dist < bestDist) {
				bestDist = dist;
				bestSystem = sys;
			}
		}
		const systemIdx = bestSystem ? systems.indexOf(bestSystem) : 0;
		measures.push({
			page: elem.page,
			index,
			system: Math.max(0, systemIdx),
			x: mx,
			w: mw,
		});
		if (bestSystem) {
			for (let sIdx = 0; sIdx < bestSystem.staves.length; sIdx++) {
				const lines = bestSystem.staves[sIdx];
				if (!lines || lines.length === 0) {
					continue;
				}
				const mapped = mapFlatStaffIndex(sIdx, partStaves);
				staves.push({
					page: elem.page,
					part: mapped.part,
					measure: index,
					staff: mapped.staff,
					lines,
					x: mx,
					w: mw,
				});
			}
		}
	}

	return { format: 'svg', pages: pageBounds, measures, staves };
}

/** Crops a Verovio SVG to `rect` in `definition-scale` coordinates. */
export function cropVerovioSvg(svg: string, rect: PixelRect): string {
	const w = Math.max(1, Math.round(rect.w));
	const h = Math.max(1, Math.round(rect.h));
	const vb = `${rect.x} ${rect.y} ${rect.w} ${rect.h}`;
	const bg = `<rect x="${rect.x}" y="${rect.y}" width="${rect.w}" height="${rect.h}" fill="#ffffff"/>`;
	return svg
		.replace(
			/(<svg\b[^>]*?)\bwidth="[^"]*"([^>]*?)\bheight="[^"]*"/,
			`$1width="${w}"$2height="${h}"`,
		)
		.replace(
			/(<svg\b[^>]*class="definition-scale"[^>]*?)\bviewBox="[^"]*"([^>]*>)/,
			`$1viewBox="${vb}"$2${bg}`,
		);
}

/** Crops a MuseScore 4 SVG to `rect` in SVG coordinates. */
export function cropMusescoreSvg(svg: string, rect: PixelRect): string {
	const w = Math.max(1, Math.round(rect.w));
	const h = Math.max(1, Math.round(rect.h));
	const vb = `${rect.x} ${rect.y} ${rect.w} ${rect.h}`;
	return svg.replace(
		/<svg\b([^>]*?)>/,
		(_full, attrs: string) =>
			`<svg${attrs
				.replace(/\bwidth="[^"]*"/, `width="${w}"`)
				.replace(/\bheight="[^"]*"/, `height="${h}"`)
				.replace(/\bviewBox="[^"]*"/, `viewBox="${vb}"`)}>`,
	);
}

function extractVerovioStaffLines(
	staffChunk: string,
): { x0: number; x1: number; ys: number[] } | null {
	const head = staffChunk.split(/<g\b[^>]*class="layer"/)[0] ?? staffChunk;
	const spans = [
		...head.matchAll(
			/<path\b[^>]*\bd="M(\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)\s+L(\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)"/g,
		),
	]
		.map(([, x0, y0, x1, y1]) => ({
			x0: Number(x0),
			y0: Number(y0),
			x1: Number(x1),
			y1: Number(y1),
		}))
		.filter((s) => s.y0 === s.y1 && s.x1 > s.x0);
	if (spans.length === 0) {
		return null;
	}
	const maxLen = Math.max(...spans.map((s) => s.x1 - s.x0));
	const staff = spans.filter((s) => s.x1 - s.x0 >= maxLen * 0.9);
	const ys = [...new Set(staff.map((s) => s.y0))].sort((a, b) => a - b);
	return {
		x0: Math.min(...staff.map((s) => s.x0)),
		x1: Math.max(...staff.map((s) => s.x1)),
		ys,
	};
}

function extractMusescoreStaffGroups(svg: string): number[][] {
	const lines = [
		...svg.matchAll(/<polyline\b[^>]*class="StaffLines"[^>]*points="([^"]+)"/g),
	]
		.map(([, pts = '']) => {
			const pairs = pts
				.trim()
				.split(/\s+/)
				.map((p) => p.split(',').map(Number));
			const [x0 = 0, y0 = 0] = pairs[0] ?? [];
			const [x1 = 0] = pairs[1] ?? [];
			return { x0, x1, y: y0 };
		})
		.filter((l) => l.x1 > l.x0)
		.sort((a, b) => a.y - b.y);

	const groups: { x0: number; x1: number; ys: number[] }[] = [];
	for (const line of lines) {
		const last = groups.at(-1);
		const prevY = last?.ys.at(-1);
		const firstGap =
			last && last.ys.length >= 2
				? (last.ys[1] ?? 0) - (last.ys[0] ?? 0)
				: null;
		const gap = prevY !== undefined ? line.y - prevY : Infinity;
		const sameX =
			last !== undefined &&
			Math.abs(last.x0 - line.x0) < 5 &&
			Math.abs(last.x1 - line.x1) < 5;
		const sameStaff =
			sameX &&
			(firstGap === null
				? gap > 10 && gap < 250
				: Math.abs(gap - firstGap) <= Math.max(5, firstGap * 0.2));
		if (last && sameStaff) {
			last.ys.push(line.y);
		} else {
			groups.push({ x0: line.x0, x1: line.x1, ys: [line.y] });
		}
	}
	return groups.map((g) => g.ys);
}

/** Splits an SVG string into chunks starting at each `<g ... class="<cls>">` tag. */
function splitByClassTag(svg: string, cls: string): string[] {
	const re = new RegExp(`<g\\b[^>]*\\bclass="${cls}"[^>]*>`, 'g');
	const starts: number[] = [];
	for (const m of svg.matchAll(re)) {
		if (m.index !== undefined) {
			starts.push(m.index);
		}
	}
	return starts.map((start, i) => svg.slice(start, starts[i + 1]));
}
