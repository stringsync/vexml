import { Stave } from './stave';
import { Voice } from './voice';

/**
 * A data container for vexflow.System.
 */
export class System {
  private staves = new Array<Stave>();
  private voices = new Array<Voice>();

  getStaves(): Stave[] {
    return this.staves;
  }

  addStave(stave: Stave): this {
    this.staves.push(stave);
    return this;
  }

  getVoices(): Voice[] {
    return this.voices;
  }

  addVoice(voice: Voice): this {
    this.voices.push(voice);
    return this;
  }

  getWidth(): number {
    return Math.max(0, ...this.staves.map((stave) => stave.getWidth()));
  }

  setWidth(width: number): this {
    for (const stave of this.staves) {
      stave.setWidth(width);
    }
    return this;
  }

  setX(x: number): this {
    for (const stave of this.staves) {
      stave.setNoteStartX(x - stave.getX());
      stave.setX(x);
    }
    return this;
  }

  setY(y: number): this {
    for (const stave of this.staves) {
      stave.setY(y);
    }
    return this;
  }

  getJustifyWidth(): number {
    return Math.max(0, ...this.staves.map((stave) => stave.getJustifyWidth()));
  }

  getModifiersWidth(): number {
    return Math.max(0, ...this.staves.map((stave) => stave.getModifiersWidth()));
  }
}
