import * as vexml from '@/index';
import * as errors from '../util/errors';
import { useEffect, useRef, useState } from 'react';
import { useWidth } from '../hooks/useWidth';

const THROTTLE_DELAY_MS = 50;

export type VexmlProps = {
  musicXML: string;
  mode: VexmlMode;
  onResult: (result: VexmlResult) => void;
  onClick?: vexml.ClickEventListener;
};

export type VexmlMode = 'svg' | 'canvas';

export type VexmlResult =
  | { type: 'none' }
  | { type: 'empty' }
  | { type: 'success'; start: Date; end: Date; width: number; element: HTMLCanvasElement | SVGElement }
  | { type: 'error'; error: Error; start: Date; end: Date; width: number };

export const Vexml = (props: VexmlProps) => {
  const musicXML = props.musicXML;
  const mode = props.mode;
  const onResult = props.onResult;
  const onClick = props.onClick;

  const divContainerRef = useRef<HTMLDivElement>(null);
  const canvasContainerRef = useRef<HTMLCanvasElement>(null);

  const divWidth = useWidth(divContainerRef, THROTTLE_DELAY_MS);
  const canvasWidth = useWidth(canvasContainerRef, THROTTLE_DELAY_MS);
  const width = mode === 'svg' ? divWidth : canvasWidth;

  const [rendering, setRendering] = useState<vexml.Rendering | null>(null);

  useEffect(() => {
    if (!rendering) {
      return;
    }

    const handles = new Array<number>();

    if (onClick) {
      handles.push(rendering.addEventListener('click', onClick));
    }

    return () => {
      for (const handle of handles) {
        rendering.removeEventListener(handle);
      }
    };
  }, [rendering, onClick]);

  useEffect(() => {
    onResult({ type: 'none' });

    if (!musicXML) {
      onResult({ type: 'empty' });
      return;
    }

    let container: HTMLDivElement | HTMLCanvasElement | null = null;
    if (mode === 'canvas') {
      container = canvasContainerRef.current as HTMLCanvasElement;
    }
    if (mode === 'svg') {
      container = divContainerRef.current as HTMLDivElement;
    }
    if (!container) {
      return;
    }
    if (width === 0) {
      return;
    }

    const start = new Date();

    try {
      const rendering = vexml.Vexml.fromMusicXML(musicXML).render({ container, width });
      setRendering(rendering);

      let element: HTMLCanvasElement | SVGElement;
      if (container instanceof HTMLDivElement) {
        element = container.firstElementChild as SVGElement;
        // Now that the <svg> is created, we can set the style for screenshots.
        element.style.backgroundColor = 'white';
      } else if (container instanceof HTMLCanvasElement) {
        // The <canvas> image background is transparent, and there's not much we can do to change that without
        // significantly changing the vexml rendering.
        element = container;
      } else {
        throw new Error(`invalid container: ${container}`);
      }

      onResult({
        type: 'success',
        start,
        end: new Date(),
        element,
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
      if (container instanceof HTMLDivElement) {
        container.firstElementChild?.remove();
      }
    };
  }, [musicXML, mode, width, onResult]);

  return (
    <>
      <div className="w-100" ref={divContainerRef} style={{ display: mode === 'svg' ? 'block' : 'none' }}></div>
      <canvas
        className="w-100"
        ref={canvasContainerRef}
        style={{ display: mode === 'canvas' ? 'block' : 'none' }}
      ></canvas>
    </>
  );
};
