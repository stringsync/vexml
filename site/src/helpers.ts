export function debounce<F extends (...args: any[]) => void>(
  callback: F,
  delayMs: number
): [debouncedCallback: F, cancel: () => void] {
  let timeout: NodeJS.Timeout | undefined;

  const cancel = () => {
    if (typeof timeout !== 'undefined') {
      clearTimeout(timeout);
    }
  };

  const debounced = (...args: Parameters<F>) => {
    cancel();
    timeout = setTimeout(() => {
      callback(...args);
    }, delayMs);
  };

  return [debounced as F, cancel];
}
