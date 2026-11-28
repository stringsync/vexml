import { Beam, type RenderContext, Stem } from 'vexflow/core';
import { StaveTremolo } from './stave-tremolo';

/*
 * A beam whose levels sit a set distance apart (`<distance type="beam">`), top to top.
 * vexflow spaces them at 1.5 beam widths, hardcoded into its drawBeamLines, so this draws the
 * lines itself off the same slope and stem math, with `levelOffset` the one place a level's
 * offset from the primary beam is decided (FeatheredBeam fans it). A null distance keeps
 * vexflow's 1.5 widths.
 * Stem reach and the flat-beam floor use that same distance.
 */
export class SpacedBeam extends Beam {
	private distance: number | null = null;

	setDistance(distance: number | null): this {
		this.distance = distance;
		return this;
	}

	/* The distance from one level's top to the next's, toward the noteheads. */
	levelDistance(): number {
		return this.distance ?? this.renderOptions.beamWidth * 1.5;
	}

	/* How far level `level` (0 for the primary) sits from the primary at `x`, signed with the
	 * stem: the whole distance per level for a plain beam. */
	protected levelOffset(level: number, _x: number): number {
		return (
			level * this.levelDistance() * (this.notes[0]?.getStemDirection() ?? 1)
		);
	}

	/*
	 * Behind Bars pp. 19-21: after vexflow picks a slope, a slanted beam is limited to one
	 * stave-space across a short group and two across a long one, takes only a slight angle
	 * (¼ or ½ space) when its notes are close-set or all beyond the first ledger line, and ends
	 * on stave lines inside the stave. Flat beams are left as vexflow drew them.
	 */
	override calculateSlope(): void {
		super.calculateSlope();
		this.engraveSlope();
	}

	private engraveSlope(): void {
		const first = this.notes[0];
		const last = this.notes[this.notes.length - 1];
		const stave = first?.getStave();
		if (!first || !last || !stave) {
			return;
		}
		const dir = this.getStemDirection();
		const x0 = first.getStemX();
		const dx = last.getStemX() - x0;
		if (dx <= 0) {
			return;
		}
		if (this.notes.some((note) => note.getStemDirection() !== dir)) {
			this.engraveKneed(dir, x0, dx);
			return;
		}
		const space = stave.getSpacingBetweenLines();
		const base = first.getStemExtents().topY;
		const startY = base + this.yShift;
		const rise0 = this.slope * dx;

		// The head nearest the beam of each note, to read the contour and ledger position.
		const near = this.notes
			.filter((note) => !note.isRest())
			.map((note) => {
				const ys = note.getYs();
				return dir === Stem.DOWN ? Math.max(...ys) : Math.min(...ys);
			});
		const contour =
			near.length > 1
				? Math.sign(Math.round(((near.at(-1) ?? 0) - (near[0] ?? 0)) * 100))
				: 0;
		const interval =
			near.length > 1
				? Math.abs((near.at(-1) ?? 0) - (near[0] ?? 0)) / (space / 2)
				: 0;
		const top = stave.getYForLine(0);
		const bottom = stave.getYForLine(stave.getNumLines() - 1);
		const ledgered =
			near.length > 1 &&
			(near.every((y) => y <= top - space + 0.5) ||
				near.every((y) => y >= bottom + space - 0.5));
		const spacing = dx / (this.notes.length - 1) / space;

		let rise = rise0;
		let snap = true;
		if (contour !== 0 && ledgered) {
			rise = contour * (Math.round(interval) >= 2 ? 0.5 : 0.25) * space;
			snap = false;
		} else if (contour !== 0 && spacing < 3) {
			const sign = rise0 === 0 ? contour : Math.sign(rise0);
			rise = sign * (Math.abs(rise0) < 0.375 * space ? 0.25 : 0.5) * space;
			snap = false;
		}
		const cap = (this.notes.length <= 4 ? 1 : 2) * space;
		if (snap || Math.abs(rise) > cap) {
			rise = Math.sign(rise) * Math.min(Math.abs(rise), cap);
		}
		if (Math.abs(rise) < 1e-6) {
			const extra = this.tremoloOutwardShift(startY, 0, x0, dx, dir);
			if (extra > 0) {
				this.yShift -= extra * dir;
			}
			return;
		}

		// Keeps every stem at least as long as it is before the beam (and long enough for
		// any single-note tremolo strokes): slides the beam out.
		const fit = (y1: number, rise: number): number => {
			let out = 0;
			for (const note of this.notes) {
				if (!note.hasStem() && !note.isRest()) {
					continue;
				}
				const y = y1 + (rise * (note.getStemX() - x0)) / dx;
				out = Math.max(out, (y - this.noteBeamTipY(note, dir)) * dir);
			}
			return y1 - out * dir;
		};
		let y1 = fit(startY + (rise0 - rise) / 2, rise);
		let y2 = y1 + rise;
		if (snap) {
			const lines = Array.from({ length: stave.getNumLines() }, (_, i) =>
				stave.getYForLine(i),
			);
			const levelGap = this.levelDistance();
			const floating = (edge: number, count: number): number => {
				let n = 0;
				for (let level = 0; level < count; level++) {
					const a = edge + level * levelGap * dir;
					const b = a + this.renderOptions.beamWidth * dir;
					const lo = Math.min(a, b);
					const hi = Math.max(a, b);
					const centre = (lo + hi) / 2;
					const inside = centre > top && centre < bottom;
					const touches = lines.some(
						(line) =>
							Math.abs(lo - line) <= 0.5 ||
							Math.abs(hi - line) <= 0.5 ||
							Math.abs(centre - line) <= 0.5,
					);
					if (inside && !touches) {
						n++;
					}
				}
				return n;
			};
			const n1 = first.getGlyphProps().beamCount;
			const n2 = last.getGlyphProps().beamCount;
			let best = {
				score: floating(y1, n1) + floating(y2, n2),
				move: 0,
				y1,
				y2,
			};
			if (best.score > 0) {
				const step = 0.5;
				for (let d1 = 0; d1 <= space; d1 += step) {
					for (let d2 = 0; d2 <= space; d2 += step) {
						const c1 = y1 - d1 * dir;
						const c2 = y2 - d2 * dir;
						if (Math.abs(c2 - c1) > cap + 1e-6) {
							continue;
						}
						const score = floating(c1, n1) + floating(c2, n2);
						const move = d1 + d2;
						if (
							score < best.score ||
							(score === best.score && move < best.move)
						) {
							best = { score, move, y1: c1, y2: c2 };
						}
					}
				}
			}
			y1 = best.y1;
			y2 = best.y2;
		}
		this.slope = (y2 - y1) / dx;
		this.yShift = y1 - base;
	}

	/*
	 * Behind Bars p. 26: a beam between opposite stems sits in the middle of the stave, slants
	 * with the interval between its outer notes, and is moved off the middle only as far as
	 * keeps every stem at least 2½ spaces long. A group split across staves keeps vexflow's.
	 */
	private engraveKneed(dir: number, x0: number, dx: number): void {
		const first = this.notes[0];
		const last = this.notes[this.notes.length - 1];
		const stave = first?.getStave();
		if (
			!first ||
			!last ||
			!stave ||
			first.isRest() ||
			last.isRest() ||
			this.notes.some((note) => note.getStave() !== stave)
		) {
			return;
		}
		const space = stave.getSpacingBetweenLines();
		const top = stave.getYForLine(0);
		const bottom = stave.getYForLine(stave.getNumLines() - 1);
		const head = (note: typeof first) => {
			const ys = note.getYs();
			return note.getStemDirection() === Stem.DOWN
				? Math.max(...ys)
				: Math.min(...ys);
		};
		const fall = Math.sign(Math.round((head(last) - head(first)) * 100));
		const rise = fall * 0.5 * space;
		const width =
			this.renderOptions.beamWidth +
			(this.getBeamCount() - 1) * this.levelDistance();
		// The beam's centre line at x is centre + rise * (x - x0) / dx; every stem needs
		// its beam edge 2½ spaces from its head.
		let lo = -Infinity;
		let hi = Infinity;
		for (const note of this.notes) {
			if (note.isRest() || !note.hasStem()) {
				continue;
			}
			const along = (rise * (note.getStemX() - x0)) / dx;
			const tremoloReach = StaveTremolo.minBeamReach(note, width);
			const minCentreDist = Math.max(
				2.5 * space + width / 2,
				tremoloReach !== null ? tremoloReach - width / 2 : 0,
			);
			if (note.getStemDirection() === Stem.DOWN) {
				lo = Math.max(lo, head(note) + minCentreDist - along);
			} else {
				hi = Math.min(hi, head(note) - minCentreDist - along);
			}
		}
		const middle = (top + bottom) / 2;
		const centre = Math.min(Math.max(middle, lo), Math.max(hi, lo));
		const y1 = centre - (dir * width) / 2;
		this.slope = rise / dx;
		this.yShift = y1 - first.getStemExtents().topY;
	}

	/* Whether notes this close (under three spaces apart on average) whose outer heads differ
	 * take a slight slant even when the contour between them reverses (Gould, p. 20). */
	private slightlySlanted(): boolean {
		const first = this.notes[0];
		const last = this.notes[this.notes.length - 1];
		const stave = first?.getStave();
		if (!first || !last || !stave || this.notes.length < 3) {
			return false;
		}
		const dir = this.getStemDirection();
		if (this.notes.some((note) => note.getStemDirection() !== dir)) {
			return false;
		}
		const dx = last.getStemX() - first.getStemX();
		const spacing =
			dx / (this.notes.length - 1) / stave.getSpacingBetweenLines();
		const head = (note: typeof first) => {
			const ys = note.getYs();
			return dir === Stem.DOWN ? Math.max(...ys) : Math.min(...ys);
		};
		// A repeated pattern (E G E G) stays flat.
		const heads = this.notes.map((note) => (note.isRest() ? NaN : head(note)));
		const half = heads.length / 2;
		const repeated =
			Number.isInteger(half) &&
			heads.slice(0, half).every((y, i) => y === heads[half + i]);
		return (
			!repeated &&
			spacing < 3 &&
			!first.isRest() &&
			!last.isRest() &&
			Math.abs(head(last) - head(first)) > 1
		);
	}

	override calculateFlatSlope(): void {
		if (this.slightlySlanted()) {
			this.renderOptions.flatBeams = false;
			this.calculateSlope();
			return;
		}
		if (this.distance === null && this.getBeamCount() <= 2) {
			const offset = this.gouldFlatBeamOffset();
			if (offset !== null) {
				const existing = this.renderOptions.flatBeamOffset;
				const direction = this.getStemDirection();
				if (
					!existing ||
					(direction === Stem.DOWN && offset > existing) ||
					(direction === Stem.UP && offset < existing)
				) {
					this.renderOptions.flatBeamOffset = offset;
				}
				this.slope = 0;
				this.yShift = 0;
				return;
			}
		}
		// VexFlow uses beamWidth only as a level spacing in this calculation. Supply
		// our distance in its units, restoring the actual ink thickness before drawing.
		const width = this.renderOptions.beamWidth;
		this.renderOptions.beamWidth = this.levelDistance() / 1.5;
		try {
			super.calculateFlatSlope();
		} finally {
			this.renderOptions.beamWidth = width;
		}
		if (this.renderOptions.flatBeamOffset !== undefined) {
			this.renderOptions.flatBeamOffset = this.extendFlatOffsetForTremolos(
				this.renderOptions.flatBeamOffset,
			);
		}
	}

	/*
	 * Behind Bars pp. 18-19: for one or two horizontal beams, the stem from the closest
	 * notehead to the outer beam edge is 3½ stave-spaces in a space and 3¼ on a line (so an
	 * inner beam lands on a stave line rather than mid-space). Notes on or beyond ledger lines
	 * still reach at least the middle line, keeping the outer stave line clear of beams.
	 */
	private gouldFlatBeamOffset(): number | null {
		const direction = this.getStemDirection();
		const pitched = this.notes.filter((note) => !note.isRest());
		const candidates = pitched.length > 0 ? pitched : this.notes;
		let extremeY: number | null = null;
		let extremeStave = this.notes[0]?.getStave();
		for (const note of candidates) {
			const ys = note.getYs();
			if (ys.length === 0) {
				continue;
			}
			const y = direction === Stem.DOWN ? Math.max(...ys) : Math.min(...ys);
			if (
				extremeY === null ||
				(direction === Stem.DOWN ? y > extremeY : y < extremeY)
			) {
				extremeY = y;
				extremeStave = note.getStave() ?? extremeStave;
			}
		}
		if (extremeY === null || !extremeStave) {
			return null;
		}
		const space = extremeStave.getSpacingBetweenLines();
		const topLine = extremeStave.getYForLine(0);
		const numLines = extremeStave.getNumLines();
		const bottomLine = extremeStave.getYForLine(numLines - 1);
		const middleLine = extremeStave.getYForLine((numLines - 1) / 2);
		const slot = Math.round(((extremeY - topLine) / space) * 2);
		const onLine = slot % 2 === 0;
		const reach = (onLine ? 3.25 : 3.5) * space;
		let offset = extremeY + reach * -direction;
		if (direction === Stem.DOWN && extremeY <= topLine - space) {
			offset = Math.max(offset, middleLine);
		} else if (direction === Stem.UP && extremeY >= bottomLine + space) {
			offset = Math.min(offset, middleLine);
		}
		return this.extendFlatOffsetForTremolos(offset);
	}

	private beamDepth(): number {
		return (
			this.renderOptions.beamWidth +
			Math.max(this.getBeamCount() - 1, 0) * this.levelDistance()
		);
	}

	private noteBeamTipY(note: (typeof this.notes)[number], dir: number): number {
		const tipY = note.getStemExtents().topY;
		const reach = StaveTremolo.minBeamReach(note, this.beamDepth());
		if (reach === null) {
			return tipY;
		}
		const ys = note.getYs();
		if (ys.length === 0) {
			return tipY;
		}
		const headY = dir === Stem.DOWN ? Math.max(...ys) : Math.min(...ys);
		const tremTipY = headY - reach * dir;
		return dir === Stem.UP
			? Math.min(tipY, tremTipY)
			: Math.max(tipY, tremTipY);
	}

	private tremoloOutwardShift(
		y1: number,
		rise: number,
		x0: number,
		dx: number,
		dir: number,
	): number {
		let out = 0;
		for (const note of this.notes) {
			if (!note.hasStem() && !note.isRest()) {
				continue;
			}
			const y = y1 + (rise * (note.getStemX() - x0)) / dx;
			out = Math.max(out, (y - this.noteBeamTipY(note, dir)) * dir);
		}
		return out;
	}

	private extendFlatOffsetForTremolos(offset: number): number {
		const dir = this.getStemDirection();
		const depth = this.beamDepth();
		let out = offset;
		for (const note of this.notes) {
			const reach = StaveTremolo.minBeamReach(note, depth);
			if (reach === null) {
				continue;
			}
			const ys = note.getYs();
			if (ys.length === 0) {
				continue;
			}
			const headY = dir === Stem.DOWN ? Math.max(...ys) : Math.min(...ys);
			const needed = headY - reach * dir;
			out = dir === Stem.DOWN ? Math.max(out, needed) : Math.min(out, needed);
		}
		return out;
	}

	override applyStemExtensions(): void {
		super.applyStemExtensions();
		if (this.distance === null) {
			return;
		}
		const { beamWidth, showStemlets, stemletExtension } = this.renderOptions;
		for (const note of this.notes) {
			const stem = note.getStem();
			if (!stem) {
				continue;
			}
			const x = note.getStemX();
			if (note.getStemDirection() !== this.getStemDirection()) {
				const level = note.getGlyphProps().beamCount - 1;
				const reach = Math.abs(this.levelOffset(level, x));
				stem.setExtension(
					stem.getExtension() + reach - level * beamWidth * 1.5,
				);
			}
			if (note.isRest() && showStemlets) {
				const reach = Math.abs(this.levelOffset(this.getBeamCount() - 1, x));
				stem.setStemlet(true, reach + beamWidth + stemletExtension);
			}
		}
	}

	protected override drawBeamLines(ctx: RenderContext): void {
		if (this.distance === null && this.constructor === SpacedBeam) {
			super.drawBeamLines(ctx);
			return;
		}
		const first = this.notes[0];
		if (!first) {
			return;
		}
		const firstX = first.getStemX();
		const baseY = this.getBeamYToDraw();
		const thickness = this.renderOptions.beamWidth * first.getStemDirection();
		const levels = ['4', '8', '16', '32', '64'];
		levels.forEach((duration, level) => {
			for (const line of this.getBeamLines(duration)) {
				const end = line.end ?? line.start;
				const topAt = (x: number) =>
					this.getSlopeY(x, firstX, baseY, this.slope) +
					this.levelOffset(level, x);
				ctx.beginPath();
				ctx.moveTo(line.start, topAt(line.start));
				ctx.lineTo(line.start, topAt(line.start) + thickness);
				ctx.lineTo(end + 1, topAt(end) + thickness);
				ctx.lineTo(end + 1, topAt(end));
				ctx.closePath();
				ctx.fill();
			}
		});
	}
}
