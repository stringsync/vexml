import { MDOMParser, MElement } from '@stringsync/mdom';

/** Atomic presence questions for the notation explicitly visible in a measure slice. */
export class VisibleThings {
	questions(xml: string): string[] {
		const out: string[] = [];
		const score = new MDOMParser().parseFromString(xml).score;
		for (const [partIndex, part] of score.parts.entries()) {
			for (const measure of part.measures) {
				let ordinal = 0;
				for (const node of measure.children) {
					if (!(node instanceof MElement)) {
						continue;
					}
					if (node.tag === 'note') {
						ordinal++;
					}
					if (hidden(node)) {
						continue;
					}
					const context = `in measure ${measure.number}, part ${partIndex + 1} (${part.label ?? part.id})`;
					if (node.tag === 'note') {
						const where = `on note/rest ${ordinal} in XML order, staff ${node.child('staff')?.text ?? '1'}, voice ${node.child('voice')?.text ?? '1'}, ${context}`;
						const pitch = node.child('pitch');
						const duration =
							node.child('type')?.text ??
							(node.child('rest')?.getAttribute('measure') === 'yes'
								? 'whole-measure'
								: '');
						let description = 'unpitched note';
						if (node.child('rest')) {
							description = `${duration} rest`.trim();
						} else if (pitch) {
							description = `${duration} note at pitch ${pitch.child('step')?.text}${pitch.child('alter')?.text ? ` altered by ${pitch.child('alter')?.text} semitones` : ''} in octave ${pitch.child('octave')?.text}`;
						}
						out.push(`Is there a visible ${description} ${where}?`);
						for (const child of node.children) {
							if (!(child instanceof MElement)) {
								continue;
							}
							if (child.tag === 'accidental' && !hidden(child)) {
								out.push(
									`Is there a visible ${child.text} accidental ${where}?`,
								);
							}
							if (child.tag === 'dot' && !hidden(child)) {
								out.push(`Is there a visible augmentation dot ${where}?`);
							}
							if (
								child.tag === 'lyric' &&
								!hidden(child) &&
								node.getAttribute('print-lyric') !== 'no'
							) {
								const text = child.children
									.filter(
										(t): t is MElement =>
											t instanceof MElement &&
											['text', 'elision'].includes(t.tag),
									)
									.map((t) => t.text ?? ' ')
									.join('');
								if (text) {
									out.push(
										`Is the lyric ${JSON.stringify(text)} visible ${where}?`,
									);
								}
							}
							if (child.tag === 'notations') {
								marks(child, where, out);
							}
						}
					} else if (
						[
							'direction',
							'harmony',
							'barline',
							'attributes',
							'figured-bass',
						].includes(node.tag)
					) {
						marks(node, context, out);
					}
				}
			}
		}
		return out;
	}
}

function hidden(node: MElement): boolean {
	return node.getAttribute('print-object') === 'no';
}

function marks(node: MElement, where: string, out: string[]): void {
	if (hidden(node)) {
		return;
	}
	const place = node.getAttribute('placement') ?? node.getAttribute('type');
	const notationChild =
		[
			'notations',
			'articulations',
			'ornaments',
			'technical',
			'direction-type',
		].includes(node.parent?.tag ?? '') &&
		![
			'articulations',
			'ornaments',
			'technical',
			'dynamics',
			'footnote',
			'level',
		].includes(node.tag);
	if (MARKS.has(node.tag) || notationChild) {
		out.push(
			`Is there a visible ${node.tag.replaceAll('-', ' ')}${node.text ? ` ${JSON.stringify(node.text)}` : ''}${place ? ` (${place})` : ''} ${where}?`,
		);
		return;
	}
	if (node.tag === 'dynamics') {
		for (const dynamic of node.children) {
			if (dynamic instanceof MElement) {
				out.push(
					`Is the dynamic ${JSON.stringify(dynamic.text ?? dynamic.tag)} visible ${where}?`,
				);
			}
		}
		return;
	}
	if (node.tag === 'clef') {
		out.push(`Is a ${node.child('sign')?.text} clef visible ${where}?`);
		return;
	}
	if (node.tag === 'time' && node.getAttribute('symbol') !== 'hidden') {
		out.push(
			`Is the time signature ${node.child('beats')?.text}/${node.child('beat-type')?.text} visible ${where}?`,
		);
		return;
	}
	if (node.tag === 'key') {
		const fifths = Number(node.child('fifths')?.text ?? 0);
		if (fifths) {
			out.push(
				`Is a key signature of ${Math.abs(fifths)} ${fifths > 0 ? 'sharps' : 'flats'} visible ${where}?`,
			);
		}
		return;
	}
	for (const child of node.children) {
		if (child instanceof MElement) {
			marks(child, where, out);
		}
	}
}

const MARKS = new Set([
	'fermata',
	'accent',
	'strong-accent',
	'staccato',
	'tenuto',
	'detached-legato',
	'staccatissimo',
	'spiccato',
	'breath-mark',
	'caesura',
	'trill-mark',
	'turn',
	'inverted-turn',
	'mordent',
	'inverted-mordent',
	'tremolo',
	'up-bow',
	'down-bow',
	'fingering',
	'fret',
	'string',
	'harmonic',
	'open-string',
	'snap-pizzicato',
	'words',
	'rehearsal',
	'segno',
	'coda',
	'wedge',
	'pedal',
	'octave-shift',
	'slur',
	'tied',
	'glissando',
	'slide',
	'tuplet',
	'ending',
	'repeat',
	'metronome',
	'root-step',
	'kind',
	'figure-number',
]);
