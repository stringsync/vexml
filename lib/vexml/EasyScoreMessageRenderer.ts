import * as VF from 'vexflow';
import { EasyScoreMessageProducer } from './EasyScoreMessageProducer';
import { EasyScoreMessage, NoteMessage } from './types';

export class EasyScoreMessageRenderer {
  static render(elementId: string, musicXml: string): void {
    const factory = new VF.Factory({
      renderer: { elementId, width: 500, height: 200 },
    });
    const renderer = new EasyScoreMessageRenderer(factory);
    EasyScoreMessageProducer.feed(musicXml).message(renderer);
    renderer.render();
  }

  private factory: VF.Factory;

  private messages = new Array<EasyScoreMessage>();

  private constructor(factory: VF.Factory) {
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
    let notes:VF.StemmableNote[] = [];
    let beamStart: number = -1;
    for (const message of this.messages) {
      switch (message.type) {
        case 'clef':
          clef = message.clef;
          break;
        case 'timeSignature':
          timeSignature = `${message.top}/${message.bottom}`;
          break;
        case 'beamStart':
          beamStart = notes.length - 1;
          break;
        case 'beamEnd':
          if (beamStart >= 0) {
            this.factory.Beam({ notes: notes.slice(beamStart), options: { autoStem: true } });
            beamStart = -1;
          }
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
          notes.push(...score.notes(name, options));
          break;
        case 'voiceEnd':
          system.addStave({
            voices: [
              score.voice(notes),
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
}
