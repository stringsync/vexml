import { useId, useRef, useState } from 'react';
import { useMusicXML } from '../hooks/useMusicXML';
import { Source } from '../types';
import { Vexml, VexmlResult } from './Vexml';
import { useTooltip } from '../hooks/useTooltip';
import { VEXML_VERSION } from '../constants';
import { SourceInfo } from './SourceInfo';
import { SourceInput } from './SourceInput';

const BUG_REPORT_HREF = `https://github.com/stringsync/vexml/issues/new?assignees=&labels=&projects=&template=bug-report.md&title=[BUG] (v${VEXML_VERSION}): <YOUR TITLE>`;

export type SourceProps = {
  source: Source;
  removable: boolean;
  onUpdate: (source: Source) => void;
  onRemove: () => void;
};

export const SourceDisplay = (props: SourceProps) => {
  const [musicXML, isMusicXMLLoading, musicXMLError] = useMusicXML(props.source);
  const isMusicXMLEmpty = !isMusicXMLLoading && !musicXMLError && musicXML.length === 0;

  const previousButtonRef = useRef<HTMLButtonElement>(null);
  useTooltip(previousButtonRef, 'top', 'Previous');

  const nextButtonRef = useRef<HTMLButtonElement>(null);
  useTooltip(nextButtonRef, 'top', 'Next');

  const lockIconRef = useRef<HTMLElement>(null);
  useTooltip(lockIconRef, 'right', 'There are no other vexml versions available');

  const [vexmlResult, setVexmlResult] = useState<VexmlResult>({ type: 'none' });

  const sourceInputCardId = useId();
  const sourceInputCardSelector = '#' + sourceInputCardId.replaceAll(':', '\\:');
  const [sourceInputCardClassName] = useState(() => (isMusicXMLEmpty ? 'show' : 'collapse'));

  return (
    <div className="card shadow-sm p-3 mt-4 mb-4">
      <div className="card-body">
        <div className="d-flex justify-content-between">
          <div className="d-flex gap-2">
            <button
              type="button"
              className="btn btn-primary"
              disabled={isMusicXMLEmpty}
              data-bs-toggle="collapse"
              data-bs-target={sourceInputCardSelector}
            >
              <i className="bi bi-pencil-square"></i> Edit
            </button>

            <button type="button" className="btn btn-light">
              <i className="bi bi-camera"></i> Snapshot
            </button>

            <a href={BUG_REPORT_HREF} type="button" target="_blank" rel="noopener noreferrer" className="btn btn-light">
              <i className="bi bi-github"></i> Report an Issue
            </a>

            <div className="d-flex align-items-center">
              <select disabled className="form-select" defaultValue="0.0.0">
                <option value="0.0.0">0.0.0</option>
              </select>
              <i ref={lockIconRef} className="bi bi-lock-fill ms-2"></i>
            </div>
          </div>

          <button type="button" className="btn btn-outline-danger" onClick={props.onRemove} disabled={!props.removable}>
            <i className="bi bi-trash"></i> Remove
          </button>
        </div>

        <br />

        <div id={sourceInputCardId} className={sourceInputCardClassName}>
          <SourceInput source={props.source} onUpdate={props.onUpdate} />
        </div>

        <br />

        <SourceInfo
          vexmlResult={vexmlResult}
          musicXML={musicXML}
          isMusicXMLLoading={isMusicXMLLoading}
          musicXMLError={musicXMLError}
        />

        <br />

        {!isMusicXMLLoading && !musicXMLError && (
          <div className="d-flex justify-content-center">
            <Vexml musicXML={musicXML} onResult={setVexmlResult} />
          </div>
        )}
      </div>
    </div>
  );
};
