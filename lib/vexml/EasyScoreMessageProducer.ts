import { MusicXMLCursor } from './MusicXMLCursor';
import { MusicXMLParser } from './MusicXMLParser';
import { EasyScoreMessage, EasyScoreMessageReceiver, XMLNode } from './types';

export class EasyScoreMessageProducer {
  static feed(musicXml: string) {
    const root = MusicXMLParser.parse(musicXml);
    return new EasyScoreMessageProducer(root);
  }

  private root: XMLNode;

  private constructor(root: XMLNode) {
    this.root = root;
  }

  message(receiver: EasyScoreMessageReceiver): void {
    const cursor = MusicXMLCursor.from(this.root);
    while (cursor.hasNext()) {
      cursor.next();
      const node = cursor.get();
      const messages = this.getMessages(node);
      for (const message of messages) {
        receiver.onMessage(message);
      }
    }
  }

  private getMessages(node: XMLNode): EasyScoreMessage[] {
    switch (node) {
      case MusicXMLCursor.clefNode:
        return [{ type: 'clef', clef: 'treble' }];
      case MusicXMLCursor.timeSignatureNode:
        return [{ type: 'timeSignature', top: 4, bottom: 4 }];
      case MusicXMLCursor.measureNode:
        return [
          { type: 'voiceStart' },
          { type: 'note', stem: 'up', pitch: 'C#5', duration: '1/4' },
          { type: 'note', stem: 'up', pitch: 'B4', duration: '1/4' },
          { type: 'note', stem: 'up', pitch: 'B4', duration: '1/8' },
          { type: 'beamStart' },
          { type: 'note', stem: 'up', pitch: 'F4', duration: '1/8' },
          { type: 'note', stem: 'up', pitch: 'G4', duration: '1/8' },
          { type: 'note', stem: 'up', pitch: 'G#4', duration: '1/8' },
          { type: 'beamEnd' },
          { type: 'voiceEnd' },
        ];
      default:
        throw new Error(`unrecognized node, got: ${node}`);
    }
  }
}
