/**
 * The root component that houses the vexflow renderings.
 *
 * The purpose of this class is to insulate low-level DOM manipulation from the rest of the codebase.
 */
export class Root {
  private element: HTMLDivElement;

  private constructor(element: HTMLDivElement) {
    this.element = element;
  }

  static svg(parent: HTMLElement) {
    return Root.render('svg', parent);
  }

  static canvas(parent: HTMLElement) {
    return Root.render('canvas', parent);
  }

  private static render(type: 'svg' | 'canvas', parent: HTMLElement) {
    const element = document.createElement('div');

    element.classList.add('vexml-root');
    element.style.position = 'relative';

    const overlay = document.createElement('div');
    overlay.classList.add('vexml-overlay');
    overlay.style.position = 'absolute';
    overlay.style.top = '0';
    overlay.style.left = '0';
    overlay.style.width = '100%';
    overlay.style.height = '100%';

    element.append(overlay);

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

    return new Root(element);
  }

  /** Returns the element that overlays the rendering. */
  getOverlayElement(): HTMLDivElement {
    return this.element.querySelector('.vexml-overlay') as HTMLDivElement;
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
