import * as VF from 'vexflow';
import { BoundingBox, Clef, StaveModifierPosition } from 'vexflow';
import { Producer } from '../producers/producer';
import { CodeTracker, DirectionMessage, NoteMessage, VexmlMessage, VexmlMessageReceiver } from '../types';
import { CodePrinter } from '../util/codeprinter';
import { Attributes } from './attributes';
import { Notations } from './notations';

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
    let directionNotes = t.let('notes', () => new Array<VF.Note>());
    let directionMessage: DirectionMessage | undefined = undefined;
    let beamStart = t.let('beamStart', () => 0);
    let graceStart = t.let('graceStart', () => -1);
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

    const systems: VF.System[] = [];

    function appendSystem(width?: number): VF.System {
      let system: VF.System;
      if (width) {
        system = factory.System({ x: 0, y: 0, width, spaceBetweenStaves: 12 }) as VF.System;
      } else {
        system = factory.System({ x: 0, y: 0, autoWidth: true, spaceBetweenStaves: 12 }) as VF.System;
      }
      return system;
    }

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
                options: { autoStem: autoStem },
              })
            );
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
          }
          break;
        case 'measureStart':
          t.newline();
          t.comment(`measure ${curMeasure}`);
          width = message.width;
          if (message.staves) {
            numStaves = message.staves;
          }
          if (firstPart == curPart) systems.push(appendSystem(width));
          for (let staff = 1; staff <= numStaves; staff++) {
            if (staff == 1) cur1stStave = systems[systems.length - 1].getStaves().length;
            systems[systems.length - 1].addStave({ voices: [] });
            t.literal(`system.addStave({voices:[]})`);
          }
          t.expression(() => (notes = []));
          duration = 0;
          Attributes.clefMeasureStart();
          break;
        case 'attributes':
          Attributes.render(t, factory, message, cur1stStave, duration, notes, systems);
          break;
        case 'direction':
          directionMessage = message;
          break;
        case 'voiceEnd':
          systems[systems.length - 1].addVoices([factory.Voice().setMode(2).addTickables(notes)]);
          t.literal(`systems[systems.length-1].addVoices([factory.Voice().setMode(2).addTickables(notes)])`);
          systems[systems.length - 1].addVoices([factory.Voice().setMode(2).addTickables(directionNotes)]);
          t.literal(`systems[systems.length-1].addVoices([factory.Voice().setMode(2).addTickables(directionNotes)])`);
          t.expression(() => (notes = []));
          t.expression(() => (directionNotes = []));
          duration = 0;
          break;
        case 'note':
          const durationDenominator = this.getDurationDenominator(message.type);
          const noteStruct: VF.GraceNoteStruct = { duration: `${durationDenominator}`, dots: message.dots };

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
            note = this.factory
              .GraceNote(noteStruct)
              .setStave(systems[systems.length - 1].getStaves()[cur1stStave + message.staff - 1]);
            t.literal(
              `note = factory.GraceNote(${JSON.stringify(noteStruct).replace(/\n/g, '')})
                .setStave(systems[systems.length-1].getStaves()[${cur1stStave + message.staff - 1}]);`
            );
          } else {
            note = this.factory
              .StaveNote(noteStruct)
              .setStave(systems[systems.length - 1].getStaves()[cur1stStave + message.staff - 1]);
            t.literal(
              `note = factory.StaveNote(${JSON.stringify(noteStruct).replace(/\n/g, '')})
                .setStave(systems[systems.length-1].getStaves()[${cur1stStave + message.staff - 1}]);`
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
              systems[systems.length - 1].getStaves().forEach((stave) => {
                stave.setEndBarType(barlineType as number);
              });
            }
            if (message.location == 'left') {
              systems[systems.length - 1].getStaves().forEach((stave) => {
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
            systems[systems.length - 1].getStaves()[cur1stStave].setVoltaType(VF.VoltaType.BEGIN_END, endingText, 0);
            endingMiddle = false;
          } else if (endingLeft == 'start') {
            systems[systems.length - 1].getStaves()[cur1stStave].setVoltaType(VF.VoltaType.BEGIN, endingText, 0);
            if (endingRight == '') endingMiddle = true;
          } else if (endingRight == 'stop') {
            systems[systems.length - 1].getStaves()[cur1stStave].setVoltaType(VF.VoltaType.END, endingText, 0);
            endingMiddle = false;
          } else if (endingMiddle) {
            systems[systems.length - 1].getStaves()[cur1stStave].setVoltaType(VF.VoltaType.MID, endingText, 0);
          }
          endingLeft = '';
          endingRight = '';
          endingText = '';
          break;
      }
    }
    let prevSystem: VF.System | undefined;
    const boundingBox = new BoundingBox(0, 0, 0, 0);
    const clefs: Clef[][] = [];

    // Initialise clefs to keep tack of the latest one shown in each staff
    systems[0]
      .getStaves()
      .forEach((stave) => clefs.push(stave.getModifiers(StaveModifierPosition.BEGIN, Clef.CATEGORY) as Clef[]));
    systems.forEach((s) => {
      if (prevSystem) {
        let x = prevSystem.getX() + prevSystem.getBoundingBox()!.getW();
        let y = prevSystem.getY();
        if (x > 1000) {
          x = 0;
          y += prevSystem.getBoundingBox()!.getH() + 50;
          s.addConnector('singleLeft');
          // On new lines make sure that the latest Clef is rendered if there is not a new one.
          s.getStaves().forEach((stave, index) => {
            if (stave.getModifiers(StaveModifierPosition.BEGIN, Clef.CATEGORY).length == 0) {
              stave.addModifier(new Clef((clefs[index][0] as any).type));
            }
          });
        }
        s.setX(x);
        s.setY(y);
        // Keep track of last Clef rendered on each Staff both at the begin and end position.
        s.getStaves().forEach((stave, index) => {
          const clef = stave.getModifiers(StaveModifierPosition.BEGIN, Clef.CATEGORY) as Clef[];
          const endClef = stave.getModifiers(StaveModifierPosition.END, Clef.CATEGORY) as Clef[];
          if (endClef.length != 0) clefs[index] = endClef;
          else if (clef.length != 0) clefs[index] = clef;
        });
      } else {
        s.addConnector('singleLeft');
      }
      s.format();
      boundingBox.mergeWith(s.getBoundingBox()!);
      prevSystem = s;
    });
    factory
      .getContext()
      .resize(boundingBox.getX() + boundingBox.getW() + 50, boundingBox.getY() + boundingBox.getH() + 50);
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
