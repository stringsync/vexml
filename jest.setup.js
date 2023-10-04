/* eslint-disable @typescript-eslint/no-var-requires */
const path = require('path');
const { configureToMatchImageSnapshot } = require('jest-image-snapshot');

const customSnapshotsDir =
  process.env.VEXML_CANONICAL_TEST_ENV === 'true'
    ? undefined
    : path.join(__dirname, 'tests', 'integration', '__tmp_image_snapshots__');

const toMatchImageSnapshot = configureToMatchImageSnapshot({
  customSnapshotsDir,
});

expect.extend({ toMatchImageSnapshot });
