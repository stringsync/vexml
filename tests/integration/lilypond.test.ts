import { Page } from 'puppeteer';
import { Vexml } from '@/index';
import * as path from 'path';
import * as fs from 'fs';
import { setup, getSnapshotIdentifier } from './helpers';

type TestCase = {
  filename: string;
  width: number;
};

const DATA_DIR = path.join(__dirname, '__data__', 'lilypond');

describe('lilypond', () => {
  let page: Page;

  beforeEach(async () => {
    page = await (globalThis as any).__BROWSER_GLOBAL__.newPage();
  });

  afterEach(async () => {
    await page.close();
  });

  // https://lilypond.org/doc/v2.23/input/regression/musicxml/collated-files.html
  it.each<TestCase>([
    { filename: '01a-Pitches-Pitches.xml', width: 900 },
    { filename: '01b-Pitches-Intervals.xml', width: 900 },
    { filename: '01c-Pitches-NoVoiceElement.xml', width: 900 },
    { filename: '01d-Pitches-Microtones.xml', width: 900 },
    { filename: '01e-Pitches-ParenthesizedAccidentals.xml', width: 900 },
    { filename: '01f-Pitches-ParenthesizedMicrotoneAccidentals.xml', width: 900 },
    { filename: '02a-Rests-Durations.xml', width: 900 },
    { filename: '02b-Rests-PitchedRests.xml', width: 900 },
    { filename: '02c-Rests-MultiMeasureRests.xml', width: 900 },
    { filename: '02d-Rests-Multimeasure-TimeSignatures.xml', width: 900 },
    { filename: '02e-Rests-NoType.xml', width: 900 },
    { filename: '03a-Rhythm-Durations.xml', width: 900 },
    { filename: '03b-Rhythm-Backup.xml', width: 900 },
    { filename: '03c-Rhythm-DivisionChange.xml', width: 900 },
    { filename: '03d-Rhythm-DottedDurations-Factors.xml', width: 900 },
    { filename: '11a-TimeSignatures.xml', width: 900 },
    { filename: '11b-TimeSignatures-NoTime.xml', width: 900 },
    { filename: '11c-TimeSignatures-CompoundSimple.xml', width: 900 },
  ])(`$filename ($width px)`, async (t) => {
    const { document, vexmlDiv, screenshotElementSelector } = setup();

    Vexml.render({
      element: vexmlDiv,
      xml: fs.readFileSync(path.join(DATA_DIR, t.filename)).toString(),
      width: t.width,
    });

    await page.setViewport({
      width: t.width,
      // height doesn't matter since we screenshot the element, not the page.
      height: 0,
    });
    await page.setContent(document.documentElement.outerHTML);

    const element = await page.$(screenshotElementSelector);
    const screenshot = await element!.screenshot();
    expect(screenshot).toMatchImageSnapshot({
      customSnapshotIdentifier: getSnapshotIdentifier({ filename: t.filename, width: t.width }),
    });
  });
});
