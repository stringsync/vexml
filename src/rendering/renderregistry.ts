import * as util from '@/util';
import { SystemRender, VoiceEntryRender } from './types';

/** RenderRegistry tracks associations between leaf render objects with spanner IDs. */
export class RenderRegistry {
  private constructor(private store: Map<string, VoiceEntryRender[]>) {}

  static create(systemRenders: SystemRender[]): RenderRegistry {
    const store = new Map<string, VoiceEntryRender[]>();

    const renders = systemRenders
      .flatMap((system) => system.measureRenders.flatMap((m) => m.fragmentRenders))
      .flatMap((f) => f.partRenders)
      .flatMap((p) => p.staveRenders)
      .flatMap((s) => s.voiceRenders)
      .flatMap((v) => v.entryRenders);

    for (const render of renders) {
      const ids = RenderRegistry.ids(render);
      for (const id of ids) {
        const renders = store.get(id) ?? [];
        util.assertDefined(renders);
        renders.push(render);
        store.set(id, renders);
      }
    }

    return new RenderRegistry(store);
  }

  private static ids(render: VoiceEntryRender): string[] {
    const ids = new Array<string>();

    function collect(o: string[] | string | null | undefined) {
      if (Array.isArray(o)) {
        ids.push(...o);
      } else if (o) {
        ids.push(o);
      }
    }

    if (render.type === 'note') {
      collect(render.curveIds);
      collect(render.graceCurves.map((c) => c.curveId));
      collect(render.beamId);
      collect(render.wedgeId);
      collect(render.tupletIds);
      collect(render.pedalMark?.pedalId);
      collect(render.octaveShiftId);
      collect(render.vibratoIds);
    }

    if (render.type === 'rest') {
      collect(render.tupletIds);
      collect(render.beamId);
    }

    return util.unique(ids);
  }

  get(id: string): VoiceEntryRender[] {
    return this.store.get(id) ?? [];
  }
}
