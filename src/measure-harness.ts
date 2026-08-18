import { MDOMParser } from '@stringsync/mdom';
import { measureFixture } from './measure-fixture';
import { FakeViewport } from './viewport/fake-viewport';

/* A one-part, one-measure, one-note score: the smallest thing that still builds a real
 * Measure through the production factory. */
export const MEASURE_XML = `<?xml version="1.0"?>
<score-partwise version="4.0">
  <part-list><score-part id="P1"><part-name>M</part-name></score-part></part-list>
  <part id="P1">
    <measure number="1">
      <attributes><divisions>1</divisions></attributes>
      <note><pitch><step>C</step><octave>4</octave></pitch><duration>1</duration><type>quarter</type></note>
    </measure>
  </part>
</score-partwise>`;

export function measureOf() {
	const mdoc = new MDOMParser().parseFromString(MEASURE_XML);
	const mpart = mdoc.score.parts[0];
	const mmeasure = mpart?.measures[0];
	if (!mpart || !mmeasure) {
		throw new Error('fixture: missing measure');
	}
	return {
		measure: measureFixture(mpart, mmeasure, new FakeViewport()),
		mmeasure,
	};
}
