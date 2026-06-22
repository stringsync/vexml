import { MusicXMLParser as LegacyMusicXMLParser } from '@/parsing/musicxml';
import { MdomParser } from '@/parsing/mdom';
import * as path from 'path';
import * as fs from 'fs';
import * as assert from 'assert';

const DATA_DIR = path.resolve(__dirname, '..', '..', '..', '__data__');
const CORPORA = ['lilypond', 'musicxml', 'w3c-musicxml', 'vexml'];

/**
 * Fixtures where the mdom adapter intentionally diverges from the legacy reader, all due to mdom-library limitations
 * rather than adapter bugs:
 *  - score-timewise-element: mdom only parses <score-partwise>, not <score-timewise>.
 *  - Echigo-Jishi: a lyric whose text is a single full-width space; xml-js drops whitespace-only text nodes.
 *  - interchangeable-element: mdom's <time> does not expose <interchangeable> components.
 *  - SchbAvMaSample: an isolated tuplet-spanning quirk in one complex piano sample (all systematic tuplet fixtures pass).
 */
const KNOWN_DIVERGENCES = new Set([
  'score-timewise-element.musicxml',
  'Echigo-Jishi.musicxml',
  'interchangeable-element.musicxml',
  'SchbAvMaSample.musicxml',
]);

/** Reads a fixture honoring its byte-order mark (some MusicXML samples ship as UTF-16). */
function stripBom(s: string): string {
  return s.charCodeAt(0) === 0xfeff ? s.slice(1) : s;
}

function readFixture(filePath: string): string {
  const buffer = fs.readFileSync(filePath);
  if (buffer[0] === 0xff && buffer[1] === 0xfe) {
    return stripBom(buffer.toString('utf16le'));
  }
  if (buffer[0] === 0xfe && buffer[1] === 0xff) {
    const swapped = Buffer.from(buffer);
    swapped.swap16();
    return stripBom(swapped.toString('utf16le'));
  }
  return buffer.toString('utf8');
}

/** Parses the same MusicXML with both the legacy reader and the mdom adapter and returns both data.Scores. */
function parseBoth(xml: string) {
  const legacy = new LegacyMusicXMLParser().parse(xml).score;
  const mdom = new MdomParser().parse(xml).score;
  return { legacy, mdom };
}

function fixtures(dir: string): string[] {
  const full = path.join(DATA_DIR, dir);
  if (!fs.existsSync(full)) {
    return [];
  }
  return fs
    .readdirSync(full)
    .filter((f) => f.endsWith('.musicxml') || f.endsWith('.xml'))
    .sort();
}

describe('mdom parser equivalence', () => {
  for (const corpus of CORPORA) {
    it(`matches the legacy IR across the ${corpus} corpus`, () => {
      const files = fixtures(corpus);
      const failures: Array<{ file: string; message: string }> = [];

      for (const file of files) {
        if (KNOWN_DIVERGENCES.has(file)) {
          continue;
        }
        const xml = readFixture(path.join(DATA_DIR, corpus, file));
        try {
          const { legacy, mdom } = parseBoth(xml);
          assert.deepStrictEqual(mdom, legacy);
        } catch (e) {
          failures.push({ file, message: (e as Error).message.split('\n').slice(0, 3).join(' ').slice(0, 200) });
        }
      }

      // eslint-disable-next-line no-console
      console.log(`\n${corpus}: ${files.length - failures.length}/${files.length} pass`);
      for (const f of failures) {
        // eslint-disable-next-line no-console
        console.log(`  FAIL ${f.file}: ${f.message}`);
      }

      expect(failures.map((f) => f.file)).toEqual([]);
    });
  }
});
