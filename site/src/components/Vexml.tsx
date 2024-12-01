import * as vexml from '@/index';
import * as errors from '../util/errors';
import { useEffect, useRef, useState } from 'react';
import { useWidth } from '../hooks/useWidth';
import { Cursor, RenderingBackend } from '../types';

const STRINGSYNC_RED = '#FC354C';

export type VexmlProps = {
  musicXML: string;
  backend: RenderingBackend;
  config: vexml.Config;
  cursors: Cursor[];
  onResult: (result: VexmlResult) => void;
  onEvent: vexml.AnyEventListener;
  onPartIdsChange: (partIds: string[]) => void;
};

export type VexmlResult =
  | { type: 'none' }
  | { type: 'empty' }
  | { type: 'success'; start: Date; end: Date; width: number; element: HTMLCanvasElement | SVGElement }
  | { type: 'error'; error: Error; start: Date; end: Date; width: number };

export const Vexml = ({ musicXML, backend, config, cursors, onResult, onEvent, onPartIdsChange }: VexmlProps) => {
  const divRef = useRef<HTMLDivElement>(null);
  const div = divRef.current;

  const width = useWidth(divRef);

  const [rendering, setRendering] = useState<vexml.Rendering | null>(null);
  const [discreteCursors, setDiscreteCursors] = useState<vexml.DiscreteCursor[]>([]);

  const [progress, setProgress] = useState(0);
  const onProgressChange: React.ChangeEventHandler<HTMLInputElement> = (e) => {
    const nextProgress = parseFloat(e.target.value);
    setProgress(nextProgress);
    for (const discreteCursor of discreteCursors) {
      discreteCursor.next();
    }
  };

  useEffect(() => {
    if (!rendering) {
      return;
    }

    const handles = new Array<number>();

    handles.push(rendering.addEventListener('click', onEvent));
    handles.push(rendering.addEventListener('longpress', onEvent));
    handles.push(rendering.addEventListener('exit', onEvent));
    handles.push(rendering.addEventListener('enter', onEvent));

    if (div) {
      const onEnter: vexml.EnterEventListener = (event) => {
        div.style.cursor = 'pointer';

        // TODO: Create official wrapper around vexml Rendering* objects that allows users to color the notes.
        const value = event.target.value;
        switch (value.type) {
          case 'stavenote':
            const vfStaveNote = value.vexflow.staveNote;
            vfStaveNote.getSVGElement()?.remove();
            vfStaveNote.setLedgerLineStyle({ strokeStyle: STRINGSYNC_RED });
            vfStaveNote.setStyle({ fillStyle: STRINGSYNC_RED, strokeStyle: STRINGSYNC_RED }).draw();
            break;
          case 'stavechord':
            value.notes.forEach((note) => {
              const vfStaveNote = note.vexflow.staveNote;
              vfStaveNote.getSVGElement()?.remove();
              vfStaveNote.setLedgerLineStyle({ strokeStyle: STRINGSYNC_RED });
              vfStaveNote.setStyle({ fillStyle: STRINGSYNC_RED, strokeStyle: STRINGSYNC_RED }).draw();
            });
            break;
          case 'tabnote':
            const vfTabNote = value.vexflow.tabNote;
            vfTabNote.getSVGElement()?.remove();
            vfTabNote.setStyle({ fillStyle: STRINGSYNC_RED, strokeStyle: STRINGSYNC_RED }).draw();
            break;
          case 'tabchord':
            value.tabNotes.forEach((tabNote) => {
              const vfTabNote = tabNote.vexflow.tabNote;
              vfTabNote.getSVGElement()?.remove();
              vfTabNote.setStyle({ fillStyle: STRINGSYNC_RED, strokeStyle: STRINGSYNC_RED }).draw();
            });
            break;
          case 'rest':
            value.vexflow.note.getSVGElement()?.remove();
            value.vexflow.note.setStyle({ fillStyle: STRINGSYNC_RED }).draw();
            break;
        }
      };
      const onExit: vexml.ExitEventListener = (event) => {
        div.style.cursor = 'default';

        const value = event.target.value;
        switch (value.type) {
          case 'stavenote':
            const vfStaveNote = value.vexflow.staveNote;
            vfStaveNote.getSVGElement()?.remove();
            vfStaveNote.setLedgerLineStyle({ strokeStyle: 'black' });
            vfStaveNote.setStyle({ fillStyle: 'black', strokeStyle: 'black' }).draw();
            break;
          case 'stavechord':
            value.notes.forEach((note) => {
              const vfStaveNote = note.vexflow.staveNote;
              vfStaveNote.getSVGElement()?.remove();
              vfStaveNote.setLedgerLineStyle({ strokeStyle: 'black' });
              vfStaveNote.setStyle({ fillStyle: 'black', strokeStyle: 'black' }).draw();
            });
            break;
          case 'tabnote':
            const vfTabNote = value.vexflow.tabNote;
            vfTabNote.getSVGElement()?.remove();
            vfTabNote.setStyle({ fillStyle: 'black', strokeStyle: 'black' }).draw();
            break;
          case 'tabchord':
            value.tabNotes.forEach((tabNote) => {
              const vfTabNote = tabNote.vexflow.tabNote;
              vfTabNote.getSVGElement()?.remove();
              vfTabNote.setStyle({ fillStyle: 'black', strokeStyle: 'black' }).draw();
            });
            break;
          case 'rest':
            value.vexflow.note.getSVGElement()?.remove();
            value.vexflow.note.setStyle({ fillStyle: 'black' }).draw();
            break;
        }
      };
      handles.push(rendering.addEventListener('enter', onEnter));
      handles.push(rendering.addEventListener('exit', onExit));
    }

    return () => {
      rendering.removeEventListener(...handles);
    };
  }, [rendering, div, onEvent]);

  useEffect(() => {
    if (!musicXML) {
      onResult({ type: 'empty' });
      return;
    }
    if (!div) {
      onResult({ type: 'none' });
      return;
    }
    if (width === 0) {
      onResult({ type: 'none' });
      return;
    }

    const start = new Date();
    let rendering: vexml.Rendering | null = null;

    try {
      rendering = vexml.Vexml.fromMusicXML(musicXML).render({
        element: div,
        width,
        backend,
        config,
      });
      setRendering(rendering);

      const partIds = rendering.getPartIds();
      onPartIdsChange(partIds);

      const discreteCursors = cursors.map((cursor) => rendering!.createDiscreteCursor(cursor));
      setDiscreteCursors(discreteCursors);

      const element = rendering.getVexflowElement();
      // For screenshots, we want the background to be white.
      element.style.backgroundColor = 'white';

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
      rendering?.destroy();
    };
  }, [musicXML, cursors, backend, config, width, div, onResult, onPartIdsChange]);

  return (
    <div className="w-100">
      <div ref={divRef}></div>
      <div className="d-flex align-items-center gap-3 m-3">
        <button className="btn bg-transparent" style={{ fontSize: 24 }}>
          <i className="bi bi-play-fill"></i>
        </button>
        <input
          className="w-100 form-range"
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={progress}
          onChange={onProgressChange}
        ></input>
        <span>0:00</span>
      </div>
    </div>
  );
};
