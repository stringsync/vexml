import { Page } from 'puppeteer';

describe('foo', () => {
  let page: Page;

  beforeEach(async () => {
    page = await (globalThis as any).__BROWSER_GLOBAL__.newPage();
  });

  afterEach(async () => {
    await page.close();
  });

  it('works', async () => {
    await page.goto('http://vexml:8080/01a-Pitches-Pitches.xml');
    const text = await page.evaluate(() => document.title);
    expect(text).toContain('vexml');
  });
});
