import * as vexml from '@/vexml';
import { useEffect, useRef } from 'react';
import { useWidth } from '../hooks/useWidth';

const DEBOUNCE_DELAY_MS = 100;

export type VexmlProps = {
  musicXML: string;
};

export const Vexml = (props: VexmlProps) => {
  const musicXML = props.musicXML;
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

    try {
      vexml.Vexml.fromMusicXML(musicXML).render({
        element,
        width,
      });
    } catch (e) {
      console.error(e);
    }

    return () => {
      const firstChild = element.firstChild;
      if (firstChild) {
        element.removeChild(firstChild);
      }
    };
  }, [musicXML, width]);

  if (musicXML.length > 0) {
    return <div className="w-100" ref={containerRef}></div>;
  } else {
    return (
      <div className="alert alert-warning d-flex align-items-center" role="alert">
        <i className="bi bi-exclamation-triangle-fill me-2"></i>
        <div>The MusicXML document is empty</div>
      </div>
    );
  }
};
