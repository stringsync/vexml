import { getById } from './helpers';
import { Vexml } from '@/vexml';

export class VexmlContainer {
  static id(id: string) {
    return new VexmlContainer(getById(id, HTMLDivElement));
  }

  constructor(private div: HTMLDivElement) {}

  getWidth(): number {
    return this.div.clientWidth;
  }

  onWidthChange(callback: (width: number) => void): void {
    let previousWidth: number | undefined;

    const resizeObserver = new ResizeObserver((entries) => {
      const width = entries[0].contentRect.width;
      if (width !== previousWidth) {
        callback(width);
      }
      previousWidth = width;
    });
    resizeObserver.observe(this.div);
  }

  render(musicXml: string, width: number): void {
    const firstChild = this.div.firstChild;
    if (firstChild) {
      this.div.removeChild(firstChild);
    }

    Vexml.render({
      element: this.div,
      width,
      xml: musicXml,
    });
  }
}
