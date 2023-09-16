import { Defaults } from '@/musicxml';
import { xml } from '@/util';

describe(Defaults, () => {
  describe('getStaffLayouts', () => {
    it('returns staff layouts', () => {
      const node = xml.defaults({
        staffLayouts: [
          xml.staffLayout({ number: 1, staffDistance: xml.staffDistance({ value: '42' }) }),
          xml.staffLayout({ number: 2, staffDistance: xml.staffDistance({ value: '43' }) }),
        ],
      });

      const defaults = new Defaults(node);

      expect(defaults.getStaffLayouts()).toStrictEqual([
        { staffNumber: 1, staffDistance: 42 },
        { staffNumber: 2, staffDistance: 43 },
      ]);
    });

    it('defaults number to 1 when missing', () => {
      const node = xml.defaults({
        staffLayouts: [xml.staffLayout({ staffDistance: xml.staffDistance({ value: '42' }) })],
      });
      const defaults = new Defaults(node);
      expect(defaults.getStaffLayouts()).toStrictEqual([{ staffNumber: 1, staffDistance: 42 }]);
    });

    it('defaults number to 1 when invalid', () => {
      const node = xml.defaults({
        staffLayouts: [xml.staffLayout({ number: NaN })],
      });
      const defaults = new Defaults(node);
      expect(defaults.getStaffLayouts()).toStrictEqual([{ staffNumber: 1, staffDistance: null }]);
    });

    it('defaults staff distance to null when missing', () => {
      const node = xml.defaults({
        staffLayouts: [xml.staffLayout({ number: 1 })],
      });
      const defaults = new Defaults(node);
      expect(defaults.getStaffLayouts()).toStrictEqual([{ staffNumber: 1, staffDistance: null }]);
    });

    it('defaults staff distance to 0 when invalid', () => {
      const node = xml.defaults({
        staffLayouts: [xml.staffLayout({ number: 1, staffDistance: xml.staffDistance({ value: 'NaN' }) })],
      });
      const defaults = new Defaults(node);
      expect(defaults.getStaffLayouts()).toStrictEqual([{ staffNumber: 1, staffDistance: 0 }]);
    });
  });

  describe('getSystemLayout', () => {
    it('returns the system layout', () => {
      const node = xml.defaults({
        systemLayout: xml.systemLayout({
          systemMargins: xml.systemMargins({
            leftMargin: xml.leftMargin({ tenths: 10 }),
            rightMargin: xml.rightMargin({ tenths: 11 }),
          }),
          systemDistance: xml.systemDistance({ tenths: 12 }),
          topSystemDistance: xml.topSystemDistance({ tenths: 13 }),
        }),
      });
      const defaults = new Defaults(node);
      expect(defaults.getSystemLayout()).toStrictEqual({
        leftMargin: 10,
        rightMargin: 11,
        systemDistance: 12,
        topSystemDistance: 13,
      });
    });

    it('defaults a null system layout when missing', () => {
      const node = xml.defaults();
      const defaults = new Defaults(node);
      expect(defaults.getSystemLayout()).toStrictEqual({
        leftMargin: null,
        rightMargin: null,
        systemDistance: null,
        topSystemDistance: null,
      });
    });

    it('defaults 0 for an invalid left margin', () => {
      const node = xml.defaults({
        systemLayout: xml.systemLayout({
          systemMargins: xml.systemMargins({ leftMargin: xml.leftMargin({ tenths: NaN }) }),
        }),
      });
      const defaults = new Defaults(node);
      expect(defaults.getSystemLayout().leftMargin).toBe(0);
    });

    it('defaults 0 for an invalid right margin', () => {
      const node = xml.defaults({
        systemLayout: xml.systemLayout({
          systemMargins: xml.systemMargins({ rightMargin: xml.rightMargin({ tenths: NaN }) }),
        }),
      });
      const defaults = new Defaults(node);
      expect(defaults.getSystemLayout().rightMargin).toBe(0);
    });

    it('defaults 0 for an invalid top system distance', () => {
      const node = xml.defaults({
        systemLayout: xml.systemLayout({
          topSystemDistance: xml.topSystemDistance({ tenths: NaN }),
        }),
      });
      const defaults = new Defaults(node);
      expect(defaults.getSystemLayout().topSystemDistance).toBe(0);
    });

    it('defaults 0 for an invalid system distance ', () => {
      const node = xml.defaults({
        systemLayout: xml.systemLayout({
          systemDistance: xml.systemDistance({ tenths: NaN }),
        }),
      });
      const defaults = new Defaults(node);
      expect(defaults.getSystemLayout().systemDistance).toBe(0);
    });
  });
});
