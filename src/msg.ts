import {
  AttributesMessage,
  BarlineMessage,
  BeamMessage,
  MeasureEndMessage,
  MeasureStartMessage,
  NotationMessage,
  NoteMessage,
  PartEndMessage,
  PartStartMessage,
  VexmlMessage,
  VoiceEndMessage,
} from './types';

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

export const attributes: CreateMsg<AttributesMessage> = (args) => ({
  msgType: 'attributes',
  clefs: [],
  keys: [],
  times: [],
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

export const note: CreateMsg<NoteMessage> = (args) => ({
  msgType: 'note',
  dots: 0,
  head: [],
  type: '',
  grace: false,
  graceSlash: false,
  arpeggiate: false,
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
