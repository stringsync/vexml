import Vex from 'vexflow';
import { Factory } from 'vexflow/build/src/factory';
import { EasyScoreMessageProducer } from './EasyScoreMessageProducer';
import { EasyScoreMessage, NoteMessage } from './types';

type Note = {
  name: string;
  options: { stem: 'up' | 'down' };
};

export class EasyScoreMessageRenderer {
  static render(elementId: string, musicXml: string): void {
    const factory = new Vex.Flow.Factory({
      renderer: { elementId, width: 500, height: 200 },
    });
    const renderer = new EasyScoreMessageRenderer(factory);
    EasyScoreMessageProducer.feed(musicXml).message(renderer);
    renderer.render();
  }

  private factory: Factory;

  private messages = new Array<EasyScoreMessage>();

  private constructor(factory: Factory) {
    this.factory = factory;
  }

  onMessage(message: EasyScoreMessage): void {
    this.messages.push(message);
  }

  private render() {
    const score = this.factory.EasyScore();
    const system = this.factory.System();

    let timeSignature = '';
    let clef = '';
    let notes = new Array<Note>();
    for (const message of this.messages) {
      switch (message.type) {
        case 'clef':
          clef = message.clef;
          break;
        case 'timeSignature':
          timeSignature = `${message.top}/${message.bottom}`;
          break;
        case 'voiceStart':
          notes = [];
          break;
        case 'note':
          const durationDenominator = this.getDurationDenominator(
            message.duration
          );
          const name = `${message.pitch}/${durationDenominator}`;
          const options = { stem: message.stem };
          notes.push({ name, options });
          break;
        case 'voiceEnd':
          system.addStave({
            voices: [
              score.voice(
                score.notes(notes.map((note) => note.name).join(','), {
                  stem: this.getStem(notes),
                })
              ),
            ],
          }).addClef(clef).addTimeSignature(timeSignature);
          break;
      }
    }

    this.factory.draw();
  }

  private getDurationDenominator(duration: NoteMessage['duration']): string {
    switch (duration) {
      case '1/16':
        return '16';
      case '1/8':
        return '8';
      case '1/4':
        return '4';
      case '1/2':
        return '2';
      case '1':
        return 'w';
      default:
        return '';
    }
  }

  private getStem(notes: Note[]): string {
    const stems = new Set<string>();
    for (const note of notes) {
      stems.add(note.options.stem);
    }
    if (stems.size !== 1) {
      throw new Error(`got invalid stems: ${JSON.stringify(notes, null, 2)}`);
    }
    return Array.from(stems)[0];
  }
}
