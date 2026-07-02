# Pinned to the installed playwright version so the bundled Chromium matches.
# This image is the source of pixel determinism: same OS, fonts, and browser build as CI.
FROM mcr.microsoft.com/playwright:v1.61.1-jammy

# Bake the fonts vexml renders with (Bravura notation, Source Sans 3 text) into the image
# as system fonts. The app otherwise loads them asynchronously — Bravura from a bundled
# woff2 @font-face, Source Sans 3 from the Google Fonts CDN — and under parallel tests that
# async load raced the layout: text measured with fallback metrics settled into a
# wrong-but-stable layout, off by hundreds of px. A system font is available synchronously
# at layout time, so renders are deterministic and the container needs no network. Copied
# early (before the source) so this layer caches until the font files themselves change.
COPY assets/fonts/Bravura.otf assets/fonts/SourceSans3-Light.ttf \
	assets/fonts/SourceSans3-Regular.ttf assets/fonts/SourceSans3-SemiBold.ttf \
	/usr/share/fonts/truetype/vexml/
RUN fc-cache -f

# Bun, copied from its official image (no curl install needed).
COPY --from=oven/bun:1 /usr/local/bin/bun /usr/local/bin/bun

WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

COPY . .

# No dir: bun discovers all *.test.ts (unit + integration), skipping node_modules.
# ENTRYPOINT (not CMD) so `docker run vexml-tests <args>` appends to bun test.
ENTRYPOINT ["bun", "test"]
