import * as VF from 'vexflow';
import { Producer } from './producer';
import { EasyScoreMessage, MeasureStartMessage, NoteMessage } from './types';

export class Renderer {
  static render(elementId: string, musicXml: string): void {
    const factory = new VF.Factory({
      renderer: { elementId, width: 1000, height: 400 },
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
    let system: VF.System | undefined = undefined;

    let timeSignature = '';
    let clefs: string[] = [];
    // Map<staff,Map<voice,Notes[]>
    const notes = new Map<string, Map<string, VF.StemmableNote[]>>([]);
    let beamStart = -1;
    let curVoice = '0';
    let curStaff = '0';
    let curMeasure = 1;
    let x = 0;
    for (const message of this.messages) {
      if (curMeasure > 2) break;
      switch (message.msgType) {
        case 'beamStart':
          beamStart = notes.get(curStaff)!.get(curVoice)!.length - 1;
          break;
        case 'beamEnd':
          if (beamStart >= 0) {
            this.factory.Beam({
              notes: notes.get(curStaff)!.get(curVoice)!.slice(beamStart),
              options: { autoStem: true },
            });
            beamStart = -1;
          }
          break;
        case 'measureStart':
          system = this.factory.System({ x, width: 300 });
          notes.clear();
          curVoice = '0';
          curStaff = '0';
          clefs = message.clefs;
          timeSignature = message.time;
          break;
        case 'note':
          const durationDenominator = this.getDurationDenominator(message.type);
          let name = '';
          let options = {};
          if (message.rest) {
            name = 'B4/w/r';
          } else {
            name = `${message.pitch}/${durationDenominator}`;
            options = { stem: message.stem };
          }
          const note = score.notes(name, options)[0];
          if (message.accidental != '') {
            note.addModifier(this.factory.Accidental({ type: this.getAccidental(message.accidental) }));
          }
          // New Staff, add previous to system (TODO function required)
          if (curStaff !== '0' && curStaff !== message.staff) {
            const voices: VF.Voice[] = [];
            notes.get(curStaff)!.forEach((value: VF.StemmableNote[]) => {
              voices.push(score.voice(value));
            });
            if (system) {
              const stave = system.addStave({ voices: voices });
              if (this.getClef(clefs, curStaff) !== '') stave.addClef(this.getClef(clefs, curStaff));
              if (timeSignature !== '/') stave.addTimeSignature(timeSignature);
            }
          }
          curStaff = message.staff;
          curVoice = message.voice;
          if (!notes.get(curStaff)) notes.set(curStaff, new Map<string, VF.StemmableNote[]>([]));
          if (!notes.get(curStaff)!.get(curVoice)) notes.get(curStaff)!.set(curVoice, []);
          notes.get(curStaff)!.get(curVoice)!.push(note);
          break;
        case 'measureEnd':
          curMeasure++;
          // Add last staff to system (TODO function required)
          const voices: VF.Voice[] = [];
          notes.get(curStaff)!.forEach((value: VF.StemmableNote[]) => {
            voices.push(score.voice(value));
          });
          if (system) {
            const stave = system.addStave({ voices: voices });
            if (this.getClef(clefs, curStaff) !== '') stave.addClef(this.getClef(clefs, curStaff));
            if (timeSignature !== '/') stave.addTimeSignature(timeSignature);
          }
          this.factory.draw();
          x += 300;
          break;
      }
    }
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

  private getClef(accidental: MeasureStartMessage['clefs'], index: string): string {
    switch (accidental[parseInt(index) - 1]) {
      case 'G':
        return 'treble';
      case 'F':
        return 'bass';
      default:
        return '';
    }
  }
}
