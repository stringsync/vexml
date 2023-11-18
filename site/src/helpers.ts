type Ctor<T> = {
  new (): T;
};

export function $<T extends HTMLElement>(id: string, type: Ctor<T>): T {
  const element = document.getElementById(id);
  if (element instanceof type) {
    return element;
  }
  throw new Error(`expected #${id} to be '${type}', got: '${element}'`);
}
