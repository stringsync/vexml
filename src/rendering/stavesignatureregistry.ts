import * as musicxml from '@/musicxml';
import { StaveSignature } from './stavesignature';

/** A collection of all the stave signatures that belong to a MusicXML Part. */
export class StaveSignatureRegistry {
  private registry: StaveSignature[][];

  private constructor(registry: StaveSignature[][]) {
    this.registry = registry;
  }

  /** Creates a registry from a MusicXML part. */
  static from(part: musicxml.Part): StaveSignatureRegistry {
    const registry = new Array<StaveSignature[]>();

    let previousStaveSignature: StaveSignature | null = null;

    const measures = part.getMeasures();
    for (let measureIndex = 0; measureIndex < measures.length; measureIndex++) {
      const measure = measures[measureIndex];

      const entries = measure.getEntries();
      for (let measureEntryIndex = 0; measureEntryIndex < entries.length; measureEntryIndex++) {
        const entry = entries[measureEntryIndex];

        registry.push([]);

        if (entry instanceof musicxml.Attributes) {
          const staveSignature = StaveSignature.merge({
            measureIndex,
            measureEntryIndex,
            previousStaveSignature: previousStaveSignature,
            musicXml: { attributes: entry },
          });
          registry[measureIndex].push(staveSignature);

          previousStaveSignature = staveSignature;
        }
      }
    }

    return new StaveSignatureRegistry(registry);
  }

  /** Returns all StaveSignatures in the order they appeared. */
  all(): StaveSignature[] {
    return this.registry.flat();
  }

  /** Returns all the StaveSignatures at a measure index. */
  getMeasureStaveSignatures(measureIndex: number): StaveSignature[] | null {
    return this.registry[measureIndex] ?? null;
  }

  /** Returns the StaveSignatures at a [measure index, measure entry index]. */
  getStaveSignature(measureIndex: number, measureEntryIndex: number): StaveSignature | null {
    return (
      this.getMeasureStaveSignatures(measureIndex)?.find(
        (measureAttributes) => measureAttributes.getMeasureEntryIndex() === measureEntryIndex
      ) ?? null
    );
  }
}
