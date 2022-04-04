import * as VF from 'vexflow';
import { Producer } from './producer';
import { ClefMessage, EasyScoreMessage, NoteMessage } from './types';

export class Renderer {
  static render(elementId: string, musicXml: string): void {
    const factory = new VF.Factory({
      renderer: { elementId, width: 500, height: 200 },
    });
    const renderer = new Renderer(factory);
    Producer.feed(musicXml).message(renderer);
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
    let notes: VF.StemmableNote[] = [];
    let beamStart = -1;
    for (const message of this.messages) {
      switch (message.type) {
        case 'clef':
          clef = this.getClef(message.clef);
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
          const durationDenominator = this.getDurationDenominator(message.duration);
          const name = `${message.pitch}/${durationDenominator}`;
          const options = { stem: message.stem };
          const note = score.notes(name, options)[0];
          if (message.accidental != '') {
            note.addModifier(this.factory.Accidental({ type: this.getAccidental(message.accidental) }));
          }
          notes.push(note);
          break;
        case 'voiceEnd':
          system
            .addStave({
              voices: [score.voice(notes)],
            })
            .addClef(clef)
            .addTimeSignature(timeSignature);
          break;
      }
    }

    this.factory.draw();
  }

  private getDurationDenominator(duration: NoteMessage['duration']): string {
    switch (duration) {
      case 'sixteenth':
        return '16';
      case 'eighth':
        return '8';
      case 'quarter':
        return '4';
      case 'half':
        return '2';
      case 'full':
        return 'w';
      default:
        return '';
    }
  }

  private getAccidental(accidental: NoteMessage['accidental']): string {
    switch (accidental) {
      case 'sharp':
        return '#';
      default:
        return '';
    }
  }

  private getClef(accidental: ClefMessage['clef']): string {
    switch (accidental) {
      case 'G':
        return 'treble';
      default:
        return '';
    }
  }
}
