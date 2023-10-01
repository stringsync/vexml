import * as path from 'path';
import { registerFont } from 'canvas';

type Src = {
  url: string;
  format: string;
};

type Font = {
  family: string;
  cdn: Src;
  local: Src;
};

const FONTS_DIR = path.join(__dirname, '../../node_modules/vexflow-fonts');

// Don't use the file:// protocol. We can't load from a file because puppeteer forbids it for security reasons.
// See https://github.com/puppeteer/puppeteer/issues/1472.
const FONTS: Font[] = [
  {
    family: 'Bravura',
    cdn: {
      url: 'https://cdn.jsdelivr.net/npm/vexflow-fonts@1.0.6/bravura/Bravura_1.392.otf',
      format: 'opentype',
    },
    local: {
      url: path.join(FONTS_DIR, 'bravura/Bravura_1.392.otf'),
      format: 'opentype',
    },
  },
];

export const setup = () => {
  registerFonts();
  return createTestDocument();
};

export const getSnapshotIdentifier = (opts: { filename: string; width: number }): string => {
  const extname = path.extname(opts.filename);
  const basename = path.basename(opts.filename, extname);
  return `${basename}_${opts.width}px`;
};

const createTestDocument = (): {
  document: Document;
  vexmlDiv: HTMLDivElement;
  screenshotElementSelector: string;
} => {
  const css = FONTS.map(cssFontFaceRule).join('\n\n');

  const html = `
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <style>
      ${css}
    </style>
  </head>
  <body>
    <div id="screenshot" style="padding: 16px; display: inline-block">
      <div id="vexml"></div>
    </div>
  </body>
</html>`;

  const parser = new DOMParser();

  const document = parser.parseFromString(html, 'text/html');
  const vexmlDiv = document.getElementById('vexml') as HTMLDivElement;

  return { document, vexmlDiv, screenshotElementSelector: '#screenshot' };
};

const cssFontFaceRule = (font: Font) => {
  return `
    @font-face {
      font-family: '${font.family}';
      src: url(${font.cdn.url}) format('${font.cdn.format}');
    }
  `;
};

const registerFonts = () => {
  for (const font of FONTS) {
    registerFont(font.local.url, { family: font.family });
  }
};
