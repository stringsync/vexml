import React, { ChangeEvent, useId, useRef, useState } from 'react';
import { Source, RenderingBackend } from '../types';
import { useModal } from '../hooks/useModal';
import DragUpload from './DragUpload';
import { DEFAULT_EXAMPLE_PATH, EXAMPLES } from '../constants';
import { Select, SelectEvent, SelectOptionGroup } from './Select';
import { Config, DEFAULT_CONFIG, Vexml } from '@/index';
import { useTooltip } from '../hooks/useTooltip';

export type SourceFormProps = {
  source: Source;
  musicXML: string;
  onUpdate: (source: Source) => void;
};

export const SourceForm = (props: SourceFormProps) => {
  const [source, setSource] = useState<Source>(props.source);

  const timeoutRef = useRef(0);

  const updateNow = (source: Source) => {
    window.clearTimeout(timeoutRef.current);
    setSource(source);
    props.onUpdate(source);
  };

  const updateLater = (source: Source) => {
    window.clearTimeout(timeoutRef.current);
    setSource(source);
    timeoutRef.current = window.setTimeout(() => {
      props.onUpdate(source);
    }, 500);
  };

  const musicXML = source.type === 'local' ? source.musicXML : props.musicXML;
  const onMusicXMLChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (source.type === 'local') {
      updateLater({ ...source, type: 'local', musicXML: e.target.value });
    }
  };

  const path = source.type === 'example' ? source.path : DEFAULT_EXAMPLE_PATH;
  const pathKey = EXAMPLE_OPTION_KEY_BY_PATH[path] ?? '';
  const onPathChange = (e: SelectEvent<string>) => {
    if (source.type === 'example') {
      updateNow({ ...source, type: 'example', path: e.value });
    }
  };

  const url = source.type === 'remote' ? source.url : '';
  const onUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (source.type === 'remote') {
      updateLater({ ...source, type: 'remote', url: e.target.value });
    }
  };

  const modalRef = useRef<HTMLDivElement>(null);
  const modal = useModal(modalRef);
  const [modalSource, setModalSource] = useState<Source>({
    type: 'local',
    musicXML: '',
    backend: 'svg',
    config: DEFAULT_CONFIG,
    height: 0,
  });
  const onModalContinue = () => {
    updateNow(modalSource);
    modal.hide();
  };

  const heightTooltipRef = useRef<HTMLDivElement>(null);
  useTooltip(heightTooltipRef, 'right', 'The height scroll container in pixels. Set to 0 for auto height.');

  const onRadioChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const type = e.target.value;
    if (!isSourceType(type)) {
      throw new Error(`Invalid source type: ${type}`);
    }

    const source = getDefaultSource(type, props.source.backend, props.source.config, props.source.height);

    const isSourceEmpty =
      (props.source.type === 'local' && props.source.musicXML.length === 0) ||
      (props.source.type === 'remote' && props.source.url.length === 0) ||
      props.source.type === 'example';

    if (isSourceEmpty) {
      setSource(source);
      props.onUpdate(source);
    } else {
      setModalSource(source);
      modal.show();
    }
  };

  const heightId = useId();
  const onHeightChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const height = parseInt(e.target.value, 10);
    updateLater({ ...source, height });
  };

  const onConvertToLocalClick = () => {
    const source = getDefaultSource('local', props.source.backend, props.source.config, props.source.height) as Extract<
      Source,
      { type: 'local' }
    >;
    source.musicXML = props.musicXML;
    updateNow(source);
  };

  const onFileInputChange = async (files: File[]) => {
    if (files.length === 0) {
      return;
    }

    try {
      const vexml = await Vexml.fromFile(files[0]);
      updateNow({
        ...source,
        type: 'local',
        musicXML: vexml.getDocumentString(),
      });
    } catch (e) {
      console.error(`error reading file: ${e}`);
    }
  };

  const onNativeFileInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    onFileInputChange(files);
  };

  const sourceTypeRadioName = useId();
  const localRadioId = useId();
  const exampleRadioId = useId();
  const remoteRadioId = useId();

  const isTextareaDisabled = props.source.type !== 'local';
  const textareaPlaceholder = props.source.type === 'local' ? 'Write or paste MusicXML here' : '';

  return (
    <div>
      <div className="row align-items-center">
        <div className="col-12 col-md-6 col-lg-8">
          <div className="form-check form-check-inline">
            <input
              className="form-check-input"
              type="radio"
              name={sourceTypeRadioName}
              id={localRadioId}
              value="local"
              checked={props.source.type === 'local'}
              onChange={onRadioChange}
            />
            <label className="form-check-label" htmlFor={localRadioId}>
              local
            </label>
          </div>
          <div className="form-check form-check-inline">
            <input
              className="form-check-input"
              type="radio"
              name={sourceTypeRadioName}
              id={exampleRadioId}
              value="example"
              checked={props.source.type === 'example'}
              onChange={onRadioChange}
            />
            <label className="form-check-label" htmlFor={exampleRadioId}>
              example
            </label>
          </div>
          <div className="form-check form-check-inline">
            <input
              className="form-check-input"
              type="radio"
              name={sourceTypeRadioName}
              id={remoteRadioId}
              value="remote"
              checked={props.source.type === 'remote'}
              onChange={onRadioChange}
            />
            <label className="form-check-label" htmlFor={remoteRadioId}>
              remote
            </label>
          </div>
        </div>

        <div className="col-12 col-md-6 col-lg-4 my-4 my-md-0">
          <div>
            <label htmlFor={heightId} className="form-label">
              Height
            </label>
            <small ref={heightTooltipRef} className="ms-2">
              <i className="bi bi-question-circle"></i>
            </small>
            <div className="row">
              <div className="col-8">
                <input
                  id={heightId}
                  type="range"
                  className="form-range"
                  value={source.height ?? 0}
                  min={0}
                  max={2400}
                  onChange={onHeightChange}
                />
              </div>
              <div className="col-4">{source.height || 'auto'}</div>
            </div>
          </div>
        </div>
      </div>

      <hr />

      <div className="row">
        <div className="col-md-6 col-12 mb-4 mb-md-0">
          {props.source.type === 'local' && (
            <>
              <div className="d-none d-md-block">
                <DragUpload placeholder="Select or drop a MusicXML file here" onChange={onFileInputChange} />
              </div>
              <div className="d-block d-md-none">
                <input type="file" className="form-control" onChange={onNativeFileInputChange} />
              </div>
            </>
          )}

          {props.source.type === 'example' && (
            <div>
              <Select groups={EXAMPLE_GROUPS} selectedKey={pathKey} onChange={onPathChange} />

              <div className="callout">
                <span>
                  <strong>NOTE:</strong> The MusicXML text is readonly
                </span>
              </div>
              <div className="d-grid">
                <button className="btn btn-outline-warning" onClick={onConvertToLocalClick}>
                  <i className="bi bi-cloud-arrow-down"></i> Convert to local
                </button>
              </div>
            </div>
          )}

          {props.source.type === 'remote' && (
            <div>
              <div className="input-group">
                <span className="input-group-text" id="inputGroup-sizing-lg">
                  URL
                </span>
                <input type="url" className="form-control" value={url} onChange={onUrlChange} />
              </div>
              <div className="callout">
                This must be a <strong>direct</strong> URL to a <code>.musicxml</code> or <code>.mxl</code> file.
              </div>

              <div className="callout">
                <span>
                  <strong>NOTE:</strong> The MusicXML text is readonly
                </span>
              </div>
              <div className="d-grid">
                <button className="btn btn-outline-warning" onClick={onConvertToLocalClick}>
                  <i className="bi bi-cloud-arrow-down"></i> Convert to local
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="col-md-6 col-12">
          <textarea
            className="form-control"
            style={{ height: '300px' }}
            value={musicXML}
            disabled={isTextareaDisabled}
            placeholder={textareaPlaceholder}
            onChange={onMusicXMLChange}
          ></textarea>
        </div>
      </div>

      <div className="modal fade" tabIndex={-1} aria-hidden="true" ref={modalRef}>
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content">
            <div className="modal-header">
              <h1 className="modal-title fs-5">Warning</h1>
              <button type="button" className="btn-close" data-bs-dismiss="modal"></button>
            </div>
            <div className="modal-body">When changing source types, you may lose the changes you made.</div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" data-bs-dismiss="modal">
                Cancel
              </button>
              <button type="button" className="btn btn-primary" onClick={onModalContinue}>
                Continue
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const isSourceType = (value: any): value is Source['type'] =>
  value === 'local' || value === 'remote' || value === 'example';

const getDefaultSource = (type: Source['type'], backend: RenderingBackend, config: Config, height: number): Source => {
  switch (type) {
    case 'local':
      return { type, musicXML: '', backend, config, height };
    case 'remote':
      return { type, url: '', backend, config, height };
    case 'example':
      return { type, path: DEFAULT_EXAMPLE_PATH, backend, config, height };
    default:
      throw new Error(`Invalid source type: ${type}`);
  }
};

const EXAMPLE_GROUPS = Object.entries(
  EXAMPLES.reduce<Record<string, { filename: string; path: string }[]>>((memo, { path }) => {
    const parts = path.substring('./examples/'.length).split('/');
    const directory = parts.length === 2 ? parts[0] : '';
    const filename = parts[parts.length - 1];
    memo[directory] ??= [];
    memo[directory].push({ filename, path });
    return memo;
  }, {})
).flatMap<SelectOptionGroup<string>>(([directory, files], groupIndex) =>
  directory
    ? {
        type: 'multi',
        label: directory,
        options: files.map(({ filename, path }, fileIndex) => ({
          key: `${groupIndex}-${directory}-${fileIndex}`,
          label: filename,
          value: path,
        })),
      }
    : files.map(({ path }, fileIndex) => ({
        type: 'single',
        option: {
          key: `${groupIndex}-${directory}-${fileIndex}`,
          label: path,
          value: path,
        },
      }))
);

const EXAMPLE_OPTION_KEY_BY_PATH = EXAMPLE_GROUPS.reduce<Record<string, string>>((memo, group) => {
  switch (group.type) {
    case 'single':
      memo[group.option.value] = group.option.key;
      break;
    case 'multi':
      for (const option of group.options) {
        memo[option.value] = option.key;
      }
      break;
  }
  return memo;
}, {});
