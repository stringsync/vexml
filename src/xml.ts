import { NamedNode } from './namednode';

// helpers
const xml = document.implementation.createDocument(null, null);
const node = (namedNode: NamedNode<string>): Node => namedNode.node;

// creators
type CreateNode<T extends string, A extends Record<any, any>> = (args?: Partial<A>) => NamedNode<T>;

export const part: CreateNode<'part', { id: string; measures: NamedNode<'measure'>[] }> = (args) => {
  const id = args?.id;
  const measures = args?.measures;

  const part = xml.createElement('part');

  if (id) {
    part.setAttribute('id', id);
  }
  if (measures) {
    part.append(...measures.map(node));
  }

  return NamedNode.of(part);
};

export const measure: CreateNode<'measure', { width: number; staves: NamedNode<'staves'> }> = (args) => {
  const width = args?.width;
  const staves = args?.staves;

  const measure = xml.createElement('measure');

  if (staves) {
    measure.append(staves.node);
  }
  if (typeof width === 'number') {
    measure.setAttribute('width', width.toString());
  }

  return NamedNode.of(measure);
};

export const staves: CreateNode<'staves', { numStaves: number }> = (args) => {
  const numStaves = args?.numStaves;

  const staves = xml.createElement('staves');

  if (typeof numStaves === 'number') {
    staves.textContent = numStaves.toString();
  }

  return NamedNode.of(staves);
};
