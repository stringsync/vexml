/* eslint-disable @typescript-eslint/no-var-requires */
// Adapted from https://jestjs.io/docs/puppeteer.

const JSDOMEnvironment = require('jest-environment-jsdom').TestEnvironment;
const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');
const os = require('os');

const DIR = path.join(os.tmpdir(), 'jest_puppeteer_global_setup');

class PuppeteerEnvironment extends JSDOMEnvironment {
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

module.exports = PuppeteerEnvironment;
