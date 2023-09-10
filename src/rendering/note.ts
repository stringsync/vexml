import * as musicxml from '@/musicxml';

export interface Modifier {
  src: Note;
}

export class Note {
  static fromMusicXml(note: musicxml.Note): Note {
    const mods = new Array<Modifier>();

    return new Note(mods);
  }

  constructor(private mods: Modifier[]) {}
}
