import * as vexml from '@/index';
import { useCallback, useId, useRef, useState } from 'react';
import { useMusicXML } from '../hooks/useMusicXML';
import { Source } from '../types';
import { Vexml, VexmlResult } from './Vexml';
import { useTooltip } from '../hooks/useTooltip';
import { VEXML_VERSION } from '../constants';
import { SourceInfo } from './SourceInfo';
import { SourceInput } from './SourceInput';
import { downloadSvgAsImage } from '../util/downloadSvgAsImage';
import { convertFontToBase64 } from '../util/convertFontToBase64';
import { useNextKey } from '../hooks/useNextKey';

const BUG_REPORT_HREF = `https://github.com/stringsync/vexml/issues/new?assignees=&labels=&projects=&template=bug-report.md&title=[BUG] (v${VEXML_VERSION}): <YOUR TITLE>`;
const SNAPSHOT_NAME = `vexml_dev_${VEXML_VERSION.replace(/\./g, '_')}.png`;
const FONT_FAMILY = 'Bravura';
const FONT_URL = 'https://cdn.jsdelivr.net/npm/vexflow-fonts@1.0.6/bravura/Bravura_1.392.otf';
const EVENT_LOG_CAPACITY = 10;

const CARD_STYLE = { maxHeight: '400px' } as const;

export type SourceProps = {
  source: Source;
  removable: boolean;
  onUpdate: (source: Source) => void;
  onRemove: () => void;
};

type EventLog = { key: string; type: string; timestamp: Date; payload: string };

export const SourceDisplay = (props: SourceProps) => {
  const [musicXML, isMusicXMLLoading, musicXMLError] = useMusicXML(props.source);

  const previousButtonRef = useRef<HTMLButtonElement>(null);
  useTooltip(previousButtonRef, 'top', 'Previous');

  const nextButtonRef = useRef<HTMLButtonElement>(null);
  useTooltip(nextButtonRef, 'top', 'Next');

  const lockIconRef = useRef<HTMLElement>(null);
  useTooltip(lockIconRef, 'right', 'There are no other vexml versions available');

  const [vexmlResult, setVexmlResult] = useState<VexmlResult>({ type: 'none' });

  const snapshotButtonRef = useRef<HTMLButtonElement>(null);
  useTooltip(snapshotButtonRef, 'top', SNAPSHOT_NAME);

  const svg = vexmlResult.type === 'success' ? vexmlResult.svg : null;
  const snapshotButtonDisabled = !svg;
  const onSnapshotClick = async () => {
    if (!svg) {
      return;
    }
    downloadSvgAsImage(svg, {
      imageName: SNAPSHOT_NAME,
      fontFamily: FONT_FAMILY,
      fontBase64: await convertFontToBase64(FONT_URL),
    });
  };

  const sourceInputCardId = useId();
  const sourceInputCardSelector = '#' + sourceInputCardId.replaceAll(':', '\\:');
  const [sourceInputCardClassName] = useState(() =>
    props.source.type === 'local' && props.source.musicXML.length === 0 ? 'show' : 'collapse'
  );

  const [logs, setLogs] = useState(new Array<EventLog>());
  const nextKey = useNextKey('event-log');
  const onVexmlClick = useCallback<vexml.ClickEventListener>(
    (payload) => {
      const log = {
        key: nextKey(),
        type: payload.type,
        timestamp: new Date(),
        payload: shallowStringify(payload),
      };
      setLogs((logs) => [log, ...logs.slice(0, EVENT_LOG_CAPACITY - 1)]);
    },
    [nextKey]
  );

  const eventCardId = useId();
  const eventCardSelector = '#' + eventCardId.replaceAll(':', '\\:');

  return (
    <div className="card shadow-sm p-3 mt-4 mb-4">
      <div className="card-body">
        <div className="d-flex flex-wrap gap-2">
          <div className="btn-group" role="group">
            <button
              type="button"
              className="btn btn-outline-primary"
              data-bs-toggle="collapse"
              data-bs-target={sourceInputCardSelector}
            >
              <i className="bi bi-pencil-square"></i> <p className="d-md-inline d-none">Edit</p>
            </button>

            <button
              type="button"
              className="btn btn-outline-success"
              data-bs-toggle="collapse"
              data-bs-target={eventCardSelector}
            >
              <i className="bi bi-lightning"></i> <p className="d-md-inline d-none">Events</p>
            </button>

            <button
              ref={snapshotButtonRef}
              type="button"
              className="btn btn-outline-secondary"
              onClick={onSnapshotClick}
              disabled={snapshotButtonDisabled}
            >
              <i className="bi bi-camera"></i> <p className="d-md-inline d-none">Snapshot</p>
            </button>

            <button
              type="button"
              className="btn btn-outline-danger"
              onClick={props.onRemove}
              disabled={!props.removable}
            >
              <i className="bi bi-trash"></i> <p className="d-md-inline d-none">Remove</p>
            </button>
          </div>

          <a href={BUG_REPORT_HREF} type="button" target="_blank" rel="noopener noreferrer" className="btn btn-light">
            <i className="bi bi-github"></i> Report an Issue
          </a>
        </div>

        <br />

        <div id={sourceInputCardId} className={sourceInputCardClassName}>
          <SourceInput source={props.source} musicXML={musicXML} onUpdate={props.onUpdate} />
        </div>

        <br />

        <div id={eventCardId} className="collapse mb-3">
          <h3 className="mb-3">
            Events <span className="badge text-bg-secondary">{logs.length}</span>
          </h3>

          <div className="d-flex overflow-x-auto gap-3">
            {logs.map((log, index) => (
              <div key={log.key} className="card rounded flex-grow-0 flex-shrink-0 overflow-y-auto" style={CARD_STYLE}>
                <div className="card-body">
                  <h5 className="card-title d-flex justify-content-between align-items-center">
                    {log.type} {index === 0 && <span className="badge text-bg-primary">new</span>}
                  </h5>
                  <h6 className="card-subtitle mb-2 text-body-secondary">ID {log.key}</h6>
                  <p className="card-text">
                    <pre>{log.payload}</pre>
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <SourceInfo
          vexmlResult={vexmlResult}
          musicXML={musicXML}
          isMusicXMLLoading={isMusicXMLLoading}
          musicXMLError={musicXMLError}
        />

        <br />

        {!isMusicXMLLoading && !musicXMLError && (
          <div className="d-flex justify-content-center">
            <Vexml musicXML={musicXML} onResult={setVexmlResult} onClick={onVexmlClick} />
          </div>
        )}
      </div>
    </div>
  );
};

const shallowStringify = <T extends object>(payload: T) =>
  JSON.stringify(
    payload,
    (key, value) => {
      const isComplexObject =
        typeof value === 'object' && value !== null && !Array.isArray(value) && value.constructor !== Object;
      if (isComplexObject) {
        return `[${value.constructor.name}]`;
      }
      return value;
    },
    2
  );
