module.exports = {
  globalSetup: './globalSetup.js',
  globalTeardown: './globalTeardown.js',
  setupFilesAfterEnv: ['jest-extended/all', './jest.setup.js'],
  testEnvironment: './PuppeteerEnvironment.js',
  testTimeout: 30000,
  moduleNameMapper: {
    '@/(.*)': '<rootDir>/src/$1',
    '^vexflow$': '<rootDir>/node_modules/vxflw-early-access',
  },
  reporters: ['default', 'jest-image-snapshot/src/outdated-snapshot-reporter.js'],
};
