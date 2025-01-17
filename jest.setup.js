import path from 'path';
import { configureToMatchImageSnapshot } from 'jest-image-snapshot';

jest.setTimeout(60000);

const customSnapshotsDir =
  process.env.VEXML_CANONICAL_TEST_ENV === 'true'
    ? undefined
    : path.join(__dirname, 'tests', 'integration', '__tmp_image_snapshots__');

const toMatchImageSnapshot = configureToMatchImageSnapshot({
  customSnapshotsDir,
  customDiffConfig: {
    threshold: 0.01, // 1%
  },
});

expect.extend({ toMatchImageSnapshot });
