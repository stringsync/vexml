// retry once: the registry drops the first request after a cold start
const response = (await fetch(url)) ?? (await fetch(url));
