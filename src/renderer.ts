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
    let keySignature = t.let('keySignature', () => '');
    const staves: Map<number, VF.Stave> = t.const('staves', () => new Map<number, VF.Stave>());
    const voices: Map<string, VF.Voice> = t.let('voices', () => new Map<string, VF.Voice>());
    let note = t.let<VF.Note | undefined>('note', () => undefined);
    let notes = t.let('notes', () => new Array<VF.Note>());
    let formatter: VF.Formatter | undefined = t.let('formatter', () => undefined);
    let beamStart = t.let('beamStart', () => 0);
    const slurStart: number[] = [-1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1];
    const tiedStart: number[] = [-1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1];
    let graceStart = t.let('graceStart', () => -1);
    const tupletStart: number[] = [-1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1];
    let curMeasure = 1;
    let x = 0;
    let y = 0;
    let yCur = 100;
    let xMax = 0;
    let width: number | undefined = undefined;
    let voicesArr: VF.Voice[] = t.let('voiceArr', () => []);
    let numStaves = 1;
    let duration = 0;

    function factoryOrnament(factory: VF.Factory, param: { type: string; position: string }): VF.Modifier {
      const modifier = new VF.Ornament(param.type);
      modifier.setPosition(param.position);
      modifier.setContext(factory.getContext());
      return modifier;
    }
    t.literal(`function factoryOrnament(factory: VF.Factory, param: { type: string; position: string }): VF.Modifier {
      const modifier = new VF.Ornament(param.type);
      modifier.setPosition(param.position);
      modifier.setContext(factory.getContext());
      return modifier;
    }`);

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
        case 'measureStart':
          t.newline();
          t.comment(`measure ${curMeasure}`);
          width = message.width;
          y = yCur;
          if (message.staves) {
            numStaves = message.staves;
          }
          for (let staff = 1; staff <= numStaves; staff++) {
            staves.set(staff, factory.Stave({ x, y, width }));
            t.literal(`staves.set(${staff}, factory.Stave({ x: ${x}, y: ${y}, width: ${width} }))`);
            y += 115;
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
              const clef = clefT.clef;
              const clefAnnotation = clefT.annotation;
              if (duration == 0) {
                const staff = clefMsg.staff;
                staves.get(staff)!.addClef(clef, 'default', clefAnnotation);
                if (clefAnnotation)
                  t.literal(`staves.get(${staff}).addClef('${clef}', 'default', '${clefAnnotation}');`);
                else t.literal(`staves.get(${staff}).addClef('${clef}', 'default');`);
              } else {
                notes.push(factory.ClefNote({ type: clef, options: { size: 'small' } }));
                t.literal(`notes.push(factory.ClefNote({ type: '${clef}', options: { size: 'small' } }))`);
              }
            }
          }

          for (const timeMsg of message.times) {
            timeSignature = timeMsg.signature;
            t.literal(`timeSignature = '${timeSignature}'`);
            t.expression(() =>
              staves.forEach((stave) => {
                stave.addTimeSignature(timeSignature);
              })
            );
          }
          for (const keyMsg of message.keys) {
            keySignature = this.getKeySignature(keyMsg.fifths);
            t.literal(`keySignature = '${keySignature}'`);
            t.expression(() =>
              staves.forEach((stave) => {
                stave.addKeySignature(keySignature);
              })
            );
          }
          break;
        case 'voiceEnd':
          voices.set(message.voice, factory.Voice().setMode(2).addTickables(notes));
          t.literal(`voices.set('${message.voice}', factory.Voice().setMode(2).addTickables(notes));`);
          t.expression(() => (notes = []));
          duration = 0;
          break;
        case 'note':
          const durationDenominator = this.getDurationDenominator(message.type);
          const noteStruct: VF.GraceNoteStruct = {};

          if (message.stem) noteStruct.stem_direction = message.stem == 'up' ? 1 : -1;
          else noteStruct.auto_stem = true;
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
            note = this.factory.GraceNote(noteStruct).setStave(staves.get(message.staff)!);
            t.literal(
              `note = factory.GraceNote(${JSON.stringify(noteStruct)}).setStave(staves.get(${message.staff}));`
            );
          } else {
            note = this.factory.StaveNote(noteStruct).setStave(staves.get(message.staff)!);
            t.literal(
              `note = factory.StaveNote(${JSON.stringify(noteStruct)}).setStave(staves.get(${message.staff}));`
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
            if (slurStart[0] >= 0 && notes[0] instanceof GraceNote) {
              t.expression(() =>
                note!.addModifier(
                  factory.GraceNoteGroup({ notes: notes.splice(graceStart) as VF.StemmableNote[], slur: true })
                )
              );
              slurStart[0] = -1;
            } else {
              t.expression(() =>
                note!.addModifier(factory.GraceNoteGroup({ notes: notes.splice(graceStart) as VF.StemmableNote[] }))
              );
            }
            t.expression(() => (graceStart = -1));
          }
          t.expression(() => notes.push(note!));
          if (message.grace && graceStart < 0) t.expression(() => (graceStart = notes.length - 1));
          break;
        case 'notation':
          {
            switch (message.name) {
              case 'slur':
                if (message.type == 'start') {
                  slurStart[message.number - 1] = notes.length - 1;
                } else if (message.type == 'stop') {
                  if (slurStart[message.number - 1] >= 0) {
                    factory.Curve({
                      from: notes[slurStart[message.number - 1]],
                      to: notes[notes.length - 1],
                      options: {},
                    });
                    t.literal(
                      `factory.Curve({from: notes[${slurStart[message.number - 1]}],` +
                        `to: notes[notes.length - 1],options: {},});`
                    );
                    slurStart[message.number - 1] = -1;
                  }
                }
                break;
              case 'tied':
                if (message.type == 'start') {
                  tiedStart[message.number - 1] = notes.length - 1;
                } else if (message.type == 'stop') {
                  if (tiedStart[message.number - 1] >= 0) {
                    factory.Curve({
                      from: notes[tiedStart[message.number - 1]],
                      to: notes[notes.length - 1],
                      options: {},
                    });
                    t.literal(
                      `factory.Curve({from: notes[${tiedStart[message.number - 1]}],` +
                        `to: notes[notes.length - 1],options: {},});`
                    );
                    tiedStart[message.number - 1] = -1;
                  }
                }
                break;
              case 'tuplet':
                if (message.type == 'start') {
                  tupletStart[message.number - 1] = notes.length - 1;
                } else if (message.type == 'stop') {
                  if (tupletStart[message.number - 1] >= 0) {
                    factory.Tuplet({
                      notes: notes.slice(tupletStart[message.number - 1]) as VF.StemmableNote[],
                      options: {},
                    });
                    t.literal(
                      `factory.Tuplet({ notes: notes.slice(${tupletStart[message.number - 1]}),` + `options: {},});`
                    );
                    tupletStart[message.number - 1] = -1;
                  }
                }
                break;
              case 'tremolo':
                notes[notes.length - 1].addModifier(new VF.Tremolo(parseInt(message.value)), 0);
                t.literal(`notes[notes.length - 1].addModifier(new VF.Tremolo(${parseInt(message.value)}), 0);`);
                break;
              case 'fingering':
                notes[notes.length - 1].addModifier(
                  factory.Fingering({ number: message.value, position: message.placement ?? 'above' }),
                  0
                );
                t.literal(
                  `notes[notes.length - 1].addModifier(factory.Fingering({ number: '${message.value}', ` +
                    `position: '${message.placement ?? 'above'}' }), 0);`
                );
                break;
              case 'string':
                notes[notes.length - 1].addModifier(
                  factory.StringNumber({ number: message.value, position: message.placement ?? 'above' }),
                  0
                );
                t.literal(
                  `notes[notes.length - 1].addModifier(factory.StringNumber({ number: '${message.value}', ` +
                    `position: '${message.placement ?? 'above'}' }), 0);`
                );
                break;
              default:
                const modifiers = this.getVexFlowNotation(factory, message.name);
                for (const modifier of modifiers) {
                  if (modifier.class == 'A') {
                    notes[notes.length - 1].addModifier(
                      factory.Articulation({ type: modifier.type, position: message.placement ?? 'above' }),
                      0
                    );
                    t.literal(
                      `notes[notes.length - 1].addModifier(factory.Articulation({ type: '${modifier.type}', ` +
                        `position: '${message.placement ?? 'above'}' }), 0);`
                    );
                  }
                  if (modifier.class == 'O') {
                    notes[notes.length - 1].addModifier(
                      factoryOrnament(factory, { type: modifier.type, position: message.placement ?? 'above' }),
                      0
                    );
                    t.literal(
                      `notes[notes.length - 1].addModifier(factoryOrnament(factory, { type: '${modifier.type}', ` +
                        `position: '${message.placement ?? 'above'}' }), 0);`
                    );
                  }
                }
            }
          }
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
          const staveWidth = width
            ? width
            : formatter!.preCalculateMinTotalWidth(voicesArr) +
              staves.get(1)!.getNoteStartX() -
              staves.get(1)!.getX() +
              VF.Stave.defaultPadding;
          staves.forEach((stave) => {
            stave.setWidth(staveWidth);
          });
          t.literal(`staves.forEach((stave) => {stave.setWidth(${staveWidth});});`);
          const notesWidth =
            staveWidth - staves.get(1)!.getNoteStartX() + staves.get(1)!.getX() - VF.Stave.defaultPadding;
          formatter!.format(voicesArr, notesWidth);
          t.literal(`formatter.format(voicesArr, ${notesWidth});`);
          t.expression(() => factory.draw());
          x += staves.get(1)!.getWidth();
          if (x > 1500) {
            xMax = x > xMax ? x : xMax;
            factory.getContext().resize(xMax + 10, y * 2 - yCur + 340);
            t.literal(`factory.getContext().resize (${xMax + 10}, ${y * 2 - yCur + 340});`);
            x = 0;
            yCur = y + 240;
          }
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
  private getKeySignature(fifths: number): string {
    switch (fifths) {
      case 1:
        return 'G';
      case 2:
        return 'D';
      case 3:
        return 'A';
      case 4:
        return 'E';
      case 5:
        return 'B';
      case 6:
        return 'F#';
      case 7:
        return 'C#';
      case -1:
        return 'F';
      case -2:
        return 'Bb';
      case -3:
        return 'Eb';
      case -4:
        return 'Ab';
      case -5:
        return 'Cb';
      case -6:
        return 'Gb';
      case -7:
        return 'Cb';
      default:
        return 'C';
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

  private getVexFlowNotation(factory: VF.Factory, type: string): { class: string; type: string }[] {
    switch (type) {
      // MusicXML Articulations
      // **********************
      case 'accent':
        return [{ class: 'A', type: 'a>' }];
      case 'breath-mark':
        // VexFlow issue: supported as TextNote
        return [];
      case 'caesura':
        // VexFlow issue: supported as TextNote
        return [];
      case 'detached-legato':
        return [
          { class: 'A', type: 'a.' },
          { class: 'A', type: 'a-' },
        ];
      case 'doit':
        return [{ class: 'O', type: 'doit' }];
      case 'falloff':
        return [{ class: 'O', type: 'fall' }];
      case 'plop':
        // VexFlow bug: not supported
        return [];
      case 'soft-accent':
        // VexFlow bug: not supported
        return [];
      case 'scoop':
        return [{ class: 'O', type: 'scoop' }];
      case 'spiccato':
        // VexFlow bug: not supported
        return [];
      case 'staccato':
        return [{ class: 'A', type: 'a.' }];
      case 'staccatissimo':
        return [{ class: 'A', type: 'av' }];
      case 'stress':
        // VexFlow bug: not supported
        return [];
      case 'strong-accent':
        return [{ class: 'A', type: 'a^' }];
        return [];
      case 'tenuto':
        return [{ class: 'A', type: 'a-' }];
      case 'unstress':
        // VexFlow bug: not supported
        return [];
      // MusicXML Ornaments
      // ******************
      case 'trill-mark':
        return [{ class: 'O', type: 'tr' }];
      case 'turn':
        return [{ class: 'O', type: 'turn' }];
      case 'inverted-turn':
        return [{ class: 'O', type: 'turn_inverted' }];
      case 'mordent':
        return [{ class: 'O', type: 'mordent' }];
      case 'inverted-mordent':
        return [{ class: 'O', type: 'mordent_inverted' }];
      case 'schleifer':
        // VexFlow bug: not supported
        return [];
      // MusicXML Notations
      // ******************
      case 'up-bow':
        return [{ class: 'A', type: 'a|' }];
      case 'down-bow':
        return [{ class: 'A', type: 'am' }];
      case 'snap-pizzicato':
        return [{ class: 'A', type: 'ao' }];
      case 'stopped':
        return [{ class: 'A', type: 'a+' }];
      // MusicXML Notations
      // ******************
      case 'fermata':
        return [{ class: 'A', type: 'a@' }];
      default:
        return [];
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
        // VexFlow bug: should be 'tab' but it is not supported
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
