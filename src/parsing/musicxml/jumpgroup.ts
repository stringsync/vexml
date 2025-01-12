import * as data from '@/data';
import * as musicxml from '@/musicxml';

export class JumpGroup {
  constructor(private jumps: data.Jump[]) {}

  static create(measureIndex: number, musicXML: { scorePartwise: musicxml.ScorePartwise }): JumpGroup {
    const measures = musicXML.scorePartwise
      .getParts()
      .map((part) => part.getMeasures())
      .map((measures) => measures[measureIndex]);

    const barlines = measures.flatMap((measure) => measure.getBarlines());

    const jumps = [
      ...JumpGroup.getRepeats({ direction: 'forward', barlines }),
      ...JumpGroup.getRepeats({ direction: 'backward', barlines }),
      ...JumpGroup.getBarlineEndings({ location: 'left', barlines }),
      ...JumpGroup.getBarlineEndings({ location: 'right', barlines }),
    ];

    return new JumpGroup(jumps);
  }

  private static getRepeats(musicXML: {
    direction: musicxml.RepeatDirection;
    barlines: musicxml.Barline[];
  }): data.Jump[] {
    const barline = musicXML.barlines.find((b) => b.isRepeat() && b.getRepeatDirection() === musicXML.direction);
    if (!barline) {
      return [];
    }

    if (musicXML.direction === 'forward') {
      return [{ type: 'repeatstart' }];
    } else {
      const times = barline.getRepeatTimes() ?? 1;
      return [{ type: 'repeatend', times }];
    }
  }

  private static getBarlineEndings(musicXML: {
    location: musicxml.BarlineLocation;
    barlines: musicxml.Barline[];
  }): data.Jump[] {
    const barline = musicXML.barlines.find((b) => b.isEnding() && b.getLocation() === musicXML.location);
    if (!barline) {
      return [];
    }

    let endBracketType: data.EndingBracketType = 'none';
    switch (barline.getEndingType()) {
      case 'start':
        endBracketType = 'begin';
        break;
      case 'stop':
        endBracketType = 'end';
        break;
      case 'discontinue':
        endBracketType = 'mid';
        break;
    }

    const text = barline.getEndingText();
    const number = barline.getEndingNumber();
    const times = barline.getRepeatTimes() ?? number.split(',').length;
    const label = text ? text : `${number}.`;

    return [{ type: 'repeatending', times, label, endBracketType }];
  }

  getStartBarlineStyle(): data.BarlineStyle | null {
    return this.jumps.find((jump) => jump.type === 'repeatstart') ? 'repeatstart' : null;
  }

  getEndBarlineStyle(): data.BarlineStyle | null {
    return this.jumps.find((jump) => jump.type === 'repeatend') ? 'repeatend' : null;
  }

  parse(): data.JumpGroup {
    return {
      type: 'jumpgroup',
      jumps: this.jumps,
    };
  }
}