import type { AlphatabApi, AlphatabContext } from './alphatab-renderer';
import { type EnginePage, registerPage } from './page-registry';

/*
 * The browser side of the alphaTab renderer: bundled to a classic script and injected
 * after alphaTab's UMD build. mount draws SVG into #screenshot and keeps the
 * AlphatabContext eval fns run against.
 */

type AlphaTabWindow = {
	alphaTab: {
		AlphaTabApi: new (el: Element, settings: object) => AlphatabApi;
	};
};

/** `musicXML` and `font` (the Bravura woff2) are both base64. */
type AlphatabInput = {
	musicXML: string;
	font: string;
};

class AlphatabPage implements EnginePage<AlphatabInput, AlphatabContext> {
	async mount(input: AlphatabInput): Promise<AlphatabContext> {
		const { AlphaTabApi } = (window as unknown as AlphaTabWindow).alphaTab;
		const container = document.getElementById('screenshot');
		if (!(container instanceof HTMLDivElement)) {
			throw new Error('mount: #screenshot container not found');
		}
		container.replaceChildren();
		const alphatab = new AlphaTabApi(container, {
			core: {
				engine: 'svg',
				// Workers would need alphaTab's own script URL, which an injected script
				// doesn't give it.
				useWorkers: false,
				// Lazy loading draws each part of the score as it scrolls into view, after
				// renderFinished, which then only means laid out: the capture would get an empty
				// page the height of the score. Off, renderFinished means drawn.
				enableLazyLoading: false,
				smuflFontSources: { woff2: `data:font/woff2;base64,${input.font}` },
			},
			player: { enablePlayer: false },
		});
		await new Promise<void>((resolve, reject) => {
			alphatab.renderFinished.on(resolve);
			alphatab.error.on(reject);
			// Every track: without the indexes alphaTab draws only the first part, which on a
			// multi-part score is a fraction of the page vexml and OSMD draw. -1 is its "all".
			const musicXML = forAlphatab(
				new TextDecoder().decode(Uint8Array.fromBase64(input.musicXML)),
			);
			if (!alphatab.load(new TextEncoder().encode(musicXML), [-1])) {
				reject(new Error('alphatab could not load the file'));
			}
		});
		return { alphatab, container };
	}
}

/**
 * The MusicXML, reworded where alphaTab's importer can't read it as written. Both are valid
 * MusicXML that leaves alphaTab throwing in collectSpaces as it paints the staff lines, and
 * then nothing of the score draws:
 *
 * - A <staff-tuning> on a staff that isn't tab: dropped. Only a tab staff reads its tuning,
 *   so the notation staves lose nothing alphaTab would have drawn.
 * - A tab note with a pitch but no <string> or <fret>: given them, derived from the staff's
 *   tuning by vexml's rule (tab-voice-translator.ts), so the two engines fret it alike.
 */
function forAlphatab(musicXML: string): string {
	const doc = new DOMParser().parseFromString(musicXML, 'application/xml');
	for (const part of Array.from(doc.querySelectorAll('part'))) {
		// A staff keeps its clef and tuning until another replaces them, so they're tracked
		// through the part in document order, attributes and notes interleaved.
		const staves = new Map<string, StaffState>();
		const staff = (number: string) => {
			let state = staves.get(number);
			if (!state) {
				state = { sign: '', lines: false, tuning: [] };
				staves.set(number, state);
			}
			return state;
		};
		for (const element of Array.from(
			part.querySelectorAll(
				':scope > measure > attributes, :scope > measure > note',
			),
		)) {
			if (element.tagName === 'attributes') {
				readAttributes(element, staff);
			} else {
				const number = child(element, 'staff')?.textContent?.trim() ?? '1';
				fret(element, staff(number));
			}
		}
	}
	return new XMLSerializer().serializeToString(doc);
}

interface StaffState {
	sign: string;
	/** Whether the staff declares its own <staff-lines>, as a G-clef tab staff does. */
	lines: boolean;
	/** Open-string MIDI pitches by string, string 1 (the highest) first. */
	tuning: number[];
}

function readAttributes(
	attributes: Element,
	staff: (number: string) => StaffState,
) {
	for (const clef of children(attributes, 'clef')) {
		staff(clef.getAttribute('number') ?? '1').sign =
			child(clef, 'sign')?.textContent?.trim() ?? '';
	}
	for (const details of children(attributes, 'staff-details')) {
		const state = staff(details.getAttribute('number') ?? '1');
		if (child(details, 'staff-lines')) {
			state.lines = true;
		}
		const tunings = children(details, 'staff-tuning');
		if (tunings.length === 0) {
			continue;
		}
		// Some exporters write a tab staff with a G clef, its string count in <staff-lines>
		// standing in for the TAB sign; that staff's tuning is what makes it tab.
		if (state.sign !== 'TAB' && !state.lines) {
			for (const tuning of tunings) {
				tuning.remove();
			}
			continue;
		}
		// <staff-tuning line="1"> is the lowest string, and <string>1 the highest.
		const byLine = new Map<number, number>();
		for (const tuning of tunings) {
			const pitch = midi(
				child(tuning, 'tuning-step')?.textContent,
				child(tuning, 'tuning-alter')?.textContent,
				child(tuning, 'tuning-octave')?.textContent,
			);
			if (pitch !== null) {
				byLine.set(Number(tuning.getAttribute('line')), pitch);
			}
		}
		const top = Math.max(...byLine.keys());
		state.tuning = [];
		for (let line = top; line >= 1; line--) {
			state.tuning.push(byLine.get(line) ?? 0);
		}
	}
}

/** Gives a tab note the <string> and <fret> its pitch implies, where it lacks either. */
function fret(note: Element, state: StaffState) {
	const tab = state.sign === 'TAB' || state.lines;
	const pitch = child(note, 'pitch');
	if (!tab || state.tuning.length === 0 || !pitch) {
		return;
	}
	const technical = child(note, 'notations')
		? child(child(note, 'notations') as Element, 'technical')
		: null;
	const string = technical ? child(technical, 'string') : null;
	if (technical && string && child(technical, 'fret')) {
		return;
	}
	const sounding = midi(
		child(pitch, 'step')?.textContent,
		child(pitch, 'alter')?.textContent,
		child(pitch, 'octave')?.textContent,
	);
	if (sounding === null) {
		return;
	}
	const position = derive(
		sounding,
		state.tuning,
		string ? Number(string.textContent) : null,
	);
	const doc = note.ownerDocument;
	let notations = child(note, 'notations');
	if (!notations) {
		notations = doc.createElement('notations');
		// Before any lyric, where the schema puts it, though alphaTab reads by name.
		note.insertBefore(notations, child(note, 'lyric'));
	}
	let target = child(notations, 'technical');
	if (!target) {
		target = doc.createElement('technical');
		notations.appendChild(target);
	}
	for (const [name, value] of [
		['string', position.string],
		['fret', position.fret],
	] as const) {
		if (!child(target, name)) {
			const element = doc.createElement(name);
			element.textContent = String(value);
			target.appendChild(element);
		}
	}
}

/**
 * vexml's rule: an explicit string keeps its string and derives its fret; otherwise the
 * string that gives the smallest fret. Below every open string, the
 * lowest string at fret 0, so the tab still shows something at that tick.
 */
function derive(
	pitch: number,
	tuning: number[],
	string: number | null,
): { string: number; fret: number } {
	if (string !== null) {
		return { string, fret: Math.max(0, pitch - (tuning[string - 1] ?? pitch)) };
	}
	let best: { string: number; fret: number } | null = null;
	for (const [index, open] of tuning.entries()) {
		const fret = pitch - open;
		if (fret >= 0 && (best === null || fret < best.fret)) {
			best = { string: index + 1, fret };
		}
	}
	return best ?? { string: tuning.length, fret: 0 };
}

const STEP_SEMITONES: Record<string, number> = {
	C: 0,
	D: 2,
	E: 4,
	F: 5,
	G: 7,
	A: 9,
	B: 11,
};

function midi(
	step: string | null | undefined,
	alter: string | null | undefined,
	octave: string | null | undefined,
): number | null {
	const semitone = STEP_SEMITONES[step?.trim() ?? ''];
	if (semitone === undefined || octave == null) {
		return null;
	}
	return (Number(octave) + 1) * 12 + semitone + Math.round(Number(alter ?? 0));
}

function child(parent: Element, name: string): Element | null {
	return children(parent, name)[0] ?? null;
}

function children(parent: Element, name: string): Element[] {
	return Array.from(parent.children).filter(
		(element) => element.tagName === name,
	);
}

registerPage(new AlphatabPage());
