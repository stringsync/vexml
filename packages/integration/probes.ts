/*
 * Every probe, re-exported flat. A probe is a browser-side function
 * `(score, container, arg) => result` living in the *.probes.ts sibling of the test
 * that uses it: page.ts registers this whole module in the page, tests invoke one by
 * export name through renderer.render, and renderer.ts derives the name/arg/result
 * types from here. Names must therefore be unique across all probe files, and args and
 * results must be structured-cloneable — they cross the process boundary.
 */
export * from './bounds.probes';
export * from './cursor.probes';
export * from './decorations.probes';
export * from './events.probes';
export * from './layers.probes';
export * from './stage.probes';
export * from './swing.probes';
