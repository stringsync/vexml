import { NamedElement } from '@/util';

/**
 * The `<rootfile>` element describes each top-level file in the MusicXML container.
 *
 * See https://www.w3.org/2021/06/musicxml40/container-reference/elements/rootfile/.
 */
export class Rootfile {
  constructor(private element: NamedElement<'rootfile'>) {}

  /** Returns the full path of the root file. Defaults to empty string. */
  getFullPath(): string {
    return this.element.attr('full-path').withDefault('').str();
  }

  /** Returns the media type of the root file. Defaults to 'application/vnd.recordare.musicxml+xml'. */
  getMediaType(): string {
    return this.element.attr('media-type').withDefault('application/vnd.recordare.musicxml+xml').str();
  }
}
