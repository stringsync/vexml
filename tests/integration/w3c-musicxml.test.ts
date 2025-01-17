import { Page } from 'puppeteer';
import * as path from 'path';
import * as fs from 'fs';
import { setup, getSnapshotIdentifier } from './helpers';
import * as vexml from '@/index';

type TestCase = {
  filename: string;
  width: number;
  migrated?: boolean;
};

const DATA_DIR = path.join(__dirname, '__data__', 'w3c-musicxml');

describe('vexml', () => {
  let page: Page;

  beforeAll(async () => {
    page = await (globalThis as any).__BROWSER_GLOBAL__.newPage();
  });

  afterAll(async () => {
    await page.close();
  });

  it.each<TestCase>([
    { filename: 'accent-element.musicxml', width: 900 },
    // { filename: 'accidental-element.musicxml', width: 900 },
    // { filename: 'accidental-mark-element-notation.musicxml', width: 900 },
    // { filename: 'accidental-mark-element-ornament.musicxml', width: 900 },
    // { filename: 'accordion-high-element.musicxml', width: 900 },
    // { filename: 'accordion-low-element.musicxml', width: 900 },
    // { filename: 'accordion-middle-element.musicxml', width: 900 },
    // { filename: 'accordion-registration-element.musicxml', width: 900 },
    // { filename: 'alter-element-microtones.musicxml', width: 900 },
    // { filename: 'alter-element-semitones.musicxml', width: 900 },
    // { filename: 'alto-clef.musicxml', width: 900 },
    // { filename: 'arpeggiate-element.musicxml', width: 900 },
    // { filename: 'arrow-element.musicxml', width: 900 },
    // { filename: 'arrowhead-element.musicxml', width: 900 },
    // { filename: 'articulations-element.musicxml', width: 900 },
    // { filename: 'artificial-element.musicxml', width: 900 },
    // { filename: 'assess-and-player-elements.musicxml', width: 900 },
    // { filename: 'attributes-element.musicxml', width: 900 },
    // { filename: 'backup-element.musicxml', width: 900 },
    // { filename: 'baritone-c-clef.musicxml', width: 900 },
    // { filename: 'baritone-f-clef.musicxml', width: 900 },
    // { filename: 'barline-element.musicxml', width: 900 },
    // { filename: 'barre-element.musicxml', width: 900 },
    // { filename: 'bass-alter-element.musicxml', width: 900 },
    // { filename: 'bass-clef-down-octave.musicxml', width: 900 },
    // { filename: 'bass-clef.musicxml', width: 900 },
    // { filename: 'bass-separator-element.musicxml', width: 900 },
    // { filename: 'bass-step-element.musicxml', width: 900 },
    // { filename: 'beam-element.musicxml', width: 900 },
    // { filename: 'beat-repeat-element.musicxml', width: 900 },
    // { filename: 'beat-type-element.musicxml', width: 900 },
    // { filename: 'beat-unit-dot-element.musicxml', width: 900 },
    // { filename: 'beat-unit-element.musicxml', width: 900 },
    // { filename: 'beat-unit-tied-element.musicxml', width: 900 },
    // { filename: 'beater-element.musicxml', width: 900 },
    // { filename: 'beats-element.musicxml', width: 900 },
    // { filename: 'bend-element.musicxml', width: 900 },
    // { filename: 'bookmark-element.musicxml', width: 900 },
    // { filename: 'bracket-element.musicxml', width: 900 },
    // { filename: 'brass-bend-element.musicxml', width: 900 },
    // { filename: 'breath-mark-element.musicxml', width: 900 },
    // { filename: 'caesura-element.musicxml', width: 900 },
    // { filename: 'cancel-element.musicxml', width: 900 },
    // { filename: 'capo-element.musicxml', width: 900 },
    // { filename: 'chord-element-multiple-stop.musicxml', width: 900 },
    // { filename: 'chord-element.musicxml', width: 900 },
    // { filename: 'circular-arrow-element.musicxml', width: 900 },
    // { filename: 'coda-element.musicxml', width: 900 },
    // { filename: 'concert-score-and-for-part-elements.musicxml', width: 900 },
    // { filename: 'credit-element.musicxml', width: 900 },
    // { filename: 'credit-image-element.musicxml', width: 900 },
    // { filename: 'credit-symbol-element.musicxml', width: 900 },
    // { filename: 'cue-element.musicxml', width: 900 },
    // { filename: 'damp-all-element.musicxml', width: 900 },
    // { filename: 'damp-element.musicxml', width: 900 },
    // { filename: 'dashes-element.musicxml', width: 900 },
    // { filename: 'degree-alter-element.musicxml', width: 900 },
    // { filename: 'degree-type-element.musicxml', width: 900 },
    // { filename: 'degree-value-element.musicxml', width: 900 },
    // { filename: 'delayed-inverted-turn-element.musicxml', width: 900 },
    // { filename: 'delayed-turn-element.musicxml', width: 900 },
    // { filename: 'detached-legato-element.musicxml', width: 900 },
    // { filename: 'divisions-and-duration-elements.musicxml', width: 900 },
    // { filename: 'doit-element.musicxml', width: 900 },
    // { filename: 'dot-element.musicxml', width: 900 },
    // { filename: 'double-element.musicxml', width: 900 },
    // { filename: 'double-tongue-element.musicxml', width: 900 },
    // { filename: 'down-bow-element.musicxml', width: 900 },
    // { filename: 'effect-element.musicxml', width: 900 },
    // { filename: 'elision-element.musicxml', width: 900 },
    // { filename: 'end-line-element.musicxml', width: 900 },
    // { filename: 'end-paragraph-element.musicxml', width: 900 },
    // { filename: 'ending-element.musicxml', width: 900 },
    // { filename: 'ensemble-element.musicxml', width: 900 },
    // { filename: 'except-voice-element.musicxml', width: 900 },
    // { filename: 'extend-element-figure.musicxml', width: 900 },
    // { filename: 'extend-element-lyric.musicxml', width: 900 },
    // { filename: 'eyeglasses-element.musicxml', width: 900 },
    // { filename: 'f-element.musicxml', width: 900 },
    // { filename: 'falloff-element.musicxml', width: 900 },
    // { filename: 'fermata-element.musicxml', width: 900 },
    // { filename: 'ff-element.musicxml', width: 900 },
    // { filename: 'fff-element.musicxml', width: 900 },
    // { filename: 'ffff-element.musicxml', width: 900 },
    // { filename: 'fffff-element.musicxml', width: 900 },
    // { filename: 'ffffff-element.musicxml', width: 900 },
    // { filename: 'figure-number-element.musicxml', width: 900 },
    // { filename: 'fingering-element-frame.musicxml', width: 900 },
    // { filename: 'fingering-element-notation.musicxml', width: 900 },
    // { filename: 'fingernails-element.musicxml', width: 900 },
    // { filename: 'flip-element.musicxml', width: 900 },
    // { filename: 'forward-element.musicxml', width: 900 },
    // { filename: 'fp-element.musicxml', width: 900 },
    // { filename: 'fret-element-frame.musicxml', width: 900 },
    // { filename: 'fz-element.musicxml', width: 900 },
    // { filename: 'glass-element.musicxml', width: 900 },
    // { filename: 'glissando-element-multiple.musicxml', width: 900 },
    // { filename: 'glissando-element-single.musicxml', width: 900 },
    // { filename: 'glyph-element.musicxml', width: 900 },
    // { filename: 'golpe-element.musicxml', width: 900 },
    // { filename: 'grace-element-appoggiatura.musicxml', width: 900 },
    // { filename: 'grace-element.musicxml', width: 900 },
    // { filename: 'group-abbreviation-display-element.musicxml', width: 900 },
    // { filename: 'group-abbreviation-element.musicxml', width: 900 },
    // { filename: 'group-barline-element.musicxml', width: 900 },
    // { filename: 'group-name-display-element.musicxml', width: 900 },
    // { filename: 'group-time-element.musicxml', width: 900 },
    // { filename: 'grouping-element.musicxml', width: 900 },
    // { filename: 'half-muted-element.musicxml', width: 900 },
    // { filename: 'handbell-element.musicxml', width: 900 },
    // { filename: 'harmon-mute-element.musicxml', width: 900 },
    // { filename: 'harp-pedals-element.musicxml', width: 900 },
    // { filename: 'haydn-element.musicxml', width: 900 },
    // { filename: 'heel-element.musicxml', width: 900 },
    // { filename: 'heel-toe-substitution.musicxml', width: 900 },
    // { filename: 'hole-element.musicxml', width: 900 },
    // { filename: 'hole-type-element.musicxml', width: 900 },
    // { filename: 'humming-element.musicxml', width: 900 },
    // { filename: 'image-element.musicxml', width: 900 },
    // { filename: 'instrument-change-element.musicxml', width: 900 },
    // { filename: 'instrument-link-element.musicxml', width: 900 },
    // { filename: 'interchangeable-element.musicxml', width: 900 },
    // { filename: 'inversion-element.musicxml', width: 900 },
    // { filename: 'inverted-mordent-element.musicxml', width: 900 },
    // { filename: 'inverted-turn-element.musicxml', width: 900 },
    // { filename: 'inverted-vertical-turn-element.musicxml', width: 900 },
    // { filename: 'ipa-element.musicxml', width: 900 },
    // { filename: 'key-element-non-traditional.musicxml', width: 900 },
    // { filename: 'key-element-traditional.musicxml', width: 900 },
    // { filename: 'key-octave-element.musicxml', width: 900 },
    // { filename: 'kind-element.musicxml', width: 900 },
    // { filename: 'laughing-element.musicxml', width: 900 },
    // { filename: 'level-element.musicxml', width: 900 },
    // { filename: 'line-detail-element.musicxml', width: 900 },
    // { filename: 'line-element.musicxml', width: 900 },
    // { filename: 'link-element.musicxml', width: 900 },
    // { filename: 'lyric-element.musicxml', width: 900 },
    // { filename: 'measure-distance-element.musicxml', width: 900 },
    // { filename: 'measure-numbering-element.musicxml', width: 900 },
    // { filename: 'measure-repeat-element.musicxml', width: 900 },
    // { filename: 'membrane-element.musicxml', width: 900 },
    // { filename: 'metal-element.musicxml', width: 900 },
    // { filename: 'metronome-arrows-element.musicxml', width: 900 },
    // { filename: 'metronome-element.musicxml', width: 900 },
    // { filename: 'metronome-note-element.musicxml', width: 900 },
    // { filename: 'metronome-tied-element.musicxml', width: 900 },
    // { filename: 'mezzo-soprano-clef.musicxml', width: 900 },
    // { filename: 'mf-element.musicxml', width: 900 },
    // { filename: 'mordent-element.musicxml', width: 900 },
    // { filename: 'mp-element.musicxml', width: 900 },
    // { filename: 'multiple-rest-element.musicxml', width: 900 },
    // { filename: 'n-element.musicxml', width: 900 },
    // { filename: 'natural-element.musicxml', width: 900 },
    // { filename: 'non-arpeggiate-element.musicxml', width: 900 },
    // { filename: 'normal-dot-element.musicxml', width: 900 },
    // { filename: 'notehead-text-element.musicxml', width: 900 },
    // { filename: 'numeral-alter-element.musicxml', width: 900 },
    // { filename: 'numeral-key-element.musicxml', width: 900 },
    // { filename: 'numeral-root-element.musicxml', width: 900 },
    // { filename: 'octave-element.musicxml', width: 900 },
    // { filename: 'octave-shift-element.musicxml', width: 900 },
    // { filename: 'open-element.musicxml', width: 900 },
    // { filename: 'open-string-element.musicxml', width: 900 },
    // { filename: 'p-element.musicxml', width: 900 },
    // { filename: 'pan-and-elevation-elements.musicxml', width: 900 },
    // { filename: 'part-abbreviation-display-element.musicxml', width: 900 },
    // { filename: 'part-link-element.musicxml', width: 900 },
    // { filename: 'part-name-display-element.musicxml', width: 900 },
    // { filename: 'part-symbol-element.musicxml', width: 900 },
    // { filename: 'pedal-element-lines.musicxml', width: 900 },
    // { filename: 'pedal-element-symbols.musicxml', width: 900 },
    // { filename: 'per-minute-element.musicxml', width: 900 },
    // { filename: 'percussion-clef.musicxml', width: 900 },
    // { filename: 'pf-element.musicxml', width: 900 },
    // { filename: 'pitch-element.musicxml', width: 900 },
    // { filename: 'pitched-element.musicxml', width: 900 },
    // { filename: 'plop-element.musicxml', width: 900 },
    // { filename: 'pluck-element.musicxml', width: 900 },
    // { filename: 'pp-element.musicxml', width: 900 },
    // { filename: 'ppp-element.musicxml', width: 900 },
    // { filename: 'pppp-element.musicxml', width: 900 },
    // { filename: 'ppppp-element.musicxml', width: 900 },
    // { filename: 'pppppp-element.musicxml', width: 900 },
    // { filename: 'pre-bend-element.musicxml', width: 900 },
    // { filename: 'prefix-element.musicxml', width: 900 },
    // { filename: 'principal-voice-element.musicxml', width: 900 },
    // { filename: 'rehearsal-element.musicxml', width: 900 },
    // { filename: 'release-element.musicxml', width: 900 },
    // { filename: 'repeat-element.musicxml', width: 900 },
    // { filename: 'rest-element.musicxml', width: 900 },
    // { filename: 'rf-element.musicxml', width: 900 },
    // { filename: 'rfz-element.musicxml', width: 900 },
    // { filename: 'root-alter-element.musicxml', width: 900 },
    // { filename: 'root-step-element.musicxml', width: 900 },
    // { filename: 'schleifer-element.musicxml', width: 900 },
    // { filename: 'scoop-element.musicxml', width: 900 },
    // { filename: 'scordatura-element.musicxml', width: 900 },
    // { filename: 'score-timewise-element.musicxml', width: 900 },
    // { filename: 'segno-element.musicxml', width: 900 },
    // { filename: 'senza-misura-element.musicxml', width: 900 },
    // { filename: 'sf-element.musicxml', width: 900 },
    // { filename: 'sffz-element.musicxml', width: 900 },
    // { filename: 'sfp-element.musicxml', width: 900 },
    // { filename: 'sfpp-element.musicxml', width: 900 },
    // { filename: 'sfz-element.musicxml', width: 900 },
    // { filename: 'sfzp-element.musicxml', width: 900 },
    // { filename: 'shake-element.musicxml', width: 900 },
    // { filename: 'slash-element.musicxml', width: 900 },
    // { filename: 'slash-type-and-slash-dot-elements.musicxml', width: 900 },
    // { filename: 'slide-element.musicxml', width: 900 },
    // { filename: 'slur-element.musicxml', width: 900 },
    // { filename: 'smear-element.musicxml', width: 900 },
    // { filename: 'snap-pizzicato-element.musicxml', width: 900 },
    // { filename: 'soft-accent-element.musicxml', width: 900 },
    // { filename: 'soprano-clef.musicxml', width: 900 },
    // { filename: 'spiccato-element.musicxml', width: 900 },
    // { filename: 'staccatissimo-element.musicxml', width: 900 },
    // { filename: 'staccato-element.musicxml', width: 900 },
    // { filename: 'staff-distance-element.musicxml', width: 900 },
    // { filename: 'staff-divide-element.musicxml', width: 900 },
    // { filename: 'staff-element.musicxml', width: 900 },
    // { filename: 'staff-lines-element.musicxml', width: 900 },
    // { filename: 'staff-size-element.musicxml', width: 900 },
    // { filename: 'staff-tuning-element.musicxml', width: 900 },
    // { filename: 'staff-type-element.musicxml', width: 900 },
    // { filename: 'staves-element.musicxml', width: 900 },
    // { filename: 'step-element.musicxml', width: 900 },
    // { filename: 'stick-element.musicxml', width: 900 },
    // { filename: 'stick-location-element.musicxml', width: 900 },
    // { filename: 'stopped-element.musicxml', width: 900 },
    // { filename: 'straight-element.musicxml', width: 900 },
    // { filename: 'stress-element.musicxml', width: 900 },
    // { filename: 'string-mute-element-off.musicxml', width: 900 },
    // { filename: 'string-mute-element-on.musicxml', width: 900 },
    // { filename: 'strong-accent-element.musicxml', width: 900 },
    // { filename: 'suffix-element.musicxml', width: 900 },
    // { filename: 'swing-element.musicxml', width: 900 },
    // { filename: 'syllabic-element.musicxml', width: 900 },
    // { filename: 'symbol-element.musicxml', width: 900 },
    // { filename: 'sync-element.musicxml', width: 900 },
    // { filename: 'system-attribute-also-top.musicxml', width: 900 },
    // { filename: 'system-attribute-only-top.musicxml', width: 900 },
    // { filename: 'system-distance-element.musicxml', width: 900 },
    // { filename: 'system-dividers-element.musicxml', width: 900 },
    // { filename: 'tab-clef.musicxml', width: 900 },
    // { filename: 'tap-element.musicxml', width: 900 },
    // { filename: 'technical-element-tablature.musicxml', width: 900 },
    // { filename: 'tenor-clef.musicxml', width: 900 },
    // { filename: 'tenuto-element.musicxml', width: 900 },
    // { filename: 'thumb-position-element.musicxml', width: 900 },
    // { filename: 'tied-element.musicxml', width: 900 },
    // { filename: 'time-modification-element.musicxml', width: 900 },
    // { filename: 'timpani-element.musicxml', width: 900 },
    // { filename: 'toe-element.musicxml', width: 900 },
    // { filename: 'transpose-element.musicxml', width: 900 },
    // { filename: 'treble-clef.musicxml', width: 900 },
    // { filename: 'tremolo-element-double.musicxml', width: 900 },
    // { filename: 'tremolo-element-single.musicxml', width: 900 },
    // { filename: 'trill-mark-element.musicxml', width: 900 },
    // { filename: 'triple-tongue-element.musicxml', width: 900 },
    // { filename: 'tuplet-dot-element.musicxml', width: 900 },
    // { filename: 'tuplet-element-nested.musicxml', width: 900 },
    // { filename: 'tuplet-element-regular.musicxml', width: 900 },
    // { filename: 'turn-element.musicxml', width: 900 },
    // { filename: 'tutorial-apres-un-reve.musicxml', width: 900 },
    // { filename: 'tutorial-chopin-prelude.musicxml', width: 900 },
    // { filename: 'tutorial-chord-symbols.musicxml', width: 900 },
    // { filename: 'tutorial-hello-world.musicxml', width: 900 },
    // { filename: 'tutorial-percussion.musicxml', width: 900 },
    // { filename: 'tutorial-tablature.musicxml', width: 900 },
    // { filename: 'unpitched-element.musicxml', width: 900 },
    // { filename: 'unstress-element.musicxml', width: 900 },
    // { filename: 'up-bow-element.musicxml', width: 900 },
    // { filename: 'vertical-turn-element.musicxml', width: 900 },
    // { filename: 'vocal-tenor-clef.musicxml', width: 900 },
    // { filename: 'voice-element.musicxml', width: 900 },
    // { filename: 'wait-element.musicxml', width: 900 },
    // { filename: 'wavy-line-element.musicxml', width: 900 },
    // { filename: 'wedge-element.musicxml', width: 900 },
    // { filename: 'with-bar-element.musicxml', width: 900 },
    // { filename: 'wood-element.musicxml', width: 900 },
  ])(`$filename ($width px)`, async (t) => {
    const { document, vexmlDiv, screenshotElementSelector } = setup();

    const buffer = fs.readFileSync(path.join(DATA_DIR, t.filename));
    const musicXML = buffer.toString();
    vexml.renderMusicXML(musicXML, vexmlDiv, { config: { WIDTH: t.width } });

    await page.setViewport({
      width: t.width,
      // height doesn't matter since we screenshot the element, not the page.
      height: 0,
    });
    await page.setContent(document.documentElement.outerHTML);

    const element = await page.$(screenshotElementSelector);
    const screenshot = Buffer.from((await element!.screenshot()) as any);
    expect(screenshot).toMatchImageSnapshot({
      customSnapshotIdentifier: getSnapshotIdentifier({ filename: t.filename, width: t.width }),
    });
  });
});
