import Controls from './components/Controls';
import Title from './components/Title';
import { useMusicXml } from './hooks/useMusicXml';
import Vexml, { RenderEvent } from './components/Vexml';
import Stats, { RenderStats } from './components/Stats';
import { useCallback, useId, useState } from 'react';

function App() {
  const musicXml = useMusicXml();

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

  const saveDisabled = musicXml.useDefault || musicXml.value.current === musicXml.value.stored;
  const resetDisabled = musicXml.useDefault;

  return (
    <div className="container mt-4">
      <Title />

      <br />

      <Controls
        value={musicXml.value.current}
        useDefault={musicXml.useDefault}
        containerId={containerId}
        saveDisabled={saveDisabled}
        resetDisabled={resetDisabled}
        reportDisabled={false}
        onChange={musicXml.update}
        onSave={musicXml.save}
        onReset={musicXml.reset}
      />

      <hr />

      <Stats stats={stats} />

      <Vexml musicXml={musicXml.value.debounced} containerId={containerId} onRender={onRender} />
    </div>
  );
}

export default App;
