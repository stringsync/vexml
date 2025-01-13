import * as vexml from '@/index';
import * as errors from '../util/errors';
import { useEffect, useRef } from 'react';
import { useWidth } from '../hooks/useWidth';

export type VexmlProps = {
  musicXML: string;
  backend: 'svg' | 'canvas';
  config: vexml.Config;
  onResult: (result: VexmlResult) => void;
};

export type VexmlResult =
  | { type: 'none' }
  | { type: 'empty' }
  | { type: 'success'; start: Date; end: Date; width: number; element: HTMLCanvasElement | SVGElement }
  | { type: 'error'; error: Error; start: Date; end: Date; width: number };

export const Vexml = ({ musicXML, backend, config, onResult }: VexmlProps) => {
  const divRef = useRef<HTMLDivElement>(null);
  const div = divRef.current;

  const width = useWidth(divRef);

  useEffect(() => {
    if (!div) {
      return;
    }
    if (musicXML.length === 0) {
      return;
    }

    const start = new Date();
    let score: vexml.Score;

    try {
      const logger = new vexml.ConsoleLogger();
      const parser = new vexml.MusicXMLParser();
      const document = parser.parse(musicXML);
      const renderer = new vexml.Renderer(document);
      score = renderer.render(div, {
        config: {
          ...config,
          DRAWING_BACKEND: backend,
          WIDTH: width,
        },
        logger,
      });
      const element = score.getVexflowElement();

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
      score.destroy();
    };
  }, [div, backend, width, musicXML, config, onResult]);

  return (
    <div className="w-100">
      <div ref={divRef}></div>
    </div>
  );
};
