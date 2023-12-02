export type RenderStats =
  | {
      type: 'loading';
    }
  | {
      type: 'success';
      timestamp: Date;
      durationMs: number;
      width: number;
    }
  | {
      type: 'error';
      timestamp: Date;
      error: Error;
      width: number;
    };

export type StatsProps = {
  stats: RenderStats;
};

function Stats(props: StatsProps) {
  const { stats } = props;

  switch (stats.type) {
    case 'loading':
      return (
        <div className="alert alert-secondary" role="alert">
          <i className="bi bi-hourglass-split"></i> Loading...
        </div>
      );
    case 'success':
      return (
        <div className="alert alert-success" role="alert">
          <i className="bi bi-check2"></i>{' '}
          {`${timestamp(stats.timestamp)} (${stats.width}px) rendered in ${stats.durationMs}ms`}
        </div>
      );
    case 'error':
      return (
        <div className="alert alert-danger" role="alert">
          <i className="bi bi-exclamation"></i>{' '}
          {`${timestamp(stats.timestamp)} (${stats.width}px) ${stats.error.stack}`}
        </div>
      );
  }
}

function timestamp(date: Date): string {
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  const seconds = date.getSeconds().toString().padStart(2, '0');
  const ms = date.getMilliseconds().toString().padEnd(3, '0').slice(-3);

  return `${hours}:${minutes}:${seconds}.${ms}`;
}

export default Stats;
