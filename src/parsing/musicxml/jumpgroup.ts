import * as data from '@/data';
import * as musicxml from '@/musicxml';

export class JumpGroup {
  constructor(private jumps: data.Jump[]) {}

  static fromMusicXML(measureIndex: number, musicXML: { scorePartwise: musicxml.ScorePartwise }): JumpGroup {
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

  // private static getStartRepeatEnding(musicXML: { barline: musicxml.Barline }): data.Jump {
  //   util.assert(musicXML.barline.isEnding(), 'expected barline to be an ending');

  //   let endBracketType: data.EndingBracketType = 'none';
  //   switch (musicXML.barline.getEndingType()) {
  //     case 'start':
  //       endBracketType = 'begin';
  //       break;
  //     case 'stop':
  //       endBracketType = 'end';
  //       break;
  //     case 'discontinue':
  //       endBracketType = 'mid';
  //       break;
  //   }

  //   const text = musicXML.barline.getEndingText();
  //   const number = musicXML.barline.getEndingNumber();
  //   const times = musicXML.barline.getRepeatTimes() ?? number.split(',').length;
  //   const label = text ? text : `${number}.`;

  //   return { type: 'repeatending', times, label, endBracketType };
  // }

  // private static getEndRepeatEnding(musicXML: { barline: musicxml.Barline }): data.Jump {
  //   util.assert(musicXML.barline.isEnding(), 'expected barline to be an ending');

  //   let endBracketType: data.EndingBracketType = 'none';
  //   switch (musicXML.barline.getEndingType()) {
  //     case 'start':
  //       endBracketType = 'begin';
  //       break;
  //     case 'stop':
  //       endBracketType = 'end';
  //       break;
  //     case 'discontinue':
  //       endBracketType = 'beginend';
  //       break;
  //   }

  //   const text = musicXML.barline.getEndingText();
  //   const number = musicXML.barline.getEndingNumber();
  //   const times = musicXML.barline.getRepeatTimes() ?? number.split(',').length;
  //   const label = text ? text : `${number}.`;

  //   return { type: 'repeatending', times, label, endBracketType };
  // }

  parse(): data.JumpGroup {
    return {
      type: 'jumpgroup',
      jumps: this.jumps,
    };
  }
}
