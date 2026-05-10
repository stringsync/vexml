import { Page } from 'puppeteer';
import * as path from 'path';
import * as fs from 'fs';
import { setup, getSnapshotIdentifier } from './helpers';
import * as vexml from '@/index';

type TestCase = {
  filename: string;
  width: number;
};

type ContinuationCase = {
  filename: string;
  /** Score WIDTH config (must be set; PanoramicFormatter does not support continuation). */
  width: number;
  continuationThreshold: number | null;
};

const DATA_DIR = path.resolve(__dirname, '..', '__data__', 'vexml');

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
    { filename: 'tabs_grace_notes.musicxml', width: 900 },
    { filename: 'tabs_stroke_direction.musicxml', width: 900 },
    { filename: 'tabs_ties.musicxml', width: 900 },
    { filename: 'tabs_vibrato.musicxml', width: 900 },
    { filename: 'tabs_bends.musicxml', width: 900 },
    { filename: 'chord_symbols.musicxml', width: 900 },
    { filename: 'empty_first_measure.musicxml', width: 900 },
  ])(`$filename ($width px)`, async (t) => {
    const { document, vexmlDiv, screenshotElementSelector } = setup();

    const buffer = fs.readFileSync(path.join(DATA_DIR, t.filename));
    const musicXML = buffer.toString();
    vexml.renderMusicXML(musicXML, vexmlDiv, { config: { WIDTH: t.width } });

    await page.setViewport({
      width: t.width,
      // height doesn't matter since we screenshot the element, not the page.
      height: 0,
    });
    await page.setContent(document.documentElement.outerHTML);

    const element = await page.$(screenshotElementSelector);
    const screenshot = Buffer.from((await element!.screenshot()) as any);
    expect(screenshot).toMatchImageSnapshot({
      customSnapshotIdentifier: getSnapshotIdentifier({ filename: t.filename, width: t.width }),
    });
  });

  it.each<ContinuationCase>([
    // Baseline: feature disabled — should match the un-fragmented rendering.
    {
      filename: 'continuation_measures_basic.musicxml',
      width: 1200,
      continuationThreshold: null,
    },
    // Narrow system width → eligible measures fragment, each piece on its own system.
    {
      filename: 'continuation_measures_basic.musicxml',
      width: 350,
      continuationThreshold: 200,
    },
  ])(`continuation: $filename (width=$width, threshold=$continuationThreshold)`, async (t) => {
    const { document, vexmlDiv, screenshotElementSelector } = setup();

    const buffer = fs.readFileSync(path.join(DATA_DIR, t.filename));
    const musicXML = buffer.toString();
    vexml.renderMusicXML(musicXML, vexmlDiv, {
      config: {
        WIDTH: t.width,
        CONTINUATION_MEASURE_WIDTH_THRESHOLD: t.continuationThreshold,
      },
    });

    await page.setViewport({ width: t.width, height: 0 });
    await page.setContent(document.documentElement.outerHTML);

    const element = await page.$(screenshotElementSelector);
    const screenshot = Buffer.from((await element!.screenshot()) as any);
    expect(screenshot).toMatchImageSnapshot({
      customSnapshotIdentifier: `continuation_${path.basename(t.filename, path.extname(t.filename))}_w${t.width}_t${
        t.continuationThreshold ?? 'null'
      }`,
    });
  });
});
