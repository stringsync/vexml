import * as util from '@/util';
import { NoteRender, SystemRender } from './types';

export class NoteRenderRegistry {
  private constructor(private store: Map<string, NoteRender[]>) {}

  static create(systemRenders: SystemRender[]): NoteRenderRegistry {
    const store = new Map<string, NoteRender[]>();

    const noteRenders = systemRenders
      .flatMap((system) => system.measureRenders.flatMap((m) => m.fragmentRenders))
      .flatMap((f) => f.partRenders)
      .flatMap((p) => p.staveRenders)
      .flatMap((s) => s.voiceRenders)
      .flatMap((v) => v.entryRenders)
      .filter((e) => e.type === 'note');

    for (const noteRender of noteRenders) {
      const ids = util.unique([
        ...noteRender.curveIds,
        ...noteRender.graceCurves.map((c) => c.curveId),
        ...(noteRender.beamId ? [noteRender.beamId] : []),
        ...(noteRender.wedgeId ? [noteRender.wedgeId] : []),
        ...noteRender.tupletIds,
        ...(noteRender.pedalMark ? [noteRender.pedalMark.pedalId] : []),
        ...(noteRender.octaveShiftId ? [noteRender.octaveShiftId] : []),
        ...noteRender.vibratoIds,
      ]);

      for (const id of ids) {
        const renders = store.get(id) ?? [];
        util.assertDefined(renders);
        renders.push(noteRender);
        store.set(id, renders);
      }
    }

    return new NoteRenderRegistry(store);
  }

  get(id: string): NoteRender[] {
    return this.store.get(id) ?? [];
  }
}
