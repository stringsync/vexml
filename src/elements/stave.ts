import * as vexflow from 'vexflow';
import * as spatial from '@/spatial';
import { Voice } from './voice';

export class Stave {
  constructor(
    private ctx: vexflow.RenderContext,
    private voices: Array<Voice>,
    private vexflow: { stave: vexflow.Stave }
  ) {}

  getRect(): spatial.Rect {
    return spatial.Rect.merge(this.voices.map((voice) => voice.getRect()));
  }

  getVoices(): Array<Voice> {
    return this.voices;
  }

  draw(): this {
    for (const voice of this.voices) {
      voice.draw();
    }

    this.vexflow.stave.setContext(this.ctx).draw();

    return this;
  }
}
