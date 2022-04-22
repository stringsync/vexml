import { useLocalStorage } from './useLocalStorage';

const SETTINGS_KEY = 'vexml:dev_settings';

export type Settings = {
  successVisible: boolean;
  failVisible: boolean;
  slowestVisible: boolean;
};

export const DEFAULT_SETTINGS: Settings = Object.freeze({
  successVisible: true,
  failVisible: true,
  slowestVisible: false,
});

export const useSettings = (): [Settings, (settings: Settings) => void] => {
  return useLocalStorage(SETTINGS_KEY, DEFAULT_SETTINGS);
};
