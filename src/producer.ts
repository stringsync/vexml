import { Cursor } from './cursor';
import { AttributesMessage, MeasureStartMessage, NoteMessage, VexmlMessage, VexmlMessageReceiver } from './types';

export class Producer {
  static feed(musicXml: string): Producer {
    return new Producer(musicXml);
  }

  private musicXml: string;
  private lastNoteMessage?: NoteMessage;
  private parts: { id: string; childs: NodeListOf<ChildNode> }[] = [];
  private partsIndex: number[] = [];

  private constructor(musicXml: string) {
    this.musicXml = musicXml;
  }

  message(receiver: VexmlMessageReceiver): void {
    const cursor = Cursor.fromString(this.musicXml);
    while (cursor.hasNext()) {
      const node = cursor.next();
      const messages = this.getMessages(node);
      for (const message of messages) {
        receiver.onMessage(message);
      }
    }
    while (this.partsIndex[0] < this.parts[0].childs.length) {
      const messages: VexmlMessage[] = [];
      for (let i = 0; i < this.parts.length; i++) {
        messages.push({ msgType: 'partStart', msgIndex: i, msgCount: this.parts.length, id: this.parts[i].id });
        do {
          messages.push(...this.getMessages(this.parts[i].childs.item(this.partsIndex[i])));
          this.partsIndex[i] += 1;
        } while (
          this.parts[i].childs.item(this.partsIndex[i] - 1).nodeName != 'measure' &&
          this.partsIndex[0] < this.parts[0].childs.length
        );
        messages.push({ msgType: 'partEnd', msgIndex: i, msgCount: this.parts.length, id: this.parts[i].id });
      }
      for (const message of messages) {
        receiver.onMessage(message);
      }
    }
  }

  private getMessages(node: Node): VexmlMessage[] {
    const messages: VexmlMessage[] = [];
    const nodeElem = node as Element;
    switch (node.nodeName) {
      case 'part':
        {
          const id = nodeElem.getAttribute('id') ?? 'NN';
          this.parts.push({ id, childs: node.childNodes });
          this.partsIndex.push(0);
        }
        break;
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
          const message: AttributesMessage = { msgType: 'attributes', clefs: [], times: [], keys: [] };
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
          const keyElems = nodeElem.getElementsByTagName('key');
          for (let i = 0; i < keyElems.length; i++) {
            const staff = keyElems.item(i)!.getAttribute('number');
            const fifths = parseInt(keyElems.item(i)!.getElementsByTagName('fifths').item(0)?.textContent ?? '0');
            if (staff) message.keys.push({ staff: parseInt(staff), fifths });
            else message.keys.push({ fifths });
          }
          const timeElems = nodeElem.getElementsByTagName('time');
          for (let i = 0; i < timeElems.length; i++) {
            const staff = timeElems.item(i)!.getAttribute('number');
            const beats = timeElems.item(i)!.getElementsByTagName('beats').item(0)?.textContent ?? '4';
            const beatType = timeElems.item(i)!.getElementsByTagName('beat-type').item(0)?.textContent ?? '4';
            if (staff) message.times.push({ staff: parseInt(staff), signature: `${beats}/${beatType}` });
            else message.times.push({ signature: `${beats}/${beatType}` });
          }
          messages.push(message);
        }
        break;
      case 'barline':
        const barStyle = nodeElem.getElementsByTagName('bar-style').item(0)?.textContent ?? undefined;
        const repeatDirection = nodeElem.getElementsByTagName('repeat').item(0)?.getAttribute('direction') ?? undefined;
        const location = nodeElem.getAttribute('location') ?? 'right';
        const ending = nodeElem.getElementsByTagName('ending').item(0);
        if (ending) {
          const number = ending.getAttribute('number') ?? '';
          const type = ending.getAttribute('type') ?? '';
          const text = ending.textContent == '' || ending.textContent == null ? number : ending.textContent;
          messages.push({ msgType: 'barline', barStyle, repeatDirection, location, ending: { number, type, text } });
        } else messages.push({ msgType: 'barline', barStyle, repeatDirection, location });
        break;
      case 'lyric':
        const text = nodeElem.getElementsByTagName('text').item(0)?.textContent ?? '';
        const syllabic = nodeElem.getElementsByTagName('syllabic').item(0)?.textContent ?? 'single';
        messages.push({ msgType: 'lyric', text, syllabic });
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
        const notehead = nodeElem.getElementsByTagName('notehead').item(0)?.textContent ?? 'normal';
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
          this.lastNoteMessage.head.push({ pitch: `${step}/${octave}`, accidental, accidentalCautionary, notehead });
        } else {
          this.lastNoteMessage = {
            msgType: 'note',
            stem,
            dots,
            head: rest ? [] : [{ pitch: `${step}/${octave}`, accidental, accidentalCautionary, notehead }],
            duration: duration ? parseInt(duration) : undefined,
            grace,
            graceSlash,
            type,
            voice,
            staff: parseInt(staff),
          };
          messages.push(this.lastNoteMessage);
        }

        const getNodeDetails = (
          node: Node
        ): { name: string; value: string; number: number; type?: string; placement?: string } => {
          const nodeElem = node as Element;
          return {
            name: node.nodeName,
            value: node.textContent ?? '',
            number: parseInt(nodeElem.getAttribute('number') ?? '1'),
            type: nodeElem.getAttribute('type') ?? undefined,
            placement: nodeElem.getAttribute('placement') ?? undefined,
          };
        };

        // Notations
        const notations = nodeElem.getElementsByTagName('notations').item(0)?.childNodes;
        for (let i = 0; notations && i < notations.length; i++) {
          const nodeName = notations.item(i).nodeName;

          switch (nodeName) {
            case 'articulations':
            case 'ornaments':
            case 'technical':
              for (let j = 0; j < notations.item(i).childNodes.length; j++) {
                if (notations.item(i).childNodes.item(j).nodeName !== '#text') {
                  messages.push({
                    msgType: 'notation',
                    ...getNodeDetails(notations.item(i).childNodes.item(j)),
                  });
                }
              }
              break;
            case '#text':
              break;
            default:
              messages.push({ msgType: 'notation', ...getNodeDetails(notations.item(i)) });
              break;
          }
        }
        // only the beam number 1 is processed, vexflow calculated the number of bars
        const beam = nodeElem.getElementsByTagName('beam').item(0);
        if (beam) messages.push({ msgType: 'beam', ...getNodeDetails(beam) });
        const lyric = nodeElem.getElementsByTagName('lyric').item(0);
        if (lyric) messages.push(...this.getMessages(lyric));
        break;
      default:
      // console.log(`unprocessed node, got:`, node);
    }
    return messages;
  }
}
