export default {
  globalSetup: './globalSetup.js',
  globalTeardown: './globalTeardown.js',
  setupFilesAfterEnv: ['jest-extended/all', './jest.setup.js'],
  testEnvironment: './PuppeteerEnvironment.js',
  testTimeout: 30000,
  testPathIgnorePatterns: ['/node_modules/', '/cli/'],
  moduleNameMapper: {
    '@/(.*)': '<rootDir>/src/$1',
    // @stringsync/mdom only exposes an ESM "import" export condition, which jest's CJS resolver can't follow. Point the
    // bare specifier at its dist entry and let babel transform it (see transformIgnorePatterns).
    '^@stringsync/mdom$': '<rootDir>/node_modules/@stringsync/mdom/dist/index.js',
  },
  transformIgnorePatterns: ['/node_modules/(?!(@stringsync/mdom)/)'],
  reporters: ['default', 'jest-image-snapshot/src/outdated-snapshot-reporter.js'],
};
