import { $ } from './helpers';

export class VexmlContainer {
  static id(id: string) {
    return new VexmlContainer($(id, HTMLDivElement));
  }

  constructor(private div: HTMLDivElement) {}
}
