import { Tooltip } from 'bootstrap';
import { useCallback, useEffect, useRef, useState } from 'react';
import DragUpload from './DragUpload';
import { VEXML_VERSION } from '../constants';
import { convertFontToBase64, downloadSvgAsImage } from '../helpers';
import { Vexml } from '@/vexml';
import Select, { SelectEvent, SelectOption } from './Select';

const BUG_REPORT_HREF = `https://github.com/stringsync/vexml/issues/new?assignees=&labels=&projects=&template=bug-report.md&title=[BUG] (v${VEXML_VERSION}): <YOUR TITLE>`;
const SNAPSHOT_NAME = `vexml_dev_${VEXML_VERSION.replace(/\./g, '_')}.png`;
const FONT_FAMILY = 'Bravura';
const FONT_URL = 'https://cdn.jsdelivr.net/npm/vexflow-fonts@1.0.6/bravura/Bravura_1.392.otf';

const SELECT_OPTIONS: SelectOption<SelectValue>[] = [
  { key: 0, text: 'default.xml', value: { type: 'asset', url: '/public/examples/default.xml' } },
  { key: 1, text: 'Custom', value: { type: 'custom' }, disabled: true },
];

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

type SelectValue =
  | {
      type: 'custom';
    }
  | {
      type: 'asset';
      url: string;
    };

function Controls(props: ControlsProps) {
  const { onChange } = props;

  // MusicXML change handlers
  const onFileInputChange = useCallback(
    async (files: File[]) => {
      if (files.length === 0) {
        return;
      }

      try {
        // TODO: Consider propagating the Vexml instance around the application instead of the document string. That
        // way, we don't need to waste an additional parse downstream. Otherwise, this is probably not that big of a
        // and this TODO can be deleted.
        const vexml = await Vexml.fromFile(files[0]);
        onChange(vexml.getDocumentString());
      } catch (e) {
        console.error(`error reading file: ${e}`);
      }
    },
    [onChange]
  );

  const onSmFileInputChange: React.ChangeEventHandler<HTMLInputElement> = (e) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    onFileInputChange(files);
  };

  const onTextAreaInput = (event: React.FormEvent<HTMLTextAreaElement>) => {
    onChange(event.currentTarget.value);
    setSelection(SELECT_OPTIONS[SELECT_OPTIONS.length - 1].key);
  };

  // Select handler
  const [selection, setSelection] = useState(() => SELECT_OPTIONS[0].key);
  const onSelectChange = async (e: SelectEvent<SelectValue>) => {
    setSelection(e.key);

    const value = e.value;
    if (value.type === 'asset') {
      const response = await fetch(value.url);
      onChange(await response.text());
    }
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
            <div className="mb-4">
              <Select options={SELECT_OPTIONS} selectedKey={selection} onChange={onSelectChange} />
            </div>

            <div className="d-none d-md-block">
              <DragUpload placeholder="Select or drop a MusicXML file here" onChange={onFileInputChange} />
            </div>

            <div className="d-block d-md-none">
              <input type="file" className="form-control" onChange={onSmFileInputChange} />
            </div>
          </div>
          <div className="col-md-6 col-12">
            <textarea
              className="form-control form-control"
              style={{ height: '361px' }}
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
