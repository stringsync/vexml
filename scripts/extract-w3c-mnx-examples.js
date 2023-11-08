/**
 * Extract MusicXML examples from the W3C site: MNX specification
 */

/* eslint-disable @typescript-eslint/no-var-requires */
const path = require('path');
const process = require('process');
const fs = require('fs');
const cheerio = require('cheerio');

const examplesUrl = 'https://w3c.github.io/mnx/docs/comparisons/musicxml/';

const cwd = process.cwd();
const targetPath = path.join(cwd, 'tests', 'integration', '__data__', 'w3c-mnx');

if (!fs.existsSync(targetPath)) {
  fs.mkdirSync(targetPath);
}

(async () => {
  const response = await fetch(examplesUrl);
  const main = await response.text();
  const $ = cheerio.load(main);

  const downloadTypes = {
    musicxml: true,
    mnx: false,
    png: false,
  };

  for (const example of $('body').find('.example')) {
    const $example = $(example);
    const title = $(example).prop('id');

    console.log(`Extracting ${title}...`);

    const $markups = $example.find('.markupexample');

    if (downloadTypes.musicxml) {
      const musicxml = '<?xml version="1.0" encoding="utf-8"?>\n' + $markups.eq(0).find('.markupcode').text().trim();
      const fileName = `${title}.musicxml`;
      fs.writeFileSync(path.join(targetPath, fileName), musicxml);

      console.log('Wrote MusicXML', fileName);
    }

    if (downloadTypes.mnx) {
      const mnx = $markups.eq(1).find('.markupcode').text();
      const fileName = `${title}.mnx.json`;
      fs.writeFileSync(path.join(targetPath, fileName), mnx.trim());

      console.log('Wrote MNX', fileName);
    }

    if (downloadTypes.png) {
      const $img = $example.find('.exampleimg');
      if ($img.length) {
        const imgUrl = `${examplesUrl}${$img.prop('src')}`;
        const fileName = imgUrl.split('/').pop();

        console.log('Fetch image', fileName);

        const response = await fetch(imgUrl);
        const buffer = Buffer.from(await response.arrayBuffer());
        fs.writeFileSync(path.join(targetPath, `${title}.png`), buffer);
      }
    }
  }

  console.log('See output in:', path.relative(cwd, targetPath));
})().catch(console.error);
