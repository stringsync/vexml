import { NamedNode } from './namednode';
import * as xml from './xml';

describe('NamedNode', () => {
  describe('of', () => {
    it('creates a NamedNode instance', () => {
      const node = xml.createElement('foo');
      const namedNode = NamedNode.of(node);
      expect(namedNode).toBeInstanceOf(NamedNode);
    });

    it('wraps the node', () => {
      const node = xml.createElement('foo');
      const namedNode = NamedNode.of(node);
      expect(namedNode.node).toBe(node);
    });
  });

  describe('isNamed', () => {
    it('returns true when the name matches the node', () => {
      const node = xml.createElement('foo');
      const namedNode = NamedNode.of(node);
      expect(namedNode.isNamed('foo')).toBeTrue();
    });

    it('returns false when the name does not match the node', () => {
      const node = xml.createElement('foo');
      const namedNode = NamedNode.of(node);
      expect(namedNode.isNamed('fo')).toBeFalse();
    });
  });

  describe('get', () => {
    it('returns the node backing the instance', () => {
      const node = xml.createElement('foo');
      const namedNode = NamedNode.of(node);
      expect(namedNode.get()).toBe(node);
    });
  });

  describe('asElement', () => {
    it('returns the node backing the instance', () => {
      const node = xml.createElement('foo');
      const namedNode = NamedNode.of(node);
      expect(namedNode.asElement()).toBe(node);
    });
  });
});
