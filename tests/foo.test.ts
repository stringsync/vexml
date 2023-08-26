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
    await page.goto('https://google.com');
    const text = await page.evaluate(() => document.title);
    expect(text).toBe('Google');
  });
});
