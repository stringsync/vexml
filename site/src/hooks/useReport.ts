export const useReport = (): (() => void) => {
  return () => {
    console.log('hello');
  };
};
