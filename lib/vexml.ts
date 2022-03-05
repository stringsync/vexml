import { EasyScore } from "vexflow";

export const vexml = (elementId: string) => {
  const element = document.getElementById(elementId);
  element.innerText = 'TODO';
};

type EasyScoreMessageReceiver = {
  onMessage(message: EasyScoreMessage);
};

class EasyScoreXml extends EasyScore {
  static fromMusicXml(containerId: string, musicXml: string): EasyScore {
    const easyScore = new EasyScore();
    EasyScoreMessageBroker.feed(musicXml).message(easyScore);
    return easyScore;
  }

  onMessage(message: EasyScoreMessage): void {
    // call APIs to render whatever the message/instruction is calling for
  }
}

class EasyScoreMessageBroker {
  static feed(musicXml: string) {
     const root = MusicXMLParser.parse(musicXml);
     return new EasyScoreMessageBroker(root);
  }

  private root: MusicXMLRootNode;
  private constructor(root: MusicXMLRootNode) {
    this.root = root;
  }

  message(receiver: EasyScoreMessageReceiver): void {
     const cursor = new MusicXMLCursor(this.root);
     while (cursor.hasNext()) {
       cursor.next();
       const node = cursor.get();
       const messages = this.getMessages(node);
       for (const message of messages) {
         receiver.onMessage(message);
       }
     }
  }

  private getMessages(node: MusicXMLNode): EasyScoreMessage[] {}
}

class MusicXMLCursor {
  root: MusicXMLRootNode;
  node: MusicXMLNode | null;
  constructor(root: MusicXMLRootNode) {
    this.root = root;
    this.node = null;
  }

  get(): MusicXMLNode {}
  hasNext(): boolean {}
  next(): void {}
}