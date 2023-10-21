/* eslint-disable @typescript-eslint/no-unused-vars */
import { NamedElement } from './namedelement';

/**
 * A wrapper around NamedElement that performs mutative actions.
 *
 * This allows callers to exclusively work with NamedElements, as opposed to casting NamedElements to their native form.
 * It also prevents the need for NamedElement to have an mutative actions.
 */
class NamedElementEditor {
  constructor(private element: NamedElement<string>) {}

  /** Appends the elements to the wrapped element as direct children. */
  append(...elements: Array<NamedElement<string>>): void {
    this.element.native().append(...elements.map((element) => element.native()));
  }

  /** Sets the text content of the wrapped element. */
  setTextContent(textContent: string): void {
    this.element.native().textContent = textContent;
  }

  /** Sets the attribute of the wrapped element. */
  setAttribute(name: string, value: string): void {
    this.element.native().setAttribute(name, value);
  }
}

/** Creates a document node. */
export const createDocument = (): Document => document.implementation.createDocument(null, null);

/** Creates an XML element with the specified tag name. */
export const createElement = (tagName: string): Element => {
  return createDocument().createElement(tagName);
};

/** Creates a NamedElement with the specified tag name. */
export const createNamedElement = <T extends string>(tagName: T): NamedElement<T> => {
  return NamedElement.of(createElement(tagName));
};

/**
 * Creates an element factory.
 *
 * Factories are invoked by invoking the returned function with the arguments.
 * @example
 * const fooFactory = createNamedElementFactory<'foo', { bar: string }>('foo', (e, { bar }) => {
 *   if (typeof bar === 'string') {
 *     e.setTextContent(bar);
 *   }
 * });
 * const fooNamedElement = fooFactory('bar');
 */
const createNamedElementFactory = <T extends string, A extends Record<any, any>>(
  tagName: T,
  builder: (e: NamedElementEditor, args: Partial<A>) => void
) => {
  return (args?: Partial<A>): NamedElement<T> => {
    const element = createNamedElement(tagName);
    builder(new NamedElementEditor(element), args ?? {});
    return element;
  };
};

export const musicXml = (scorePartwise: NamedElement<'score-partwise'>): Document => {
  const root = createDocument();
  root.appendChild(scorePartwise.native());
  return root;
};

export const scorePartwise = createNamedElementFactory<
  'score-partwise',
  {
    parts: NamedElement<'part'>[];
    partList: NamedElement<'part-list'>;
    defaults: NamedElement<'defaults'>;
  }
>('score-partwise', (e, { parts, partList, defaults }) => {
  if (parts) {
    e.append(...parts);
  }
  if (partList) {
    e.append(partList);
  }
  if (defaults) {
    e.append(defaults);
  }
});

export const partList = createNamedElementFactory<
  'part-list',
  {
    scoreParts: NamedElement<'score-part'>[];
  }
>('part-list', (e, { scoreParts }) => {
  if (scoreParts) {
    e.append(...scoreParts);
  }
});

export const scorePart = createNamedElementFactory<
  'score-part',
  {
    id: string;
    partName: NamedElement<'part-name'>;
  }
>('score-part', (e, { id, partName }) => {
  if (id) {
    e.setAttribute('id', id);
  }
  if (partName) {
    e.append(partName);
  }
});

export const partName = createNamedElementFactory<
  'part-name',
  {
    textContent: string;
  }
>('part-name', (e, { textContent }) => {
  if (textContent) {
    e.setTextContent(textContent);
  }
});

export const part = createNamedElementFactory<
  'part',
  {
    id: string;
    measures: NamedElement<'measure'>[];
  }
>('part', (e, { id, measures }) => {
  if (id) {
    e.setAttribute('id', id);
  }
  if (measures) {
    e.append(...measures);
  }
});

export const measure = createNamedElementFactory<
  'measure',
  {
    width: number;
    number: string;
    implicit: string;
    entries: Array<
      | NamedElement<'attributes'>
      | NamedElement<'note'>
      | NamedElement<'backup'>
      | NamedElement<'forward'>
      | NamedElement<'direction'>
    >;
    notes: NamedElement<'note'>[];
    attributes: NamedElement<'attributes'>[];
    barlines: NamedElement<'barline'>[];
    prints: NamedElement<'print'>[];
  }
>('measure', (e, { width, entries, implicit, number, notes, attributes, barlines, prints }) => {
  if (entries) {
    e.append(...entries);
  }
  if (notes) {
    e.append(...notes);
  }
  if (attributes) {
    e.append(...attributes);
  }
  if (barlines) {
    e.append(...barlines);
  }
  if (prints) {
    e.append(...prints);
  }
  if (implicit) {
    e.setAttribute('implicit', implicit);
  }
  if (typeof width === 'number') {
    e.setAttribute('width', width.toString());
  }
  if (typeof number === 'string') {
    e.setAttribute('number', number);
  }
});

export const note = createNamedElementFactory<
  'note',
  {
    type: NamedElement<'type'>;
    stem: NamedElement<'stem'>;
    dots: NamedElement<'dot'>[];
    rest: NamedElement<'rest'>;
    pitch: NamedElement<'pitch'>;
    accidental: NamedElement<'accidental'>;
    notehead: NamedElement<'notehead'>;
    grace: NamedElement<'grace'>;
    duration: NamedElement<'duration'>;
    notations: NamedElement<'notations'>[];
    voice: NamedElement<'voice'>;
    staff: NamedElement<'staff'>;
    beams: NamedElement<'beam'>[];
    chord: NamedElement<'chord'>;
    lyrics: NamedElement<'lyric'>[];
  }
>(
  'note',
  (
    e,
    {
      type,
      grace,
      stem,
      dots,
      rest,
      pitch,
      accidental,
      notehead,
      duration,
      notations,
      voice,
      staff,
      beams,
      chord,
      lyrics,
    }
  ) => {
    if (grace) {
      e.append(grace);
    }
    if (chord) {
      e.append(chord);
    }
    if (pitch) {
      e.append(pitch);
    }
    if (rest) {
      e.append(rest);
    }
    if (duration) {
      e.append(duration);
    }
    if (voice) {
      e.append(voice);
    }
    if (type) {
      e.append(type);
    }
    if (dots) {
      e.append(...dots);
    }
    if (accidental) {
      e.append(accidental);
    }
    if (stem) {
      e.append(stem);
    }
    if (notehead) {
      e.append(notehead);
    }
    if (staff) {
      e.append(staff);
    }
    if (beams) {
      e.append(...beams);
    }
    if (notations) {
      e.append(...notations);
    }
    if (lyrics) {
      e.append(...lyrics);
    }
  }
);

export const backup = createNamedElementFactory<'backup', { duration: NamedElement<'duration'> }>(
  'backup',
  (e, { duration }) => {
    if (duration) {
      e.append(duration);
    }
  }
);

export const forward = createNamedElementFactory<'forward', { duration: NamedElement<'duration'> }>(
  'forward',
  (e, { duration }) => {
    if (duration) {
      e.append(duration);
    }
  }
);

export const type = createNamedElementFactory<
  'type',
  {
    textContent: string;
  }
>('type', (e, { textContent }) => {
  if (textContent) {
    e.setTextContent(textContent);
  }
});

export const attributes = createNamedElementFactory<
  'attributes',
  {
    divisions: NamedElement<'divisions'>;
    staves: NamedElement<'staves'>;
    clefs: NamedElement<'clef'>[];
    times: NamedElement<'time'>[];
    keys: NamedElement<'key'>[];
    staffDetails: NamedElement<'staff-details'>[];
    measureStyles: NamedElement<'measure-style'>[];
  }
>('attributes', (e, { divisions, staves, clefs, times, keys, staffDetails, measureStyles }) => {
  if (divisions) {
    e.append(divisions);
  }
  if (keys) {
    e.append(...keys);
  }
  if (times) {
    e.append(...times);
  }
  if (clefs) {
    e.append(...clefs);
  }
  if (staves) {
    e.append(staves);
  }
  if (staffDetails) {
    e.append(...staffDetails);
  }
  if (measureStyles) {
    e.append(...measureStyles);
  }
});

export const divisions = createNamedElementFactory<'divisions', { positiveDivisions: number }>(
  'divisions',
  (e, { positiveDivisions }) => {
    if (typeof positiveDivisions === 'number') {
      e.setTextContent(positiveDivisions.toString());
    }
  }
);

export const print = createNamedElementFactory<
  'print',
  {
    newSystem: boolean;
    newPage: boolean;
    systemLayout: NamedElement<'system-layout'>;
    staffLayouts: NamedElement<'staff-layout'>[];
  }
>('print', (e, { newSystem, newPage, staffLayouts, systemLayout }) => {
  if (typeof newSystem === 'boolean') {
    e.setAttribute('new-system', newSystem ? 'yes' : 'no');
  }
  if (typeof newPage === 'boolean') {
    e.setAttribute('new-page', newPage ? 'yes' : 'no');
  }
  if (staffLayouts) {
    e.append(...staffLayouts);
  }
  if (systemLayout) {
    e.append(systemLayout);
  }
});

export const defaults = createNamedElementFactory<
  'defaults',
  {
    systemLayout: NamedElement<'system-layout'>;
    staffLayouts: NamedElement<'staff-layout'>[];
  }
>('defaults', (e, { staffLayouts, systemLayout }) => {
  if (staffLayouts) {
    e.append(...staffLayouts);
  }
  if (systemLayout) {
    e.append(systemLayout);
  }
});

export const staffLayout = createNamedElementFactory<
  'staff-layout',
  {
    number: number;
    staffDistance: NamedElement<'staff-distance'>;
  }
>('staff-layout', (e, { number, staffDistance }) => {
  if (typeof number === 'number') {
    e.setAttribute('number', number.toString());
  }
  if (staffDistance) {
    e.append(staffDistance);
  }
});

export const staffDistance = createNamedElementFactory<
  'staff-distance',
  {
    value: string;
  }
>('staff-distance', (e, { value }) => {
  if (value) {
    e.setTextContent(value);
  }
});

export const systemLayout = createNamedElementFactory<
  'system-layout',
  {
    systemMargins: NamedElement<'system-margins'>;
    systemDistance: NamedElement<'system-distance'>;
    topSystemDistance: NamedElement<'top-system-distance'>;
    systemDividers: NamedElement<'system-dividers'>;
  }
>('system-layout', (e, { systemMargins, systemDistance, topSystemDistance, systemDividers }) => {
  if (systemMargins) {
    e.append(systemMargins);
  }
  if (systemDistance) {
    e.append(systemDistance);
  }
  if (topSystemDistance) {
    e.append(topSystemDistance);
  }
  if (systemDividers) {
    e.append(systemDividers);
  }
});

export const systemMargins = createNamedElementFactory<
  'system-margins',
  {
    leftMargin: NamedElement<'left-margin'>;
    rightMargin: NamedElement<'right-margin'>;
  }
>('system-margins', (e, { leftMargin, rightMargin }) => {
  if (leftMargin) {
    e.append(leftMargin);
  }
  if (rightMargin) {
    e.append(rightMargin);
  }
});

export const leftMargin = createNamedElementFactory<
  'left-margin',
  {
    tenths: number;
  }
>('left-margin', (e, { tenths }) => {
  if (typeof tenths === 'number') {
    e.setTextContent(tenths.toString());
  }
});

export const rightMargin = createNamedElementFactory<
  'right-margin',
  {
    tenths: number;
  }
>('right-margin', (e, { tenths }) => {
  if (typeof tenths === 'number') {
    e.setTextContent(tenths.toString());
  }
});

export const systemDistance = createNamedElementFactory<
  'system-distance',
  {
    tenths: number;
  }
>('system-distance', (e, { tenths }) => {
  if (typeof tenths === 'number') {
    e.setTextContent(tenths.toString());
  }
});

export const topSystemDistance = createNamedElementFactory<
  'top-system-distance',
  {
    tenths: number;
  }
>('top-system-distance', (e, { tenths }) => {
  if (typeof tenths === 'number') {
    e.setTextContent(tenths.toString());
  }
});

export const direction = createNamedElementFactory<
  'direction',
  {
    types: NamedElement<'direction-type'>[];
  }
>('direction', (e, { types }) => {
  if (types) {
    e.append(...types);
  }
});

export const directionType = createNamedElementFactory<
  'direction-type',
  {
    codas: NamedElement<'coda'>[];
    segnos: NamedElement<'segno'>[];
    metronome: NamedElement<'metronome'>;
    tokens: Array<NamedElement<'words'> | NamedElement<'symbol'>>;
  }
>('direction-type', (e, { codas, segnos, metronome, tokens }) => {
  if (codas) {
    e.append(...codas);
  }
  if (segnos) {
    e.append(...segnos);
  }
  if (metronome) {
    e.append(metronome);
  }
  if (tokens) {
    e.append(...tokens);
  }
});

export const words = createNamedElementFactory<'words', { content: string }>('words', (e, { content }) => {
  if (content) {
    e.setTextContent(content);
  }
});

export const symbolic = createNamedElementFactory<'symbol', { smuflGlyphName: string }>(
  'symbol',
  (e, { smuflGlyphName }) => {
    if (smuflGlyphName) {
      e.setTextContent(smuflGlyphName);
    }
  }
);

export const metronome = createNamedElementFactory<
  'metronome',
  {
    beatUnit: NamedElement<'beat-unit'>;
    beatUnitDots: NamedElement<'beat-unit-dot'>[];
    perMinute: NamedElement<'per-minute'>;
    perMinuteDots: NamedElement<'beat-unit-dot'>[];
  }
>('metronome', (e, { beatUnit, beatUnitDots, perMinute, perMinuteDots }) => {
  if (beatUnit) {
    e.append(beatUnit);
  }
  if (beatUnitDots) {
    e.append(...beatUnitDots);
  }
  if (perMinute) {
    e.append(perMinute);
  }
  if (perMinuteDots) {
    e.append(...perMinuteDots);
  }
});

export const beatUnit = createNamedElementFactory<'beat-unit', { noteTypeValue: string }>(
  'beat-unit',
  (e, { noteTypeValue }) => {
    if (noteTypeValue) {
      e.setTextContent(noteTypeValue);
    }
  }
);

export const beatUnitDot = createNamedElementFactory<'beat-unit-dot', Record<string, never>>('beat-unit-dot', () => {});

export const perMinute = createNamedElementFactory<'per-minute', { value: string }>('per-minute', (e, { value }) => {
  if (value) {
    e.setTextContent(value);
  }
});

export const barline = createNamedElementFactory<
  'barline',
  {
    location: string;
    barStyle: NamedElement<'bar-style'>;
    repeat: NamedElement<'repeat'>;
    ending: NamedElement<'ending'>;
  }
>('barline', (e, { location, barStyle, repeat, ending }) => {
  if (location) {
    e.setAttribute('location', location);
  }
  if (barStyle) {
    e.append(barStyle);
  }
  if (repeat) {
    e.append(repeat);
  }
  if (ending) {
    e.append(ending);
  }
});

export const staves = createNamedElementFactory<
  'staves',
  {
    staveCount: number;
  }
>('staves', (e, { staveCount }) => {
  if (typeof staveCount === 'number') {
    e.setTextContent(staveCount.toString());
  }
});

export const barStyle = createNamedElementFactory<
  'bar-style',
  {
    value: string;
  }
>('bar-style', (e, { value }) => {
  if (value) {
    e.setTextContent(value);
  }
});

export const repeat = createNamedElementFactory<
  'repeat',
  {
    direction: string;
  }
>('repeat', (e, { direction }) => {
  if (direction) {
    e.setAttribute('direction', direction);
  }
});

export const ending = createNamedElementFactory<
  'ending',
  {
    number: string;
    type: string;
    textContent: string;
  }
>('ending', (e, { number, type, textContent }) => {
  if (number) {
    e.setAttribute('number', number);
  }
  if (type) {
    e.setAttribute('type', type);
  }
  if (textContent) {
    e.setTextContent(textContent);
  }
});

export const stem = createNamedElementFactory<
  'stem',
  {
    value: string;
  }
>('stem', (e, { value }) => {
  if (value) {
    e.setTextContent(value);
  }
});

export const dot = createNamedElementFactory<'dot', Record<never, never>>('dot', (_, __) => {
  // noop
});

export const rest = createNamedElementFactory<
  'rest',
  {
    displayStep: NamedElement<'display-step'>;
    displayOctave: NamedElement<'display-octave'>;
  }
>('rest', (e, { displayStep, displayOctave }) => {
  if (displayStep) {
    e.append(displayStep);
  }
  if (displayOctave) {
    e.append(displayOctave);
  }
});

export const displayStep = createNamedElementFactory<
  'display-step',
  {
    step: string;
  }
>('display-step', (e, { step }) => {
  if (step) {
    e.setTextContent(step);
  }
});

export const displayOctave = createNamedElementFactory<
  'display-octave',
  {
    octave: string;
  }
>('display-octave', (e, { octave }) => {
  if (octave) {
    e.setTextContent(octave);
  }
});

export const pitch = createNamedElementFactory<
  'pitch',
  {
    step: NamedElement<'step'>;
    alter: NamedElement<'alter'>;
    octave: NamedElement<'octave'>;
  }
>('pitch', (e, { step, alter, octave }) => {
  if (step) {
    e.append(step);
  }
  if (alter) {
    e.append(alter);
  }
  if (octave) {
    e.append(octave);
  }
});

export const step = createNamedElementFactory<
  'step',
  {
    value: string;
  }
>('step', (e, { value }) => {
  if (value) {
    e.setTextContent(value);
  }
});

export const alter = createNamedElementFactory<'alter', { value: number }>('alter', (e, { value }) => {
  if (typeof value === 'number') {
    e.setTextContent(value.toString());
  }
});

export const octave = createNamedElementFactory<
  'octave',
  {
    value: number;
  }
>('octave', (e, { value }) => {
  if (value) {
    e.setTextContent(value.toString());
  }
});

export const accidental = createNamedElementFactory<
  'accidental',
  {
    value: string;
    cautionary: string;
  }
>('accidental', (e, { value, cautionary }) => {
  if (value) {
    e.setTextContent(value);
  }
  if (cautionary) {
    e.setAttribute('cautionary', cautionary);
  }
});

export const grace = createNamedElementFactory<
  'grace',
  {
    slash: string;
  }
>('grace', (e, { slash }) => {
  if (slash) {
    e.setAttribute('slash', slash);
  }
});

export const duration = createNamedElementFactory<
  'duration',
  {
    positiveDivisions: number;
  }
>('duration', (e, { positiveDivisions }) => {
  if (typeof positiveDivisions === 'number') {
    e.setTextContent(positiveDivisions.toString());
  }
});

export const key = createNamedElementFactory<
  'key',
  {
    fifths: NamedElement<'fifths'>;
    mode: NamedElement<'mode'>;
  }
>('key', (e, { fifths, mode }) => {
  if (fifths) {
    e.append(fifths);
  }
  if (mode) {
    e.append(mode);
  }
});

export const fifths = createNamedElementFactory<
  'fifths',
  {
    value: string;
  }
>('fifths', (e, { value }) => {
  if (value) {
    e.setTextContent(value);
  }
});

export const mode = createNamedElementFactory<'mode', { value: string }>('mode', (e, { value }) => {
  if (value) {
    e.setTextContent(value);
  }
});

export const time = createNamedElementFactory<
  'time',
  {
    staveNumber: number;
    symbol: string;
    senzaMisura: NamedElement<'senza-misura'>;
    times: Array<{
      beats?: NamedElement<'beats'>;
      beatType?: NamedElement<'beat-type'>;
    }>;
  }
>('time', (e, { staveNumber, symbol, times, senzaMisura }) => {
  if (typeof staveNumber === 'number') {
    e.setAttribute('number', staveNumber.toString());
  }
  if (symbol) {
    e.setAttribute('symbol', symbol);
  }
  if (times) {
    for (const { beats, beatType } of times) {
      if (beats) {
        e.append(beats);
      }
      if (beatType) {
        e.append(beatType);
      }
    }
  }
  if (senzaMisura) {
    e.append(senzaMisura);
  }
});

export const senzaMisura = createNamedElementFactory<'senza-misura', { content: string }>(
  'senza-misura',
  (e, { content }) => {
    if (content) {
      e.setTextContent(content);
    }
  }
);

export const clef = createNamedElementFactory<
  'clef',
  {
    number: number;
    sign: NamedElement<'sign'>;
    line: NamedElement<'line'>;
    clefOctaveChange: NamedElement<'clef-octave-change'>;
  }
>('clef', (e, { number, sign, line, clefOctaveChange }) => {
  if (typeof number === 'number') {
    e.setAttribute('number', number.toString());
  }
  if (sign) {
    e.append(sign);
  }
  if (line) {
    e.append(line);
  }
  if (clefOctaveChange) {
    e.append(clefOctaveChange);
  }
});

export const coda = createNamedElementFactory<'coda', Record<never, never>>('coda', (_, __) => {
  // noop
});

export const segno = createNamedElementFactory<'segno', Record<never, never>>('segno', (_, __) => {
  // noop
});

export const sign = createNamedElementFactory<
  'sign',
  {
    value: string;
  }
>('sign', (e, { value }) => {
  if (value) {
    e.setTextContent(value);
  }
});

export const line = createNamedElementFactory<
  'line',
  {
    value: number;
  }
>('line', (e, { value }) => {
  if (typeof value === 'number') {
    e.setTextContent(value.toString());
  }
});

export const clefOctaveChange = createNamedElementFactory<
  'clef-octave-change',
  {
    value: number;
  }
>('clef-octave-change', (e, { value }) => {
  if (typeof value === 'number') {
    e.setTextContent(value.toString());
  }
});

export const beats = createNamedElementFactory<
  'beats',
  {
    value: string;
  }
>('beats', (e, { value }) => {
  if (value) {
    e.setTextContent(value);
  }
});

export const beatType = createNamedElementFactory<
  'beat-type',
  {
    value: string;
  }
>('beat-type', (e, { value }) => {
  if (value) {
    e.setTextContent(value);
  }
});

export const lyric = createNamedElementFactory<
  'lyric',
  {
    number: number;
    components: Array<NamedElement<'syllabic'> | NamedElement<'text'> | NamedElement<'elision'>>;
  }
>('lyric', (e, { number, components }) => {
  if (typeof number === 'number') {
    e.setAttribute('number', number.toString());
  }
  if (components) {
    e.append(...components);
  }
});

export const syllabic = createNamedElementFactory<
  'syllabic',
  {
    value: string;
  }
>('syllabic', (e, { value }) => {
  if (value) {
    e.setTextContent(value);
  }
});

export const text = createNamedElementFactory<
  'text',
  {
    value: string;
  }
>('text', (e, { value }) => {
  if (value) {
    e.setTextContent(value);
  }
});

export const elision = createNamedElementFactory<'elision', { value: string }>('elision', (e, { value }) => {
  if (value) {
    e.setTextContent(value);
  }
});

export const notations = createNamedElementFactory<
  'notations',
  {
    arpeggiate: NamedElement<'arpeggiate'>;
  }
>('notations', (e, { arpeggiate }) => {
  if (arpeggiate) {
    e.append(arpeggiate);
  }
});

export const arpeggiate = createNamedElementFactory<
  'arpeggiate',
  {
    direction: string;
  }
>('arpeggiate', (e, { direction }) => {
  if (direction) {
    e.setAttribute('direction', direction);
  }
});

export const voice = createNamedElementFactory<
  'voice',
  {
    value: string;
  }
>('voice', (e, { value }) => {
  if (value) {
    e.setTextContent(value);
  }
});

export const staff = createNamedElementFactory<
  'staff',
  {
    number: number;
  }
>('staff', (e, { number }) => {
  if (typeof number === 'number') {
    e.setTextContent(number.toString());
  }
});

export const notehead = createNamedElementFactory<
  'notehead',
  {
    value: string;
  }
>('notehead', (e, { value }) => {
  if (value) {
    e.setTextContent(value);
  }
});

export const chord = createNamedElementFactory<'chord', Record<never, never>>('chord', (_, __) => {
  // noop
});

export const beam = createNamedElementFactory<'beam', { number: number; beamValue: string }>(
  'beam',
  (e, { number, beamValue }) => {
    if (typeof number === 'number') {
      e.setAttribute('number', number.toString());
    }
    if (typeof beamValue === 'string') {
      e.setTextContent(beamValue);
    }
  }
);

export const staffDetails = createNamedElementFactory<
  'staff-details',
  { number: number; staffType: NamedElement<'staff-type'>; staffLines: NamedElement<'staff-lines'> }
>('staff-details', (e, { number, staffType, staffLines }) => {
  if (typeof number === 'number') {
    e.setAttribute('number', number.toString());
  }
  if (staffType) {
    e.append(staffType);
  }
  if (staffLines) {
    e.append(staffLines);
  }
});

export const measureStyle = createNamedElementFactory<
  'measure-style',
  { staffNumber: number; multipleRest: NamedElement<'multiple-rest'> }
>('measure-style', (e, { staffNumber, multipleRest }) => {
  if (typeof staffNumber === 'number') {
    e.setAttribute('number', staffNumber.toString());
  }
  if (multipleRest) {
    e.append(multipleRest);
  }
});

export const multipleRest = createNamedElementFactory<'multiple-rest', { multipleRestCount: number }>(
  'multiple-rest',
  (e, { multipleRestCount }) => {
    if (typeof multipleRestCount === 'number') {
      e.setTextContent(multipleRestCount.toString());
    }
  }
);

export const staffLines = createNamedElementFactory<'staff-lines', { value: number }>('staff-lines', (e, { value }) => {
  if (typeof value === 'number') {
    e.setTextContent(value.toString());
  }
});

export const staffType = createNamedElementFactory<'staff-type', { value: string }>('staff-type', (e, { value }) => {
  if (typeof value === 'string') {
    e.setTextContent(value);
  }
});
