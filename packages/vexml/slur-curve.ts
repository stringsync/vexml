import type { Curve, CurveOptions, Stave, StaveNote } from 'vexflow/core';
import type { Appearance } from './appearance';
import { CrispCurve, CURVE_THICKNESS, curveThickness } from './crisp-curve';
import type { SlurConnector } from './curve-connectors';
import { HeadCurve } from './head-curve';
import type { SlurBow } from './slur-bow';
import type { SlurShape } from './slur-shape';

/*
 * A built slur, with the vertical extent it will be drawn at. A slur is not movable: it's
 * pinned to its two noteheads, so the only way it can stop printing through a neighbouring
 * part's lyrics is for the draw pass to reserve the room its bow needs (it feeds this to
 * recordStaveSpill).
 */
export type SlurCurve = {
	curve: Curve;
	/* The stave the bow is drawn over; absent only if an endpoint lost its stave. */
	stave: Stave | undefined;
	top: number;
	bottom: number;
	left: number;
	right: number;
	/* Whether the bow joins two staves of the same system. Such a curve LIVES in the gap
	 * between them, so it doesn't report spill: it would ask the gap to widen to hold a
	 * curve whose height that same gap sets, and the two would chase each other. It takes
	 * whatever room the notes leave. */
	crossStave: boolean;
};

/* The ends one curve of a slur is drawn between, and the shape solved for it. */
export type SlurCurveEnds = {
	// vet-ignore noop-objects-over-null: a tie end can lack a note; absence is score data, and a stand-in VexFlow note would curve to nothing
	from: StaveNote | undefined;
	// vet-ignore noop-objects-over-null: a tie end can lack a note; absence is score data, and a stand-in VexFlow note would curve to nothing
	to: StaveNote | undefined;
	// vet-ignore noop-objects-over-null: absent means the stave's own edge; a stand-in X would move the end
	openX: number | undefined;
	shape: SlurShape;
};

/* Draws a solved slur bow as a curve, to the document's slur widths. */
export class SlurCurveFactory {
	constructor(private readonly appearance: Appearance) {}

	create(bow: SlurBow, slur: SlurConnector, ends: SlurCurveEnds): SlurCurve {
		const { from: curveFrom, to: curveTo, openX } = ends;
		const { cpY, yShift, shoulder, width } = ends.shape;
		// vexflow offsets each control point from its OWN endpoint by the same cps.y, so
		// on a slur whose two ends sit at very different heights both points land the
		// same distance above their end, which is nowhere near the line between the
		// two. The far one ends up on the wrong side of its endpoint entirely and the
		// curve flicks up out of the note instead of settling onto it.
		//
		// Offset them from the CHORD (the straight line joining the two ends) instead,
		// each lifted `cpY` off it. vexflow puts the control points a quarter and three
		// quarters of the way along, so the chord there is a quarter of the drop either
		// side of the midpoint, hence the ±slant. What that draws is a parabola over
		// the chord: symmetric bow, both ends tangent to the chord, no hook. The apex
		// is unchanged at chord-midpoint + 0.75*cpY (the cubic's t=0.5 works out to
		// that), so the clearance SlurShape solved for still holds. Level endpoints
		// have no slant and reduce to the old symmetric cps exactly.
		const only = (curveFrom ?? curveTo) as StaveNote;
		const position = bow.metric(curveFrom ?? only);
		const positionEnd = bow.metric(curveTo ?? only);
		const y0 = bow.endpointY(curveFrom ?? only);
		const y1 = bow.endpointY(curveTo ?? only);
		// vexflow puts the control points a quarter of the way in from each end;
		// a flattened bow (see SlurShape) moves them out to `shoulder`.
		const slant = (y1 - y0) * shoulder;
		const pull = (shoulder - 0.25) * width;
		// Lifted straight up or down, a control point over a slanted chord also slides
		// along it toward the end the bow hangs past, so the bow sags toward that end.
		// Leaning each point back by the chord's slope lifts it square off the chord
		// instead, and the bow sits centred on it. Level ends have no slope and no lean.
		const lean = width ? (-bow.dir * (y1 - y0) * cpY) / width : 0;
		const middle = this.appearance.lineWidth('slur middle');
		const thickness =
			middle === null ? CURVE_THICKNESS : curveThickness(middle);
		const options: CurveOptions = {
			thickness,
			position,
			positionEnd,
			openingDirection: bow.bulgeUp ? 'down' : 'up',
			yShift,
			cps: [
				{ x: pull + lean, y: cpY + bow.dir * slant },
				{ x: -pull + lean, y: cpY - bow.dir * slant },
			],
		};
		const bezier = slur.bezier && {
			start: curveFrom ? slur.bezier.start : { x: null, y: null },
			end: curveTo ? slur.bezier.end : { x: null, y: null },
		};
		// An end lifted off its marks or its tie is pinned at its own Y, which vexflow's Curve
		// can't take (it reads the end off the note), so it draws as a HeadCurve
		// too.
		const lifted = [curveFrom, curveTo].some(
			(n) => n !== undefined && (bow.markLift(n) > 0 || bow.tieLift(n) > 0),
		);
		// A body end runs to its notehead's centre, on the side away from its stem. A stem
		// on the bow's side stands in the way, whichever anchor the end took,
		// and a document's control points are offsets from the ends it knows.
		const reachesHead = (note: StaveNote | undefined) =>
			!bow.isGrace && !bezier && note !== undefined && !bow.towardBulge(note);
		const reach = {
			start: reachesHead(curveFrom),
			end: reachesHead(curveTo),
		};
		const curve =
			bow.isGrace || lifted || bow.ghost
				? new HeadCurve({
						...options,
						from: curveFrom,
						to: curveTo,
						fromY: y0,
						toY: y1,
						bezier,
						reach,
						openX,
					})
				: new CrispCurve(curveFrom, curveTo, {
						...options,
						bezier,
						reach,
						openX,
					});
		curve.setTip(this.appearance.lineWidth('slur tip'));
		// Where the bow will actually reach. vexflow shifts both endpoints by
		// `yShift` and lands both control points at `depth`, so the cubic's midpoint
		// sits at mid(y0,y1) + dir*(yShift + 0.75*cpY): the arc's far side, plus the
		// stroke thickness it's drawn with. Reported so the draw pass can reserve the
		// room a bow needs over its stave instead of letting it print into the part
		// above's lyrics.
		const endTop = Math.min(y0, y1) + bow.dir * yShift;
		const endBottom = Math.max(y0, y1) + bow.dir * yShift;
		const apex = (y0 + y1) / 2 + bow.dir * (yShift + 0.75 * cpY + thickness);
		const stave = only.checkStave();
		const firstX =
			(curveFrom?.getTieRightX() ?? openX ?? stave.getTieStartX()) +
			curve.renderOptions.xShift;
		const lastX =
			(curveTo?.getTieLeftX() ?? openX ?? stave.getTieEndX()) -
			curve.renderOptions.xShift;
		const spacing = (lastX - firstX) / 4;
		const controlXs = bezier
			? [
					firstX + (bezier.start.x ?? spacing + pull + lean),
					lastX + (bezier.end.x ?? -spacing - pull + lean),
				]
			: [];
		const controlYs = bezier
			? [
					y0 +
						bow.dir * yShift +
						(bezier.start.y === null ? bow.dir * cpY + slant : -bezier.start.y),
					y1 +
						bow.dir * yShift +
						(bezier.end.y === null ? bow.dir * cpY - slant : -bezier.end.y),
				]
			: [];
		// A dashed/dotted slur is a single stroked bezier, not the filled lens a
		// solid one is: vexflow's renderCurve already skips the fill and the
		// second (thickness) pass when the element carries a lineDash. The
		// draw pass calls drawWithStyle, which puts the dash on the context.
		// vexflow's ElementStyle spells a dash array space-separated.
		if (slur.dash) {
			curve.setStyle({ lineDash: slur.dash.join(' ') });
		}
		// A half-curve (one end wrapped onto another system) bows out to the edge of
		// the stave it does have.
		const curveStave = (curveFrom ?? curveTo)?.getStave();
		return {
			curve,
			stave: curveStave,
			top: Math.min(endTop, apex, ...controlYs.map((y) => y - thickness)),
			bottom: Math.max(endBottom, apex, ...controlYs.map((y) => y + thickness)),
			left: Math.min(
				curveFrom?.getAbsoluteX() ?? openX ?? curveStave?.getTieStartX() ?? 0,
				...controlXs,
			),
			right: Math.max(
				curveTo?.getAbsoluteX() ?? openX ?? curveStave?.getTieEndX() ?? 0,
				...controlXs,
			),
			crossStave: bow.crossStave && !bow.ghost,
		};
	}
}
