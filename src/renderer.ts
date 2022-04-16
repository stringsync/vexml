import * as VF from 'vexflow';
import { GraceNote } from 'vexflow';
import { CodePrinter } from './codeprinter';
import { Producer } from './producer';
import { CodeTracker, EasyScoreMessage, NoteMessage } from './types';

export type RendererOptions = {
  codeTracker?: CodeTracker;
};

export class Renderer {
  static render(elementId: string, musicXml: string, opts: RendererOptions = {}): void {
    const t = opts.codeTracker || CodePrinter.noop();

    t.literal(`let VF = Vex.Flow;`);
    t.newline();
    t.literal(`const elementId = 'score'`);

    const factory = t.const('factory', () => new VF.Factory({ renderer: { elementId, width: 2000, height: 400 } }));
    const renderer = new Renderer(factory, t);
    Producer.feed(musicXml).message(renderer);
    renderer.render();
  }

  private factory: VF.Factory;
  private clefs: Map<number, { duration: number; clef?: string; annotation?: string }[]> = new Map<
    number,
    { duration: number; clef: string }[]
  >();

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

    t.newline();

    let timeSignature = t.let('timeSignature', () => '');
    let clef = t.let('clef', () => '');
    let clefAnnotation: string | undefined = t.let('width', () => undefined);
    let stave: VF.Stave | undefined = t.let('stave', () => undefined);
    const staves: Map<number, VF.Stave> = t.const('staves', () => new Map<number, VF.Stave>());
    const voices: Map<number, VF.Voice> = t.let('voices', () => new Map<number, VF.Voice>());
    let note = t.let<VF.Note | undefined>('note', () => undefined);
    let notes = t.let('notes', () => new Array<VF.Note>());
    let formatter: VF.Formatter | undefined = t.let('formatter', () => undefined);
    let beamStart = t.let('beamStart', () => -1);
    let slurStart = t.let('slurStart', () => -1);
    let graceStart = t.let('graceStart', () => -1);
    let curMeasure = 1;
    let accidental = t.let('accidental', () => '');
    let accNdx = t.let('accNdx', () => 0);
    let voice = t.let('voice', () => 0);
    let x = t.let('x', () => 0);
    let y = t.let('y', () => 0);
    let width: number | undefined = t.let('width', () => undefined);
    let staveWidth: number = t.let('staveWidth', () => 0);
    let voicesArr: VF.Voice[] = t.let('voiceArr', () => []);
    let numStaves = 1;
    let duration = 0;

    for (const message of this.messages) {
      switch (message.msgType) {
        case 'beamStart':
          beamStart = notes.length - 1;
          break;
        case 'beamEnd':
          if (beamStart >= 0) {
            t.literal(`beamStart = ${beamStart}`);
            t.expression(() =>
              factory.Beam({
                notes: notes.slice(beamStart) as VF.StemmableNote[],
                options: { autoStem: true },
              })
            );
            beamStart = -1;
          }
          break;
        case 'slurStart':
          slurStart = notes.length - 1;
          break;
        case 'slurEnd':
          if (slurStart >= 0) {
            t.literal(`slurStart = ${slurStart}`);
            t.expression(() => factory.Curve({ from: notes[slurStart], to: notes[notes.length - 1], options: {} }));
            slurStart = -1;
          }
          break;
        case 'measureStart':
          t.newline();
          t.comment(`measure ${curMeasure}`);
          t.literal(`width = ${message.width}`);
          width = message.width;
          t.expression(() => (y = 0));
          if (message.staves) {
            numStaves = message.staves;
          }
          for (let staff = 1; staff <= numStaves; staff++) {
            t.literal(`staff = ${staff}`);
            t.expression(() => staves.set(staff, factory.Stave({ x, y, width })));
            t.expression(() => (y += 115));
          }
          t.expression(() => (notes = []));
          duration = 0;
          this.clefMeasureStart();
          break;
        case 'attributes':
          for (const clefMsg of message.clefs) {
            const clefT = this.clefTranslate(clefMsg);
            this.clefSet(clefMsg.staff, duration, clefT);
            if (clefT.clef) {
              clef = clefT.clef;
              t.literal(clefT.clef ? `clef = '${clefT.clef}'` : `clef = undefined`);
              clefAnnotation = clefT.annotation;
              t.literal(clefT.annotation ? `clefAnnotation = '${clefT.annotation}'` : `clefAnnotation = undefined`);
              if (duration == 0) {
                const staff = clefMsg.staff;
                t.literal(`staff = ${clefMsg.staff}`);
                t.expression(() => staves.get(staff)!.addClef(clef, 'default', clefAnnotation));
              } else {
                t.expression(() => notes.push(factory.ClefNote({ type: clef, options: { size: 'small' } })));
              }
            }
          }

          timeSignature = message.time!;
          t.literal(`timeSignature = '${timeSignature}'`);
          if (timeSignature)
            t.expression(() =>
              staves.forEach((stave) => {
                stave.addTimeSignature(timeSignature);
              })
            );
          break;
        case 'voiceEnd':
          voice = parseInt(message.voice);
          t.literal(`voice = ${voice}`);
          t.expression(() => voices.set(voice, factory.Voice().setMode(2).addTickables(notes)));
          t.expression(() => (notes = []));
          duration = 0;
          break;
        case 'note':
          const durationDenominator = this.getDurationDenominator(message.type);
          const noteStruct: VF.GraceNoteStruct = {};

          if (message.stem) noteStruct.stem_direction = message.stem == 'up' ? 1 : -1;
          noteStruct.clef = this.clefGet(message.staff, duration).clef;
          if (message.duration) duration += message.duration;
          // no pitch, rest
          if (message.head.length == 0) {
            if (noteStruct.clef == 'bass') noteStruct.keys = ['D/2'];
            else noteStruct.keys = ['B/4'];
            noteStruct.duration = `${durationDenominator}r`;
          } else {
            noteStruct.keys = [];
            for (const head of message.head) {
              noteStruct.keys.push(`${head.pitch}`);
            }
            noteStruct.duration = `${durationDenominator}`;
          }

          if (message.grace) {
            noteStruct.slash = message.graceSlash;
            note = this.factory.GraceNote(noteStruct);
            t.literal(`note = factory.GraceNote(${JSON.stringify(noteStruct)})`);
          } else {
            note = this.factory.StaveNote(noteStruct);
            t.literal(`note = factory.StaveNote(${JSON.stringify(noteStruct)})`);
          }
          for (let i = 0; i < message.dots; i++) {
            t.expression(() => VF.Dot.buildAndAttach([note!], { all: true }));
          }
          message.head.forEach((head, index) => {
            if (head.accidental != '') {
              accidental = this.getAccidental(head.accidental);
              t.literal(`accidental = '${accidental}'`);
              accNdx = index;
              t.literal(`accNdx = ${index}`);
              if (head.accidentalCautionary) {
                t.expression(() =>
                  note!.addModifier(factory.Accidental({ type: accidental }).setAsCautionary(), accNdx)
                );
              } else {
                t.expression(() => note!.addModifier(factory.Accidental({ type: accidental }), accNdx));
              }
            }
          });
          if (!message.grace && graceStart >= 0) {
            if (slurStart >= 0 && notes[slurStart] instanceof GraceNote) {
              t.expression(() =>
                note!.addModifier(
                  factory.GraceNoteGroup({ notes: notes.splice(graceStart) as VF.StemmableNote[], slur: true })
                )
              );
              slurStart = -1;
            } else {
              t.expression(() =>
                note!.addModifier(factory.GraceNoteGroup({ notes: notes.splice(graceStart) as VF.StemmableNote[] }))
              );
            }
            t.expression(() => (graceStart = -1));
          }
          stave = staves.get(message.staff);
          t.literal(`staff = ${message.staff}`);
          t.literal(`stave = staves.get(staff)`);
          if (stave) t.expression(() => note!.setStave(stave!));
          t.expression(() => notes.push(note!));
          if (message.grace && graceStart < 0) t.expression(() => (graceStart = notes.length - 1));
          break;
        case 'measureEnd':
          curMeasure++;
          t.expression(() => (voicesArr = []));
          t.expression(() =>
            voices.forEach((voice) => {
              voicesArr.push(voice);
            })
          );
          t.expression(() => (formatter = factory.Formatter().joinVoices(voicesArr)));
          t.expression(
            () =>
              (staveWidth = width
                ? width
                : formatter!.preCalculateMinTotalWidth(voicesArr) +
                  staves.get(1)!.getNoteStartX() -
                  staves.get(1)!.getX() +
                  VF.Stave.defaultPadding)
          );
          t.expression(() =>
            staves.forEach((stave) => {
              stave.setWidth(staveWidth);
            })
          );
          t.expression(() =>
            formatter!.format(
              voicesArr,
              staveWidth - staves.get(1)!.getNoteStartX() + staves.get(1)!.getX() - VF.Stave.defaultPadding
            )
          );
          t.expression(() => factory.draw());
          t.expression(() => (x += staves.get(1)!.getWidth()));
          break;
      }
    }
  }

  private getDurationDenominator(duration: NoteMessage['type']): string {
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
      case 'flat':
        return 'b';
      case 'natural':
        return 'n';
      case 'double-sharp':
        return '##';
      case 'double-flat':
      case 'flat-flat':
        return 'bb';
      case 'quarter-flat':
        return 'd';
      case 'quarter-sharp':
        return '+';
      case 'three-quarters-flat':
        return 'db';
      case 'three-quarters-sharp':
        return '++';
      default:
        return '';
    }
  }

  private clefMeasureStart() {
    this.clefs.forEach((value, key) => this.clefs.set(key, [{ duration: 0, clef: value.pop()!.clef }]));
  }

  private clefSet(staff: number, duration: number, clef: { clef?: string; annotation?: string }): void {
    let current = this.clefs.get(staff);
    if (!current) current = [];
    current.push({ duration, clef: clef.clef, annotation: clef.annotation });
    this.clefs.set(staff, current);
  }

  private clefGet(staff: number, duration: number): { clef?: string; annotation?: string } {
    const current = this.clefs.get(staff);
    let clef = {};
    if (current) {
      for (let i = current.length - 1; i >= 0; i--) {
        const value = current[i];
        if (duration >= value.duration) {
          clef = { clef: value.clef, annotation: value.annotation };
          break;
        }
      }
    }
    return clef;
  }

  private clefTranslate(clef: { sign: string; line?: number; octaveChange?: number }): {
    clef?: string;
    annotation?: string;
  } {
    const value: { clef?: string; annotation?: string } = {};
    switch (clef.sign) {
      case 'G':
        // with G line defaults to 2
        // see https://www.w3.org/2021/06/musicxml40/musicxml-reference/elements/line/
        if (clef.line == 1) value.clef = 'french';
        value.clef = 'treble';
        break;
      case 'F':
        // with F line defaults to 4
        if (clef.line == 5) value.clef = 'subbass';
        if (clef.line == 3) value.clef = 'baritone-f';
        value.clef = 'bass';
        break;
      case 'C':
        // with C line defaults to 3
        if (clef.line == 5) value.clef = 'baritone-c';
        if (clef.line == 4) value.clef = 'tenor';
        if (clef.line == 2) value.clef = 'mezzo-soprano';
        if (clef.line == 1) value.clef = 'soprano';
        value.clef = 'alto';
        break;
      case 'percussion':
        value.clef = 'percussion';
        break;
      case 'TAB':
        // should be tab but it is buggy in VexFlow
        //value.clef = 'tab';
        value.clef = 'treble';
        break;
      default:
        value.clef = undefined;
    }
    switch (clef.octaveChange) {
      case -1:
        value.annotation = '8vb';
        break;
      case 1:
        value.annotation = '8va';
        break;
    }
    return value;
  }
}
