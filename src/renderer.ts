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
    let stave: VF.Stave | undefined = undefined;
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
          system = this.factory.System({ x, width: message.width, formatOptions: { align_rests: true } });
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
            voices.push(this.factory.Voice().setMode(2).addTickables(notes));
            notes = [];
            if (system) {
              stave = system.addStave({ voices: voices });
              if (this.getClef(clefs, curStaff) !== '') {
                stave.addClef(this.getClef(clefs, curStaff));
              }
              if (timeSignature !== '/') {
                stave.addTimeSignature(timeSignature);
              }
            }
            voices = [];
          } else if (curVoice !== '0' && curVoice !== message.voice) {
            voices.push(this.factory.Voice().setMode(2).addTickables(notes));
            notes = [];
          }
          curStaff = message.staff;
          curVoice = message.voice;

          options = { stem: message.stem, clef: this.getClef(curClefs, curStaff, 'treble') };
          // no pitch, rest
          if (message.head.length == 0) {
            name = `B4/${durationDenominator}/r`;
            options = {};
            // single pitch
          } else if (message.head.length == 1) name = `${message.head[0].pitch}/${durationDenominator}`;
          // multiple pitches, chords
          else if (message.head.length > 1) {
            for (const head of message.head) {
              name += ` ${head.pitch}`;
            }
            name = name.replace(/ /, '(');
            name += `)/${durationDenominator}`;
          }

          for (let i = 0; i < message.dots; i++) {
            name += '.';
          }
          const note = score.notes(name, options)[0];
          message.head.forEach((head, index) => {
            if (head.accidental != '') {
              note.addModifier(this.factory.Accidental({ type: this.getAccidental(head.accidental) }), index);
            }
          });
          notes.push(note);
          break;
        case 'measureEnd':
          curMeasure++;
          // Add last staff to system (TODO function required)
          voices.push(this.factory.Voice().setMode(2).addTickables(notes));
          notes = [];
          if (system) {
            stave = system.addStave({ voices: voices });
            if (this.getClef(clefs, curStaff) !== '') {
              stave.addClef(this.getClef(clefs, curStaff));
            }
            if (timeSignature !== '/') {
              stave.addTimeSignature(timeSignature);
            }
          }
          voices = [];
          this.factory.draw();
          x += stave!.getWidth();
          break;
      }
    }
  }

  private getDurationDenominator(duration: NoteMessage['duration']): string {
    switch (duration) {
      case '1024th':
        return '1024';
      case '512th':
        return '512';
      case '256th':
        return '256';
      case '128th':
        return '128';
      case '64th':
        return '64';
      case '32nd':
        return '32';
      case '16th':
        return '16';
      case 'eighth':
        return '8';
      case 'quarter':
        return '4';
      case 'half':
        return '2';
      case 'whole':
        return 'w';
      default:
        return '';
    }
  }

  private getAccidental(accidental: string): string {
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
