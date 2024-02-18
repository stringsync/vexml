import { Tooltip } from 'bootstrap';
import { useEffect, useRef, useState } from 'react';
import DragUpload from './DragUpload';
import { VEXML_VERSION } from '../constants';
import { convertFontToBase64, downloadSvgAsImage } from '../helpers';
import { Vexml } from '@/vexml';
import Select, { SelectEvent, SelectOptionGroup } from './Select';
import { getExamples } from '../examples';

const BUG_REPORT_HREF = `https://github.com/stringsync/vexml/issues/new?assignees=&labels=&projects=&template=bug-report.md&title=[BUG] (v${VEXML_VERSION}): <YOUR TITLE>`;
const SNAPSHOT_NAME = `vexml_dev_${VEXML_VERSION.replace(/\./g, '_')}.png`;
const FONT_FAMILY = 'Bravura';
const FONT_URL = 'https://cdn.jsdelivr.net/npm/vexflow-fonts@1.0.6/bravura/Bravura_1.392.otf';

const GROUPS: SelectOptionGroup<SelectValue>[] = [
  ...Object.entries(getExamples()).flatMap<SelectOptionGroup<SelectValue>>(([directory, values], groupIndex) =>
    directory
      ? {
          type: 'multi',
          label: directory,
          options: values.map((value, fileIndex) => ({
            key: `${groupIndex}-${directory}-${fileIndex}`,
            label: value.filename,
            value: { type: 'asset', get: value.get },
          })),
        }
      : values.map((value, fileIndex) => ({
          type: 'single',
          option: {
            key: `${groupIndex}-${directory}-${fileIndex}`,
            label: value.filename,
            value: { type: 'asset', get: value.get },
          },
        }))
  ),
  {
    type: 'multi',
    label: 'Other',
    options: [
      {
        key: 'custom',
        label: 'Custom',
        value: { type: 'custom' },
        disabled: true,
      },
    ],
  },
];

const DEFAULT_OPTION_GROUP = GROUPS[0];
// NOTE: This can be updated to target any option.
const DEFAULT_OPTION =
  DEFAULT_OPTION_GROUP.type === 'multi' ? DEFAULT_OPTION_GROUP.options[0] : DEFAULT_OPTION_GROUP.option;

const CUSTOM_OPTION_GROUP = GROUPS[GROUPS.length - 1];
const CUSTOM_OPTION =
  CUSTOM_OPTION_GROUP.type === 'multi' ? CUSTOM_OPTION_GROUP.options[0] : CUSTOM_OPTION_GROUP.option;

type ChangeType = 'default' | 'normal';

export type ControlsProps = {
  value: string;
  useDefault: boolean;
  containerId: string;
  saveDisabled: boolean;
  resetDisabled: boolean;
  reportDisabled: boolean;
  onChange: (type: ChangeType, value: string) => void;
  onSave: () => void;
  onReset: () => void;
};

type SelectValue =
  | {
      type: 'custom';
    }
  | {
      type: 'asset';
      get: () => Promise<string>;
    };

function Controls(props: ControlsProps) {
  // MusicXML change handlers
  const onFileInputChange = async (files: File[]) => {
    if (files.length === 0) {
      return;
    }

    try {
      // TODO: Consider propagating the Vexml instance around the application instead of the document string. That
      // way, we don't need to waste an additional parse downstream. Otherwise, this is probably not that big of a
      // and this TODO can be deleted.
      const vexml = await Vexml.fromFile(files[0]);
      setSelection(CUSTOM_OPTION.key);
      props.onChange('normal', vexml.getDocumentString());
    } catch (e) {
      console.error(`error reading file: ${e}`);
    }
  };

  const onSmFileInputChange: React.ChangeEventHandler<HTMLInputElement> = (e) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    onFileInputChange(files);
  };

  const onTextAreaInput = (event: React.FormEvent<HTMLTextAreaElement>) => {
    props.onChange('normal', event.currentTarget.value);
    setSelection(CUSTOM_OPTION.key);
  };

  // Select handler
  const [selection, setSelection] = useState(() => CUSTOM_OPTION.key);

  const onSelectChange = async (e: SelectEvent<SelectValue>) => {
    if (e.value.type === 'asset') {
      e.value.get().then((musicXML) => {
        props.onChange('normal', musicXML);
        setSelection(e.key);
      });
    }
  };

  // Handle useDefault
  if (props.useDefault && selection !== DEFAULT_OPTION.key) {
    setSelection(DEFAULT_OPTION.key);

    if (DEFAULT_OPTION.value.type === 'asset') {
      DEFAULT_OPTION.value.get().then((musicXML) => props.onChange('default', musicXML));
    }
  }

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
              <Select groups={GROUPS} selectedKey={selection} onChange={onSelectChange} />
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
