import { Page } from 'puppeteer';
import { Vexml } from '@/index';
import * as path from 'path';
import * as fs from 'fs';
import { setup, getSnapshotIdentifier } from './helpers';

type TestCase = {
  filename: string;
  width: number;
};

const DATA_DIR = path.join(__dirname, '__data__', 'vexml');

describe('vexml', () => {
  let page: Page;

  beforeAll(async () => {
    page = await (globalThis as any).__BROWSER_GLOBAL__.newPage();
  });

  afterAll(async () => {
    await page.close();
  });

  it.each<TestCase>([
    { filename: 'multi_system_spanners.musicxml', width: 400 },
    { filename: 'multi_stave_single_part_formatting.musicxml', width: 900 },
    { filename: 'multi_part_formatting.musicxml', width: 900 },
    { filename: 'complex_formatting.musicxml', width: 900 },
    { filename: 'prelude_no_1_snippet.musicxml', width: 900 },
    { filename: 'tabs_basic.musicxml', width: 900 },
    { filename: 'tabs_with_stave.musicxml', width: 900 },
    { filename: 'tabs_slurs.musicxml', width: 900 },
    { filename: 'tabs_natural_harmonics.musicxml', width: 900 },
    { filename: 'tabs_slides.musicxml', width: 900 },
    { filename: 'tabs_taps.musicxml', width: 900 },
    { filename: 'tabs_dead_notes.musicxml', width: 900 },
    { filename: 'tabs_multi_voice.musicxml', width: 900 },
  ])(`$filename ($width px)`, async (t) => {
    const { document, vexmlDiv, screenshotElementSelector } = setup();

    const buffer = fs.readFileSync(path.join(DATA_DIR, t.filename));

    Vexml.fromBuffer(buffer).render({
      element: vexmlDiv,
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
