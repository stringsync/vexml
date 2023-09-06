module.exports = {
  globalSetup: './globalSetup.js',
  globalTeardown: './globalTeardown.js',
  setupFilesAfterEnv: ['jest-extended/all', './jest.setup.js'],
  testEnvironment: './PuppeteerEnvironment.js',
  testTimeout: 30000,
  moduleNameMapper: {
    '@/(.*)': '<rootDir>/src/$1',
  },
};
