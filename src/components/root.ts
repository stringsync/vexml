import { Overlay } from './overlay';

/**
 * The root component that houses the vexflow renderings.
 *
 * The purpose of this class is to insulate low-level DOM manipulation from the rest of the codebase.
 */
export class Root {
  private element: HTMLDivElement;
  private overlay: Overlay;

  private constructor(element: HTMLDivElement, overlay: Overlay) {
    this.element = element;
    this.overlay = overlay;
  }

  static svg(parent: HTMLElement, height: number | undefined) {
    return Root.render('svg', parent, height);
  }

  static canvas(parent: HTMLElement, height: number | undefined) {
    return Root.render('canvas', parent, height);
  }

  private static render(type: 'svg' | 'canvas', parent: HTMLElement, height: number | undefined): Root {
    const vexmlRoot = document.createElement('div');
    vexmlRoot.classList.add('vexml-root');
    vexmlRoot.classList.add('vexml-scroll-container');

    if (typeof height === 'number') {
      vexmlRoot.style.height = `${height}px`;
      vexmlRoot.style.overflowY = 'auto';
      vexmlRoot.style.overflowX = 'hidden';
    }

    const vexmlContainer = document.createElement('div');
    vexmlContainer.classList.add('vexml-container');
    vexmlContainer.style.position = 'relative';
    vexmlRoot.append(vexmlContainer);

    const overlay = Overlay.render(vexmlContainer);

    if (type === 'svg') {
      const vexflowContainer = document.createElement('div');
      vexflowContainer.classList.add('vexflow-container');
      vexflowContainer.classList.add('vexflow-container-svg');
      vexmlContainer.append(vexflowContainer);
    } else {
      const vexflowContainer = document.createElement('canvas');
      vexflowContainer.classList.add('vexflow-container');
      vexflowContainer.classList.add('vexflow-container-canvas');
      vexmlContainer.append(vexflowContainer);
    }

    parent.append(vexmlRoot);

    return new Root(vexmlRoot, overlay);
  }

  /** Returns the Overlay component. */
  getOverlay(): Overlay {
    return this.overlay;
  }

  getScrollContainer(): HTMLDivElement {
    return this.element;
  }

  /** Returns the element that is intended to be inputted to vexflow. */
  getVexflowContainerElement(): HTMLDivElement | HTMLCanvasElement {
    return this.element.querySelector('.vexflow-container') as HTMLDivElement | HTMLCanvasElement;
  }

  /** Returns the element that vexflow rendered onto. */
  getVexflowElement(): SVGElement | HTMLCanvasElement {
    const container = this.getVexflowContainerElement();
    if (container instanceof HTMLDivElement) {
      return container.firstElementChild as SVGElement;
    } else {
      return container as HTMLCanvasElement;
    }
  }

  /** Removes the element from the DOM. */
  remove(): void {
    this.element?.remove();
  }
}
