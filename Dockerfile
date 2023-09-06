FROM node:18.3.0

# See https://stackoverflow.com/questions/71452265/how-to-run-puppeteer-on-a-docker-container-on-a-macos-apple-silicon-m1-arm64-hos
RUN apt-get update \
  && apt-get install -y chromium \
  fonts-ipafont-gothic fonts-wqy-zenhei fonts-thai-tlwg fonts-kacst fonts-freefont-ttf libxss1 \
  --no-install-recommends

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
