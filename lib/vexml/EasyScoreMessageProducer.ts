import { MusicXMLCursor } from './MusicXMLCursor';
import { EasyScoreMessage, EasyScoreMessageReceiver} from './types';

export class EasyScoreMessageProducer {
  static feed(musicXml: Document) {
    return new EasyScoreMessageProducer(musicXml);
  }

  private root: Document;

  private constructor(root: Document) {
    this.root = root;
  }

  message(receiver: EasyScoreMessageReceiver): void {
    const cursor = MusicXMLCursor.from(this.root);
    receiver.onMessage({ type: 'voiceStart' });
    while (cursor.hasNext()) {
      cursor.next();
      const node = cursor.get();
      console.log(node);
      const messages: EasyScoreMessage[] = [];
      messages.push(...this.getMessages(node));
      for (const message of messages) {
        receiver.onMessage(message);
      }
    }
    receiver.onMessage({ type: 'voiceEnd' });
  }

  private getMessages(node: Node): EasyScoreMessage[] {
    const messages: EasyScoreMessage[] = [];
    const nodeElem = node as Element;
    switch (node.nodeName) {
      case 'attributes':
        var children = node.childNodes;
        for (var i = 0; i < children.length; i++) {
          const childElem = children[i] as Element;  
          switch (children[i].nodeName) {
            case 'clef':
              const sign = childElem.getElementsByTagName('sign').item(0)?.textContent??'';
              messages.push({ type: 'clef', clef: sign });
              break;
            case 'time':
              const beats = childElem.getElementsByTagName('beats').item(0)?.textContent??'';
              const beatType = childElem.getElementsByTagName('beat-type').item(0)?.textContent??'';
              messages.push({ type: 'timeSignature', top: beats, bottom: beatType });
            break;
            default:
              console.log(`unprocessed node, got: ${children[i]}`);
          }
        }
        break;
      case 'note':
        const step = nodeElem.getElementsByTagName('step').item(0)?.textContent??'';
        const octave = nodeElem.getElementsByTagName('octave').item(0)?.textContent??'';
        const stem = nodeElem.getElementsByTagName('stem').item(0)?.textContent??'';
        const accidental = nodeElem.getElementsByTagName('accidental').item(0)?.textContent??'';
        const duration = nodeElem.getElementsByTagName('type').item(0)?.textContent??'';
        messages.push({type: 'note', stem: stem, pitch: `${step}${octave}`, duration: duration, accidental: accidental});
        const beam = '' + nodeElem.getElementsByTagName('beam').item(0)?.textContent;
        console.log(beam);
        if (beam === 'begin') messages.push({ type: 'beamStart' });
        if (beam === 'end') messages.push({ type: 'beamEnd' });
        break;
      default:
        console.log(`unprocessed node, got: ${node}`);
    }
    return messages;
  }
}
