import { useEffect, useState } from 'react';

export const useTimeAgo = (since: Date) => {
  const [timeAgo, setTimeAgo] = useState<string>(() => getTimeAgo(0));

  useEffect(() => {
    let timeout: NodeJS.Timeout;

    const update = () => {
      const now = Date.now();
      const dt = now - since.getTime();

      setTimeAgo(getTimeAgo(dt));

      // When less than a minute, update every second. Otherwise, update every minute.
      const intervalMs = dt < 60000 ? 1000 : 60 * 1000;

      timeout = setTimeout(update, intervalMs);
    };

    update();

    return () => {
      clearTimeout(timeout);
    };
  }, [since]);

  return timeAgo;
};

const getTimeAgo = (dt: number) => {
  if (dt < 10 * 1000) {
    return 'just now';
  } else if (dt < 60 * 1000) {
    const seconds = Math.floor(dt / 1000);
    return `${seconds} second${seconds === 1 ? '' : 's'} ago`;
  } else if (dt < 60 * 60 * 1000) {
    const minutes = Math.floor(dt / (60 * 1000));
    return `${minutes} minute${minutes === 1 ? '' : 's'} ago`;
  } else if (dt < 24 * 60 * 60 * 1000) {
    const hours = Math.floor(dt / (60 * 60 * 1000));
    return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  } else {
    const days = Math.floor(dt / (24 * 60 * 60 * 1000));
    return `${days} day${days === 1 ? '' : 's'} ago`;
  }
};
