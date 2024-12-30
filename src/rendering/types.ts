import { Document } from './document';

export interface Formatter {
  format(): Document;
}

export type PartLabelKey = {
  partIndex: number;
};

export type SystemArrangement = {
  measureIndexes: number[];
};

export type SystemKey = {
  systemIndex: number;
};

export type MeasureKey = SystemKey & {
  measureIndex: number;
};

export type MeasureEntryKey = MeasureKey & {
  measureEntryIndex: number;
};

export type PartKey = MeasureEntryKey & {
  partIndex: number;
};

export type StaveKey = PartKey & {
  staveIndex: number;
};

export type VoiceKey = StaveKey & {
  voiceIndex: number;
};

export type VoiceEntryKey = VoiceKey & {
  voiceEntryIndex: number;
};
