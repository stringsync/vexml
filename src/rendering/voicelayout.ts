import * as util from '@/util';
import { Config } from './config';
import { Logger } from '@/debug';
import { Document } from './document';
import { VoiceEntryKey, VoiceKey } from './types';
import { Rect } from '@/spatial';

/**
 * Accounts for the positions of voices and notes.
 *
 * Voice and note positions depend on the other voice and note positions within the same **fragment part**. Therefore,
 * when doing a DFS-like operation on the stave subtree, we will not know the rect until we have visited all the
 * nodes.
 *
 * Vexflow already formats voices and notes across staves. This class is mainly responsible for caching that format
 * result and passing it to Renderables that need it.
 */
export class VoiceLayout {
  constructor(
    private config: Config,
    private log: Logger,
    private document: Document,
    private key: VoiceKey,
    private staveWidth: number
  ) {}

  rect(key: VoiceEntryKey): Rect {
    const rect = this.rects().get(key.voiceEntryIndex);
    util.assertDefined(rect);
    return rect;
  }

  @util.memoize()
  private rects(): Map<number, Rect> {
    const rects = new Map<number, Rect>();

    return rects;
  }
}
