# Pinned to the installed playwright version so the bundled Chromium matches.
# This image is the source of pixel determinism: same OS, fonts, and browser build as CI.
FROM mcr.microsoft.com/playwright:v1.61.1-jammy

# Bun, copied from its official image (no curl install needed).
COPY --from=oven/bun:1 /usr/local/bin/bun /usr/local/bin/bun

WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

COPY . .

# Visual tests only; Chromium already lives in the base image.
# ENTRYPOINT (not CMD) so `docker run vexml-tests <args>` appends to bun test.
ENTRYPOINT ["bun", "test", "tests/integration"]
