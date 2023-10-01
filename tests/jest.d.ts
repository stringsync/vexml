declare namespace jest {
  interface Matchers<R> {
    toMatchImageSnapshot(opts: { customSnapshotIdentifier?: string }): R;
  }
}
