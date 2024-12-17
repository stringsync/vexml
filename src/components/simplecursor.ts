const STRINGSYNC_RED = '#FC354C';

export class SimpleCursor {
  private element: HTMLElement;

  private constructor(element: HTMLElement) {
    this.element = element;
  }

  static render(parent: HTMLElement, color = STRINGSYNC_RED) {
    const element = document.createElement('div');
    element.classList.add('vexml-cursor');
    element.style.display = 'block';
    element.style.width = '1.5px';
    element.style.position = 'absolute';
    element.style.backgroundColor = color;

    parent.insertBefore(element, parent.firstChild);

    return new SimpleCursor(element);
  }

  /** Moves the cursor's position to the given rect. */
  update(opts: { x: number; y: number; w: number; h: number }) {
    this.element.style.left = `${opts.x}px`;
    this.element.style.top = `${opts.y}px`;
    this.element.style.width = `${opts.w}px`;
    this.element.style.height = `${opts.h}px`;
  }

  remove() {
    this.element.remove();
  }

  show() {
    this.element.style.display = 'block';
  }

  hide() {
    this.element.style.display = 'none';
  }
}
