import Controls from './components/Controls';
import Title from './components/Title';
import { useMusicXML } from './hooks/useMusicXML';
import Vexml, { RenderEvent } from './components/Vexml';
import Stats, { RenderStats } from './components/Stats';
import { useCallback, useEffect, useId, useState } from 'react';
import { DEPRECATED_LOCAL_STORAGE_KEYS } from './constants';

function App() {
  const musicXML = useMusicXML();

  useEffect(() => {
    for (const key of DEPRECATED_LOCAL_STORAGE_KEYS) {
      localStorage.removeItem(key);
    }
  }, []);

  const [stats, setStats] = useState<RenderStats>({ type: 'loading' });
  const onRender = useCallback((event: RenderEvent) => {
    switch (event.type) {
      case 'success':
        setStats({
          type: 'success',
          timestamp: event.stop,
          width: event.width,
          durationMs: event.stop.getTime() - event.start.getTime(),
        });
        break;
      case 'error':
        setStats({
          type: 'error',
          timestamp: event.stop,
          width: event.width,
          error: event.error,
        });
        break;
    }
  }, []);

  const containerId = useId();

  const saveDisabled = musicXML.useDefault || musicXML.value.current === musicXML.value.stored;
  const resetDisabled = musicXML.useDefault;

  return (
    <div className="container mt-4">
      <Title />

      <br />

      <Controls
        value={musicXML.value.current}
        useDefault={musicXML.useDefault}
        containerId={containerId}
        saveDisabled={saveDisabled}
        resetDisabled={resetDisabled}
        reportDisabled={false}
        onChange={musicXML.update}
        onSave={musicXML.save}
        onReset={musicXML.reset}
      />

      <hr />

      <Stats stats={stats} />

      <Vexml musicXML={musicXML.value.debounced} containerId={containerId} onRender={onRender} />
    </div>
  );
}

export default App;
