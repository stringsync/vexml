FROM ghcr.io/puppeteer/puppeteer:21.9.0

ENV VEXML_CANONICAL_TEST_ENV=true

WORKDIR /vexml

# Install dependencies.
COPY package.json .
COPY yarn.lock .
RUN yarn install

# Copy config.
COPY jest.config.js .
COPY babel.config.json .
COPY PuppeteerEnvironment.js .
COPY globalSetup.js .
COPY globalTeardown.js .
COPY jest.setup.js .

# Copy the code needed to run the dev server and tests.
COPY src src
COPY tests tests

# Run the test by default.
CMD [ "yarn", "jest" ]
