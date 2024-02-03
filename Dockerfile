FROM ghcr.io/puppeteer/puppeteer:21.9.0

ENV VEXML_CANONICAL_TEST_ENV=true

WORKDIR /vexml

# Elevate temporarily to perform setup
# See https://github.com/puppeteer/puppeteer/blob/163394d7353d755e2b5ec47ffe56e2e869214860/docker/Dockerfile#L16
USER root

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

# Allow pptruser to read and write to the directories under /vexml, which is needed when snapshots don't match. This is
# done after the COPY commands, since those would've changed the owner and maybe permissions (?) depending on the
# platform and version of Docker engine.
RUN chown -R pptruser:pptruser tests \
    && chmod -R ugoa+rwX tests
USER pptruser

# Run the test by default.
CMD [ "yarn", "jest" ]
