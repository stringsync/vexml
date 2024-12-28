import * as vexml from '@/index';
import { useCallback, useId, useRef, useState } from 'react';
import { useMusicXML } from '../hooks/useMusicXML';
import { CursorInput, RenderingBackend, Source } from '../types';
import { LegacyVexml, VexmlResult } from './LegacyVexml';
import { useTooltip } from '../hooks/useTooltip';
import { VEXML_VERSION } from '../constants';
import { SourceInfo } from './SourceInfo';
import { SourceForm } from './SourceForm';
import { downloadSvgAsImage } from '../util/downloadSvgAsImage';
import { convertFontToBase64 } from '../util/convertFontToBase64';
import { useNextKey } from '../hooks/useNextKey';
import { EVENT_LOG_CAPACITY, EventLog, EventLogCard } from './EventLogCard';
import { downloadCanvasAsImage } from '../util/downloadCanvasAsImage';
import { ConfigForm } from './ConfigForm';
import { EventTypeForm } from './EventTypeForm';
import { CursorForm } from './CursorForm';
import { Vexml } from './Vexml';

const BUG_REPORT_HREF = `https://github.com/stringsync/vexml/issues/new?assignees=&labels=&projects=&template=bug-report.md&title=[BUG] (v${VEXML_VERSION}): <YOUR TITLE>`;
const SNAPSHOT_NAME = `vexml_dev_${VEXML_VERSION.replace(/\./g, '_')}.png`;
const FONT_FAMILY = 'Bravura';
const FONT_URL = 'https://cdn.jsdelivr.net/npm/vexflow-fonts@1.0.6/bravura/Bravura_1.392.otf';

export type SourceProps = {
  source: Source;
  removable: boolean;
  onUpdate: (source: Source) => void;
  onRemove: () => void;
};

export const SourceDisplay = (props: SourceProps) => {
  const [musicXML, isMusicXMLLoading, musicXMLError] = useMusicXML(props.source);

  const previousButtonRef = useRef<HTMLButtonElement>(null);
  useTooltip(previousButtonRef, 'top', 'Previous');

  const nextButtonRef = useRef<HTMLButtonElement>(null);
  useTooltip(nextButtonRef, 'top', 'Next');

  const lockIconRef = useRef<HTMLElement>(null);
  useTooltip(lockIconRef, 'right', 'There are no other vexml versions available');

  const [legacyVexmlResult, setLegacyVexmlResult] = useState<VexmlResult>({ type: 'none' });

  const snapshotButtonRef = useRef<HTMLButtonElement>(null);
  useTooltip(snapshotButtonRef, 'top', SNAPSHOT_NAME);

  const element = legacyVexmlResult.type === 'success' ? legacyVexmlResult.element : null;
  const snapshotButtonDisabled = !(element instanceof SVGElement) && !(element instanceof HTMLCanvasElement);
  const onSnapshotClick = async () => {
    if (element instanceof SVGElement) {
      downloadSvgAsImage(element, {
        imageName: SNAPSHOT_NAME,
        fontFamily: FONT_FAMILY,
        fontBase64: await convertFontToBase64(FONT_URL),
      });
    }
    if (element instanceof HTMLCanvasElement) {
      downloadCanvasAsImage(element, SNAPSHOT_NAME);
    }
  };

  // For some reason, the data attributes doesn't work correctly when there are colons in the id.
  const collapseRootId = `source-display-collapse-${useId().replaceAll(':', '\\:')}`;
  const collapseRootSelector = `#${collapseRootId}`;

  const sourceInputCardId = useId();
  const sourceInputCardSelector = '#' + sourceInputCardId.replaceAll(':', '\\:');
  const [sourceInputCardClassName] = useState(() =>
    props.source.type === 'local' && props.source.musicXML.length === 0 ? 'collapse show' : 'collapse'
  );

  const configFormCardId = useId();
  const configFormCardSelector = '#' + configFormCardId.replaceAll(':', '\\:');
  const onConfigChange = (config: vexml.LegacyConfig) => {
    props.onUpdate({ ...props.source, config });
  };

  const eventCardId = useId();
  const eventCardSelector = '#' + eventCardId.replaceAll(':', '\\:');

  const [enabledVexmlEventTypes, setEnabledVexmlEventTypes] = useState<vexml.EventType[]>(['click', 'longpress']);

  const [logs, setLogs] = useState(new Array<EventLog>());
  const nextKey = useNextKey('event-log');
  const onVexmlEvent = useCallback<vexml.AnyEventListener>(
    (event) => {
      if (!enabledVexmlEventTypes.includes(event.type)) {
        return;
      }
      const log = {
        key: nextKey(),
        type: event.type,
        timestamp: new Date(),
        event,
      };
      setLogs((logs) => [log, ...logs.slice(0, EVENT_LOG_CAPACITY - 1)]);
    },
    [enabledVexmlEventTypes, nextKey]
  );

  const cursorCardId = useId();
  const cursorCardSelector = '#' + cursorCardId.replaceAll(':', '\\:');

  const svgButtonId = useId();
  const canvasButtonId = useId();
  const vexmlModeName = useId();
  const onVexmlModeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    props.onUpdate({ ...props.source, backend: e.target.value as RenderingBackend });
  };

  const [partIds, setPartIds] = useState<string[]>([]);
  const [cursorInputs, setCursorInputs] = useState(new Array<CursorInput>());
  const onCursorInputsChange = (cursorInputs: CursorInput[]) => {
    setCursorInputs(cursorInputs);
  };

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
              className="btn btn-outline-primary"
              data-bs-toggle="collapse"
              data-bs-target={eventCardSelector}
            >
              <i className="bi bi-lightning"></i>{' '}
              <p className="d-md-inline d-none">
                Events <span className="badge text-bg-primary">{logs.length}</span>
              </p>
            </button>

            <button
              type="button"
              className="btn btn-outline-primary"
              data-bs-toggle="collapse"
              data-bs-target={configFormCardSelector}
            >
              <i className="bi bi-gear"></i> <p className="d-md-inline d-none">Config</p>
            </button>

            <button
              type="button"
              className="btn btn-outline-primary"
              data-bs-toggle="collapse"
              data-bs-target={cursorCardSelector}
            >
              <i className="bi bi-input-cursor"></i> <p className="d-md-inline d-none">Cursors</p>
            </button>
          </div>

          <div className="btn-group" role="group">
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

          <div className="btn-group" role="group">
            <input
              type="radio"
              className="btn-check"
              name={vexmlModeName}
              value="svg"
              id={svgButtonId}
              checked={props.source.backend === 'svg'}
              onChange={onVexmlModeChange}
            />
            <label className="btn btn-outline-info" htmlFor={svgButtonId}>
              SVG
            </label>

            <input
              type="radio"
              className="btn-check"
              name={vexmlModeName}
              value="canvas"
              id={canvasButtonId}
              checked={props.source.backend === 'canvas'}
              onChange={onVexmlModeChange}
            />
            <label className="btn btn-outline-info" htmlFor={canvasButtonId}>
              Canvas
            </label>
          </div>

          <a href={BUG_REPORT_HREF} type="button" target="_blank" rel="noopener noreferrer" className="btn btn-light">
            <i className="bi bi-github"></i> Report an Issue
          </a>
        </div>

        <br />

        <div id={collapseRootId}>
          <div id={sourceInputCardId} className={sourceInputCardClassName} data-bs-parent={collapseRootSelector}>
            <h3 className="mb-3">Edit</h3>

            <SourceForm source={props.source} musicXML={musicXML} onUpdate={props.onUpdate} />
          </div>

          <br />

          <div id={eventCardId} className="collapse mb-3" data-bs-parent={collapseRootSelector}>
            <h3 className="mb-3">Events</h3>

            <EventTypeForm defaultEventTypes={enabledVexmlEventTypes} onEventTypesChange={setEnabledVexmlEventTypes} />

            <div className="d-flex overflow-x-auto gap-3">
              {logs.map((log, index) => (
                <EventLogCard key={log.key} index={index} log={log} />
              ))}
            </div>
          </div>

          <div id={configFormCardId} className="collapse mb-3" data-bs-parent={collapseRootSelector}>
            <h3 className="mb-3">Config</h3>

            <ConfigForm defaultValue={props.source.config} onChange={onConfigChange} />
          </div>

          <div id={cursorCardId} className="collapse mb-3" data-bs-parent={collapseRootSelector}>
            <h3 className="mb-3">Cursors</h3>

            <CursorForm partIds={partIds} onChange={onCursorInputsChange} />
          </div>
        </div>

        <br />

        {!isMusicXMLLoading && !musicXMLError && (
          <div>
            <h2>New</h2>
            <Vexml musicXML={musicXML} backend={props.source.backend} />

            <hr />

            <div className="d-flex gap-4 align-items-center">
              <h2 className="mb-3 ">Legacy</h2>
              <div className="flex-grow-1">
                <SourceInfo
                  vexmlResult={legacyVexmlResult}
                  musicXML={musicXML}
                  isMusicXMLLoading={isMusicXMLLoading}
                  musicXMLError={musicXMLError}
                />
              </div>
            </div>

            <LegacyVexml
              musicXML={musicXML}
              height={props.source.height === 0 ? undefined : props.source.height}
              cursorInputs={cursorInputs}
              backend={props.source.backend}
              config={props.source.config}
              onResult={setLegacyVexmlResult}
              onEvent={onVexmlEvent}
              onPartIdsChange={setPartIds}
            />
          </div>
        )}
      </div>
    </div>
  );
};
