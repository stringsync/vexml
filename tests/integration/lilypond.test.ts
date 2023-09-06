import { Page, Viewport } from 'puppeteer';
import { Vexml } from '@/index';
import * as path from 'path';
import * as fs from 'fs';

type TestCase = {
  filename: string;
  viewport: Viewport;
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
    { filename: '01a-Pitches-Pitches.xml', viewport: { width: 1920, height: 1080 } },
    { filename: '01a-Pitches-Pitches.xml', viewport: { width: 360, height: 800 } },
  ])(`renders: $filename ($viewport.width X $viewport.height)`, async (t) => {
    await page.setViewport(t.viewport);

    const div = document.createElement('div');
    div.setAttribute('id', 'screenshot');

    const xml = fs.readFileSync(path.join(DATA_DIR, t.filename)).toString();

    Vexml.render({ element: div, xml, width: t.viewport.width });
    await page.setContent(div.outerHTML);

    const element = await page.$('#screenshot');
    const screenshot = await element!.screenshot();
    expect(screenshot).toMatchImageSnapshot();
  });
});
