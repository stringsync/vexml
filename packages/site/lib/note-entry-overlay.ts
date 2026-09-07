import type { Layer, Score } from '@stringsync/vexml';
import { Disposer, type Resource } from 'webappwiz/disposable';
import type { NoteEntry } from './note-entry';

/** Draw an uncommitted staff note or tab position on the score's own content layer. */
export class NoteEntryOverlay implements Resource {
	private readonly disposer = new Disposer();
	private readonly layer: Layer;
	constructor(
		private readonly score: Score,
		private readonly entry: NoteEntry,
	) {
		this.layer = this.disposer.use(score.addLayer('content', 3));
		this.disposer.defer(entry.events.on('changed', () => this.draw()));
		this.draw();
	}
	dispose(): void {
		this.disposer.dispose();
	}
	private draw(): void {
		const ctx = this.layer.ctx;
		ctx.save();
		ctx.resetTransform();
		ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
		ctx.restore();
		const draft = this.entry.draft;
		if (!draft) {
			return;
		}
		const measure = this.score
			.getParts()
			.flatMap((part) => part.getMeasures())
			.find((measure) => measure.getSources()[0] === draft.measure);
		const staff = measure
			?.getStaves()
			.find((staff) => staff.staff === draft.staff);
		if (!staff) {
			return;
		}
		const notes =
			measure?.getVoices().flatMap((voice) => voice.getNotes()) ?? [];
		const selected = notes.find((note) => note.getSources()[0] === draft.note);
		const last = notes.at(-1);
		const x = selected
			? selected.rect.x + selected.rect.w / 2
			: Math.min(
					staff.endX - 14,
					last ? last.rect.right + 28 : staff.startX + 16,
				);
		let y = staff.top + (draft.string - 1) * staff.spacing;
		if (!draft.tab) {
			const clef = draft.note?.clef ?? draft.measure.getClef(draft.staff);
			let reference = 4 * 7 + 4;
			if (clef?.sign === 'F') {
				reference = 3 * 7 + 3;
			}
			if (clef?.sign === 'C') {
				reference = 4 * 7;
			}
			const line = clef?.line ?? 2;
			const pitch = draft.octave * 7 + 'CDEFGAB'.indexOf(draft.step);
			y =
				staff.top +
				(staff.lines - line) * staff.spacing -
				((pitch - reference - (clef?.octaveChange ?? 0) * 7) * staff.spacing) /
					2;
		}
		ctx.save();
		ctx.fillStyle = 'rgba(120,120,128,0.14)';
		ctx.strokeStyle = 'rgba(120,120,128,0.65)';
		ctx.lineWidth = 1;
		ctx.beginPath();
		ctx.ellipse(x, y, 13, 11, 0, 0, Math.PI * 2);
		ctx.fill();
		ctx.stroke();
		ctx.fillStyle = '#9ca3af';
		ctx.strokeStyle = '#9ca3af';
		if (draft.tab) {
			if (draft.fret) {
				ctx.font = 'bold 13px sans-serif';
				ctx.textAlign = 'center';
				ctx.textBaseline = 'middle';
				ctx.fillText(draft.fret, x, y);
			}
		} else {
			ctx.beginPath();
			ctx.ellipse(x, y, 5.5, 3.5, -0.4, 0, Math.PI * 2);
			if (this.entry.duration === 'whole' || this.entry.duration === 'half') {
				ctx.stroke();
			} else {
				ctx.fill();
			}
			if (this.entry.duration !== 'whole') {
				ctx.beginPath();
				ctx.moveTo(x + 5, y);
				ctx.lineTo(x + 5, y - 28);
				ctx.stroke();
				const flags =
					['eighth', '16th', '32nd'].indexOf(this.entry.duration) + 1;
				for (let flag = 0; flag < flags; flag++) {
					ctx.beginPath();
					ctx.moveTo(x + 5, y - 28 + flag * 5);
					ctx.quadraticCurveTo(
						x + 17,
						y - 20 + flag * 5,
						x + 9,
						y - 13 + flag * 5,
					);
					ctx.stroke();
				}
			}
			for (
				let lineY = staff.top - staff.spacing;
				lineY >= y - 1;
				lineY -= staff.spacing
			) {
				ctx.beginPath();
				ctx.moveTo(x - 9, lineY);
				ctx.lineTo(x + 9, lineY);
				ctx.stroke();
			}
			for (
				let lineY = staff.top + staff.lines * staff.spacing;
				lineY <= y + 1;
				lineY += staff.spacing
			) {
				ctx.beginPath();
				ctx.moveTo(x - 9, lineY);
				ctx.lineTo(x + 9, lineY);
				ctx.stroke();
			}
			if (draft.alter) {
				ctx.font = '16px serif';
				ctx.fillText(draft.alter > 0 ? '♯' : '♭', x - 21, y + 5);
			}
		}
		ctx.restore();
	}
}
