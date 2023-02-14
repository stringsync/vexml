import * as VF from 'vexflow';
import { BoundingBox } from 'vexflow';
import { Producer } from '../producers/producer';
import {
  LegacyAttributesMessage,
  CodeTracker,
  DirectionMessage,
  NoteMessage,
  VexmlMessage,
  VexmlMessageReceiver,
} from '../types';
import { CodePrinter } from '../util/codeprinter';
import { Attributes } from './attributes';
import { Notations } from './notations';
import * as msg from '../util/msg';

export type RendererOptions = {
  codeTracker?: CodeTracker;
};

export class Renderer implements VexmlMessageReceiver {
  static render(elementId: string, musicXml: string, opts: RendererOptions = {}): void {
    const t = opts.codeTracker || CodePrinter.noop();

    t.literal(`let VF = Vex.Flow;`);
    t.newline();
    t.literal(`const elementId = 'score'`);

    const factory = t.const('factory', () => new VF.Factory({ renderer: { elementId, width: 2000, height: 400 } }));
    const renderer = new Renderer(factory, t);
    Producer.feed(musicXml).sendMessages(renderer);
    renderer.render();
  }

  private factory: VF.Factory;

  private messages = new Array<VexmlMessage>();
  private t: CodeTracker;

  private constructor(factory: VF.Factory, codeTracker: CodeTracker) {
    this.factory = factory;
    this.t = codeTracker;
  }

  onMessage(message: VexmlMessage): void {
    this.messages.push(message);
  }

  private render() {
    const { t, factory } = this;

    t.newline();

    let note = t.let<VF.Note | undefined>('note', () => undefined);
    let notes = t.let('notes', () => new Array<VF.Note>());
    let directionNotes = t.let('directionNotes', () => new Array<VF.Note>());
    let directionMessage: DirectionMessage | undefined = undefined;
    let beamStart = t.let('beamStart', () => 0);
    let graceStart = t.let('graceStart', () => -1);
    const curAttributes: LegacyAttributesMessage = msg.legacyAttributes();
    let lastAttributes: LegacyAttributesMessage | undefined;
    let newLine = true;
    let newMeasure = false;
    let connector: VF.StaveConnectorType | undefined;
    let staffLayout: { staffDistance?: number | undefined }[] = [];
    let curPart = '';
    let firstPart = '';
    let curMeasure = 1;
    let cur1stStave = 0;
    let width: number | undefined = undefined;
    let numStaves = 1;
    let duration = 0;
    let endingLeft = '';
    let endingRight = '';
    let endingText = '';
    let endingMiddle = false;
    let autoStem = false;

    let system = t.let<VF.System | undefined>('system', () => undefined);
    let prevSystem = t.let<VF.System | undefined>('prevSystem', () => undefined);
    const systems = t.let('systems', () => new Array<VF.System>());

    function appendSystem(width?: number): VF.System {
      let system: VF.System;
      if (width) {
        system = factory.System({ x: 0, y: 0, width });
        t.literal(`system = factory.System({ x: 0, y: 0, width: ${width} })`);
      } else {
        system = factory.System({ x: 0, y: 0, autoWidth: true });
        t.literal('system = factory.System({ x: 0, y: 0, autoWidth: true })');
      }
      return system;
    }

    function createStaves() {
      if (newMeasure) {
        for (let staff = 1; staff <= numStaves; staff++) {
          if (staff == 1) cur1stStave = system!.getStaves().length;
          if (staff < numStaves) {
            system!.addStave({
              voices: [],
              spaceBelow: staffLayout[0]?.staffDistance ? staffLayout[0].staffDistance / 5 - 12 : 0,
            });
            t.literal(`system.addStave({
              voices: [],
              spaceBelow: ${staffLayout[0]?.staffDistance ? staffLayout[0].staffDistance / 5 - 12 : 0},
            })`);
          } else {
            system!.addStave({ voices: [] });
            t.literal(`system.addStave({ voices: [] })`);
          }
        }
        newMeasure = false;
      }
      if (newLine) {
        Attributes.render(t, factory, curAttributes, cur1stStave, 0, notes, systems);
        lastAttributes = undefined;
        connector = 'singleLeft';
        newLine = false;
      } else if (lastAttributes) {
        Attributes.render(t, factory, lastAttributes, cur1stStave, duration, notes, systems);
        lastAttributes = undefined;
      }
    }

    for (const message of this.messages) {
      switch (message.msgType) {
        case 'beam':
          if (message.value == 'begin') {
            beamStart = notes.length - 1;
          } else if (message.value == 'end') {
            factory.Beam({
              notes: notes.slice(beamStart) as VF.StemmableNote[],
              options: { autoStem: autoStem },
            });
            t.literal(` factory.Beam({
              notes: notes.slice(${beamStart}),
              options: { autoStem: ${autoStem} },
            })`);
            beamStart = -1;
            autoStem = false;
          }
          break;
        case 'partStart':
          if (firstPart == '') firstPart = message.id;
          curPart = message.id;
          break;
        case 'partEnd':
          if (message.msgCount == message.msgIndex + 1) {
            curMeasure++;
            if (connector) {
              system!.addConnector(connector);
              connector = undefined;
            }
          }
          break;
        case 'measureStart':
          t.newline();
          t.comment(`measure ${curMeasure}`);
          width = message.width;
          if (message.staves) {
            numStaves = message.staves;
          }
          if (firstPart == curPart) {
            t.expression(() => (prevSystem = system));
            system = appendSystem(width);
            systems.push(system);
            t.literal('systems.push(system)');
            if (prevSystem != undefined) {
              prevSystem!.format();
              t.literal('prevSystem.format()');
              system!.setX(prevSystem!.getX() + prevSystem!.getBoundingBox()!.getW());
              t.literal(`system.setX(
                prevSystem.getX() + prevSystem.getBoundingBox().getW()
              )`);
              system!.setY(prevSystem!.getY());
              t.literal('system.setY(prevSystem.getY())');
            }
          }
          newMeasure = true;
          t.expression(() => (notes = []));
          duration = 0;
          Attributes.clefMeasureStart();
          break;
        case 'legacyAttributes':
          lastAttributes = message;
          message.clefs.forEach((clef) => {
            const id = curAttributes.clefs.findIndex((obj) => {
              return obj.staff == clef.staff;
            });
            if (id >= 0) {
              curAttributes.clefs.splice(id, 1);
            }
            curAttributes.clefs.push(clef);
          });
          message.times.forEach((time) => {
            const id = curAttributes.times.findIndex((obj) => {
              return obj.staff == time.staff;
            });
            if (id >= 0) {
              curAttributes.times.splice(id, 1);
            }
            curAttributes.times.push(time);
          });
          message.keys.forEach((key) => {
            const id = curAttributes.keys.findIndex((obj) => {
              return obj.staff == key.staff;
            });
            if (id >= 0) {
              curAttributes.keys.splice(id, 1);
            }
            curAttributes.keys.push(key);
          });
          break;
        case 'print':
          newLine = true;
          system!.setX(0 + (message.systemLayout.leftMargin ?? 0));
          t.literal(`system.setX(${0 + (message.systemLayout.leftMargin ?? 0)})`);
          staffLayout = message.staffLayout;
          if (prevSystem) {
            system!.setY(
              prevSystem!.getY() + prevSystem!.getBoundingBox()!.getH() + (message.systemLayout.systemMargin ?? 50)
            );
            t.literal(`system.setY(${
              prevSystem!.getY() + prevSystem!.getBoundingBox()!.getH() + (message.systemLayout.systemMargin ?? 50)
            })
            `);
          } else {
            system!.setY(message.systemLayout.systemMargin ?? 50);
            t.literal(`system.setY(${message.systemLayout.systemMargin ?? 50})`);
          }

          /*if (system!.getX() > 1000) {
            newLine = true;
            system!.setX(0);
            system!.setY(prevSystem!.getBoundingBox()!.getH() + 50);
          }*/
          break;
        case 'direction':
          directionMessage = message;
          break;
        case 'voiceEnd':
          system!.addVoices([factory.Voice().setMode(2).addTickables(notes)]);
          t.literal(`system.addVoices([factory.Voice().setMode(2).addTickables(notes)])`);
          system!.addVoices([factory.Voice().setMode(2).addTickables(directionNotes)]);
          t.literal(`system.addVoices([factory.Voice().setMode(2).addTickables(directionNotes)])`);
          t.expression(() => (notes = []));
          t.expression(() => (directionNotes = []));
          duration = 0;
          break;
        case 'note':
          const durationDenominator = this.getDurationDenominator(message.type);
          const noteStruct: VF.GraceNoteStruct = { duration: `${durationDenominator}`, dots: message.dots };

          createStaves();

          if (message.stem) noteStruct.stem_direction = message.stem == 'up' ? 1 : -1;
          else {
            noteStruct.auto_stem = true;
            autoStem = true;
          }
          noteStruct.clef = Attributes.clefGet(message.staff, duration).clef;
          if (message.duration) duration += message.duration;
          // no pitch, rest
          if (message.head.length == 0) {
            if (noteStruct.clef == 'bass') noteStruct.keys = ['D/2'];
            else noteStruct.keys = ['B/4'];
            noteStruct.duration = `${durationDenominator}r`;
            noteStruct.dots = message.dots;
          } else {
            noteStruct.keys = [];
            for (const head of message.head) {
              noteStruct.keys.push(`${head.pitch}${this.getNotehead(head.notehead)}`);
            }
            noteStruct.duration = `${durationDenominator}`;
            noteStruct.dots = message.dots;
          }

          if (message.grace) {
            noteStruct.slash = message.graceSlash;
            note = this.factory.GraceNote(noteStruct).setStave(system!.getStaves()[cur1stStave + message.staff - 1]);
            t.literal(
              `note = factory.GraceNote(${JSON.stringify(noteStruct).replace(/\n/g, '')})
                .setStave(system.getStaves()[${cur1stStave + message.staff - 1}]);`
            );
          } else {
            note = this.factory.StaveNote(noteStruct).setStave(system!.getStaves()[cur1stStave + message.staff - 1]);
            t.literal(
              `note = factory.StaveNote(${JSON.stringify(noteStruct).replace(/\n/g, '')})
                .setStave(system.getStaves()[${cur1stStave + message.staff - 1}]);`
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
          // Process arpeggiatte
          if (message.arpeggiate) {
            switch (message.arpeggiateDirection) {
              default:
                note.addStroke(0, new VF.Stroke(7));
                break;
              case 'up':
                note.addStroke(0, new VF.Stroke(3));
                break;
              case 'down':
                note.addStroke(0, new VF.Stroke(4));
                break;
            }
          }
          t.expression(() => notes.push(note!));
          if (directionMessage?.codas.length)
            t.expression(() =>
              directionNotes.push(factory.TextNote({ glyph: 'coda', duration: note!.getDuration() }).setXShift(-20))
            );
          else if (directionMessage?.segnos.length)
            t.expression(() =>
              directionNotes.push(factory.TextNote({ glyph: 'segno', duration: note!.getDuration() }).setXShift(-20))
            );
          else t.expression(() => directionNotes.push(factory.TextNote({ text: '', duration: note!.getDuration() })));
          directionMessage = undefined;
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
          createStaves();
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
              system!.getStaves().forEach((stave) => {
                stave.setEndBarType(barlineType as number);
              });
            }
            if (message.location == 'left') {
              system!.getStaves().forEach((stave) => {
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
            system!.getStaves()[cur1stStave].setVoltaType(VF.VoltaType.BEGIN_END, endingText, 0);
            endingMiddle = false;
          } else if (endingLeft == 'start') {
            system!.getStaves()[cur1stStave].setVoltaType(VF.VoltaType.BEGIN, endingText, 0);
            if (endingRight == '') endingMiddle = true;
          } else if (endingRight == 'stop') {
            system!.getStaves()[cur1stStave].setVoltaType(VF.VoltaType.END, endingText, 0);
            endingMiddle = false;
          } else if (endingMiddle) {
            system!.getStaves()[cur1stStave].setVoltaType(VF.VoltaType.MID, endingText, 0);
          }
          endingLeft = '';
          endingRight = '';
          endingText = '';
          break;
      }
    }
    system!.format();
    const boundingBox = new BoundingBox(0, 0, 0, 0);

    systems.forEach((s) => {
      boundingBox.mergeWith(s.getBoundingBox()!);
    });
    factory
      .getContext()
      .resize(boundingBox.getX() + boundingBox.getW() + 50, boundingBox.getY() + boundingBox.getH() + 50);
    t.literal(`factory.getContext()
      .resize(${boundingBox.getX() + boundingBox.getW() + 50}, ${boundingBox.getY() + boundingBox.getH() + 50});
    `);
    t.expression(() => factory.draw());
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

  private getNotehead(notehead: string): string {
    switch (notehead) {
      case 'arrow down':
        return '/td';
      case 'arrow up':
        return '/tu';
      case 'back slashed':
        return '/sb';
      case 'circle dot':
        return '';
      case 'circle-x':
        return '/cx';
      case 'circled':
        return '/ci';
      case 'cluster':
        return '';
      case 'cross':
        return '';
      case 'diamond':
        return '/d';
      case 'do':
        return '/do';
      case 'fa':
        return '/fa';
      case 'fa up':
        return '/faup';
      case 'inverted triangle':
        return '';
      case 'left triangle':
        return '';
      case 'mi':
        return '/mi';
      case 'none':
        return '';
      case 'normal':
        return '/n';
      case 'rectangle':
        return '';
      case 'slash':
        return '/s';
      case 'slashed':
        return '';
      case 'so':
        return 'so';
      case 'square':
        return '/sq';
      case 'ti':
        return '/ti';
      case 'triangle':
        return '/tu';
      case 'x':
        return '/x';
    }
    return '/n';
  }
}
