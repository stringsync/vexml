import { useState } from 'react';
import { useNextKey } from '../hooks/useNextKey';
import { Keyed, Source } from '../types';
import { SourceDisplay } from './SourceDisplay';
import { SourceInput } from './SourceInput';
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

  const onSourceUnshift = (source: Source) => {
    const nextKeyedSources = [{ key: nextKey(), value: source }, ...keyedSources];
    setKeyedSources(nextKeyedSources);
    onSourcesChange(nextKeyedSources);
  };

  const onSourcePush = (source: Source) => {
    const nextKeyedSources = [...keyedSources, { key: nextKey(), value: source }];
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
    <div className="d-grid gap-2">
      <SourceInput onAdd={onSourceUnshift} />

      {keyedSources.map(({ key, value: source }) => (
        <SourceDisplay
          key={key}
          source={source}
          removable={removable}
          onUpdate={onSourceUpdate(key)}
          onRemove={onSourceRemove(key)}
        />
      ))}

      <SourceInput onAdd={onSourcePush} />
    </div>
  );
};
