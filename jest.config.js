module.exports = {
  globalSetup: './jest.setup.js',
  globalTeardown: './jest.teardown.js',
  setupFilesAfterEnv: ['jest-extended/all'],
  testEnvironment: './PuppeteerEnvironment.js',
  testTimeout: 30000,
  moduleNameMapper: {
    '@/(.*)': '<rootDir>/src/$1',
  },
};
