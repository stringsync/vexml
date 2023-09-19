import { Page } from 'puppeteer';
import { Vexml } from '@/index';
import { registerFont } from 'canvas';
import * as path from 'path';
import * as fs from 'fs';

type TestCase = {
  filename: string;
  width: number;
};

const DATA_DIR = path.join(__dirname, '__data__', 'lilypond');
const FONTS_DIR = path.join(__dirname, '../../node_modules/vexflow-fonts');

describe('lilypond', () => {
  let page: Page;

  beforeAll(() => {
    registerFont(path.join(FONTS_DIR, 'bravura/Bravura_1.392.otf'), { family: 'Bravura' });
  });

  beforeEach(async () => {
    page = await (globalThis as any).__BROWSER_GLOBAL__.newPage();
  });

  afterEach(async () => {
    await page.close();
  });

  // https://lilypond.org/doc/v2.23/input/regression/musicxml/collated-files.html
  it.each<TestCase>([
    { filename: '01a-Pitches-Pitches.xml', width: 900 },
    { filename: '01a-Pitches-Pitches.xml', width: 360 },
  ])(`$filename ($width px)`, async (t) => {
    const outerDiv = document.createElement('div');
    const innerDiv = document.createElement('div');

    outerDiv.append(innerDiv);

    outerDiv.setAttribute('id', 'screenshot');
    outerDiv.style.paddingLeft = '16px';
    outerDiv.style.paddingRight = '16px';
    outerDiv.style.display = 'inline-block';

    Vexml.render({
      element: innerDiv,
      xml: fs.readFileSync(path.join(DATA_DIR, t.filename)).toString(),
      width: t.width,
    });

    await page.setViewport({
      width: t.width,
      // height doesn't matter since we screenshot the element, not the page.
      height: 0,
    });
    await page.setContent(outerDiv.outerHTML);
    await page.evaluate(() => {
      const style = document.createElement('style');

      style.innerHTML = `
        @font-face {
          font-family: 'Bravura';
          src: url('https://cdn.jsdelivr.net/npm/vexflow-fonts@1.0.6/bravura/Bravura_1.392.otf') format('opentype');
        }
      `;

      document.head.appendChild(style);
    });

    const element = await page.$('#screenshot');
    const screenshot = await element!.screenshot();
    expect(screenshot).toMatchImageSnapshot();
  });
});
