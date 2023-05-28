import * as vexflow from 'vexflow';
import { ClefType } from './enums';
import { Voice } from './voice';

/**
 * Data container for vexflow.Stave objects.
 */
export class Stave {
  private x = 0;
  private y = 0;
  private width = 0;
  private voiceWidth = 0;
  private modifiersWidth = 0;
  private noteStartX = 0;
  private clef?: ClefType;
  private timeSignature?: string;
  private begBarType?: vexflow.BarlineType;
  private endBarType?: vexflow.BarlineType;
  private voice?: Voice;

  clone(): Stave {
    return new Stave()
      .setX(this.x)
      .setY(this.y)
      .setWidth(this.width)
      .setVoiceWidth(this.voiceWidth)
      .setModifiersWidth(this.modifiersWidth)
      .setNoteStartX(this.noteStartX)
      .setClef(this.clef)
      .setTimeSignature(this.timeSignature)
      .setBegBarType(this.begBarType)
      .setEndBarType(this.endBarType)
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

  setVoiceWidth(voiceWidth: number): this {
    this.voiceWidth = voiceWidth;
    return this;
  }

  getVoiceWidth(): number {
    return this.voiceWidth;
  }

  setModifiersWidth(modifiersWidth: number): this {
    this.modifiersWidth = modifiersWidth;
    return this;
  }

  getModifiersWidth(): number {
    return this.modifiersWidth;
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

  getBegBarType(): vexflow.BarlineType | undefined {
    return this.begBarType;
  }

  setBegBarType(begBarType: vexflow.BarlineType | undefined): this {
    this.begBarType = begBarType;
    return this;
  }

  getEndBarType(): vexflow.BarlineType | undefined {
    return this.endBarType;
  }

  setEndBarType(endBarType: vexflow.BarlineType | undefined): this {
    this.endBarType = endBarType;
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

    const begBarType = this.begBarType;
    if (typeof begBarType !== 'undefined') {
      stave.setBegBarType(begBarType);
    }

    const endBarType = this.endBarType;
    if (typeof endBarType !== 'undefined') {
      stave.setEndBarType(endBarType);
    }

    return stave;
  }
}
