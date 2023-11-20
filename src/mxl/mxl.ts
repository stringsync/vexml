import JSZip from 'jszip';
import { Container } from './container';
import { NamedElement } from '@/util';

const META_PATH = 'META-INF/container.xml';
const MUSICXML_MIME_TYPES = [
  'text/xml',
  'application/xml',
  'application/x-xml',
  'application/vnd.recordare.musicxml+xml',
];

/** Represents the manifest for a compressed MusicXML file. */
export class MXL {
  constructor(private blob: Blob) {}

  /**
   * Returns the MusicXML string.
   * @throws {Error} when the blob cannot be handled like a MXL file.
   */
  async getMusicXml(): Promise<string> {
    const zip = await JSZip.loadAsync(this.blob);

    const xml = await zip.file(META_PATH)?.async('string');
    if (typeof xml === 'undefined') {
      throw new Error(`could not extract manifest from: ${META_PATH}`);
    }

    const parser = new DOMParser();
    const doc = parser.parseFromString(xml, 'application/xml');
    const node = doc.getElementsByTagName('container').item(0);
    if (!node) {
      throw new Error('could not locate a <container> element');
    }

    const container = new Container(NamedElement.of(node));
    const path = container
      .getRootfiles()
      .find((rootfile) => MUSICXML_MIME_TYPES.includes(rootfile.getMediaType()))
      ?.getFullPath();
    if (typeof path === 'undefined') {
      throw new Error(`could not find a <rootfile> with type: ${MUSICXML_MIME_TYPES.join(',')}`);
    }

    const musicXml = await zip.file(path)?.async('string');
    if (typeof musicXml !== 'string') {
      throw new Error(`could not find file with path: ${path}`);
    }

    return musicXml;
  }
}
