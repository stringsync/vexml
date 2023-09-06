// eslint-disable-next-line @typescript-eslint/no-var-requires
const { configureToMatchImageSnapshot } = require('jest-image-snapshot');

const toMatchImageSnapshot = configureToMatchImageSnapshot({
  failureThreshold: 1,
  failureThresholdType: 'percent',
});

expect.extend({ toMatchImageSnapshot });
