import { useEffect, useState } from 'react';

export enum Format {
  Json,
  Text,
}

export type FetchResult =
  | {
      type: 'idle';
    }
  | {
      type: 'loading';
    }
  | {
      type: 'success';
      data: any;
    }
  | {
      type: 'error';
      error: any;
    };

export const useFetch = (url: string, format: Format): FetchResult => {
  const [result, setResult] = useState<FetchResult>({ type: 'idle' });
  const loading = () => setResult({ type: 'loading' });
  const success = (data: any) => setResult({ type: 'success', data });
  const error = (error: string) => setResult({ type: 'error', error });

  useEffect(() => {
    let done = false;
    loading();
    const controller = new AbortController();
    fetch(url, { signal: controller.signal })
      .then((res) => {
        switch (format) {
          case Format.Json:
            return res.json();
          case Format.Text:
            return res.text();
        }
      })
      .then(success)
      .catch(error)
      .finally(() => {
        done = true;
      });
    return () => {
      if (!done) {
        controller.abort();
      }
    };
  }, [url, format]);

  return result;
};
