import * as vexml from '@/vexml';
import { useEffect, useRef } from 'react';
import { useWidth } from '../hooks/useWidth';

const DEBOUNCE_DELAY_MS = 100;

export type RenderEvent =
  | {
      type: 'success';
      start: Date;
      stop: Date;
      width: number;
    }
  | {
      type: 'error';
      start: Date;
      stop: Date;
      error: Error;
      width: number;
    };

export type VexmlProps = {
  musicXML: string;
  containerId: string;
  onRender: (event: RenderEvent) => void;
};

function Vexml({ musicXML, containerId, onRender }: VexmlProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const width = useWidth(containerRef, DEBOUNCE_DELAY_MS);

  useEffect(() => {
    if (!musicXML) {
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
      onRender({
        type: 'success',
        start,
        stop: new Date(),
        width,
      });
    } catch (e) {
      onRender({
        type: 'error',
        start,
        stop: new Date(),
        error: e instanceof Error ? e : new Error(String(e)),
        width,
      });
    }

    return () => {
      const firstChild = element.firstChild;
      if (firstChild) {
        element.removeChild(firstChild);
      }
    };
  }, [musicXML, width, onRender]);

  return <div id={containerId} ref={containerRef}></div>;
}

export default Vexml;
