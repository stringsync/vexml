import * as data from '@/data';
import * as mdom from '@stringsync/mdom';
import { MdomSystem } from './system';
import { IdProvider } from '@/parsing/musicxml/idprovider';
import { ScoreContext } from '@/parsing/musicxml/contexts';
import { Config } from '@/config';
import { Logger } from '@/debug';

export class MdomScore {
  private constructor(
    private config: Config,
    private log: Logger,
    private idProvider: IdProvider,
    private title: string,
    private partLabels: string[],
    private systems: MdomSystem[]
  ) {}

  static create(config: Config, log: Logger, score: mdom.Score): MdomScore {
    const idProvider = new IdProvider();
    // Legacy reads only <movement-title> (trimmed); it does not fall back to <work><work-title> like mdom's .title.
    const title = score.child('movement-title')?.text?.trim() ?? '';
    // Mirror legacy getPartDetails(): labels come from <part-list><score-part>, not the actual <part> elements.
    const partLabels = (score.child('part-list')?.childrenNamed('score-part') ?? []).map(
      (scorePart) => scorePart.child('part-name')?.text ?? ''
    );

    // When parsing, we assume a single system. Pre-rendering determines the minimum widths used to split into multiple
    // systems if a constrained width requires it.
    const systems = [MdomSystem.create(config, log, score)];

    return new MdomScore(config, log, idProvider, title, partLabels, systems);
  }

  parse(): data.Score {
    const scoreCtx = new ScoreContext(this.idProvider);

    return {
      type: 'score',
      title: this.title,
      partLabels: this.partLabels,
      systems: this.systems.map((s) => s.parse(scoreCtx)),
      curves: scoreCtx.getCurves(),
      wedges: scoreCtx.getWedges(),
      pedals: scoreCtx.getPedals(),
      octaveShifts: scoreCtx.getOctaveShifts(),
      vibratos: scoreCtx.getVibratos(),
    };
  }
}
