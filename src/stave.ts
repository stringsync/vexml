import * as vexflow from 'vexflow';
import { BarStyle, ClefType } from './enums';
import { Voice } from './voice';

/**
 * Data container for vexflow.Stave objects.
 */
export class Stave {
  private x = 0;
  private y = 0;
  private width = 0;
  private noteStartX = 0;
  private clef?: ClefType;
  private timeSignature?: string;
  private beginningBarStyle?: BarStyle;
  private endBarStyle?: BarStyle;
  private voice?: Voice;

  clone(): Stave {
    return new Stave()
      .setX(this.x)
      .setY(this.y)
      .setWidth(this.width)
      .setNoteStartX(this.noteStartX)
      .setClef(this.clef)
      .setTimeSignature(this.timeSignature)
      .setBeginningBarStyle(this.beginningBarStyle)
      .setEndBarStyle(this.endBarStyle)
      .setVoice(this.voice?.clone());
  }

  getX(): number {
    return this.x;
  }

  setX(x: number): this {
    this.x = x;
    return this;
  }

  getY(): number {
    return this.y;
  }

  setY(y: number): this {
    this.y = y;
    return this;
  }

  getWidth(): number {
    return this.width;
  }

  setWidth(width: number): this {
    this.width = width;
    return this;
  }

  addWidth(width: number): this {
    this.width += width;
    return this;
  }

  getJustifyWidth(): number {
    const vfVoice = this.getVoice()?.toVexflow();
    return typeof vfVoice === 'undefined' ? 0 : new vexflow.Formatter().preCalculateMinTotalWidth([vfVoice]);
  }

  getModifiersWidth(): number {
    return this.clone().setX(0).toVexflow().getNoteStartX();
  }

  getNoteStartX(): number {
    return this.noteStartX;
  }

  setNoteStartX(noteStartX: number): this {
    this.noteStartX = noteStartX;
    return this;
  }

  getClef(): ClefType | undefined {
    return this.clef;
  }

  setClef(clef: ClefType | undefined): this {
    this.clef = clef;
    return this;
  }

  getTimeSignature(): string | undefined {
    return this.timeSignature;
  }

  setTimeSignature(timeSignature: string | undefined): this {
    this.timeSignature = timeSignature;
    return this;
  }

  getBeginningBarStyle(): BarStyle | undefined {
    return this.beginningBarStyle;
  }

  setBeginningBarStyle(barStyle: BarStyle | undefined): this {
    this.beginningBarStyle = barStyle;
    return this;
  }

  getEndBarStyle(): BarStyle | undefined {
    return this.endBarStyle;
  }

  setEndBarStyle(endBarStyle: BarStyle | undefined): this {
    this.endBarStyle = endBarStyle;
    return this;
  }

  getVoice(): Voice | undefined {
    return this.voice;
  }

  setVoice(voice: Voice | undefined): this {
    this.voice = voice;
    return this;
  }

  toVexflow(): vexflow.Stave {
    const stave = new vexflow.Stave(this.x, this.y, this.width).setNoteStartX(this.noteStartX);

    const clef = this.clef;
    if (typeof clef !== 'undefined') {
      stave.addClef(clef);
    }

    const timeSignature = this.timeSignature;
    if (typeof timeSignature !== 'undefined') {
      stave.addTimeSignature(timeSignature);
    }

    const begBarType = this.getBarlineType(this.beginningBarStyle);
    if (typeof begBarType !== 'undefined') {
      stave.setBegBarType(begBarType);
    }

    const endBarType = this.getBarlineType(this.endBarStyle);
    if (typeof endBarType !== 'undefined') {
      stave.setEndBarType(endBarType);
    }

    return stave;
  }

  private getBarlineType(barStyle: BarStyle | undefined): vexflow.BarlineType | undefined {
    switch (barStyle) {
      case 'regular':
      case 'short':
      case 'dashed':
      case 'dotted':
      case 'heavy':
        return vexflow.BarlineType.SINGLE;
      case 'heavy-light':
      case 'heavy-heavy':
      case 'light-light':
      case 'tick':
        return vexflow.BarlineType.DOUBLE;
      case 'light-heavy':
        return vexflow.BarlineType.END;
      case 'none':
        return vexflow.BarlineType.NONE;
      default:
        return undefined;
    }
  }
}
