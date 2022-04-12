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

    t.literal(`let VF = Vex.Flow;`);
    t.newline();
    t.literal(`const elementId = 'score'`);

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

    const score = t.const('score', () => factory.EasyScore());
    t.newline();

    let system = t.let<VF.System | undefined>('system', () => undefined);
    let timeSignature = t.let('timeSignature', () => '');
    let clefs = t.let('clefs', () => new Array<string>());
    let clef = t.let('clef', () => '');
    let curClefs: string[] = [];
    let voices = t.let('voices', () => new Array<VF.Voice>());
    let note = t.let<VF.StemmableNote | undefined>('note', () => undefined);
    let notes = t.let('notes', () => new Array<VF.StemmableNote>());
    let beamStart = t.let('beamStart', () => -1);
    let curMeasure = 1;
    let accidental = t.let('accidental', () => '');
    let accNdx = t.let('accNdx', () => 0);
    let x = t.let('x', () => 0);
    let width = t.let('width', () => 0);
    let stave = t.let<VF.Stave | undefined>('stave', () => undefined);

    for (const message of this.messages) {
      if (curMeasure > 3) break;
      switch (message.msgType) {
        case 'beamStart':
          beamStart = notes.length - 1;
          break;
        case 'beamEnd':
          if (beamStart >= 0) {
            t.literal(`beamStart = ${beamStart}`);
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
          t.literal(`width = ${message.width}`);
          width = message.width;
          t.expression(() => (system = factory.System({ x, width: width, formatOptions: { align_rests: true } })));
          t.expression(() => (notes = []));
          t.expression(() => (voices = []));
          clefs = message.clefs;
          if (clefs.length > 0) curClefs = clefs;
          timeSignature = message.time;
          break;
        case 'voiceEnd':
          t.expression(() => voices.push(factory.Voice().setMode(2).addTickables(notes)));
          t.expression(() => (notes = []));
          break;
        case 'staffEnd':
          if (system) {
            t.expression(() => (stave = system!.addStave({ voices: voices })));
            clef = this.getClef(clefs, message.staff);
            t.literal(`clef = '${clef}'`);
            if (clef !== '') {
              t.expression(() => stave!.addClef(clef));
            }
            if (timeSignature !== '/') {
              t.literal(`timeSignature = '${timeSignature}'`);
              t.expression(() => stave!.addTimeSignature(timeSignature));
            }
          }
          t.expression(() => (voices = []));
          break;
        case 'note':
          const durationDenominator = this.getDurationDenominator(message.type);
          let name = '';
          let options = {};

          options = { stem: message.stem, clef: this.getClef(curClefs, message.staff, 'treble') };
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
              accNdx = index;
              t.literal(`accNdx = ${index}`);
              t.expression(() => note!.addModifier(factory.Accidental({ type: accidental }), accNdx));
            }
          });
          t.expression(() => notes.push(note!));
          break;
        case 'measureEnd':
          curMeasure++;
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
