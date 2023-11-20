import { NamedElement } from '@/util';
import { Rootfile } from './rootfile';

/**
 * Starting with Version 2.0, the MusicXML format includes a standard zip compressed version. These zip files can
 * contain multiple MusicXML files as well as other media files for images and sound. The container element is the
 * document element for the META-INF/container.xml file. The container describes the starting point for the MusicXML
 * version of the file, as well as alternate renditions such as PDF and audio versions of the musical score.
 *
 * See https://www.w3.org/2021/06/musicxml40/container-reference/elements/container/.
 */
export class Container {
  constructor(private element: NamedElement<'container'>) {}

  /** Returns the rootfiles of the container. Defaults to empty array. */
  getRootfiles(): Rootfile[] {
    return this.element.all('rootfile').map((node) => new Rootfile(node));
  }
}
