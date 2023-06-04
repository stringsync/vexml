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
  private clef?: ClefType;
  private timeSignature?: string;
  private beginningBarStyle?: BarStyle;
  private endBarStyle?: BarStyle;
  private voice?: Voice;

  /**
   * Creates a deep clone of the stave.
   */
  clone(): Stave {
    return new Stave()
      .setX(this.x)
      .setY(this.y)
      .setWidth(this.width)
      .setClef(this.clef)
      .setTimeSignature(this.timeSignature)
      .setBeginningBarStyle(this.beginningBarStyle)
      .setEndBarStyle(this.endBarStyle)
      .setVoice(this.voice?.clone());
  }

  /**
   * Returns the X coordinate of where the stave starts.
   */
  getX(): number {
    return this.x;
  }

  /**
   * Sets the X coordinate of where the stave starts.
   */
  setX(x: number): this {
    this.x = x;
    return this;
  }

  /**
   * Returns the Y coordinate of where the stave starts.
   */
  getY(): number {
    return this.y;
  }

  /**
   * Sets the Y coordinate of where the stave starts.
   */
  setY(y: number): this {
    this.y = y;
    return this;
  }

  /**
   * Returns the width of the stave.
   */
  getWidth(): number {
    return this.width;
  }

  /**
   * Sets the width of the stave.
   */
  setWidth(width: number): this {
    this.width = width;
    return this;
  }

  /**
   * Adds width to the stave.
   */
  addWidth(width: number): this {
    this.width += width;
    return this;
  }

  /**
   * Calculates the minunmum justify width of the stave.
   */
  getJustifyWidth(): number {
    const vfVoice = this.getVoice()?.toVexflow();
    return typeof vfVoice === 'undefined' ? 0 : new vexflow.Formatter().preCalculateMinTotalWidth([vfVoice]);
  }

  /**
   * Calculates the minimum width needed to accomodate the modifiers.
   */
  getModifiersWidth(): number {
    return this.clone().setX(0).toVexflow().getNoteStartX();
  }

  /**
   * Returns the X coordinate of where the notes start.
   */
  getNoteStartX(): number {
    return this.toVexflow().getNoteStartX();
  }

  /**
   * Returns the clef of the stave.
   */
  getClef(): ClefType | undefined {
    return this.clef;
  }

  /**
   * Sets the clef of the stave.
   */
  setClef(clef: ClefType | undefined): this {
    this.clef = clef;
    return this;
  }

  /**
   * Returns the time signature of the stave.
   */
  getTimeSignature(): string | undefined {
    return this.timeSignature;
  }

  /**
   * Sets the time signature of the stave.
   */
  setTimeSignature(timeSignature: string | undefined): this {
    this.timeSignature = timeSignature;
    return this;
  }

  /**
   * Returns the beginning bar style of the stave.
   */
  getBeginningBarStyle(): BarStyle | undefined {
    return this.beginningBarStyle;
  }

  /**
   * Sets the beginning bar style of the stave.
   */
  setBeginningBarStyle(barStyle: BarStyle | undefined): this {
    this.beginningBarStyle = barStyle;
    return this;
  }

  /**
   * Returns the end bar style of the stave.
   */
  getEndBarStyle(): BarStyle | undefined {
    return this.endBarStyle;
  }

  /**
   * Sets the end bar style of the stave.
   */
  setEndBarStyle(endBarStyle: BarStyle | undefined): this {
    this.endBarStyle = endBarStyle;
    return this;
  }

  /**
   * Returns the voice of the stave.
   */
  getVoice(): Voice | undefined {
    return this.voice;
  }

  /**
   * Sets the voice of the stave.
   */
  setVoice(voice: Voice | undefined): this {
    this.voice = voice;
    return this;
  }

  /**
   * Transforms the stave into a Vexflow Stave.
   */
  toVexflow(): vexflow.Stave {
    const stave = new vexflow.Stave(this.x, this.y, this.width);

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
