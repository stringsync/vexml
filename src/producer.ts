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
          const message: AttributesMessage = { msgType: 'attributes', clefs: [] };
          const clefElems = nodeElem.getElementsByTagName('clef');
          for (let i = 0; i < clefElems.length; i++) {
            const staff = parseInt(clefElems.item(i)!.getAttribute('number') ?? '1');
            const sign = clefElems.item(i)!.getElementsByTagName('sign').item(0)?.textContent;
            const line = clefElems.item(i)!.getElementsByTagName('line').item(0)?.textContent;
            const octaveChange = clefElems.item(i)!.getElementsByTagName('clef-octave-change').item(0)?.textContent;
            if (sign)
              message.clefs.push({
                staff,
                sign,
                line: line ? parseInt(line) : undefined,
                octaveChange: octaveChange ? parseInt(octaveChange) : undefined,
              });
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
        const graceSlash = nodeElem.getElementsByTagName('grace').item(0)?.getAttribute('slash') == 'yes' ?? false;
        const step = nodeElem.getElementsByTagName('step').item(0)?.textContent ?? '';
        const octave = nodeElem.getElementsByTagName('octave').item(0)?.textContent ?? '';
        const stem = nodeElem.getElementsByTagName('stem').item(0)?.textContent ?? undefined;
        const dots = nodeElem.getElementsByTagName('dot').length;
        const accidental = nodeElem.getElementsByTagName('accidental').item(0)?.textContent ?? '';
        const accidentalCautionary =
          nodeElem.getElementsByTagName('accidental').item(0)?.getAttribute('cautionary') == 'yes' ?? false;
        const duration = nodeElem.getElementsByTagName('duration').item(0)?.textContent;
        const type = nodeElem.getElementsByTagName('type').item(0)?.textContent ?? 'whole';
        const voice = nodeElem.getElementsByTagName('voice').item(0)?.textContent ?? '1';
        const staff = nodeElem.getElementsByTagName('staff').item(0)?.textContent ?? '1';
        const chord = nodeElem.getElementsByTagName('chord').length > 0;
        if (this.lastNoteMessage && this.lastNoteMessage.voice !== voice) {
          messages.push({ msgType: 'voiceEnd', voice: this.lastNoteMessage.voice });
        }
        if (chord && this.lastNoteMessage) {
          this.lastNoteMessage.head.push({ pitch: `${step}/${octave}`, accidental, accidentalCautionary });
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
            head: rest ? [] : [{ pitch: `${step}/${octave}`, accidental, accidentalCautionary }],
            duration: duration ? parseInt(duration) : undefined,
            grace,
            graceSlash,
            type,
            voice,
            staff: parseInt(staff),
          };
          messages.push(this.lastNoteMessage);
        }
        // Notations
        const notations = nodeElem.getElementsByTagName('notations').item(0)?.childNodes;
        for (let i = 0; notations && i < notations.length; i++) {
          // Articulations
          if (notations.item(i).nodeName == 'articulations') {
            for (let j = 0; j < notations.item(i).childNodes.length; j++) {
              messages.push({ msgType: 'articulation', type: notations.item(i).childNodes.item(j).nodeName, index: i });
            }
          }
        }
        // only the beam number 1 is processed, vexflow calculated the number of bars
        const beam = nodeElem.getElementsByTagName('beam').item(0)?.textContent;
        if (beam === 'begin') messages.push({ msgType: 'beamStart' });
        if (beam === 'end') messages.push({ msgType: 'beamEnd' });
        // only the beam number 1 is processed, vexflow calculated the number of bars
        const slur = nodeElem.getElementsByTagName('slur').item(0)?.getAttribute('type');
        if (slur === 'start') messages.push({ msgType: 'slurStart' });
        if (slur === 'stop') messages.push({ msgType: 'slurEnd' });
        break;
      default:
      // console.log(`unprocessed node, got:`, node);
    }
    return messages;
  }
}
