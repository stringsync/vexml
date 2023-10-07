import { Print } from '@/musicxml/print';
import { xml } from '@/util';

describe(Print, () => {
  describe('getStaffLayouts', () => {
    it('returns staff layouts', () => {
      const node = xml.print({
        staffLayouts: [
          xml.staffLayout({ number: 1, staffDistance: xml.staffDistance({ value: '42' }) }),
          xml.staffLayout({ number: 2, staffDistance: xml.staffDistance({ value: '43' }) }),
        ],
      });

      const print = new Print(node);

      expect(print.getStaveLayouts()).toStrictEqual([
        { staveNumber: 1, staveDistance: 42 },
        { staveNumber: 2, staveDistance: 43 },
      ]);
    });

    it('defaults number to 1 when missing', () => {
      const node = xml.print({
        staffLayouts: [xml.staffLayout({ staffDistance: xml.staffDistance({ value: '42' }) })],
      });
      const print = new Print(node);
      expect(print.getStaveLayouts()).toStrictEqual([{ staveNumber: 1, staveDistance: 42 }]);
    });

    it('defaults number to 1 when invalid', () => {
      const node = xml.print({
        staffLayouts: [xml.staffLayout({ number: NaN })],
      });
      const print = new Print(node);
      expect(print.getStaveLayouts()).toStrictEqual([{ staveNumber: 1, staveDistance: null }]);
    });

    it('defaults staff distance to null when missing', () => {
      const node = xml.print({
        staffLayouts: [xml.staffLayout({ number: 1 })],
      });
      const print = new Print(node);
      expect(print.getStaveLayouts()).toStrictEqual([{ staveNumber: 1, staveDistance: null }]);
    });

    it('defaults staff distance to 0 when invalid', () => {
      const node = xml.print({
        staffLayouts: [xml.staffLayout({ number: 1, staffDistance: xml.staffDistance({ value: 'NaN' }) })],
      });
      const print = new Print(node);
      expect(print.getStaveLayouts()).toStrictEqual([{ staveNumber: 1, staveDistance: 0 }]);
    });
  });

  describe('getSystemLayout', () => {
    it('returns the system layout', () => {
      const node = xml.print({
        systemLayout: xml.systemLayout({
          systemMargins: xml.systemMargins({
            leftMargin: xml.leftMargin({ tenths: 10 }),
            rightMargin: xml.rightMargin({ tenths: 11 }),
          }),
          systemDistance: xml.systemDistance({ tenths: 12 }),
          topSystemDistance: xml.topSystemDistance({ tenths: 13 }),
        }),
      });
      const print = new Print(node);
      expect(print.getSystemLayout()).toStrictEqual({
        leftMargin: 10,
        rightMargin: 11,
        systemDistance: 12,
        topSystemDistance: 13,
      });
    });

    it('defaults a null system layout when missing', () => {
      const node = xml.print();
      const print = new Print(node);
      expect(print.getSystemLayout()).toStrictEqual({
        leftMargin: null,
        rightMargin: null,
        systemDistance: null,
        topSystemDistance: null,
      });
    });

    it('defaults 0 for an invalid left margin', () => {
      const node = xml.print({
        systemLayout: xml.systemLayout({
          systemMargins: xml.systemMargins({ leftMargin: xml.leftMargin({ tenths: NaN }) }),
        }),
      });
      const print = new Print(node);
      expect(print.getSystemLayout().leftMargin).toBe(0);
    });

    it('defaults 0 for an invalid right margin', () => {
      const node = xml.print({
        systemLayout: xml.systemLayout({
          systemMargins: xml.systemMargins({ rightMargin: xml.rightMargin({ tenths: NaN }) }),
        }),
      });
      const print = new Print(node);
      expect(print.getSystemLayout().rightMargin).toBe(0);
    });

    it('defaults 0 for an invalid top system distance', () => {
      const node = xml.print({
        systemLayout: xml.systemLayout({
          topSystemDistance: xml.topSystemDistance({ tenths: NaN }),
        }),
      });
      const print = new Print(node);
      expect(print.getSystemLayout().topSystemDistance).toBe(0);
    });

    it('defaults 0 for an invalid system distance ', () => {
      const node = xml.print({
        systemLayout: xml.systemLayout({
          systemDistance: xml.systemDistance({ tenths: NaN }),
        }),
      });
      const print = new Print(node);
      expect(print.getSystemLayout().systemDistance).toBe(0);
    });
  });
});
