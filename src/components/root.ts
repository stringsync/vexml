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
    const element = document.createElement('div');

    element.classList.add('vexml-root');
    element.style.position = 'relative';

    if (typeof height === 'number') {
      element.style.height = `${height}px`;
      element.style.overflow = 'auto';
    }

    const overlay = Overlay.render(element);

    switch (type) {
      case 'svg':
        const div = document.createElement('div');
        div.classList.add('vexml-container');
        div.classList.add('vexml-container-svg');
        element.append(div);
        break;
      case 'canvas':
        const canvas = document.createElement('canvas');
        canvas.classList.add('vexml-container');
        canvas.classList.add('vexml-container-canvas');
        element.append(canvas);
        break;
    }

    parent.append(element);

    return new Root(element, overlay);
  }

  /** Returns the Overlay component. */
  getOverlay(): Overlay {
    return this.overlay;
  }

  /** Returns the element that is intended to be inputted to vexflow. */
  getVexflowContainerElement(): HTMLDivElement | HTMLCanvasElement {
    return this.element.querySelector('.vexml-container') as HTMLDivElement | HTMLCanvasElement;
  }

  /** Returns the element that vexflow rendered onto. */
  getVexflowElement(): SVGElement | HTMLCanvasElement {
    const container = this.getVexflowContainerElement();
    return container instanceof HTMLDivElement ? (container.firstElementChild as SVGElement) : container;
  }

  /** Removes the element from the DOM. */
  remove(): void {
    this.element?.remove();
  }
}
