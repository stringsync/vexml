import { Page } from 'puppeteer';
import { Vexml } from '@/index';
import * as path from 'path';
import * as fs from 'fs';
import { setup, getSnapshotIdentifier } from './helpers';

type TestCase = {
  filename: string;
  width: number;
};

const DATA_DIR = path.join(__dirname, '__data__', 'lilypond');

describe('lilypond', () => {
  let page: Page;

  beforeEach(async () => {
    page = await (globalThis as any).__BROWSER_GLOBAL__.newPage();
  });

  afterEach(async () => {
    await page.close();
  });

  // https://lilypond.org/doc/v2.23/input/regression/musicxml/collated-files.html
  it.each<TestCase>([
    { filename: '01a-Pitches-Pitches.xml', width: 900 },
    { filename: '01b-Pitches-Intervals.xml', width: 900 },
    { filename: '01c-Pitches-NoVoiceElement.xml', width: 900 },
    { filename: '01d-Pitches-Microtones.xml', width: 900 },
    { filename: '01e-Pitches-ParenthesizedAccidentals.xml', width: 900 },
    { filename: '01f-Pitches-ParenthesizedMicrotoneAccidentals.xml', width: 900 },
    { filename: '02a-Rests-Durations.xml', width: 900 },
    { filename: '02b-Rests-PitchedRests.xml', width: 900 },
    { filename: '02c-Rests-MultiMeasureRests.xml', width: 900 },
    { filename: '02d-Rests-Multimeasure-TimeSignatures.xml', width: 900 },
    { filename: '02e-Rests-NoType.xml', width: 900 },
    { filename: '03a-Rhythm-Durations.xml', width: 900 },
    { filename: '03b-Rhythm-Backup.xml', width: 900 },
    { filename: '03c-Rhythm-DivisionChange.xml', width: 900 },
    { filename: '03d-Rhythm-DottedDurations-Factors.xml', width: 900 },
    { filename: '11a-TimeSignatures.xml', width: 900 },
    { filename: '11b-TimeSignatures-NoTime.xml', width: 900 },
    { filename: '11c-TimeSignatures-CompoundSimple.xml', width: 900 },
    { filename: '11d-TimeSignatures-CompoundMultiple.xml', width: 900 },
    { filename: '11e-TimeSignatures-CompoundMixed.xml', width: 900 },
    { filename: '11f-TimeSignatures-SymbolMeaning.xml', width: 900 },
    { filename: '11g-TimeSignatures-SingleNumber.xml', width: 900 },
    { filename: '11h-TimeSignatures-SenzaMisura.xml', width: 900 },
    { filename: '12a-Clefs.xml', width: 900 },
    { filename: '12b-Clefs-NoKeyOrClef.xml', width: 900 },
    { filename: '13a-KeySignatures.xml', width: 900 },
    { filename: '13b-KeySignatures-ChurchModes.xml', width: 900 },
    { filename: '13c-KeySignatures-NonTraditional.xml', width: 900 },
    { filename: '13d-KeySignatures-Microtones.xml', width: 900 },
    // { filename: '14a-StaffDetails-LineChanges.xml', width: 900 },
    // { filename: '21a-Chord-Basic.xml', width: 900 },
    // { filename: '21b-Chords-TwoNotes.xml', width: 900 },
    // { filename: '21c-Chords-ThreeNotesDuration.xml', width: 900 },
    // { filename: '21d-Chords-SchubertStabatMater.xml', width: 900 },
    // { filename: '21e-Chords-PickupMeasures.xml', width: 900 },
    // { filename: '21f-Chord-ElementInBetween.xml', width: 900 },
    // { filename: '22a-Noteheads.xml', width: 900 },
    // { filename: '22b-Staff-Notestyles.xml', width: 900 },
    // { filename: '22c-Noteheads-Chords.xml', width: 900 },
    // { filename: '22d-Parenthesized-Noteheads.xml', width: 900 },
    // { filename: '23a-Tuplets.xml', width: 900 },
    // { filename: '23b-Tuplets-Styles.xml', width: 900 },
    // { filename: '23c-Tuplet-Display-NonStandard.xml', width: 900 },
    // { filename: '23d-Tuplets-Nested.xml', width: 900 },
    // { filename: '23e-Tuplets-Tremolo.xml', width: 900 },
    // { filename: '23f-Tuplets-DurationButNoBracket.xml', width: 900 },
    // { filename: '24a-GraceNotes.xml', width: 900 },
    // { filename: '24b-ChordAsGraceNote.xml', width: 900 },
    // { filename: '24c-GraceNote-MeasureEnd.xml', width: 900 },
    // { filename: '24d-AfterGrace.xml', width: 900 },
    // { filename: '24e-GraceNote-StaffChange.xml', width: 900 },
    // { filename: '24f-GraceNote-Slur.xml', width: 900 },
    // { filename: '31a-Directions.xml', width: 900 },
    { filename: '31c-MetronomeMarks.xml', width: 900 },
    // { filename: '32a-Notations.xml', width: 900 },
    // { filename: '32b-Articulations-Texts.xml', width: 900 },
    // { filename: '32c-MultipleNotationChildren.xml', width: 900 },
    // { filename: '32d-Arpeggio.xml', width: 900 },
    // { filename: '33a-Spanners.xml', width: 900 },
    // { filename: '33b-Spanners-Tie.xml', width: 900 },
    // { filename: '33c-Spanners-Slurs.xml', width: 900 },
    // { filename: '33d-Spanners-OctaveShifts.xml', width: 900 },
    // { filename: '33e-Spanners-OctaveShifts-InvalidSize.xml', width: 900 },
    // { filename: '33f-Trill-EndingOnGraceNote.xml', width: 900 },
    // { filename: '33g-Slur-ChordedNotes.xml', width: 900 },
    // { filename: '33h-Spanners-Glissando.xml', width: 900 },
    // { filename: '33i-Ties-NotEnded.xml', width: 900 },
    // { filename: '41a-MultiParts-Partorder.xml', width: 900 },
    // { filename: '41b-MultiParts-MoreThan10.xml', width: 900 },
    // { filename: '41c-StaffGroups.xml', width: 900 },
    // { filename: '41d-StaffGroups-Nested.xml', width: 900 },
    // { filename: '41e-StaffGroups-InstrumentNames-Linebroken.xml', width: 900 },
    // { filename: '41f-StaffGroups-Overlapping.xml', width: 900 },
    // { filename: '41g-PartNoId.xml', width: 900 },
    // { filename: '41h-TooManyParts.xml', width: 900 },
    // { filename: '41i-PartNameDisplay-Override.xml', width: 900 },
    // { filename: '42a-MultiVoice-TwoVoicesOnStaff-Lyrics.xml', width: 900 },
    // { filename: '42b-MultiVoice-MidMeasureClefChange.xml', width: 900 },
    // { filename: '43a-PianoStaff.xml', width: 900 },
    // { filename: '43b-MultiStaff-DifferentKeys.xml', width: 900 },
    // { filename: '43c-MultiStaff-DifferentKeysAfterBackup.xml', width: 900 },
    // { filename: '43d-MultiStaff-StaffChange.xml', width: 900 },
    // { filename: '43e-Multistaff-ClefDynamics.xml', width: 900 },
    // { filename: '45a-SimpleRepeat.xml', width: 900 },
    // { filename: '45b-RepeatWithAlternatives.xml', width: 900 },
    // { filename: '45c-RepeatMultipleTimes.xml', width: 900 },
    // { filename: '45d-Repeats-Nested-Alternatives.xml', width: 900 },
    // { filename: '45e-Repeats-Nested-Alternatives.xml', width: 900 },
    // { filename: '45f-Repeats-InvalidEndings.xml', width: 900 },
    // { filename: '45g-Repeats-NotEnded.xml', width: 900 },
    // { filename: '46a-Barlines.xml', width: 900 },
    // { filename: '46b-MidmeasureBarline.xml', width: 900 },
    // { filename: '46c-Midmeasure-Clef.xml', width: 900 },
    // { filename: '46d-PickupMeasure-ImplicitMeasures.xml', width: 900 },
    // { filename: '46e-PickupMeasure-SecondVoiceStartsLater.xml', width: 900 },
    // { filename: '46f-IncompleteMeasures.xml', width: 900 },
    // { filename: '46g-PickupMeasure-Chordnames-FiguredBass.xml', width: 900 },
    // { filename: '51b-Header-Quotes.xml', width: 900 },
    // { filename: '51c-MultipleRights.xml', width: 900 },
    // { filename: '51d-EmptyTitle.xml', width: 900 },
    // { filename: '52a-PageLayout.xml', width: 900 },
    // { filename: '52b-Breaks.xml', width: 900 },
    // { filename: '61a-Lyrics.xml', width: 900 },
    // { filename: '61b-MultipleLyrics.xml', width: 900 },
    // { filename: '61c-Lyrics-Pianostaff.xml', width: 900 },
    // { filename: '61d-Lyrics-Melisma.xml', width: 900 },
    // { filename: '61e-Lyrics-Chords.xml', width: 900 },
    // { filename: '61f-Lyrics-GracedNotes.xml', width: 900 },
    // { filename: '61g-Lyrics-NameNumber.xml', width: 900 },
    // { filename: '61h-Lyrics-BeamsMelismata.xml', width: 900 },
    // { filename: '61i-Lyrics-Chords.xml', width: 900 },
    // { filename: '61j-Lyrics-Elisions.xml', width: 900 },
    // { filename: '61k-Lyrics-SpannersExtenders.xml', width: 900 },
    // { filename: '71a-Chordnames.xml', width: 900 },
    // { filename: '71c-ChordsFrets.xml', width: 900 },
    // { filename: '71d-ChordsFrets-Multistaff.xml', width: 900 },
    // { filename: '71e-TabStaves.xml', width: 900 },
    // { filename: '71f-AllChordTypes.xml', width: 900 },
    // { filename: '71g-MultipleChordnames.xml', width: 900 },
    // { filename: '72a-TransposingInstruments.xml', width: 900 },
    // { filename: '72b-TransposingInstruments-Full.xml', width: 900 },
    // { filename: '72c-TransposingInstruments-Change.xml', width: 900 },
    // { filename: '73a-Percussion.xml', width: 900 },
    // { filename: '74a-FiguredBass.xml', width: 900 },
    // { filename: '75a-AccordionRegistrations.xml', width: 900 },
    // { filename: '99a-Sibelius5-IgnoreBeaming.xml', width: 900 },
    // { filename: '99b-Lyrics-BeamsMelismata-IgnoreBeams.xml', width: 900 },
  ])(`$filename ($width px)`, async (t) => {
    const { document, vexmlDiv, screenshotElementSelector } = setup();

    Vexml.render({
      element: vexmlDiv,
      xml: fs.readFileSync(path.join(DATA_DIR, t.filename)).toString(),
      width: t.width,
    });

    await page.setViewport({
      width: t.width,
      // height doesn't matter since we screenshot the element, not the page.
      height: 0,
    });
    await page.setContent(document.documentElement.outerHTML);

    const element = await page.$(screenshotElementSelector);
    const screenshot = await element!.screenshot();
    expect(screenshot).toMatchImageSnapshot({
      customSnapshotIdentifier: getSnapshotIdentifier({ filename: t.filename, width: t.width }),
    });
  });
});
