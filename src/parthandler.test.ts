import { NamedNode } from './namednode';
import { PartHandler } from './parthandler';
import { TestReceiver } from './testreceiver';
import { PartEndMessage, PartStartMessage } from './types';

const createPart = (opts: { id: string }): NamedNode<'part'> => {
  const parser = new DOMParser();
  const doc = parser.parseFromString(`<part id="${opts.id}"></part>`, 'application/xml');
  const parts = doc.getElementsByTagName('part');
  return NamedNode.of<'part'>(parts[0]);
};

describe('PartHandler', () => {
  let receiver: TestReceiver;

  beforeEach(() => {
    receiver = new TestReceiver();
  });

  it('sends a partStart message', () => {
    const part = createPart({ id: 'foo' });
    const handler = new PartHandler(part);

    handler.message(receiver);

    expect(receiver.messages[0]).toEqual<PartStartMessage>({
      msgType: 'partStart',
      id: 'foo',
      msgCount: 0,
      msgIndex: 0,
    });
  });

  it('sends a partEnd message', () => {
    const part = createPart({ id: 'foo' });
    const handler = new PartHandler(part);

    handler.message(receiver);

    expect(receiver.messages[1]).toEqual<PartEndMessage>({
      msgType: 'partEnd',
      id: 'foo',
      msgCount: 0,
      msgIndex: 0,
    });
  });
});
