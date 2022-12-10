import * as VF from 'vexflow';
import { AttributesMessage, CodeTracker } from '../types';

export class Attributes {
  private static clefs: Map<number, { duration: number; clef?: string; annotation?: string }[]> = new Map<
    number,
    { duration: number; clef: string }[]
  >();

  public static render(
    t: CodeTracker,
    factory: VF.Factory,
    message: AttributesMessage,
    cur1stStave: number,
    duration: number,
    notes: Array<VF.Note>,
    systems: VF.System[]
  ): void {
    for (const clefMsg of message.clefs) {
      const clefT = this.clefTranslate(clefMsg);
      this.clefSet(clefMsg.staff, duration, clefT);
      if (clefT.clef) {
        const clef = clefT.clef;
        const clefAnnotation = clefT.annotation;
        if (duration == 0) {
          const staff = clefMsg.staff;
          systems[systems.length - 1].getStaves()[cur1stStave + staff - 1].addClef(clef, 'default', clefAnnotation);
          if (clefAnnotation)
            t.literal(
              `systems[systems.length-1].getStaves()[${
                cur1stStave + staff - 1
              }].addClef('${clef}', 'default', '${clefAnnotation}');`
            );
          else
            t.literal(
              `systems[systems.length-1].getStaves()[${cur1stStave + staff - 1}].addClef('${clef}', 'default');`
            );
        } else {
          notes.push(factory.ClefNote({ type: clef, options: { size: 'small' } }));
          t.literal(`notes.push(factory.ClefNote({ type: '${clef}', options: { size: 'small' } }))`);
        }
      }
    }

    for (const timeMsg of message.times) {
      const timeSignature = timeMsg.signature;
      systems[systems.length - 1].getStaves().forEach((stave, index) => {
        if (index >= cur1stStave) stave.addTimeSignature(timeSignature);
      });
      t.literal(`systems[systems.length-1].getStaves().forEach((stave, index) => {
        if (index>=${cur1stStave}) stave.addTimeSignature('${timeSignature}');
      });`);
    }
    for (const keyMsg of message.keys) {
      const keySignature = Attributes.getKeySignature(keyMsg.fifths);
      systems[systems.length - 1].getStaves().forEach((stave, index) => {
        if (index >= cur1stStave) stave.addKeySignature(keySignature);
      });
      t.literal(`systems[systems.length-1].getStaves().forEach((stave, index) => {
        if (index>=${cur1stStave})  stave.addKeySignature('${keySignature}');
      });`);
    }
  }

  public static clefMeasureStart(): void {
    Attributes.clefs.forEach((value, key) => Attributes.clefs.set(key, [{ duration: 0, clef: value.pop()!.clef }]));
  }

  private static clefSet(staff: number, duration: number, clef: { clef?: string; annotation?: string }): void {
    let current = Attributes.clefs.get(staff);
    if (!current) current = [];
    current.push({ duration, clef: clef.clef, annotation: clef.annotation });
    Attributes.clefs.set(staff, current);
  }

  public static clefGet(staff: number, duration: number): { clef?: string; annotation?: string } {
    const current = Attributes.clefs.get(staff);
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

  private static clefTranslate(clef: { sign: string; line?: number; octaveChange?: number }): {
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

  private static getKeySignature(fifths: number): string {
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
}
