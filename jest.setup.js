/* eslint-disable @typescript-eslint/no-var-requires */
const { toMatchImageSnapshot } = require('jest-image-snapshot');

expect.extend({ toMatchImageSnapshot });
