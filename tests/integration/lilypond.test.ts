import { Page } from 'puppeteer';
import * as path from 'path';
import * as fs from 'fs';
import { setup, getSnapshotIdentifier } from './helpers';
import * as vexml from '@/index';

type TestCase = {
  filename: string;
  width: number;
};

const DATA_DIR = path.join(__dirname, '__data__', 'lilypond');

describe('lilypond', () => {
  let page: Page;

  beforeAll(async () => {
    page = await (globalThis as any).__BROWSER_GLOBAL__.newPage();
  });

  afterAll(async () => {
    await page.close();
  });

  // https://lilypond.org/doc/v2.23/input/regression/musicxml/collated-files.html
  it.each<TestCase>([
    { filename: '01a-Pitches-Pitches.musicxml', width: 900 },
    { filename: '01b-Pitches-Intervals.musicxml', width: 900 },
    { filename: '01c-Pitches-NoVoiceElement.musicxml', width: 900 },
    { filename: '01e-Pitches-ParenthesizedAccidentals.musicxml', width: 900 },
    { filename: '01d-Pitches-Microtones.musicxml', width: 900 },
    { filename: '01f-Pitches-ParenthesizedMicrotoneAccidentals.musicxml', width: 900 },
    { filename: '02a-Rests-Durations.musicxml', width: 900 },
    { filename: '02b-Rests-PitchedRests.musicxml', width: 900 },
    { filename: '02c-Rests-MultiMeasureRests.musicxml', width: 900 },
    { filename: '02d-Rests-Multimeasure-TimeSignatures.musicxml', width: 900 },
    { filename: '02e-Rests-NoType.musicxml', width: 900 },
    { filename: '03a-Rhythm-Durations.musicxml', width: 900 },
    { filename: '03b-Rhythm-Backup.musicxml', width: 900 },
    { filename: '03c-Rhythm-DivisionChange.musicxml', width: 900 },
    { filename: '03d-Rhythm-DottedDurations-Factors.musicxml', width: 900 },
    { filename: '11a-TimeSignatures.musicxml', width: 900 },
    { filename: '11b-TimeSignatures-NoTime.musicxml', width: 900 },
    { filename: '11c-TimeSignatures-CompoundSimple.musicxml', width: 900 },
    { filename: '11d-TimeSignatures-CompoundMultiple.musicxml', width: 900 },
    { filename: '11e-TimeSignatures-CompoundMixed.musicxml', width: 900 },
    { filename: '11f-TimeSignatures-SymbolMeaning.musicxml', width: 900 },
    { filename: '11g-TimeSignatures-SingleNumber.musicxml', width: 900 },
    { filename: '11h-TimeSignatures-SenzaMisura.musicxml', width: 900 },
    { filename: '12a-Clefs.musicxml', width: 900 },
    { filename: '12b-Clefs-NoKeyOrClef.musicxml', width: 900 },
    { filename: '13a-KeySignatures.musicxml', width: 900 },
    { filename: '13b-KeySignatures-ChurchModes.musicxml', width: 900 },
    { filename: '13c-KeySignatures-NonTraditional.musicxml', width: 900 },
    { filename: '13d-KeySignatures-Microtones.musicxml', width: 900 },
    { filename: '14a-StaffDetails-LineChanges.musicxml', width: 900 },
    { filename: '21a-Chord-Basic.musicxml', width: 900 },
    { filename: '21b-Chords-TwoNotes.musicxml', width: 900 },
    { filename: '21c-Chords-ThreeNotesDuration.musicxml', width: 900 },
    { filename: '21d-Chords-SchubertStabatMater.musicxml', width: 900 },
    { filename: '21e-Chords-PickupMeasures.musicxml', width: 900 },
    { filename: '21f-Chord-ElementInBetween.musicxml', width: 900 },
    { filename: '22a-Noteheads.musicxml', width: 900 },
    // { filename: '22b-Staff-Notestyles.musicxml', width: 900 },
    { filename: '22c-Noteheads-Chords.musicxml', width: 900 },
    { filename: '22d-Parenthesized-Noteheads.musicxml', width: 900 },
    { filename: '23a-Tuplets.musicxml', width: 900 },
    // { filename: '23b-Tuplets-Styles.musicxml', width: 900 },
    // { filename: '23c-Tuplet-Display-NonStandard.musicxml', width: 900 },
    // { filename: '23d-Tuplets-Nested.musicxml', width: 900 },
    // { filename: '23e-Tuplets-Tremolo.musicxml', width: 900 },
    // { filename: '23f-Tuplets-DurationButNoBracket.musicxml', width: 900 },
    { filename: '24a-GraceNotes.musicxml', width: 900 },
    { filename: '24b-ChordAsGraceNote.musicxml', width: 900 },
    // { filename: '24c-GraceNote-MeasureEnd.musicxml', width: 900 },
    // { filename: '24d-AfterGrace.musicxml', width: 900 },
    // { filename: '24e-GraceNote-StaffChange.musicxml', width: 900 },
    { filename: '24f-GraceNote-Slur.musicxml', width: 900 },
    { filename: '31a-Directions.musicxml', width: 900 },
    { filename: '31c-MetronomeMarks.musicxml', width: 900 },
    { filename: '32a-Notations.musicxml', width: 900 },
    // { filename: '32b-Articulations-Texts.musicxml', width: 900 },
    // { filename: '32c-MultipleNotationChildren.musicxml', width: 900 },
    // { filename: '32d-Arpeggio.musicxml', width: 900 },
    { filename: '33a-Spanners.musicxml', width: 900 },
    { filename: '33b-Spanners-Tie.musicxml', width: 900 },
    { filename: '33c-Spanners-Slurs.musicxml', width: 900 },
    // { filename: '33d-Spanners-OctaveShifts.musicxml', width: 900 },
    // { filename: '33e-Spanners-OctaveShifts-InvalidSize.musicxml', width: 900 },
    // { filename: '33f-Trill-EndingOnGraceNote.musicxml', width: 900 },
    { filename: '33g-Slur-ChordedNotes.musicxml', width: 900 },
    // { filename: '33h-Spanners-Glissando.musicxml', width: 900 },
    // { filename: '33i-Ties-NotEnded.musicxml', width: 900 },
    { filename: '41a-MultiParts-Partorder.musicxml', width: 900 },
    // { filename: '41b-MultiParts-MoreThan10.musicxml', width: 900 },
    // { filename: '41c-StaffGroups.musicxml', width: 900 },
    // { filename: '41d-StaffGroups-Nested.musicxml', width: 900 },
    // { filename: '41e-StaffGroups-InstrumentNames-Linebroken.musicxml', width: 900 },
    // { filename: '41f-StaffGroups-Overlapping.musicxml', width: 900 },
    // { filename: '41g-PartNoId.musicxml', width: 900 },
    // { filename: '41h-TooManyParts.musicxml', width: 900 },
    // { filename: '41i-PartNameDisplay-Override.musicxml', width: 900 },
    // { filename: '42a-MultiVoice-TwoVoicesOnStaff-Lyrics.musicxml', width: 900 },
    // { filename: '42b-MultiVoice-MidMeasureClefChange.musicxml', width: 900 },
    { filename: '43a-PianoStaff.musicxml', width: 900 },
    // { filename: '43b-MultiStaff-DifferentKeys.musicxml', width: 900 },
    // { filename: '43c-MultiStaff-DifferentKeysAfterBackup.musicxml', width: 900 },
    // { filename: '43d-MultiStaff-StaffChange.musicxml', width: 900 },
    // { filename: '43e-Multistaff-ClefDynamics.musicxml', width: 900 },
    { filename: '45a-SimpleRepeat.musicxml', width: 900 },
    { filename: '45b-RepeatWithAlternatives.musicxml', width: 900 },
    { filename: '45c-RepeatMultipleTimes.musicxml', width: 900 },
    { filename: '45d-Repeats-Nested-Alternatives.musicxml', width: 900 },
    // { filename: '45e-Repeats-Nested-Alternatives.musicxml', width: 900 },
    // { filename: '45f-Repeats-InvalidEndings.musicxml', width: 900 },
    // { filename: '45g-Repeats-NotEnded.musicxml', width: 900 },
    // { filename: '46a-Barlines.musicxml', width: 900 },
    // { filename: '46b-MidmeasureBarline.musicxml', width: 900 },
    // { filename: '46c-Midmeasure-Clef.musicxml', width: 900 },
    // { filename: '46d-PickupMeasure-ImplicitMeasures.musicxml', width: 900 },
    // { filename: '46e-PickupMeasure-SecondVoiceStartsLater.musicxml', width: 900 },
    // { filename: '46f-IncompleteMeasures.musicxml', width: 900 },
    // { filename: '46g-PickupMeasure-Chordnames-FiguredBass.musicxml', width: 900 },
    // { filename: '51b-Header-Quotes.musicxml', width: 900 },
    // { filename: '51c-MultipleRights.musicxml', width: 900 },
    // { filename: '51d-EmptyTitle.musicxml', width: 900 },
    // { filename: '52a-PageLayout.musicxml', width: 900 },
    // { filename: '52b-Breaks.musicxml', width: 900 },
    // { filename: '61a-Lyrics.musicxml', width: 900 },
    // { filename: '61b-MultipleLyrics.musicxml', width: 900 },
    // { filename: '61c-Lyrics-Pianostaff.musicxml', width: 900 },
    // { filename: '61d-Lyrics-Melisma.musicxml', width: 900 },
    // { filename: '61e-Lyrics-Chords.musicxml', width: 900 },
    // { filename: '61f-Lyrics-GracedNotes.musicxml', width: 900 },
    // { filename: '61g-Lyrics-NameNumber.musicxml', width: 900 },
    // { filename: '61h-Lyrics-BeamsMelismata.musicxml', width: 900 },
    // { filename: '61i-Lyrics-Chords.musicxml', width: 900 },
    // { filename: '61j-Lyrics-Elisions.musicxml', width: 900 },
    // { filename: '61k-Lyrics-SpannersExtenders.musicxml', width: 900 },
    // { filename: '71a-Chordnames.musicxml', width: 900 },
    // { filename: '71c-ChordsFrets.musicxml', width: 900 },
    // { filename: '71d-ChordsFrets-Multistaff.musicxml', width: 900 },
    { filename: '71e-TabStaves.musicxml', width: 900 },
    // { filename: '71f-AllChordTypes.musicxml', width: 900 },
    // { filename: '71g-MultipleChordnames.musicxml', width: 900 },
    // { filename: '72a-TransposingInstruments.musicxml', width: 900 },
    // { filename: '72b-TransposingInstruments-Full.musicxml', width: 900 },
    // { filename: '72c-TransposingInstruments-Change.musicxml', width: 900 },
    // { filename: '73a-Percussion.musicxml', width: 900 },
    // { filename: '74a-FiguredBass.musicxml', width: 900 },
    // { filename: '75a-AccordionRegistrations.musicxml', width: 900 },
    // { filename: '99a-Sibelius5-IgnoreBeaming.musicxml', width: 900 },
    // { filename: '99b-Lyrics-BeamsMelismata-IgnoreBeams.musicxml', width: 900 },
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
