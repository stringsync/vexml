import { renderTemplate } from '@/util';

describe('html', () => {
  describe('renderTemplate', () => {
    it('replaces a single placeholder with a value', () => {
      const template = '<div>{{foo}}</div>';
      const result = renderTemplate(template, { foo: 'foo' });
      expect(result).toBe('<div>foo</div>');
    });

    it('replaces multiple different placeholders with values', () => {
      const template = '<div>{{foo}}</div><div>{{bar}}</div>';
      const result = renderTemplate(template, { foo: 'foo', bar: 'bar' });
      expect(result).toBe('<div>foo</div><div>bar</div>');
    });

    it('replaces multiple instances of a single placeholder with a value', () => {
      const template = '<div>{{foo}}</div><div>{{foo}}</div>';
      const result = renderTemplate(template, { foo: 'foo' });
      expect(result).toBe('<div>foo</div><div>foo</div>');
    });

    it('shows the placeholder when the key is not present', () => {
      const template = '<div>{{foo}}</div>';
      const result = renderTemplate(template, { bar: 'bar' });
      expect(result).toBe('<div>{{foo}}</div>');
    });

    it('ignores extra keys', () => {
      const template = '<div>{{foo}}</div>';
      const result = renderTemplate(template, { foo: 'foo', bar: 'bar' });
      expect(result).toBe('<div>foo</div>');
    });
  });
});
