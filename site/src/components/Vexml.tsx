import * as vexml from '@/index';
import * as errors from '../util/errors';
import { useEffect, useRef, useState } from 'react';
import { useWidth } from '../hooks/useWidth';

const THROTTLE_DELAY_MS = 50;

export type VexmlProps = {
  musicXML: string;
  mode: VexmlMode;
  debug: boolean;
  onResult: (result: VexmlResult) => void;
  onEvent: vexml.AnyEventListener;
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
  const debug = props.debug;
  const onResult = props.onResult;
  const onEvent = props.onEvent;

  const divContainerRef = useRef<HTMLDivElement>(null);
  const canvasContainerRef = useRef<HTMLCanvasElement>(null);

  const divStyle: React.CSSProperties = {
    display: mode === 'svg' ? 'block' : 'none',
  };
  const canvasStyle: React.CSSProperties = {
    display: mode === 'canvas' ? 'block' : 'none',
  };

  const divWidth = useWidth(divContainerRef, THROTTLE_DELAY_MS);
  const canvasWidth = useWidth(canvasContainerRef, THROTTLE_DELAY_MS);
  const width = mode === 'svg' ? divWidth : canvasWidth;

  const container = mode === 'svg' ? divContainerRef.current : canvasContainerRef.current;
  const [rendering, setRendering] = useState<vexml.Rendering | null>(null);

  useEffect(() => {
    if (!rendering) {
      return;
    }

    const handles = new Array<number>();

    handles.push(rendering.addEventListener('click', onEvent));
    handles.push(rendering.addEventListener('hover', onEvent));
    handles.push(rendering.addEventListener('enter', onEvent));
    handles.push(rendering.addEventListener('exit', onEvent));

    if (container) {
      const onEnter: vexml.EnterEventListener = () => {
        container.style.cursor = 'pointer';
      };
      const onExit: vexml.ExitEventListener = () => {
        container.style.cursor = 'default';
      };
      handles.push(rendering.addEventListener('enter', onEnter));
      handles.push(rendering.addEventListener('exit', onExit));
    }

    return () => {
      rendering.removeEventListener(...handles);
    };
  }, [rendering, container, onEvent]);

  useEffect(() => {
    onResult({ type: 'none' });

    if (!musicXML) {
      onResult({ type: 'empty' });
      return;
    }
    if (!container) {
      return;
    }
    if (width === 0) {
      return;
    }

    const start = new Date();

    try {
      const rendering = vexml.Vexml.fromMusicXML(musicXML).render({
        container,
        width,
        config: { DEBUG_DRAW_TARGET_BOUNDS: debug },
      });
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
  }, [musicXML, mode, debug, width, container, onResult]);

  return (
    <>
      <div className="w-100" ref={divContainerRef} style={divStyle}></div>
      <canvas className="w-100" ref={canvasContainerRef} style={canvasStyle}></canvas>
    </>
  );
};
