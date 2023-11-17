/* eslint-disable @typescript-eslint/no-var-requires */
// Adapted from https://jestjs.io/docs/puppeteer.

import { promises } from 'fs';
import os from 'os';
import path from 'path';
import puppeteer from 'puppeteer';

const DIR = path.join(os.tmpdir(), 'jest_puppeteer_global_setup');

export default async function () {
  const browser = await puppeteer.launch({
    headless: 'new',
    // Required for Docker version of Puppeteer
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--font-render-hinting=none'],
  });
  // store the browser instance so we can teardown it later
  // this global is only available in the teardown but not in TestEnvironments
  globalThis.__BROWSER_GLOBAL__ = browser;

  // use the file system to expose the wsEndpoint for TestEnvironments
  await promises.mkdir(DIR, { recursive: true });
  await promises.writeFile(path.join(DIR, 'wsEndpoint'), browser.wsEndpoint());
}
