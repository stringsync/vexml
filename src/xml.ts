import { NamedNode } from './namednode';

// helpers
const xml = document.implementation.createDocument(null, null);
const getNode = (namedNode: NamedNode<string>): Node => namedNode.node;

// creators
type CreateNode<T extends string, A extends Record<any, any>> = (args?: Partial<A>) => NamedNode<T>;

export const createElement = xml.createElement.bind(xml);

export const scorePartwise: CreateNode<'score-partwise', { parts: NamedNode<'part'>[] }> = ({ parts } = {}) => {
  const node = createElement('score-partwise');

  if (parts) {
    node.append(...parts.map(getNode));
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
    notes: NamedNode<'note'>[];
    attributes: NamedNode<'attributes'>[];
    barlines: NamedNode<'barlines'>[];
  }
> = ({ width, notes, attributes, barlines } = {}) => {
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
  if (typeof width === 'number') {
    node.setAttribute('width', width.toString());
  }

  return NamedNode.of(node);
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
  const node = createElement('note');

  if (pitch) {
    node.appendChild(pitch.node);
  }
  if (rest) {
    node.appendChild(rest.node);
  }
  if (dots) {
    for (const dot of dots) {
      node.appendChild(dot.node);
    }
  }
  if (accidental) {
    node.appendChild(accidental.node);
  }
  if (stem) {
    node.appendChild(stem.node);
  }
  if (notehead) {
    node.appendChild(notehead.node);
  }

  return NamedNode.of(node);
};

export const attributes: CreateNode<'attributes', { staves: NamedNode<'staves'> }> = ({ staves } = {}) => {
  const node = createElement('attributes');

  if (staves) {
    node.append(staves.node);
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

export const staves: CreateNode<'staves', { numStaves: number }> = ({ numStaves } = {}) => {
  const node = createElement('staves');

  if (typeof numStaves === 'number') {
    node.textContent = numStaves.toString();
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
    node.appendChild(displayStep.node);
  }
  if (displayOctave) {
    node.appendChild(displayOctave.node);
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
    node.appendChild(step.node);
  }
  if (octave) {
    node.appendChild(octave.node);
  }

  return NamedNode.of(node);
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
