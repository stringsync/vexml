import { useEffect, useState } from 'react';

export const useTimeAgo = (since: Date) => {
  const [timeAgo, setTimeAgo] = useState<string>(() => getTimeAgo(0));

  useEffect(() => {
    const handle = setInterval(() => {
      const dt = Date.now() - since.getTime();
      const nextTimeAgo = getTimeAgo(dt);
      setTimeAgo(nextTimeAgo);
    }, 60000);
    return () => {
      clearInterval(handle);
    };
  }, [since]);

  return timeAgo;
};

const getTimeAgo = (dt: number) => {
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
