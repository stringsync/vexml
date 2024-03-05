import.meta.glob('./examples/**/*.musicxml', { as: 'raw' });

export function getExamples() {
  const examples = Object.entries(import.meta.glob('./examples/**/*.musicxml', { as: 'raw' }))
    .sort()
    .map(([path, get]) => {
      const parts = path.substring('./examples/'.length).split('/');
      const directory = parts.length === 2 ? parts[0] : '';
      const filename = parts[parts.length - 1];
      return { directory, filename, get };
    })
    .reduce<Record<string, Array<{ filename: string; get: () => Promise<string> }>>>(
      (memo, { directory, filename, get }) => {
        memo[directory] ??= [];
        memo[directory].push({ filename, get });
        return memo;
      },
      {}
    );

  for (const key of Object.keys(examples)) {
    examples[key].sort();
  }

  return examples;
}
