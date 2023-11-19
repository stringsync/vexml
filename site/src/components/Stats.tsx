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

  let className: string = 'alert';
  switch (stats.type) {
    case 'loading':
    case 'success':
      className = 'alert alert-secondary';
      break;
    case 'error':
      className = 'alert alert-danger';
      break;
  }

  let message: string = '';
  switch (stats.type) {
    case 'loading':
      message = 'Loading...';
      break;
    case 'success':
      message = `${timestamp(stats.timestamp)} (${stats.width}px) rendered in ${stats.durationMs}ms`;
      break;
    case 'error':
      message = `${timestamp(stats.timestamp)} (${stats.width}px) ${stats.error.stack}`;
      break;
  }

  return (
    <div id="alert" className={className} role="alert">
      {message}
    </div>
  );
}

function timestamp(date: Date): string {
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  const seconds = date.getSeconds().toString().padStart(2, '0');
  const ms = date.getMilliseconds().toString().padEnd(3, '0').slice(-3);

  return `${hours}:${minutes}:${seconds}.${ms}`;
}

export default Stats;
