import { useEffect, useState } from 'react';

export const useTimeAgo = (since: Date) => {
  const [timeAgo, setTimeAgo] = useState<string>(() => getTimeAgo(since));

  useEffect(() => {
    const interval = setInterval(() => {
      const nextTimeAgo = getTimeAgo(since);
      setTimeAgo(nextTimeAgo);
    }, 1000);

    return () => {
      clearInterval(interval);
    };
  }, [since]);

  return timeAgo;
};

const getTimeAgo = (since: Date) => {
  const now = new Date();
  const dt = now.getTime() - since.getTime();
  if (dt < 60 * 1000) {
    return 'just now';
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
