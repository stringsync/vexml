import { NamedNode } from './namednode';

type CreateNode<T extends string, A extends Record<any, any>> = (args?: Partial<A>) => NamedNode<T>;

const getNode = (namedNode: NamedNode<string>): Node => namedNode.node;

export const createDocument = (): Document => document.implementation.createDocument(null, null);

export const createElement = (tagName: string, options?: ElementCreationOptions): HTMLElement => {
  return createDocument().createElement(tagName, options);
};

export const scorePartwise: CreateNode<
  'score-partwise',
  {
    parts: NamedNode<'part'>[];
    partList: NamedNode<'part-list'>;
  }
> = ({ parts, partList } = {}) => {
  const node = createElement('score-partwise');

  if (parts) {
    node.append(...parts.map(getNode));
  }
  if (partList) {
    node.append(partList.node);
  }

  return NamedNode.of(node);
};

export const partList: CreateNode<'part-list', { scoreParts: NamedNode<'score-part'>[] }> = ({ scoreParts } = {}) => {
  const node = createElement('part-list');

  if (scoreParts) {
    node.append(...scoreParts.map(getNode));
  }

  return NamedNode.of(node);
};

export const scorePart: CreateNode<
  'score-part',
  {
    id: string;
    partName: NamedNode<'part-name'>;
  }
> = ({ id, partName } = {}) => {
  const node = createElement('score-part');

  if (id) {
    node.setAttribute('id', id);
  }
  if (partName) {
    node.append(partName.node);
  }

  return NamedNode.of(node);
};

export const partName: CreateNode<'part-name', { textContent: string }> = ({ textContent } = {}) => {
  const node = createElement('part-name');

  if (textContent) {
    node.textContent = textContent;
  }

  return NamedNode.of(node);
};

export const part: CreateNode<'part', { id: string; measures: NamedNode<'measure'>[] }> = ({ id, measures } = {}) => {
  const node = createElement('part');

  if (id) {
    node.setAttribute('id', id);
  }
  if (measures) {
    node.append(...measures.map(getNode));
  }

  return NamedNode.of(node);
};

export const measure: CreateNode<
  'measure',
  {
    width: number;
    number: string;
    notes: NamedNode<'note'>[];
    attributes: NamedNode<'attributes'>[];
    barlines: NamedNode<'barlines'>[];
    print: NamedNode<'print'>;
  }
> = ({ width, number, notes, attributes, barlines, print } = {}) => {
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
  if (print) {
    node.append(print.node);
  }
  if (typeof width === 'number') {
    node.setAttribute('width', width.toString());
  }
  if (typeof number === 'string') {
    node.setAttribute('number', number);
  }

  return NamedNode.of(node);
};

export const note: CreateNode<
  'note',
  {
    type: NamedNode<'type'>;
    stem: NamedNode<'stem'>;
    dots: NamedNode<'dot'>[];
    rest: NamedNode<'rest'>;
    pitch: NamedNode<'pitch'>;
    accidental: NamedNode<'accidental'>;
    notehead: NamedNode<'notehead'>;
    grace: NamedNode<'grace'>;
    duration: NamedNode<'duration'>;
    notations: NamedNode<'notations'>[];
    voice: NamedNode<'voice'>;
    staff: NamedNode<'staff'>;
  }
> = ({ type, grace, stem, dots, rest, pitch, accidental, notehead, duration, notations, voice, staff } = {}) => {
  const node = createElement('note');

  if (grace) {
    node.append(grace.node);
  }
  if (pitch) {
    node.append(pitch.node);
  }
  if (rest) {
    node.append(rest.node);
  }
  if (duration) {
    node.append(duration.node);
  }
  if (voice) {
    node.append(voice.node);
  }
  if (type) {
    node.append(type.node);
  }
  if (dots) {
    node.append(...dots.map(getNode));
  }
  if (accidental) {
    node.append(accidental.node);
  }
  if (stem) {
    node.append(stem.node);
  }
  if (notehead) {
    node.append(notehead.node);
  }
  if (staff) {
    node.append(staff.node);
  }
  if (notations) {
    node.append(...notations.map(getNode));
  }

  return NamedNode.of(node);
};

export const type: CreateNode<'type', { textContent: string }> = ({ textContent } = {}) => {
  const node = createElement('type');

  if (textContent) {
    node.textContent = textContent;
  }

  return NamedNode.of(node);
};

export const attributes: CreateNode<
  'attributes',
  {
    staves: NamedNode<'staves'>;
    clefs: NamedNode<'clef'>[];
    times: NamedNode<'time'>[];
    keys: NamedNode<'key'>[];
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
    node.append(staves.node);
  }

  return NamedNode.of(node);
};

export const print: CreateNode<
  'print',
  {
    newSystem: boolean;
    newPage: boolean;
    systemLayout: NamedNode<'system-layout'>;
    staffLayouts: NamedNode<'staff-layout'>[];
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
    node.append(systemLayout.node);
  }

  return NamedNode.of(node);
};

export const staffLayout: CreateNode<
  'staff-layout',
  {
    number: number;
    staffDistance: NamedNode<'staff-distance'>;
  }
> = ({ number, staffDistance } = {}) => {
  const node = createElement('staff-layout');

  if (typeof number === 'number') {
    node.setAttribute('number', number.toString());
  }
  if (staffDistance) {
    node.append(staffDistance.node);
  }

  return NamedNode.of(node);
};

export const staffDistance: CreateNode<'staff-distance', { textContent: string }> = ({ textContent } = {}) => {
  const node = createElement('staff-distance');

  if (textContent) {
    node.textContent = textContent;
  }

  return NamedNode.of(node);
};

export const systemLayout: CreateNode<
  'system-layout',
  {
    systemMargins: NamedNode<'system-margins'>;
    systemDistance: NamedNode<'system-distance'>;
    topSystemDistance: NamedNode<'top-system-distance'>;
    systemDividers: NamedNode<'system-dividers'>;
  }
> = ({ systemMargins, systemDistance, topSystemDistance, systemDividers } = {}) => {
  const node = createElement('system-layout');

  if (systemMargins) {
    node.append(systemMargins.node);
  }
  if (systemDistance) {
    node.append(systemDistance.node);
  }
  if (topSystemDistance) {
    node.append(topSystemDistance.node);
  }
  if (systemDividers) {
    node.append(systemDividers.node);
  }

  return NamedNode.of(node);
};

export const systemMargins: CreateNode<
  'system-margins',
  { leftMargin: NamedNode<'left-margin'>; rightMargin: NamedNode<'right-margin'> }
> = ({ leftMargin, rightMargin } = {}) => {
  const node = createElement('system-margins');

  if (leftMargin) {
    node.append(leftMargin.node);
  }
  if (rightMargin) {
    node.append(rightMargin.node);
  }

  return NamedNode.of(node);
};

export const leftMargin: CreateNode<'left-margin', { tenths: number }> = ({ tenths } = {}) => {
  const node = createElement('left-margin');

  if (typeof tenths === 'number') {
    node.textContent = tenths.toString();
  }

  return NamedNode.of(node);
};

export const rightMargin: CreateNode<'right-margin', { tenths: number }> = ({ tenths } = {}) => {
  const node = createElement('right-margin');

  if (typeof tenths === 'number') {
    node.textContent = tenths.toString();
  }

  return NamedNode.of(node);
};

export const systemDistance: CreateNode<'system-distance', { tenths: number }> = ({ tenths } = {}) => {
  const node = createElement('system-distance');

  if (typeof tenths === 'number') {
    node.textContent = tenths.toString();
  }

  return NamedNode.of(node);
};

export const topSystemDistance: CreateNode<'top-system-distance', { tenths: number }> = ({ tenths } = {}) => {
  const node = createElement('top-system-distance');

  if (typeof tenths === 'number') {
    node.textContent = tenths.toString();
  }

  return NamedNode.of(node);
};

export const direction: CreateNode<
  'direction',
  {
    codas: NamedNode<'coda'>[];
    segnos: NamedNode<'segno'>[];
  }
> = ({ codas, segnos } = {}) => {
  const node = createElement('direction');

  if (codas) {
    node.append(...codas.map(getNode));
  }
  if (segnos) {
    node.append(...segnos.map(getNode));
  }

  return NamedNode.of(node);
};

export const barline: CreateNode<
  'barline',
  { location: string; barStyle: NamedNode<'bar-style'>; repeat: NamedNode<'repeat'>; ending: NamedNode<'ending'> }
> = ({ location, barStyle, repeat, ending } = {}) => {
  const node = createElement('barline');

  if (location) {
    node.setAttribute('location', location);
  }
  if (barStyle) {
    node.append(barStyle.node);
  }
  if (repeat) {
    node.append(repeat.node);
  }
  if (ending) {
    node.append(ending.node);
  }

  return NamedNode.of(node);
};

export const staves: CreateNode<'staves', { staveCount: number }> = ({ staveCount } = {}) => {
  const node = createElement('staves');

  if (typeof staveCount === 'number') {
    node.textContent = staveCount.toString();
  }

  return NamedNode.of(node);
};

export const barStyle: CreateNode<'bar-style', { textContent: string }> = ({ textContent } = {}) => {
  const node = createElement('bar-style');

  if (textContent) {
    node.textContent = textContent;
  }

  return NamedNode.of(node);
};

export const repeat: CreateNode<'repeat', { direction: string }> = ({ direction } = {}) => {
  const node = createElement('repeat');

  if (direction) {
    node.setAttribute('direction', direction);
  }

  return NamedNode.of(node);
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

  return NamedNode.of(node);
};

export const stem: CreateNode<'stem', { textContent: string }> = ({ textContent } = {}) => {
  const node = createElement('stem');

  if (textContent) {
    node.textContent = textContent;
  }

  return NamedNode.of(node);
};

export const dot: CreateNode<'dot', Record<never, never>> = () => {
  const node = createElement('dot');
  return NamedNode.of(node);
};

export const rest: CreateNode<
  'rest',
  { displayStep: NamedNode<'display-step'>; displayOctave: NamedNode<'display-octave'> }
> = ({ displayStep, displayOctave } = {}) => {
  const node = createElement('rest');

  if (displayStep) {
    node.append(displayStep.node);
  }
  if (displayOctave) {
    node.append(displayOctave.node);
  }

  return NamedNode.of(node);
};

export const displayStep: CreateNode<'display-step', { step: string }> = ({ step } = {}) => {
  const node = createElement('display-step');

  if (step) {
    node.textContent = step;
  }

  return NamedNode.of(node);
};

export const displayOctave: CreateNode<'display-octave', { octave: string }> = ({ octave } = {}) => {
  const node = createElement('display-octave');

  if (octave) {
    node.textContent = octave;
  }

  return NamedNode.of(node);
};

export const pitch: CreateNode<'pitch', { step: NamedNode<'step'>; octave: NamedNode<'octave'> }> = ({
  step,
  octave,
} = {}) => {
  const node = createElement('pitch');

  if (step) {
    node.append(step.node);
  }
  if (octave) {
    node.append(octave.node);
  }

  return NamedNode.of(node);
};

export const step: CreateNode<'step', { textContent: string }> = ({ textContent } = {}) => {
  const node = createElement('step');

  if (textContent) {
    node.textContent = textContent;
  }

  return NamedNode.of(node);
};

export const octave: CreateNode<'octave', { textContent: string }> = ({ textContent } = {}) => {
  const node = createElement('octave');

  if (textContent) {
    node.textContent = textContent;
  }

  return NamedNode.of(node);
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

  return NamedNode.of(node);
};

export const grace: CreateNode<'grace', { slash: string }> = ({ slash } = {}) => {
  const node = createElement('grace');

  if (slash) {
    node.setAttribute('slash', slash);
  }

  return NamedNode.of(node);
};

export const duration: CreateNode<'duration', { positiveDivisions: NamedNode<'positive-divisions'> }> = ({
  positiveDivisions,
} = {}) => {
  const node = createElement('duration');

  if (positiveDivisions) {
    node.append(positiveDivisions.node);
  }

  return NamedNode.of(node);
};

export const positiveDivisions: CreateNode<'positive-divisions', { divisions: number }> = ({ divisions } = {}) => {
  const node = createElement('positive-divisions');

  if (divisions) {
    node.textContent = divisions.toString();
  }

  return NamedNode.of(node);
};

export const key: CreateNode<'key', { fifths: NamedNode<'fifths'> }> = ({ fifths } = {}) => {
  const node = createElement('key');

  if (fifths) {
    node.append(fifths.node);
  }

  return NamedNode.of(node);
};

export const fifths: CreateNode<'fifths', { textContent: string }> = ({ textContent } = {}) => {
  const node = createElement('fifths');

  if (textContent) {
    node.textContent = textContent;
  }

  return NamedNode.of(node);
};

export const time: CreateNode<
  'time',
  {
    times: {
      beats?: NamedNode<'beats'>;
      beatType?: NamedNode<'beat-type'>;
    }[];
  }
> = ({ times } = {}) => {
  const node = createElement('time');

  if (times) {
    for (const { beats, beatType } of times) {
      if (beats) {
        node.append(beats.node);
      }
      if (beatType) {
        node.append(beatType.node);
      }
    }
  }

  return NamedNode.of(node);
};

export const clef: CreateNode<
  'clef',
  { staff: number; sign: NamedNode<'sign'>; line: NamedNode<'line'>; clefOctaveChange: NamedNode<'clef-octave-change'> }
> = ({ staff, sign, line, clefOctaveChange } = {}) => {
  const node = createElement('clef');

  if (staff) {
    node.setAttribute('number', staff.toString());
  }
  if (sign) {
    node.append(sign.node);
  }
  if (line) {
    node.append(line.node);
  }
  if (clefOctaveChange) {
    node.append(clefOctaveChange.node);
  }

  return NamedNode.of(node);
};

export const coda: CreateNode<'coda', Record<string, never>> = () => {
  const node = createElement('coda');

  return NamedNode.of(node);
};

export const segno: CreateNode<'segno', Record<string, never>> = () => {
  const node = createElement('segno');

  return NamedNode.of(node);
};

export const sign: CreateNode<'sign', { sign: string }> = ({ sign } = {}) => {
  const node = createElement('sign');

  if (sign) {
    node.textContent = sign;
  }

  return NamedNode.of(node);
};

export const line: CreateNode<'line', { line: number }> = ({ line } = {}) => {
  const node = createElement('line');

  if (line) {
    node.textContent = line.toString();
  }

  return NamedNode.of(node);
};

export const clefOctaveChange: CreateNode<'clefOctaveChange', { clefOctaveChange: number }> = ({
  clefOctaveChange,
} = {}) => {
  const node = createElement('clefOctaveChange');

  if (clefOctaveChange) {
    node.textContent = clefOctaveChange.toString();
  }

  return NamedNode.of(node);
};

export const beats: CreateNode<'beats', { textContent: string }> = ({ textContent } = {}) => {
  const node = createElement('beats');

  if (textContent) {
    node.textContent = textContent;
  }

  return NamedNode.of(node);
};

export const beatType: CreateNode<'beat-type', { textContent: string }> = ({ textContent } = {}) => {
  const node = createElement('beat-type');

  if (textContent) {
    node.textContent = textContent;
  }

  return NamedNode.of(node);
};

export const lyric: CreateNode<'lyric', { text: NamedNode<'text'>; syllabic: NamedNode<'syllabic'> }> = ({
  syllabic,
  text,
} = {}) => {
  const node = createElement('lyric');

  if (syllabic) {
    node.append(syllabic.node);
  }
  if (text) {
    node.append(text.node);
  }

  return NamedNode.of(node);
};

export const syllabic: CreateNode<'syllabic', { syllabic: string }> = ({ syllabic } = {}) => {
  const node = createElement('syllabic');

  if (syllabic) {
    node.textContent = syllabic;
  }

  return NamedNode.of(node);
};

export const text: CreateNode<'text', { text: string }> = ({ text } = {}) => {
  const node = createElement('text');

  if (text) {
    node.textContent = text;
  }

  return NamedNode.of(node);
};

export const notations: CreateNode<'notations', { arpeggiate: NamedNode<'arpeggiate'> }> = ({ arpeggiate } = {}) => {
  const node = createElement('notations');

  if (arpeggiate) {
    node.append(arpeggiate.node);
  }

  return NamedNode.of(node);
};

export const arpeggiate: CreateNode<'arpeggiate', { direction: string }> = ({ direction } = {}) => {
  const node = createElement('arpeggiate');

  if (typeof direction === 'string') {
    node.setAttribute('direction', direction);
  }

  return NamedNode.of(node);
};

export const voice: CreateNode<'voice', { textContent: string }> = ({ textContent } = {}) => {
  const node = createElement('voice');

  if (typeof textContent === 'string') {
    node.textContent = textContent;
  }

  return NamedNode.of(node);
};

export const staff: CreateNode<'staff', { number: number }> = ({ number } = {}) => {
  const node = createElement('staff');

  if (typeof number === 'number') {
    node.textContent = number.toString();
  }

  return NamedNode.of(node);
};
