import * as vexml from '@/index';
import * as errors from '../util/errors';
import { useEffect, useRef } from 'react';
import { useWidth } from '../hooks/useWidth';

const THROTTLE_DELAY_MS = 50;

export type VexmlProps = {
  musicXML: string;
  onResult: (result: VexmlResult) => void;
  onClick: vexml.ClickEventListener;
};

export type VexmlResult =
  | { type: 'none' }
  | { type: 'empty' }
  | { type: 'success'; start: Date; end: Date; width: number; svg: SVGElement }
  | { type: 'error'; error: Error; start: Date; end: Date; width: number };

export const Vexml = (props: VexmlProps) => {
  const musicXML = props.musicXML;
  const onResult = props.onResult;
  const onClick = props.onClick;
  const containerRef = useRef<HTMLDivElement>(null);
  const width = useWidth(containerRef, THROTTLE_DELAY_MS);

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

    let rendering: vexml.Rendering | undefined;

    try {
      rendering = vexml.Vexml.fromMusicXML(musicXML).render({
        container: element,
        width,
      });

      rendering.addEventListener('click', onClick);

      const svg = element.firstChild as SVGElement;
      svg.style.backgroundColor = 'white'; // needed for non-transparent background downloadSvgAsImage
      onResult({
        type: 'success',
        start,
        end: new Date(),
        svg,
        width,
      });
    } catch (e) {
      onResult({
        type: 'error',
        error: errors.wrap(e),
        start,
        end: new Date(),
        width,
      });
    }

    return () => {
      rendering?.removeAllEventListeners();

      const firstChild = element.firstChild;
      if (firstChild) {
        element.removeChild(firstChild);
      }
    };
  }, [musicXML, width, onResult, onClick]);

  return <div className="w-100 position-relative" ref={containerRef}></div>;
};
