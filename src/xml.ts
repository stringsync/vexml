import { NamedElement } from './namedelement';

type CreateNode<T extends string, A extends Record<any, any>> = (args?: Partial<A>) => NamedElement<T>;

const getNode = (namedNode: NamedElement<string>): Node => namedNode.native();

export const createDocument = (): Document => document.implementation.createDocument(null, null);

export const createElement = (tagName: string, options?: ElementCreationOptions): Element => {
  return createDocument().createElement(tagName, options);
};

export const scorePartwise: CreateNode<
  'score-partwise',
  {
    parts: NamedElement<'part'>[];
    partList: NamedElement<'part-list'>;
  }
> = ({ parts, partList } = {}) => {
  const node = createElement('score-partwise');

  if (parts) {
    node.append(...parts.map(getNode));
  }
  if (partList) {
    node.append(partList.native());
  }

  return NamedElement.of(node);
};

export const partList: CreateNode<'part-list', { scoreParts: NamedElement<'score-part'>[] }> = ({
  scoreParts,
} = {}) => {
  const node = createElement('part-list');

  if (scoreParts) {
    node.append(...scoreParts.map(getNode));
  }

  return NamedElement.of(node);
};

export const scorePart: CreateNode<
  'score-part',
  {
    id: string;
    partName: NamedElement<'part-name'>;
  }
> = ({ id, partName } = {}) => {
  const node = createElement('score-part');

  if (id) {
    node.setAttribute('id', id);
  }
  if (partName) {
    node.append(partName.native());
  }

  return NamedElement.of(node);
};

export const partName: CreateNode<'part-name', { textContent: string }> = ({ textContent } = {}) => {
  const node = createElement('part-name');

  if (textContent) {
    node.textContent = textContent;
  }

  return NamedElement.of(node);
};

export const part: CreateNode<'part', { id: string; measures: NamedElement<'measure'>[] }> = ({
  id,
  measures,
} = {}) => {
  const node = createElement('part');

  if (id) {
    node.setAttribute('id', id);
  }
  if (measures) {
    node.append(...measures.map(getNode));
  }

  return NamedElement.of(node);
};

export const measure: CreateNode<
  'measure',
  {
    width: number;
    number: string;
    notes: NamedElement<'note'>[];
    attributes: NamedElement<'attributes'>[];
    barlines: NamedElement<'barline'>[];
    prints: NamedElement<'print'>[];
  }
> = ({ width, number, notes, attributes, barlines, prints } = {}) => {
  const node = createElement('measure');

  if (notes) {
    node.append(...notes.map(getNode));
  }
  if (attributes) {
    node.append(...attributes.map(getNode));
  }
  if (barlines) {
    node.append(...barlines.map(getNode));
  }
  if (prints) {
    node.append(...prints.map(getNode));
  }
  if (typeof width === 'number') {
    node.setAttribute('width', width.toString());
  }
  if (typeof number === 'string') {
    node.setAttribute('number', number);
  }

  return NamedElement.of(node);
};

export const note: CreateNode<
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
    chord: NamedElement<'chord'>;
  }
> = ({ type, grace, stem, dots, rest, pitch, accidental, notehead, duration, notations, voice, staff, chord } = {}) => {
  const node = createElement('note');

  if (grace) {
    node.append(grace.native());
  }
  if (chord) {
    node.append(chord.native());
  }
  if (pitch) {
    node.append(pitch.native());
  }
  if (rest) {
    node.append(rest.native());
  }
  if (duration) {
    node.append(duration.native());
  }
  if (voice) {
    node.append(voice.native());
  }
  if (type) {
    node.append(type.native());
  }
  if (dots) {
    node.append(...dots.map(getNode));
  }
  if (accidental) {
    node.append(accidental.native());
  }
  if (stem) {
    node.append(stem.native());
  }
  if (notehead) {
    node.append(notehead.native());
  }
  if (staff) {
    node.append(staff.native());
  }
  if (notations) {
    node.append(...notations.map(getNode));
  }

  return NamedElement.of(node);
};

export const type: CreateNode<'type', { textContent: string }> = ({ textContent } = {}) => {
  const node = createElement('type');

  if (textContent) {
    node.textContent = textContent;
  }

  return NamedElement.of(node);
};

export const attributes: CreateNode<
  'attributes',
  {
    staves: NamedElement<'staves'>;
    clefs: NamedElement<'clef'>[];
    times: NamedElement<'time'>[];
    keys: NamedElement<'key'>[];
  }
> = ({ staves, clefs, times, keys } = {}) => {
  const node = createElement('attributes');

  if (keys) {
    node.append(...keys.map(getNode));
  }
  if (times) {
    node.append(...times.map(getNode));
  }
  if (clefs) {
    node.append(...clefs.map(getNode));
  }
  if (staves) {
    node.append(staves.native());
  }

  return NamedElement.of(node);
};

export const print: CreateNode<
  'print',
  {
    newSystem: boolean;
    newPage: boolean;
    systemLayout: NamedElement<'system-layout'>;
    staffLayouts: NamedElement<'staff-layout'>[];
  }
> = ({ newSystem, newPage, systemLayout, staffLayouts } = {}) => {
  const node = createElement('print');

  if (typeof newSystem === 'boolean') {
    node.setAttribute('new-system', newSystem ? 'yes' : 'no');
  }
  if (typeof newPage === 'boolean') {
    node.setAttribute('new-page', newPage ? 'yes' : 'no');
  }
  if (staffLayouts) {
    node.append(...staffLayouts.map(getNode));
  }
  if (systemLayout) {
    node.append(systemLayout.native());
  }

  return NamedElement.of(node);
};

export const staffLayout: CreateNode<
  'staff-layout',
  {
    number: number;
    staffDistance: NamedElement<'staff-distance'>;
  }
> = ({ number, staffDistance } = {}) => {
  const node = createElement('staff-layout');

  if (typeof number === 'number') {
    node.setAttribute('number', number.toString());
  }
  if (staffDistance) {
    node.append(staffDistance.native());
  }

  return NamedElement.of(node);
};

export const staffDistance: CreateNode<'staff-distance', { textContent: string }> = ({ textContent } = {}) => {
  const node = createElement('staff-distance');

  if (textContent) {
    node.textContent = textContent;
  }

  return NamedElement.of(node);
};

export const systemLayout: CreateNode<
  'system-layout',
  {
    systemMargins: NamedElement<'system-margins'>;
    systemDistance: NamedElement<'system-distance'>;
    topSystemDistance: NamedElement<'top-system-distance'>;
    systemDividers: NamedElement<'system-dividers'>;
  }
> = ({ systemMargins, systemDistance, topSystemDistance, systemDividers } = {}) => {
  const node = createElement('system-layout');

  if (systemMargins) {
    node.append(systemMargins.native());
  }
  if (systemDistance) {
    node.append(systemDistance.native());
  }
  if (topSystemDistance) {
    node.append(topSystemDistance.native());
  }
  if (systemDividers) {
    node.append(systemDividers.native());
  }

  return NamedElement.of(node);
};

export const systemMargins: CreateNode<
  'system-margins',
  { leftMargin: NamedElement<'left-margin'>; rightMargin: NamedElement<'right-margin'> }
> = ({ leftMargin, rightMargin } = {}) => {
  const node = createElement('system-margins');

  if (leftMargin) {
    node.append(leftMargin.native());
  }
  if (rightMargin) {
    node.append(rightMargin.native());
  }

  return NamedElement.of(node);
};

export const leftMargin: CreateNode<'left-margin', { tenths: number }> = ({ tenths } = {}) => {
  const node = createElement('left-margin');

  if (typeof tenths === 'number') {
    node.textContent = tenths.toString();
  }

  return NamedElement.of(node);
};

export const rightMargin: CreateNode<'right-margin', { tenths: number }> = ({ tenths } = {}) => {
  const node = createElement('right-margin');

  if (typeof tenths === 'number') {
    node.textContent = tenths.toString();
  }

  return NamedElement.of(node);
};

export const systemDistance: CreateNode<'system-distance', { tenths: number }> = ({ tenths } = {}) => {
  const node = createElement('system-distance');

  if (typeof tenths === 'number') {
    node.textContent = tenths.toString();
  }

  return NamedElement.of(node);
};

export const topSystemDistance: CreateNode<'top-system-distance', { tenths: number }> = ({ tenths } = {}) => {
  const node = createElement('top-system-distance');

  if (typeof tenths === 'number') {
    node.textContent = tenths.toString();
  }

  return NamedElement.of(node);
};

export const direction: CreateNode<
  'direction',
  {
    codas: NamedElement<'coda'>[];
    segnos: NamedElement<'segno'>[];
  }
> = ({ codas, segnos } = {}) => {
  const node = createElement('direction');

  if (codas) {
    node.append(...codas.map(getNode));
  }
  if (segnos) {
    node.append(...segnos.map(getNode));
  }

  return NamedElement.of(node);
};

export const barline: CreateNode<
  'barline',
  {
    location: string;
    barStyle: NamedElement<'bar-style'>;
    repeat: NamedElement<'repeat'>;
    ending: NamedElement<'ending'>;
  }
> = ({ location, barStyle, repeat, ending } = {}) => {
  const node = createElement('barline');

  if (location) {
    node.setAttribute('location', location);
  }
  if (barStyle) {
    node.append(barStyle.native());
  }
  if (repeat) {
    node.append(repeat.native());
  }
  if (ending) {
    node.append(ending.native());
  }

  return NamedElement.of(node);
};

export const staves: CreateNode<'staves', { staveCount: number }> = ({ staveCount } = {}) => {
  const node = createElement('staves');

  if (typeof staveCount === 'number') {
    node.textContent = staveCount.toString();
  }

  return NamedElement.of(node);
};

export const barStyle: CreateNode<'bar-style', { value: string }> = ({ value } = {}) => {
  const node = createElement('bar-style');

  if (value) {
    node.textContent = value;
  }

  return NamedElement.of(node);
};

export const repeat: CreateNode<'repeat', { direction: string }> = ({ direction } = {}) => {
  const node = createElement('repeat');

  if (direction) {
    node.setAttribute('direction', direction);
  }

  return NamedElement.of(node);
};

export const ending: CreateNode<'ending', { number: string; type: string; textContent: string }> = ({
  number,
  type,
  textContent,
} = {}) => {
  const node = createElement('ending');

  if (number) {
    node.setAttribute('number', number);
  }
  if (type) {
    node.setAttribute('type', type);
  }
  if (textContent) {
    node.textContent = textContent;
  }

  return NamedElement.of(node);
};

export const stem: CreateNode<'stem', { textContent: string }> = ({ textContent } = {}) => {
  const node = createElement('stem');

  if (textContent) {
    node.textContent = textContent;
  }

  return NamedElement.of(node);
};

export const dot: CreateNode<'dot', Record<never, never>> = () => {
  const node = createElement('dot');
  return NamedElement.of(node);
};

export const rest: CreateNode<
  'rest',
  { displayStep: NamedElement<'display-step'>; displayOctave: NamedElement<'display-octave'> }
> = ({ displayStep, displayOctave } = {}) => {
  const node = createElement('rest');

  if (displayStep) {
    node.append(displayStep.native());
  }
  if (displayOctave) {
    node.append(displayOctave.native());
  }

  return NamedElement.of(node);
};

export const displayStep: CreateNode<'display-step', { step: string }> = ({ step } = {}) => {
  const node = createElement('display-step');

  if (step) {
    node.textContent = step;
  }

  return NamedElement.of(node);
};

export const displayOctave: CreateNode<'display-octave', { octave: string }> = ({ octave } = {}) => {
  const node = createElement('display-octave');

  if (octave) {
    node.textContent = octave;
  }

  return NamedElement.of(node);
};

export const pitch: CreateNode<'pitch', { step: NamedElement<'step'>; octave: NamedElement<'octave'> }> = ({
  step,
  octave,
} = {}) => {
  const node = createElement('pitch');

  if (step) {
    node.append(step.native());
  }
  if (octave) {
    node.append(octave.native());
  }

  return NamedElement.of(node);
};

export const step: CreateNode<'step', { textContent: string }> = ({ textContent } = {}) => {
  const node = createElement('step');

  if (textContent) {
    node.textContent = textContent;
  }

  return NamedElement.of(node);
};

export const octave: CreateNode<'octave', { textContent: string }> = ({ textContent } = {}) => {
  const node = createElement('octave');

  if (textContent) {
    node.textContent = textContent;
  }

  return NamedElement.of(node);
};

export const accidental: CreateNode<'accidental', { value: string; cautionary: string }> = ({
  value,
  cautionary,
} = {}) => {
  const node = createElement('accidental');

  if (value) {
    node.textContent = value;
  }
  if (cautionary) {
    node.setAttribute('cautionary', cautionary);
  }

  return NamedElement.of(node);
};

export const grace: CreateNode<'grace', { slash: string }> = ({ slash } = {}) => {
  const node = createElement('grace');

  if (slash) {
    node.setAttribute('slash', slash);
  }

  return NamedElement.of(node);
};

export const duration: CreateNode<'duration', { positiveDivisions: number }> = ({ positiveDivisions } = {}) => {
  const node = createElement('duration');

  if (positiveDivisions) {
    node.textContent = positiveDivisions.toString();
  }

  return NamedElement.of(node);
};

export const key: CreateNode<'key', { fifths: NamedElement<'fifths'> }> = ({ fifths } = {}) => {
  const node = createElement('key');

  if (fifths) {
    node.append(fifths.native());
  }

  return NamedElement.of(node);
};

export const fifths: CreateNode<'fifths', { textContent: string }> = ({ textContent } = {}) => {
  const node = createElement('fifths');

  if (textContent) {
    node.textContent = textContent;
  }

  return NamedElement.of(node);
};

export const time: CreateNode<
  'time',
  {
    times: {
      beats?: NamedElement<'beats'>;
      beatType?: NamedElement<'beat-type'>;
    }[];
  }
> = ({ times } = {}) => {
  const node = createElement('time');

  if (times) {
    for (const { beats, beatType } of times) {
      if (beats) {
        node.append(beats.native());
      }
      if (beatType) {
        node.append(beatType.native());
      }
    }
  }

  return NamedElement.of(node);
};

export const clef: CreateNode<
  'clef',
  {
    number: number;
    sign: NamedElement<'sign'>;
    line: NamedElement<'line'>;
    clefOctaveChange: NamedElement<'clef-octave-change'>;
  }
> = ({ number, sign, line, clefOctaveChange } = {}) => {
  const node = createElement('clef');

  if (typeof number === 'number') {
    node.setAttribute('number', number.toString());
  }
  if (sign) {
    node.append(sign.native());
  }
  if (line) {
    node.append(line.native());
  }
  if (clefOctaveChange) {
    node.append(clefOctaveChange.native());
  }

  return NamedElement.of(node);
};

export const coda: CreateNode<'coda', Record<string, never>> = () => {
  const node = createElement('coda');

  return NamedElement.of(node);
};

export const segno: CreateNode<'segno', Record<string, never>> = () => {
  const node = createElement('segno');

  return NamedElement.of(node);
};

export const sign: CreateNode<'sign', { value: string }> = ({ value } = {}) => {
  const node = createElement('sign');

  if (value) {
    node.textContent = value;
  }

  return NamedElement.of(node);
};

export const line: CreateNode<'line', { value: number }> = ({ value } = {}) => {
  const node = createElement('line');

  if (typeof value === 'number') {
    node.textContent = value.toString();
  }

  return NamedElement.of(node);
};

export const clefOctaveChange: CreateNode<'clef-octave-change', { value: number }> = ({ value } = {}) => {
  const node = createElement('clef-octave-change');

  if (typeof value === 'number') {
    node.textContent = value.toString();
  }

  return NamedElement.of(node);
};

export const beats: CreateNode<'beats', { textContent: string }> = ({ textContent } = {}) => {
  const node = createElement('beats');

  if (textContent) {
    node.textContent = textContent;
  }

  return NamedElement.of(node);
};

export const beatType: CreateNode<'beat-type', { textContent: string }> = ({ textContent } = {}) => {
  const node = createElement('beat-type');

  if (textContent) {
    node.textContent = textContent;
  }

  return NamedElement.of(node);
};

export const lyric: CreateNode<'lyric', { text: NamedElement<'text'>; syllabic: NamedElement<'syllabic'> }> = ({
  syllabic,
  text,
} = {}) => {
  const node = createElement('lyric');

  if (syllabic) {
    node.append(syllabic.native());
  }
  if (text) {
    node.append(text.native());
  }

  return NamedElement.of(node);
};

export const syllabic: CreateNode<'syllabic', { syllabic: string }> = ({ syllabic } = {}) => {
  const node = createElement('syllabic');

  if (syllabic) {
    node.textContent = syllabic;
  }

  return NamedElement.of(node);
};

export const text: CreateNode<'text', { text: string }> = ({ text } = {}) => {
  const node = createElement('text');

  if (text) {
    node.textContent = text;
  }

  return NamedElement.of(node);
};

export const notations: CreateNode<'notations', { arpeggiate: NamedElement<'arpeggiate'> }> = ({ arpeggiate } = {}) => {
  const node = createElement('notations');

  if (arpeggiate) {
    node.append(arpeggiate.native());
  }

  return NamedElement.of(node);
};

export const arpeggiate: CreateNode<'arpeggiate', { direction: string }> = ({ direction } = {}) => {
  const node = createElement('arpeggiate');

  if (typeof direction === 'string') {
    node.setAttribute('direction', direction);
  }

  return NamedElement.of(node);
};

export const voice: CreateNode<'voice', { textContent: string }> = ({ textContent } = {}) => {
  const node = createElement('voice');

  if (typeof textContent === 'string') {
    node.textContent = textContent;
  }

  return NamedElement.of(node);
};

export const staff: CreateNode<'staff', { number: number }> = ({ number } = {}) => {
  const node = createElement('staff');

  if (typeof number === 'number') {
    node.textContent = number.toString();
  }

  return NamedElement.of(node);
};

export const notehead: CreateNode<'notehead', { value: string }> = ({ value } = {}) => {
  const node = createElement('notehead');

  if (typeof value === 'string') {
    node.textContent = value;
  }

  return NamedElement.of(node);
};

export const chord: CreateNode<'chord', Record<never, never>> = () => {
  const node = createElement('chord');

  return NamedElement.of(node);
};
