import { Title } from './components/Title';
import { SourceWorkspace } from './components/SourceWorkspace';
import { DEPRECATED_LOCAL_STORAGE_KEYS } from './constants';
import { useLocalStorageCleanup } from './hooks/useLocalStorageCleanup';
import { useSources } from './hooks/useSources';
import { Source } from './types';
import './style.css';

export const App = () => {
  useLocalStorageCleanup(DEPRECATED_LOCAL_STORAGE_KEYS);

  const [sources, setSources] = useSources();
  const onSourcesChange = (sources: Source[]) => {
    setSources(sources);
  };

  return (
    <div className="container mt-4 mb-4">
      <Title />

      <br />

      <SourceWorkspace sources={sources} onSourcesChange={onSourcesChange} />
    </div>
  );
};
