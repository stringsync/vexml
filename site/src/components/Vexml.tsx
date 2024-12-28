import * as vexml from '@/index';
import { useEffect, useRef } from 'react';

export type VexmlProps = {
  musicXML: string;
  backend: 'svg' | 'canvas';
};

export const Vexml = ({ musicXML, backend }: VexmlProps) => {
  const divRef = useRef<HTMLDivElement>(null);
  const div = divRef.current;

  useEffect(() => {
    if (!div) {
      return;
    }

    const parser = new vexml.MusicXMLParser();
    const document = parser.parse(musicXML);
    const renderer = new vexml.Renderer(document);
    const rendering = renderer.render(div, {
      config: {
        DRAWING_BACKEND: backend,
      },
      logger: new vexml.ConsoleLogger(),
    });

    return () => {
      rendering.clear();
    };
  }, [div, backend, musicXML]);

  return (
    <div className="w-100">
      <div ref={divRef}></div>
    </div>
  );
};
