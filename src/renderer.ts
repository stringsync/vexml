import * as VF from 'vexflow';
import { Attributes } from './attributes';
import { CodePrinter } from './codeprinter';
import { Notations } from './notations';
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

    const staves: Map<string, VF.Stave> = t.const('staves', () => new Map<string, VF.Stave>());
    const voices: Map<string, VF.Voice> = t.let('voices', () => new Map<string, VF.Voice>());
    let note = t.let<VF.Note | undefined>('note', () => undefined);
    let notes = t.let('notes', () => new Array<VF.Note>());
    let formatter: VF.Formatter | undefined = t.let('formatter', () => undefined);
    let beamStart = t.let('beamStart', () => 0);
    let graceStart = t.let('graceStart', () => -1);
    let curPart = '';
    let curMeasure = 1;
    let x = 0;
    let y = 0;
    const yCur: Map<string, number> = new Map<string, number>();
    let xMax = 0;
    let width: number | undefined = undefined;
    let voicesArr: VF.Voice[] = t.let('voiceArr', () => []);
    let numStaves = 1;
    let duration = 0;
    let endingLeft = '';
    let endingRight = '';
    let endingText = '';
    let endingMiddle = false;

    for (const message of this.messages) {
      switch (message.msgType) {
        case 'beam':
          if (message.value == 'begin') {
            beamStart = notes.length - 1;
          } else if (message.value == 'end') {
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
        case 'partStart':
          curPart = message.id;
          if (yCur.get(`${curPart}`) == undefined) {
            yCur.set(`${curPart}`, 100 + 100 * message.msgIndex);
            factory.getContext().resize(2000, 100 + 100 * message.msgIndex + 300);
            t.literal(`factory.getContext().resize (2000, ${100 + 100 * message.msgIndex + 300});`);
          }
          break;
        case 'partEnd':
          if (message.msgCount == message.msgIndex + 1) {
            curMeasure++;
            t.expression(() => (voicesArr = []));
            t.expression(() =>
              voices.forEach((voice) => {
                voicesArr.push(voice);
              })
            );
            t.expression(() => (formatter = factory.Formatter().joinVoices(voicesArr)));
            const staveWidth = width
              ? width
              : formatter!.preCalculateMinTotalWidth(voicesArr) +
                staves.get(`${curPart}_1`)!.getNoteStartX() -
                staves.get(`${curPart}_1`)!.getX() +
                VF.Stave.defaultPadding;
            staves.forEach((stave) => {
              stave.setWidth(staveWidth);
            });
            t.literal(`staves.forEach((stave) => {stave.setWidth(${staveWidth});});`);
            const notesWidth =
              staveWidth -
              staves.get(`${curPart}_1`)!.getNoteStartX() +
              staves.get(`${curPart}_1`)!.getX() -
              VF.Stave.defaultPadding;
            formatter!.format(voicesArr, notesWidth);
            t.literal(`formatter.format(voicesArr, ${notesWidth});`);
            t.expression(() => factory.draw());
            x += staves.get(`${curPart}_1`)!.getWidth();
            if (x > 1500) {
              xMax = x > xMax ? x : xMax;
              let yMax = 0;
              yCur.forEach((value, key) => {
                yCur.set(key, value + 240);
                yMax = Math.max(yMax, value + 240);
              });
              factory.getContext().resize(2000, yMax + 240);
              t.literal(`factory.getContext().resize (2000, ${yMax + 240});`);
              x = 0;
            }
          }
          break;
        case 'measureStart':
          t.newline();
          t.comment(`measure ${curMeasure}`);
          width = message.width;
          y = yCur.get(`${curPart}`) ?? 100;
          if (message.staves) {
            numStaves = message.staves;
          }
          for (let staff = 1; staff <= numStaves; staff++) {
            staves.set(`${curPart}_${staff}`, factory.Stave({ x, y, width }));
            t.literal(`staves.set('${curPart}_${staff}', factory.Stave({ x: ${x}, y: ${y}, width: ${width} }))`);
            y += 115;
          }
          t.expression(() => (notes = []));
          duration = 0;
          Attributes.clefMeasureStart();
          break;
        case 'attributes':
          Attributes.render(t, factory, message, curPart, duration, notes, staves);
          break;
        case 'voiceEnd':
          voices.set(`${curPart}_${message.voice}`, factory.Voice().setMode(2).addTickables(notes));
          t.literal(`voices.set('${curPart}_${message.voice}', factory.Voice().setMode(2).addTickables(notes));`);
          t.expression(() => (notes = []));
          duration = 0;
          break;
        case 'note':
          const durationDenominator = this.getDurationDenominator(message.type);
          const noteStruct: VF.GraceNoteStruct = {};

          if (message.stem) noteStruct.stem_direction = message.stem == 'up' ? 1 : -1;
          else noteStruct.auto_stem = true;
          noteStruct.clef = Attributes.clefGet(message.staff, duration).clef;
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
            note = this.factory.GraceNote(noteStruct).setStave(staves.get(`${curPart}_${message.staff}`)!);
            t.literal(
              `note = factory.GraceNote(${JSON.stringify(noteStruct)}).setStave(staves.get('${curPart}_${
                message.staff
              }'));`
            );
          } else {
            note = this.factory.StaveNote(noteStruct).setStave(staves.get(`${curPart}_${message.staff}`)!);
            t.literal(
              `note = factory.StaveNote(${JSON.stringify(noteStruct)}).setStave(staves.get('${curPart}_${
                message.staff
              }'));`
            );
          }
          for (let i = 0; i < message.dots; i++) {
            t.expression(() => VF.Dot.buildAndAttach([note!], { all: true }));
          }
          message.head.forEach((head, index) => {
            if (head.accidental != '') {
              const accidental = this.getAccidental(head.accidental);
              if (head.accidentalCautionary) {
                note!.addModifier(factory.Accidental({ type: accidental }).setAsCautionary(), index);
                t.literal(
                  `note.addModifier(factory.Accidental({ type: '${accidental}' }).setAsCautionary(), ${index})`
                );
              } else {
                note!.addModifier(factory.Accidental({ type: accidental }), index);
                t.literal(`note.addModifier(factory.Accidental({ type: '${accidental}' }), ${index});`);
              }
            }
          });
          if (!message.grace && graceStart >= 0) {
            t.expression(() =>
              note!.addModifier(factory.GraceNoteGroup({ notes: notes.splice(graceStart) as VF.StemmableNote[] }))
            );
            t.expression(() => (graceStart = -1));
          }
          t.expression(() => notes.push(note!));
          if (message.grace && graceStart < 0) t.expression(() => (graceStart = notes.length - 1));
          break;
        case 'notation':
          Notations.render(t, factory, message, notes);
          break;
        case 'lyric':
          let text = message.text;
          switch (message.syllabic) {
            case 'begin':
            case 'middle':
              text += ' -';
              break;
          }
          notes[notes.length - 1].addModifier(factory.Annotation({ text }));
          break;
        case 'barline':
          if (message.barStyle) {
            let barlineType: VF.BarlineType | undefined;
            switch (message.barStyle) {
              case 'dashed':
                barlineType = VF.BarlineType.SINGLE;
                break;
              case 'dotted':
                barlineType = VF.BarlineType.SINGLE;
                break;
              case 'heavy':
                barlineType = VF.BarlineType.SINGLE;
                break;
              case 'heavy-heavy':
                barlineType = VF.BarlineType.DOUBLE;
                break;
              case 'heavy-light':
                barlineType = VF.BarlineType.DOUBLE;
                break;
              case 'light-heavy':
                barlineType = VF.BarlineType.END;
                break;
              case 'light-light':
                barlineType = VF.BarlineType.DOUBLE;
                break;
              case 'none':
                barlineType = VF.BarlineType.NONE;
                break;
              case 'regular':
                barlineType = VF.BarlineType.SINGLE;
                break;
              case 'short':
                barlineType = VF.BarlineType.SINGLE;
                break;
              case 'tick':
                barlineType = VF.BarlineType.DOUBLE;
                break;
            }
            switch (message.repeatDirection) {
              case 'forward':
                barlineType = VF.BarlineType.REPEAT_BEGIN;
                break;
              case 'backward':
                barlineType = VF.BarlineType.REPEAT_END;
                break;
            }
            if (message.location == 'right') {
              staves.forEach((stave) => {
                stave.setEndBarType(barlineType as number);
              });
            }
            if (message.location == 'left') {
              staves.forEach((stave) => {
                stave.setBegBarType(barlineType as number);
              });
            }
          }
          if (message.ending) {
            if (message.location == 'right') {
              endingRight = message.ending.type;
              endingText = message.ending.text;
            }
            if (message.location == 'left') {
              endingLeft = message.ending.type;
              endingText = message.ending.text;
            }
          }
          break;
        case 'measureEnd':
          if (endingLeft == 'start' && endingRight == 'stop') {
            staves.get(`${curPart}_1`)!.setVoltaType(VF.VoltaType.BEGIN_END, endingText, 0);
            endingMiddle = false;
          } else if (endingLeft == 'start') {
            staves.get(`${curPart}_1`)!.setVoltaType(VF.VoltaType.BEGIN, endingText, 0);
            if (endingRight == '') endingMiddle = true;
          } else if (endingRight == 'stop') {
            staves.get(`${curPart}_1`)!.setVoltaType(VF.VoltaType.END, endingText, 0);
            endingMiddle = false;
          } else if (endingMiddle) {
            staves.get(`${curPart}_1`)!.setVoltaType(VF.VoltaType.MID, endingText, 0);
          }
          endingLeft = '';
          endingRight = '';
          endingText = '';
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
      case 'breve':
        return '1/2';
      case 'long':
        // VexFlow bug: should be '1/4' but it is not supported
        // return '1/4';
        return '1/2';
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
}
