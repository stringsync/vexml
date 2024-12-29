import * as vexml from '@/index';
import { useEffect, useRef } from 'react';
import { useWidth } from '../hooks/useWidth';

export type VexmlProps = {
  musicXML: string;
  backend: 'svg' | 'canvas';
};

export const Vexml = ({ musicXML, backend }: VexmlProps) => {
  const divRef = useRef<HTMLDivElement>(null);
  const div = divRef.current;

  const width = useWidth(divRef);

  useEffect(() => {
    if (!div) {
      return;
    }

    const logger = new vexml.ConsoleLogger();

    const parser = new vexml.MusicXMLParser();
    const document = parser.parse(musicXML);
    const renderer = new vexml.Renderer(document);
    const rendering = renderer.render(div, {
      config: {
        DRAWING_BACKEND: backend,
        WIDTH: width,
      },
      logger,
    });

    return () => {
      rendering.clear();
    };
  }, [div, backend, width, musicXML]);

  return (
    <div className="w-100">
      <div ref={divRef}></div>
    </div>
  );
};
