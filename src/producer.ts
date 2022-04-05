import { Cursor } from './cursor';
import { EasyScoreMessage, EasyScoreMessageReceiver } from './types';

export class Producer {
  static feed(musicXml: string): Producer {
    return new Producer(musicXml);
  }

  private musicXml: string;

  private constructor(musicXml: string) {
    this.musicXml = musicXml;
  }

  message(receiver: EasyScoreMessageReceiver): void {
    const cursor = Cursor.fromMusicXml(this.musicXml);
    while (cursor.hasNext()) {
      const node = cursor.next();
      const messages: EasyScoreMessage[] = [];
      messages.push(...this.getMessages(node));
      for (const message of messages) {
        receiver.onMessage(message);
      }
    }
  }

  private getMessages(node: Node): EasyScoreMessage[] {
    const messages: EasyScoreMessage[] = [];
    const nodeElem = node as Element;
    switch (node.nodeName) {
      case 'measure':
        const width = nodeElem.getAttribute('width') ?? '';
        const staves = nodeElem.getElementsByTagName('staves').item(0)?.textContent ?? '1';
        const sign: string[] = [];
        for (let i = 0; i < parseInt(staves); i++) {
          sign.push(nodeElem.getElementsByTagName('sign').item(i)?.textContent ?? '');
        }
        const beats = nodeElem.getElementsByTagName('beats').item(0)?.textContent ?? '';
        const beatType = nodeElem.getElementsByTagName('beat-type').item(0)?.textContent ?? '';
        messages.push({ msgType: 'measureStart', width, staves, clef: sign, time: `${beats}/${beatType}` });
        messages.push(...Array.from(node.childNodes).flatMap(this.getMessages));
        messages.push({ msgType: 'measureEnd' });
        break;
      case 'attributes':
        // Nothing to do processed in measure
        break;
      case 'note':
        const rest = nodeElem.getElementsByTagName('rest').item(0) ? true : false;
        const step = nodeElem.getElementsByTagName('step').item(0)?.textContent ?? '';
        const octave = nodeElem.getElementsByTagName('octave').item(0)?.textContent ?? '';
        const stem = nodeElem.getElementsByTagName('stem').item(0)?.textContent ?? '';
        const accidental = nodeElem.getElementsByTagName('accidental').item(0)?.textContent ?? '';
        const duration = nodeElem.getElementsByTagName('duration').item(0)?.textContent ?? '';
        const type = nodeElem.getElementsByTagName('type').item(0)?.textContent ?? '';
        const voice = nodeElem.getElementsByTagName('voice').item(0)?.textContent ?? '1';
        const staff = nodeElem.getElementsByTagName('staff').item(0)?.textContent ?? '1';
        messages.push({
          msgType: 'note',
          rest,
          stem,
          pitch: `${step}${octave}`,
          duration,
          type,
          accidental,
          voice,
          staff,
        });
        const beam = '' + nodeElem.getElementsByTagName('beam').item(0)?.textContent;
        if (beam === 'begin') messages.push({ msgType: 'beamStart' });
        if (beam === 'end') messages.push({ msgType: 'beamEnd' });
        break;
      default:
        console.log(`unprocessed node, got:`, node);
    }
    return messages;
  }
}
