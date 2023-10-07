FROM ghcr.io/puppeteer/puppeteer:21.2.1

ENV VEXML_CANONICAL_TEST_ENV=true

WORKDIR /vexml

# Elevate temporarily to perform setup
# See https://github.com/puppeteer/puppeteer/blob/163394d7353d755e2b5ec47ffe56e2e869214860/docker/Dockerfile#L16
USER root
RUN mkdir -p src tests \
    chown -R pptruser:pptruser /vexml \
    && chmod -R ugoa+rwX /vexml
USER pptruser

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
