import { NamedNode } from './namednode';

// helpers
const xml = document.implementation.createDocument(null, null);
const node = (namedNode: NamedNode<string>): Node => namedNode.node;

// creators
type CreateNode<T extends string, A extends Record<any, any>> = (args?: Partial<A>) => NamedNode<T>;

export const createElement = xml.createElement.bind(xml);

export const scorePartwise: CreateNode<'score-partwise', { parts: NamedNode<'part'>[] }> = ({ parts } = {}) => {
  const scorePartwise = createElement('score-partwise');

  if (parts) {
    scorePartwise.append(...parts.map(node));
  }

  return NamedNode.of(scorePartwise);
};

export const part: CreateNode<'part', { id: string; measures: NamedNode<'measure'>[] }> = ({ id, measures } = {}) => {
  const part = createElement('part');

  if (id) {
    part.setAttribute('id', id);
  }
  if (measures) {
    part.append(...measures.map(node));
  }

  return NamedNode.of(part);
};

export const measure: CreateNode<
  'measure',
  {
    width: number;
    notes: NamedNode<'note'>[];
    attributes: NamedNode<'attributes'>[];
    barlines: NamedNode<'barlines'>[];
  }
> = ({ width, notes, attributes, barlines } = {}) => {
  const measure = createElement('measure');

  if (notes) {
    measure.append(...notes.map(node));
  }
  if (attributes) {
    measure.append(...attributes.map(node));
  }
  if (barlines) {
    measure.append(...barlines.map(node));
  }
  if (typeof width === 'number') {
    measure.setAttribute('width', width.toString());
  }

  return NamedNode.of(measure);
};

export const note: CreateNode<
  'note',
  {
    stem: NamedNode<'stem'>;
    dots: NamedNode<'dot'>[];
    rest: NamedNode<'rest'>;
    pitch: NamedNode<'pitch'>;
    accidental: NamedNode<'accidental'>;
    notehead: NamedNode<'notehead'>;
  }
> = ({ stem, dots, rest, pitch, accidental, notehead } = {}) => {
  const note = createElement('note');

  if (pitch) {
    note.appendChild(pitch.node);
  }
  if (rest) {
    note.appendChild(rest.node);
  }
  if (dots) {
    for (const dot of dots) {
      note.appendChild(dot.node);
    }
  }
  if (accidental) {
    note.appendChild(accidental.node);
  }
  if (stem) {
    note.appendChild(stem.node);
  }
  if (notehead) {
    note.appendChild(notehead.node);
  }

  return NamedNode.of(note);
};

export const attributes: CreateNode<'attributes', { staves: NamedNode<'staves'> }> = ({ staves } = {}) => {
  const attributes = createElement('attributes');

  if (staves) {
    attributes.append(staves.node);
  }

  return NamedNode.of(attributes);
};

export const barline: CreateNode<
  'barline',
  { location: string; barStyle: NamedNode<'bar-style'>; repeat: NamedNode<'repeat'>; ending: NamedNode<'ending'> }
> = ({ location, barStyle, repeat, ending } = {}) => {
  const barline = createElement('barline');

  if (location) {
    barline.setAttribute('location', location);
  }
  if (barStyle) {
    barline.append(barStyle.node);
  }
  if (repeat) {
    barline.append(repeat.node);
  }
  if (ending) {
    barline.append(ending.node);
  }

  return NamedNode.of(barline);
};

export const staves: CreateNode<'staves', { numStaves: number }> = ({ numStaves } = {}) => {
  const staves = createElement('staves');

  if (typeof numStaves === 'number') {
    staves.textContent = numStaves.toString();
  }

  return NamedNode.of(staves);
};

export const barStyle: CreateNode<'bar-style', { textContent: string }> = ({ textContent } = {}) => {
  const barStyle = createElement('bar-style');

  if (textContent) {
    barStyle.textContent = textContent;
  }

  return NamedNode.of(barStyle);
};

export const repeat: CreateNode<'repeat', { direction: string }> = ({ direction } = {}) => {
  const repeat = createElement('repeat');

  if (direction) {
    repeat.setAttribute('direction', direction);
  }

  return NamedNode.of(repeat);
};

export const ending: CreateNode<'ending', { number: string; type: string; textContent: string }> = ({
  number,
  type,
  textContent,
} = {}) => {
  const ending = createElement('ending');

  if (number) {
    ending.setAttribute('number', number);
  }
  if (type) {
    ending.setAttribute('type', type);
  }
  if (textContent) {
    ending.textContent = textContent;
  }

  return NamedNode.of(ending);
};

export const stem: CreateNode<'stem', { textContent: string }> = ({ textContent } = {}) => {
  const stem = createElement('stem');

  if (textContent) {
    stem.textContent = textContent;
  }

  return NamedNode.of(stem);
};

export const dot: CreateNode<'dot', Record<never, never>> = () => {
  const dot = createElement('dot');
  return NamedNode.of(dot);
};

export const rest: CreateNode<
  'rest',
  { displayStep: NamedNode<'display-step'>; displayOctave: NamedNode<'display-octave'> }
> = ({ displayStep, displayOctave } = {}) => {
  const rest = createElement('rest');

  if (displayStep) {
    rest.appendChild(displayStep.node);
  }
  if (displayOctave) {
    rest.appendChild(displayOctave.node);
  }

  return NamedNode.of(rest);
};

export const displayStep: CreateNode<'display-step', { step: string }> = ({ step } = {}) => {
  const displayStep = createElement('display-step');

  if (step) {
    displayStep.textContent = step;
  }

  return NamedNode.of(displayStep);
};

export const displayOctave: CreateNode<'display-octave', { octave: string }> = ({ octave } = {}) => {
  const displayOctave = createElement('display-octave');

  if (octave) {
    displayOctave.textContent = octave;
  }

  return NamedNode.of(displayOctave);
};

export const pitch: CreateNode<'pitch', { step: NamedNode<'step'>; octave: NamedNode<'octave'> }> = ({
  step,
  octave,
} = {}) => {
  const pitch = createElement('pitch');

  if (step) {
    pitch.appendChild(step.node);
  }
  if (octave) {
    pitch.appendChild(octave.node);
  }

  return NamedNode.of(pitch);
};

export const step: CreateNode<'step', { step: string }> = ({ step } = {}) => {
  const node = createElement('step');

  if (step) {
    node.textContent = step;
  }

  return NamedNode.of(node);
};

export const octave: CreateNode<'octave', { octave: string }> = ({ octave } = {}) => {
  const node = createElement('octave');

  if (octave) {
    node.textContent = octave;
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
