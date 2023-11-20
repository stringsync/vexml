import { Tooltip } from 'bootstrap';
import { useCallback, useEffect, useRef } from 'react';
import DragUpload from './DragUpload';
import { VEXML_VERSION } from '../constants';
import { convertFontToBase64, downloadSvgAsImage } from '../helpers';

const BUG_REPORT_HREF = `https://github.com/stringsync/vexml/issues/new?assignees=&labels=&projects=&template=bug-report.md&title=[BUG] (v${VEXML_VERSION}): <YOUR TITLE>`;
const SNAPSHOT_NAME = `vexml_dev_${VEXML_VERSION.replace(/\./g, '_')}.png`;
const FONT_FAMILY = 'Bravura';
const FONT_URL = 'https://cdn.jsdelivr.net/npm/vexflow-fonts@1.0.6/bravura/Bravura_1.392.otf';

export type ControlsProps = {
  value: string;
  containerId: string;
  saveDisabled: boolean;
  resetDisabled: boolean;
  reportDisabled: boolean;
  onChange: (value: string) => void;
  onSave: () => void;
  onReset: () => void;
};

function Controls(props: ControlsProps) {
  const { value, onChange } = props;

  // MusicXML change handlers
  const onFileInputChange = useCallback(
    (files: File[]) => {
      if (files.length === 0) {
        return;
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result;
        if (typeof text === 'string' && text !== value) {
          onChange(text);
        }
      };
      reader.readAsText(files[0]);
    },
    [value, onChange]
  );

  const onTextAreaInput = (event: React.FormEvent<HTMLTextAreaElement>) => {
    onChange(event.currentTarget.value);
  };

  // Save
  const saveButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const saveButton = saveButtonRef.current;
    if (!saveButton) {
      return;
    }

    const tooltip = new Tooltip(saveButton, {
      title: '5MB limit',
      placement: 'top',
      trigger: 'hover',
    });

    return () => tooltip.dispose();
  }, []);

  // Snapshot
  const snapshotButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const snapshotButton = snapshotButtonRef.current;
    if (!snapshotButton) {
      return;
    }

    const tooltip = new Tooltip(snapshotButton, {
      title: `<em>${SNAPSHOT_NAME}</em>`,
      placement: 'top',
      trigger: 'hover',
      html: true,
    });

    return () => tooltip.dispose();
  }, []);

  const container = document.getElementById(props.containerId);
  const svg = container?.getElementsByTagName('svg')[0] ?? null;
  const snapshotDisabled = !svg || !props.value;

  const onSnapshotClick: React.MouseEventHandler<HTMLButtonElement> = async () => {
    if (!svg) {
      return;
    }

    downloadSvgAsImage(svg, {
      imageName: SNAPSHOT_NAME,
      fontFamily: FONT_FAMILY,
      fontBase64: await convertFontToBase64(FONT_URL),
    });
  };

  return (
    <>
      <div className="custom-file mb-4">
        <div className="row">
          <div className="col-md-6 col-12 mb-4 mb-md-0">
            <DragUpload placeholder="Select or drop a MusicXML file here" onChange={onFileInputChange} />
          </div>
          <div className="col-md-6 col-12">
            <textarea
              className="form-control form-control"
              style={{ height: '300px' }}
              value={props.value}
              onInput={onTextAreaInput}
            ></textarea>
          </div>
        </div>
      </div>

      <div className="d-flex gap-2">
        <button
          className="btn btn-success"
          type="button"
          ref={saveButtonRef}
          disabled={props.saveDisabled}
          onClick={props.onSave}
        >
          <i className="bi bi-floppy"></i> Save
        </button>

        <button type="button" className="btn btn-danger" disabled={props.resetDisabled} onClick={props.onReset}>
          <i className="bi bi-arrow-clockwise"></i> Reset
        </button>

        <button
          type="button"
          className="btn btn-primary"
          ref={snapshotButtonRef}
          onClick={onSnapshotClick}
          disabled={snapshotDisabled}
        >
          <i className="bi bi-camera"></i> Snapshot
        </button>

        <a href={BUG_REPORT_HREF} type="button" target="_blank" className="btn btn-light">
          <i className="bi bi-github"></i> Report an Issue
        </a>
      </div>
    </>
  );
}

export default Controls;
