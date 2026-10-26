import {
	type AlphatabContext,
	type Image,
	type OsmdContext,
	renderers,
	type VexmlContext,
} from '@vexml/renderer';
import { Rect } from 'webappwiz/geometry';
import type { Engine } from './lint';
import type { PlacedMeasure } from './measure-map';

/** A render and where its measures landed in it. */
export interface LocatedRender {
	png: Image;
	/** In score order; empty when the engine can't say (MuseScore). */
	measures: PlacedMeasure[];
}

/**
 * Renders a score through one engine and asks the engine where it put each measure,
 * in the PNG's pixels. The lint itself stays pixel-only; the measures only name where a
 * finding is, so trusting the renderer here costs nothing a finding depends on.
 */
export async function locate(
	engine: Engine,
	musicXML: string,
): Promise<LocatedRender> {
	switch (engine) {
		case 'vexml': {
			const { image, result } = await renderers
				.vexml({ musicXML })
				.eval(vexmlMeasures);
			return { png: image, measures: result.map(placed) };
		}
		case 'osmd': {
			const { image, result } = await renderers
				.osmd({ musicXML })
				.eval(osmdMeasures);
			return { png: image, measures: numbered(result, musicXML) };
		}
		case 'alphatab': {
			const { image, result } = await renderers
				.alphatab({ musicXML })
				.eval(alphatabMeasures);
			return { png: image, measures: numbered(result, musicXML) };
		}
		case 'musescore':
			// No browser behind it, so nothing to ask. ponytail: MuseScore can write measure
			// positions (.mpos) beside the PNG, if its findings ever need measures.
			return {
				png: await renderers.musescore({ musicXML }).render(),
				measures: [],
			};
	}
}

/** A measure box in the capture's pixels, as a page fn hands it back. */
interface RawMeasure {
	/** The MusicXML number, where the engine keeps it. */
	number?: string;
	/** The 0-based position among the score's measures, where it doesn't. */
	index?: number;
	x: number;
	y: number;
	w: number;
	h: number;
}

function placed(raw: RawMeasure): PlacedMeasure {
	return {
		number: raw.number ?? String((raw.index ?? 0) + 1),
		box: new Rect(raw.x, raw.y, raw.w, raw.h),
	};
}

// OSMD and alphaTab know a measure by its place in the score, so the number comes from
// the MusicXML's first part, measure for measure.
function numbered(raws: RawMeasure[], musicXML: string): PlacedMeasure[] {
	const numbers = measureNumbers(musicXML);
	return raws.map((raw) =>
		placed({ ...raw, number: numbers[raw.index ?? -1] ?? raw.number }),
	);
}

function measureNumbers(musicXML: string): string[] {
	const part = /<part\b[^>]*>([\s\S]*?)<\/part>/.exec(musicXML)?.[1] ?? '';
	return [...part.matchAll(/<measure\b[^>]*?\bnumber="([^"]*)"/g)].map(
		(match) => match[1] ?? '',
	);
}

// The page fns below run in the browser via toString(), so each stays self-contained: no
// closing over module scope. Each measures from #screenshot, the element the capture is
// of, and scales by the device pixel ratio, since the PNG is in device pixels.

function vexmlMeasures({ score }: VexmlContext): RawMeasure[] {
	const origin = document.getElementById('screenshot')?.getBoundingClientRect();
	const ratio = window.devicePixelRatio;
	return score
		.getElements()
		.measureBoxes()
		.map((box) => {
			const rect = box.getBoundingClientRect();
			return {
				number: box.getNumber(),
				x: (rect.x - (origin?.x ?? 0)) * ratio,
				y: (rect.y - (origin?.y ?? 0)) * ratio,
				w: rect.width * ratio,
				h: rect.height * ratio,
			};
		});
}

// OSMD lays out in units of 10px at zoom 1, from the top left of its one SVG (the
// default endless page format draws a single page). It has a box per staff, not per
// column, so a finding between staves goes to the nearest.
function osmdMeasures({ osmd, container }: OsmdContext): RawMeasure[] {
	type Box = {
		AbsolutePosition: { x: number; y: number };
		BorderLeft: number;
		BorderRight: number;
	};
	type Measure = {
		PositionAndShape: Box;
		ParentStaffLine: { StaffHeight: number };
		parentSourceMeasure: { measureListIndex: number };
	};
	const live = osmd as unknown as {
		Zoom: number;
		GraphicSheet: { MeasureList: Array<Array<Measure | undefined>> };
	};
	const origin = document.getElementById('screenshot')?.getBoundingClientRect();
	const svg = container.querySelector('svg')?.getBoundingClientRect();
	const ratio = window.devicePixelRatio;
	const unit = 10 * live.Zoom;
	const dx = (svg?.x ?? 0) - (origin?.x ?? 0);
	const dy = (svg?.y ?? 0) - (origin?.y ?? 0);
	return live.GraphicSheet.MeasureList.flatMap((staves) =>
		staves.flatMap((measure) => {
			if (!measure) {
				return [];
			}
			// The measure's own vertical borders don't sit on its staff, so it spans the
			// staff: from its top line, as tall as the staff.
			const box = measure.PositionAndShape;
			const left = box.AbsolutePosition.x + box.BorderLeft;
			const top = box.AbsolutePosition.y;
			return [
				{
					index: measure.parentSourceMeasure.measureListIndex,
					x: (dx + left * unit) * ratio,
					y: (dy + top * unit) * ratio,
					w: (box.BorderRight - box.BorderLeft) * unit * ratio,
					h: measure.ParentStaffLine.StaffHeight * unit * ratio,
				},
			];
		}),
	);
}

// alphaTab's bounds are in pixels from the top left of the surface it draws on.
function alphatabMeasures({
	alphatab,
	container,
}: AlphatabContext): RawMeasure[] {
	type Bounds = { x: number; y: number; w: number; h: number };
	const live = alphatab as unknown as {
		boundsLookup: {
			staffSystems: Array<{
				bars: Array<{ index: number; realBounds: Bounds }>;
			}>;
		} | null;
	};
	const origin = document.getElementById('screenshot')?.getBoundingClientRect();
	const surface = (
		container.querySelector('.at-surface') ?? container
	).getBoundingClientRect();
	const ratio = window.devicePixelRatio;
	const dx = surface.x - (origin?.x ?? 0);
	const dy = surface.y - (origin?.y ?? 0);
	return (live.boundsLookup?.staffSystems ?? []).flatMap((system) =>
		system.bars.map((bar) => ({
			index: bar.index,
			x: (dx + bar.realBounds.x) * ratio,
			y: (dy + bar.realBounds.y) * ratio,
			w: bar.realBounds.w * ratio,
			h: bar.realBounds.h * ratio,
		})),
	);
}
