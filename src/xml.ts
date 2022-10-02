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

export const note: CreateNode<'note', Record<string, never>> = () => {
  const note = createElement('note');
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
