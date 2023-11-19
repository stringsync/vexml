import Controls from './components/Controls';
import Title from './components/Title';
import { DEFAULT_MUSICXML } from './constants';
import { useReport } from './hooks/useReport';
import { useMusicXml } from './hooks/useMusicXml';
import Vexml, { RenderEvent } from './components/Vexml';
import Stats, { RenderStats } from './components/Stats';
import { useCallback, useState } from 'react';

function App() {
  const musicXml = useMusicXml();

  const onMusicXmlChange = (value: string) => {
    musicXml.set(value);
  };

  const report = useReport();

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

  const value = musicXml.useDefault ? DEFAULT_MUSICXML : musicXml.value;
  const saveDisabled = musicXml.useDefault || musicXml.value === musicXml.storedValue;
  const resetDisabled = musicXml.useDefault;

  return (
    <div className="container mt-4">
      <Title />

      <br />

      <Controls
        value={value}
        saveDisabled={saveDisabled}
        resetDisabled={resetDisabled}
        reportDisabled={false}
        onChange={onMusicXmlChange}
        onSave={musicXml.save}
        onReset={musicXml.reset}
        onReport={report}
      />

      <hr />

      <Stats stats={stats} />

      <Vexml musicXml={value} onRender={onRender} />
    </div>
  );
}

export default App;
