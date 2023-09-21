import * as path from 'path';

type Font = {
  family: string;
  path: string;
};

const FONTS_DIR = path.join(__dirname, '../../node_modules/vexflow-fonts');

const FONTS: Font[] = [
  {
    family: 'Bravura',
    path: path.join(FONTS_DIR, 'bravura/Bravura_1.392.otf'),
  },
];

export const createTemplate = (): Document => {
  const css = FONTS.map(cssFontFaceRule).join('\n\n');

  const html = `
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    ${css}
  </head>
  <body>
    <div style="padding: 16px; display: inline-block">
      <div id="vexml"></div>
    </div>
  </body>
</html>`;

  const parser = new DOMParser();
  return parser.parseFromString(html, 'text/html');
};

const cssFontFaceRule = (font: Font) => {
  return `
@font-face {
  font-family: ${font.family};
  src: url(${font.path}) format('opentype');
}`;
};
