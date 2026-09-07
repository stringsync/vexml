import { MDocument, MElement, MusicXMLSerializer } from '@stringsync/mdom';

/** Start a blank 4/4 score on a treble staff or six-string guitar tablature. */
export class NewNotation {
	create(kind: 'staff' | 'tab'): string {
		const document = MDocument.empty();
		const part = document.score.addPart();
		const measure = part.addMeasure();
		measure.setDivisions(32);
		measure.setTime({ beats: 4, beatType: 4 });
		measure.setClef(
			kind === 'tab' ? { sign: 'TAB', line: 5 } : { sign: 'G', line: 2 },
		);
		if (kind === 'tab') {
			const details = new MElement('staff-details');
			const lines = new MElement('staff-lines');
			lines.setText('6');
			details.append(lines);
			for (const [index, [step, octave]] of [
				['E', '2'],
				['A', '2'],
				['D', '3'],
				['G', '3'],
				['B', '3'],
				['E', '4'],
			].entries()) {
				const tuning = new MElement('staff-tuning');
				tuning.setAttribute('line', String(index + 1));
				const pitch = new MElement('tuning-step');
				pitch.setText(step ?? 'E');
				const register = new MElement('tuning-octave');
				register.setText(octave ?? '4');
				tuning.append(pitch);
				tuning.append(register);
				details.append(tuning);
			}
			measure.getOrCreateAttributes().append(details);
		}
		return new MusicXMLSerializer().serializeToString(document);
	}
}
