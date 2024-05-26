import { Fragment, useState } from 'react';
import { useNextKey } from '../hooks/useNextKey';
import { Keyed, Source } from '../types';
import { SourceDisplay } from './SourceDisplay';
import { isEqual } from '../util/isEqual';

export type SourceWorkspaceProps = {
  sources: Source[];
  onSourcesChange: (sources: Source[]) => void;
};

export const SourceWorkspace = (props: SourceWorkspaceProps) => {
  const nextKey = useNextKey('source');

  const toKeyedSource = (source: Source): Keyed<Source> => ({
    key: nextKey(),
    value: source,
  });

  const [keyedSources, setKeyedSources] = useState(() => props.sources.map(toKeyedSource));

  // NOTE: When sources are changed upstream, it will re-render all children of this component due to the new keys.
  const areSourcesInSync = isEqual(
    keyedSources.map(({ value }) => value),
    props.sources
  );
  if (!areSourcesInSync) {
    setKeyedSources(props.sources.map(toKeyedSource));
  }

  const onSourcesChange = (keyedSources: Keyed<Source>[]) => {
    props.onSourcesChange(keyedSources.map(({ value }) => value));
  };

  const onResetAllClick = () => {
    setKeyedSources([]);
    onSourcesChange([]);
  };

  const onAddClick = (index: number) => () => {
    const keyedSource: Keyed<Source> = { key: nextKey(), value: { type: 'local', musicXML: '' } };
    const nextKeyedSources = [...keyedSources];
    nextKeyedSources.splice(index, 0, keyedSource);
    setKeyedSources(nextKeyedSources);
    onSourcesChange(nextKeyedSources);
  };

  const onSourceRemove = (key: string) => () => {
    const nextKeyedSources = keyedSources.filter((source) => source.key !== key);
    setKeyedSources(nextKeyedSources);
    onSourcesChange(nextKeyedSources);
  };

  const onSourceUpdate = (key: string) => (source: Source) => {
    const nextKeyedSources = keyedSources.map((keyedSource) =>
      keyedSource.key === key ? { key, value: source } : keyedSource
    );
    setKeyedSources(nextKeyedSources);
    onSourcesChange(nextKeyedSources);
  };

  const removable = keyedSources.length > 1;

  return (
    <div>
      <div className="d-flex gap-2">
        <button className="btn btn-light btn-sm mb-3" onClick={onResetAllClick}>
          <i className="bi bi-arrow-counterclockwise"></i> Reset all{' '}
          <span className="badge text-secondary">{keyedSources.length}</span>
        </button>
      </div>

      <div className="d-grid gap-2">
        {keyedSources.map(({ key, value: source }, index) => (
          <Fragment key={key}>
            <button type="button" className="btn btn-light btn-lg" onClick={onAddClick(index)}>
              <i className="bi bi-plus-lg"></i>
            </button>

            <SourceDisplay
              source={source}
              removable={removable}
              onUpdate={onSourceUpdate(key)}
              onRemove={onSourceRemove(key)}
            />
          </Fragment>
        ))}

        <button type="button" className="btn btn-light btn-lg" onClick={onAddClick(keyedSources.length)}>
          <i className="bi bi-plus-lg"></i>
        </button>
      </div>
    </div>
  );
};
