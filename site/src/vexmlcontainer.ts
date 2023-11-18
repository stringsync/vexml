import { getById } from './helpers';

export class VexmlContainer {
  static id(id: string) {
    return new VexmlContainer(getById(id, HTMLDivElement));
  }

  constructor(private div: HTMLDivElement) {}
}
