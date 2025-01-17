FROM ghcr.io/puppeteer/puppeteer:23.9.0

ENV VEXML_CANONICAL_TEST_ENV=true

WORKDIR /app

# Install dependencies.
USER node
COPY package.json .
COPY package-lock.json .
# Workaround for puppeteer base image setting USER:
# https://github.com/puppeteer/puppeteer/blob/c764f82c7435bdc10e6a9007892ab8dba111d21c/docker/Dockerfile#
# Also see: https://github.com/nodejs/docker-node/issues/740
USER root
RUN npm install
USER $PPTRUSER_UID

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
CMD [ "npm", "run", "jest" ]
