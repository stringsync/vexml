type Ctor<T> = {
  new (): T;
};

export function getById<T extends HTMLElement>(id: string, type: Ctor<T>): T {
  const element = document.getElementById(id);
  if (element instanceof type) {
    return element;
  }
  throw new Error(`expected #${id} to be '${type}', got: '${element}'`);
}

export function debounce<F extends (...args: any[]) => void>(callback: F, delayMs: number): F {
  let timeout: NodeJS.Timeout | undefined;

  const debounced = (...args: Parameters<F>) => {
    if (timeout !== undefined) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(() => {
      callback(...args);
    }, delayMs);
  };

  return debounced as F;
}
