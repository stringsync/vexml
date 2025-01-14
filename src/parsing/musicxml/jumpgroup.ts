import * as data from '@/data';
import * as musicxml from '@/musicxml';

export class JumpGroup {
  constructor(private jumps: data.Jump[]) {}

  static create(measureIndex: number, musicXML: { scorePartwise: musicxml.ScorePartwise }): JumpGroup {
    const barlines = musicXML.scorePartwise
      .getParts()
      .map((part) => part.getMeasures())
      .map((measures) => measures[measureIndex])
      .flatMap((measure) => measure.getBarlines());

    const jumps = new Array<data.Jump>();

    const leftBarlines = barlines.filter(
      (barline) => barline.getRepeatDirection() === 'forward' || barline.getLocation() === 'left'
    );
    const rightBarlines = barlines.filter(
      (barline) => barline.getRepeatDirection() === 'backward' || barline.getLocation() === 'right'
    );

    if (leftBarlines.some((barline) => barline.isRepeat())) {
      jumps.push({ type: 'repeatstart' });
    }

    const leftEnding = leftBarlines.find((barline) => barline.isEnding());
    const rightEnding = rightBarlines.find((barline) => barline.isEnding());
    const repeatEnd = rightBarlines.find((barline) => barline.isRepeat());
    if (leftEnding || rightEnding) {
      const hasStart = leftEnding?.getEndingType() === 'start';
      const hasStop = rightEnding?.getEndingType() === 'stop';

      let endingBracketType: data.EndingBracketType = 'mid';
      if (hasStart && hasStop) {
        endingBracketType = 'both';
      } else if (hasStart) {
        endingBracketType = 'begin';
      } else if (hasStop) {
        endingBracketType = 'end';
      }

      const label =
        leftEnding?.getEndingText() ||
        rightEnding?.getEndingText() ||
        leftEnding?.getEndingNumber() ||
        rightEnding?.getEndingNumber() ||
        '';

      let times = 0;
      if (repeatEnd) {
        times = repeatEnd.getRepeatTimes() ?? 1;
      }

      jumps.push({ type: 'repeatending', times, label, endingBracketType });
    } else if (repeatEnd) {
      jumps.push({ type: 'repeatend', times: repeatEnd.getRepeatTimes() ?? 1 });
    }

    return new JumpGroup(jumps);
  }

  getStartBarlineStyle(): data.BarlineStyle | null {
    return this.jumps.some((jump) => jump.type === 'repeatstart') ? 'repeatstart' : null;
  }

  getEndBarlineStyle(): data.BarlineStyle | null {
    return this.jumps.some((jump) => jump.type === 'repeatend' || (jump.type === 'repeatending' && jump.times > 0))
      ? 'repeatend'
      : null;
  }

  parse(): data.Jump[] {
    return this.jumps;
  }
}
