// 'metronome' | 'stavecount' | 'stavelinecount' | 'clef' | 'key' | 'time';
export type SignatureChange =
  | { type: 'metronome' }
  | { type: 'stavecount'; partId: string }
  | { type: 'stavelinecount'; partId: string; staveNumber: number }
  | { type: 'clef'; partId: string; staveNumber: number }
  | { type: 'key'; partId: string; staveNumber: number }
  | { type: 'time'; partId: string; staveNumber: number };
