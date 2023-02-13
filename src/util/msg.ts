import {
  BarlineMessage,
  BeamMessage,
  ClefMessage,
  DirectionMessage,
  KeyMessage,
  LegacyAttributesMessage,
  LyricMessage,
  MeasureEndMessage,
  MeasureStartMessage,
  NotationMessage,
  NoteMessage,
  PartEndMessage,
  PartStartMessage,
  PrintMessage,
  TimeMessage,
  VexmlMessage,
  VoiceEndMessage,
  VoiceStartMessage,
} from '../types';

type CreateMsg<T extends VexmlMessage> = (args?: Omit<Partial<T>, 'msgType'>) => T;

export const measureStart: CreateMsg<MeasureStartMessage> = (args) => ({
  msgType: 'measureStart',
  ...args,
});

export const partStart: CreateMsg<PartStartMessage> = (args) => ({
  msgType: 'partStart',
  id: 'NN',
  msgCount: 0,
  msgIndex: 0,
  ...args,
});

export const print: CreateMsg<PrintMessage> = (args) => ({
  msgType: 'print',
  newSystem: true,
  newPage: false,
  systemLayout: {},
  staffLayout: [],
  ...args,
});

export const legacyAttributes: CreateMsg<LegacyAttributesMessage> = (args) => ({
  msgType: 'legacyAttributes',
  clefs: [],
  keys: [],
  times: [],
  ...args,
});

export const clef: CreateMsg<ClefMessage> = (args) => ({
  msgType: 'clef',
  sign: 'none',
  staff: null,
  line: null,
  octaveChange: null,
  ...args,
});

export const time: CreateMsg<TimeMessage> = (args) => ({
  msgType: 'time',
  beats: 4,
  beatType: 4,
  staff: null,
  ...args,
});

export const key: CreateMsg<KeyMessage> = (args) => ({
  msgType: 'key',
  fifths: 0,
  staff: null,
  ...args,
});

export const direction: CreateMsg<DirectionMessage> = (args) => ({
  msgType: 'direction',
  codas: [],
  segnos: [],
  ...args,
});

export const measureEnd: CreateMsg<MeasureEndMessage> = () => ({
  msgType: 'measureEnd',
});

export const partEnd: CreateMsg<PartEndMessage> = (args) => ({
  msgType: 'partEnd',
  id: 'NN',
  msgCount: 0,
  msgIndex: 0,
  ...args,
});

export const beam: CreateMsg<BeamMessage> = (args) => ({
  msgType: 'beam',
  name: '',
  number: 0,
  value: '',
  ...args,
});

export const voiceEnd: CreateMsg<VoiceEndMessage> = (args) => ({
  msgType: 'voiceEnd',
  voice: '',
  ...args,
});

export const voiceStart: CreateMsg<VoiceStartMessage> = (args) => ({
  msgType: 'voiceStart',
  voice: '',
  ...args,
});

export const note: CreateMsg<NoteMessage> = (args) => ({
  msgType: 'note',
  stem: null,
  dots: 0,
  head: [{ pitch: '', accidental: '', accidentalCautionary: false, notehead: 'normal' }],
  duration: 4,
  type: '',
  grace: false,
  graceSlash: false,
  arpeggiate: false,
  arpeggiateDirection: undefined,
  voice: '',
  staff: 0,
  ...args,
});

export const notation: CreateMsg<NotationMessage> = (args) => ({
  msgType: 'notation',
  name: '',
  value: '',
  number: 0,
  ...args,
});

export const barline: CreateMsg<BarlineMessage> = (args) => ({
  msgType: 'barline',
  location: '',
  ...args,
});

export const lyric: CreateMsg<LyricMessage> = (args) => ({
  msgType: 'lyric',
  text: '',
  syllabic: '',
  ...args,
});
