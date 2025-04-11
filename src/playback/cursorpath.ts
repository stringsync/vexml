import { CursorFrame } from './types';

/** A collection of cursor frames for a given part index.. */
export class CursorPath {
  constructor(private partIndex: number, private frames: CursorFrame[]) {}

  getPartIndex(): number {
    return this.partIndex;
  }

  getFrames(): CursorFrame[] {
    return this.frames;
  }
}
