import * as data from '@/data';
import * as musicxml from '@/musicxml';

export class JumpGroup {
  constructor(private jumps: data.Jump[]) {}

  static fromMusicXML(measureIndex: number, musicXML: { scorePartwise: musicxml.ScorePartwise }): JumpGroup {
    const jumps = new Array<data.Jump>();

    const measures = musicXML.scorePartwise
      .getParts()
      .map((part) => part.getMeasures())
      .map((measures) => measures[measureIndex]);

    const barlines = measures.flatMap((measure) => measure.getBarlines());
    const repeatBarlines = barlines.filter((barline) => barline.isRepeat());

    const hasStartRepeat = repeatBarlines.some((barline) => barline.getRepeatDirection() === 'forward');
    if (hasStartRepeat) {
      jumps.push({ type: 'repeatstart' });
    }

    const endRepeat = repeatBarlines.find((barline) => barline.getRepeatDirection() === 'backward');
    if (endRepeat && endRepeat.isEnding()) {
      jumps.push({ type: 'repeatending', times: endRepeat.getEndingNumber().split(',').length });
    }
    if (endRepeat && !endRepeat.isEnding()) {
      jumps.push({ type: 'repeatend', times: endRepeat.getRepeatTimes() ?? 1 });
    }

    return new JumpGroup(jumps);
  }

  parse(): data.JumpGroup {
    return {
      type: 'jumpgroup',
      jumps: this.jumps,
    };
  }
}
