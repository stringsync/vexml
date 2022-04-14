import { Cursor } from './cursor';
import {
  AttributesMessage,
  EasyScoreMessage,
  EasyScoreMessageReceiver,
  MeasureStartMessage,
  NoteMessage,
} from './types';

export class Producer {
  static feed(musicXml: string): Producer {
    return new Producer(musicXml);
  }

  private musicXml: string;
  private lastNoteMessage?: NoteMessage;

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
        {
          const message: MeasureStartMessage = { msgType: 'measureStart' };
          const width = nodeElem.getAttribute('width');
          if (width) message.width = parseInt(width);
          const staves = nodeElem.getElementsByTagName('staves').item(0)?.textContent;
          if (staves) message.staves = parseInt(staves);
          this.lastNoteMessage = undefined;
          messages.push(message);
          messages.push(...Array.from(node.childNodes).flatMap(this.getMessages.bind(this)));
          messages.push({ msgType: 'voiceEnd', voice: this.lastNoteMessage!.voice });
          messages.push({ msgType: 'measureEnd' });
        }
        break;
      case 'attributes':
        {
          const message: AttributesMessage = { msgType: 'attributes', clefs: new Map() };
          const clefElems = nodeElem.getElementsByTagName('clef');
          for (let i = 0; i < clefElems.length; i++) {
            const number = parseInt(clefElems.item(i)!.getAttribute('number') ?? '1');
            const sign = clefElems.item(i)!.getElementsByTagName('sign').item(0)?.textContent;
            if (sign) message.clefs.set(number, sign);
          }
          const fifths = nodeElem.getElementsByTagName('fifth').item(0)?.textContent;
          if (fifths) message.key = parseInt(fifths);
          const beats = nodeElem.getElementsByTagName('beats').item(0)?.textContent;
          const beatType = nodeElem.getElementsByTagName('beat-type').item(0)?.textContent;
          if (beats && beatType) message.time = `${beats}/${beatType}`;
          messages.push(message);
        }
        break;
      case 'note':
        const rest = nodeElem.getElementsByTagName('rest').length > 0;
        const grace = nodeElem.getElementsByTagName('grace').length > 0;
        const step = nodeElem.getElementsByTagName('step').item(0)?.textContent ?? '';
        const octave = nodeElem.getElementsByTagName('octave').item(0)?.textContent ?? '';
        const stem = nodeElem.getElementsByTagName('stem').item(0)?.textContent ?? '';
        const dots = nodeElem.getElementsByTagName('dot').length;
        const accidental = nodeElem.getElementsByTagName('accidental').item(0)?.textContent ?? '';
        const duration = nodeElem.getElementsByTagName('duration').item(0)?.textContent;
        const type = nodeElem.getElementsByTagName('type').item(0)?.textContent ?? 'whole';
        const voice = nodeElem.getElementsByTagName('voice').item(0)?.textContent ?? '1';
        const staff = nodeElem.getElementsByTagName('staff').item(0)?.textContent ?? '1';
        const chord = nodeElem.getElementsByTagName('chord').length > 0;
        if (this.lastNoteMessage && this.lastNoteMessage.voice !== voice) {
          messages.push({ msgType: 'voiceEnd', voice: this.lastNoteMessage.voice });
        }
        if (chord && this.lastNoteMessage) {
          this.lastNoteMessage.head.push({ pitch: `${step}/${octave}`, accidental: `${accidental}` });
          // chords need to be sorted.
          this.lastNoteMessage.head.sort((a, b) =>
            a.pitch
              .replace(/A/, 'H')
              .replace(/B/, 'I')
              .split('')
              .reverse()
              .join('')
              .localeCompare(b.pitch.replace(/A/, 'H').replace(/B/, 'I').split('').reverse().join(''))
          );
        } else {
          this.lastNoteMessage = {
            msgType: 'note',
            stem,
            dots,
            head: rest ? [] : [{ pitch: `${step}/${octave}`, accidental: `${accidental}` }],
            duration: duration ? parseInt(duration) : undefined,
            grace,
            type,
            voice,
            staff: parseInt(staff),
          };
          messages.push(this.lastNoteMessage);
        }
        // only the beam number 1 is processed, vexflow calculated the number of bars
        const beam = '' + nodeElem.getElementsByTagName('beam').item(0)?.textContent;
        if (beam === 'begin') messages.push({ msgType: 'beamStart' });
        if (beam === 'end') messages.push({ msgType: 'beamEnd' });
        break;
      default:
      // console.log(`unprocessed node, got:`, node);
    }
    return messages;
  }
}
