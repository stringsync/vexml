export class Cursor {
  private element: HTMLElement;

  private constructor(element: HTMLElement) {
    this.element = element;
  }

  static render(parent: HTMLElement) {
    const element = document.createElement('div');
    element.classList.add('vexml-cursor');
    element.style.width = '1.5px';
    element.style.position = 'absolute';
    element.style.backgroundColor = 'red';

    parent.append(element);

    return new Cursor(element);
  }

  update(opts: { x?: number; y?: number; w?: number; h?: number }) {
    if (typeof opts.x === 'number') {
      this.element.style.left = `${opts.x}px`;
    }
    if (typeof opts.y === 'number') {
      this.element.style.top = `${opts.y}px`;
    }
    if (typeof opts.w === 'number') {
      this.element.style.width = `${opts.w}px`;
    }
    if (typeof opts.h === 'number') {
      this.element.style.height = `${opts.h}px`;
    }
  }

  remove() {
    this.element.remove();
  }
}
