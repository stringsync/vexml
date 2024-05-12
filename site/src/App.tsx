import { Title } from './components/Title';
import { Workspace } from './components/Workspace';
import { DEPRECATED_LOCAL_STORAGE_KEYS } from './constants';
import { useLocalStorageCleanup } from './hooks/useLocalStorageCleanup';
import { useSources } from './hooks/useSources';
import { Source } from './types';

export const App = () => {
  useLocalStorageCleanup(DEPRECATED_LOCAL_STORAGE_KEYS);

  const [sources, setSources] = useSources();
  const onSourcesChange = (sources: Source[]) => {
    setSources(sources);
  };

  return (
    <div className="container mt-4">
      <Title />

      <br />

      <Workspace sources={sources} onSourcesChange={onSourcesChange} />
    </div>
  );
};
