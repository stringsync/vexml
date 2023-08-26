FROM node:18.3.0

WORKDIR /vexml

# Install dependencies.
COPY package.json .
COPY yarn.lock .
RUN yarn install

# Copy config.
COPY babel.config.json .
COPY jest.config.js .
COPY PuppeteerEnvironment.js .
COPY jest.setup.js .
COPY jest.teardown.js .

# Copy the code needed to run the dev server and tests.
COPY dev dev
COPY src src
COPY vexflow vexflow

# Run the dev server by default.
CMD [ "yarn", "dev" ]
