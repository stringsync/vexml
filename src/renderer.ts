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
    let curClefs: string[] = [];
    let voices: VF.Voice[] = [];
    let notes: VF.StemmableNote[] = [];
    let beamStart = -1;
    let curVoice = '0';
    let curStaff = '0';
    let curMeasure = 1;
    let x = 0;
    for (const message of this.messages) {
      if (curMeasure > 3) break;
      switch (message.msgType) {
        case 'beamStart':
          beamStart = notes.length - 1;
          break;
        case 'beamEnd':
          if (beamStart >= 0) {
            this.factory.Beam({
              notes: notes.slice(beamStart),
              options: { autoStem: true },
            });
            beamStart = -1;
          }
          break;
        case 'measureStart':
          system = this.factory.System({ x, width: 300, formatOptions: { align_rests: true } });
          notes = [];
          voices = [];
          curVoice = '0';
          curStaff = '0';
          clefs = message.clefs;
          if (clefs.length > 0) curClefs = clefs;
          timeSignature = message.time;
          break;
        case 'note':
          const durationDenominator = this.getDurationDenominator(message.type);
          let name = '';
          let options = {};
          // New Staff, add previous to system
          if (curStaff !== '0' && curStaff !== message.staff) {
            voices.push(score.voice(notes).setMode(2));
            notes = [];
            if (system) {
              const stave = system.addStave({ voices: voices });
              if (this.getClef(clefs, curStaff) !== '') {
                stave.addClef(this.getClef(clefs, curStaff));
              }
              if (timeSignature !== '/') {
                stave.addTimeSignature(timeSignature);
              }
            }
            voices = [];
          } else if (curVoice !== '0' && curVoice !== message.voice) {
            voices.push(score.voice(notes).setMode(2));
            notes = [];
          }
          curStaff = message.staff;
          curVoice = message.voice;

          options = { stem: message.stem, clef: this.getClef(curClefs, curStaff, 'treble') };
          // no pitch, rest
          if (message.pitch.length == 0) {
            name = `B4/${durationDenominator}/r`;
            options = {};
            // single pitch
          } else if (message.pitch.length == 1) name = `${message.pitch}/${durationDenominator}`;
          // multiple pitches, chords
          else if (message.pitch.length > 1) {
            name = '(';
            for (const pitch of message.pitch) {
              name += ` ${pitch}`;
            }
            name += ` )/${durationDenominator}`;
          }

          for (let i = 0; i < message.dots; i++) {
            name += '.';
          }
          const note = score.notes(name, options)[0];
          if (message.accidental != '') {
            note.addModifier(this.factory.Accidental({ type: this.getAccidental(message.accidental) }));
          }
          notes.push(note);
          break;
        case 'measureEnd':
          curMeasure++;
          // Add last staff to system (TODO function required)
          voices.push(score.voice(notes).setMode(2));
          notes = [];
          if (system) {
            const stave = system.addStave({ voices: voices });
            if (this.getClef(clefs, curStaff) !== '') {
              stave.addClef(this.getClef(clefs, curStaff));
            }
            if (timeSignature !== '/') {
              stave.addTimeSignature(timeSignature);
            }
          }
          voices = [];
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

  private getClef(accidental: MeasureStartMessage['clefs'], index: string, defect = ''): string {
    switch (accidental[parseInt(index) - 1]) {
      case 'G':
        return 'treble';
      case 'F':
        return 'bass';
      default:
        return defect;
    }
  }
}
