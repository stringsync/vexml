import * as vexml from '@/vexml';
import { useEffect, useRef } from 'react';
import { useWidth } from '../hooks/useWidth';

const DEBOUNCE_DELAY_MS = 100;

export type VexmlProps = {
  musicXML: string;
  onResult: (result: VexmlResult) => void;
};

export type VexmlResult =
  | { type: 'none' }
  | { type: 'empty' }
  | { type: 'success'; start: Date; end: Date; width: number }
  | { type: 'error'; error: Error; start: Date; end: Date; width: number };

export const Vexml = (props: VexmlProps) => {
  const musicXML = props.musicXML;
  const onResult = props.onResult;
  const containerRef = useRef<HTMLDivElement>(null);
  const width = useWidth(containerRef, DEBOUNCE_DELAY_MS);

  useEffect(() => {
    onResult({ type: 'none' });

    if (!musicXML) {
      onResult({ type: 'empty' });
      return;
    }

    const element = containerRef.current;
    if (!element) {
      return;
    }

    if (width === 0) {
      return;
    }

    const start = new Date();

    try {
      vexml.Vexml.fromMusicXML(musicXML).render({
        element,
        width,
      });
      onResult({
        type: 'success',
        start,
        end: new Date(),
        width,
      });
    } catch (e) {
      onResult({
        type: 'error',
        error: e instanceof Error ? e : new Error(String(e)),
        start,
        end: new Date(),
        width,
      });
    }

    return () => {
      const firstChild = element.firstChild;
      if (firstChild) {
        element.removeChild(firstChild);
      }
    };
  }, [musicXML, width, onResult]);

  return <div className="w-100" ref={containerRef}></div>;
};
