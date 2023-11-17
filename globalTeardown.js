/* eslint-disable @typescript-eslint/no-var-requires */
// Adapted from https://jestjs.io/docs/puppeteer.

import { promises } from 'fs';
import os from 'os';
import path from 'path';

const DIR = path.join(os.tmpdir(), 'jest_puppeteer_global_setup');
export default async function () {
  // close the browser instance
  await globalThis.__BROWSER_GLOBAL__.close();

  // clean-up the wsEndpoint file
  await promises.rm(DIR, { recursive: true, force: true });
}
