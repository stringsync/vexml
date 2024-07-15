/* eslint-disable @typescript-eslint/no-var-requires */
// Adapted from https://jestjs.io/docs/puppeteer.

import { TestEnvironment } from 'jest-environment-jsdom';
import fs from 'fs';
import path from 'path';
import puppeteer from 'puppeteer';
import os from 'os';

const DIR = path.join(os.tmpdir(), 'jest_puppeteer_global_setup');

export default class PuppeteerEnvironment extends TestEnvironment {
  constructor(...args) {
    super(...args);

    this.global.structuredClone = globalThis.structuredClone;
  }

  async setup() {
    await super.setup();
    // get the wsEndpoint
    const wsEndpoint = fs.readFileSync(path.join(DIR, 'wsEndpoint'), 'utf8');
    if (!wsEndpoint) {
      throw new Error('wsEndpoint not found');
    }

    // connect to puppeteer
    this.global.__BROWSER_GLOBAL__ = await puppeteer.connect({
      browserWSEndpoint: wsEndpoint,
    });
  }
}
