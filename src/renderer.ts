import * as VF from 'vexflow';
import { CodePrinter } from './codeprinter';
import { Producer } from './producer';
import { CodeTracker, EasyScoreMessage, MeasureStartMessage, NoteMessage } from './types';

export type RendererOptions = {
  codeTracker?: CodeTracker;
};

export class Renderer {
  static render(elementId: string, musicXml: string, opts: RendererOptions = {}): void {
    const t = opts.codeTracker || CodePrinter.noop();

    t.literal(`import * as VF from 'vexflow';`);
    t.newline();
    t.literal(`const elementId = 'vexflow'`);

    const factory = t.const('factory', () => new VF.Factory({ renderer: { elementId, width: 1000, height: 400 } }));
    const renderer = new Renderer(factory, t);
    Producer.feed(musicXml).message(renderer);
    renderer.render();
  }

  private factory: VF.Factory;

  private messages = new Array<EasyScoreMessage>();
  private t: CodeTracker;

  private constructor(factory: VF.Factory, codeTracker: CodeTracker) {
    this.factory = factory;
    this.t = codeTracker;
  }

  onMessage(message: EasyScoreMessage): void {
    this.messages.push(message);
  }

  private render() {
    const { t, factory } = this;

    const score = t.const('score', () => this.factory.EasyScore());
    t.newline();

    let system = t.let<VF.System | undefined>('system', () => undefined);
    let timeSignature = t.let('timeSignature', () => '');
    let clefs = t.let('clefs', () => new Array<string>());
    let curClefs: string[] = [];
    let voices = t.let('voices', () => new Array<VF.Voice>());
    let note = t.let<VF.StemmableNote | undefined>('note', () => undefined);
    let notes = t.let('notes', () => new Array<VF.StemmableNote>());
    let beamStart = -1;
    let curVoice = '0';
    let curStaff = '0';
    let curMeasure = 1;
    let accidental = t.let('accidental', () => '');
    let x = t.let('x', () => 0);
    let stave = t.let<VF.Stave | undefined>('stave', () => undefined);

    for (const message of this.messages) {
      if (curMeasure > 3) break;
      switch (message.msgType) {
        case 'beamStart':
          beamStart = notes.length - 1;
          break;
        case 'beamEnd':
          if (beamStart >= 0) {
            t.expression(() =>
              factory.Beam({
                notes: notes.slice(beamStart),
                options: { autoStem: true },
              })
            );
            beamStart = -1;
          }
          break;
        case 'measureStart':
          t.newline();
          t.comment(`measure ${curMeasure}`);
          system = t.expression(() =>
            factory.System({ x, width: message.width, formatOptions: { align_rests: true } })
          );
          t.expression(() => (notes = []));
          t.expression(() => (voices = []));
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
            t.expression(() => voices.push(factory.Voice().setMode(2).addTickables(notes)));
            t.expression(() => (notes = []));
            if (system) {
              t.expression(() => (stave = system!.addStave({ voices: voices })));
              if (this.getClef(clefs, curStaff) !== '') {
                t.expression(() => stave!.addClef(this.getClef(clefs, curStaff)));
              }
              if (timeSignature !== '/') {
                t.expression(() => stave!.addTimeSignature(timeSignature));
              }
            }
            t.expression(() => (voices = []));
          } else if (curVoice !== '0' && curVoice !== message.voice) {
            t.expression(() => voices.push(factory.Voice().setMode(2).addTickables(notes)));
            t.expression(() => (notes = []));
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
          note = score.notes(name, options)[0];
          t.literal(`note = score.notes('${name}', ${JSON.stringify(options)})[0]`);
          message.head.forEach((head, index) => {
            if (head.accidental != '') {
              accidental = this.getAccidental(head.accidental);
              t.literal(`accidental = '${accidental}'`);
              t.expression(() => note!.addModifier(factory.Accidental({ type: accidental }), index));
            }
          });
          t.expression(() => notes.push(note!));
          break;
        case 'measureEnd':
          curMeasure++;
          // Add last staff to system (TODO function required)
          t.expression(() => voices.push(factory.Voice().setMode(2).addTickables(notes)));
          t.expression(() => (notes = []));
          if (system) {
            t.expression(() => (stave = system!.addStave({ voices: voices })));
            if (this.getClef(clefs, curStaff) !== '') {
              t.expression(() => stave!.addClef(this.getClef(clefs, curStaff)));
            }
            if (timeSignature !== '/') {
              t.expression(() => stave!.addTimeSignature(timeSignature));
            }
          }
          t.expression(() => (voices = []));
          t.expression(() => factory.draw());
          t.expression(() => (x += stave!.getWidth()));
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
