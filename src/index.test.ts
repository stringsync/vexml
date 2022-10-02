describe('index', () => {
  it('loads', () => {
    expect(() => import('./index')).not.toThrow();
  });
});
