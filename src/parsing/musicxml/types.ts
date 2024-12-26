import * as data from '@/data';
import * as musicxml from '@/musicxml';

/** Data that defines a part. */
export type PartSignature = {
  partId: string;
  staveCount: number;
};

export type FragmentPart = {
  partId: string;
  measureIndex: number;
  fragmentIndex: number;
  events: MeasureEvent[];
  changes: FragmentComponent[];
};

export type FragmentComponent = 'metronome' | 'clef' | 'keysignature' | 'timesignature' | 'stavelinecount';

/**
 * MeasureEvent is an intermediate data structure that accounts for the duration of each event.
 *
 * It's a transformation of {@link musicxml.MeasureEntry} that inherently accounts for the {@link musicxml.Forward} and
 * {@link musicxml.Backup} elements.
 */
export type MeasureEvent = NoteEvent | SignatureEvent | OctaveShiftEvent | DynamicsEvent;

export type NoteEvent = {
  type: 'note';
  beat: data.Fraction;
  duration: data.Fraction;
  note: musicxml.Note;
  fragmentSignature: data.FragmentSignature;
  measureIndex: number;
  partId: string;
  staveNumber: number;
  voiceId: string;
};

export type SignatureEvent = {
  type: 'signature';
  beat: data.Fraction;
  partId: string;
  measureIndex: number;
  fragmentSignature: data.FragmentSignature;
};

export type OctaveShiftEvent = {
  type: 'octaveshift';
  beat: data.Fraction;
  octaveShift: musicxml.OctaveShift;
  measureIndex: number;
  partId: string;
  fragmentSignature: data.FragmentSignature;
};

export type DynamicsEvent = {
  type: 'dynamics';
  beat: data.Fraction;
  dynamics: musicxml.Dynamics;
  measureIndex: number;
  partId: string;
  placement: musicxml.AboveBelow;
  fragmentSignature: data.FragmentSignature;
};
