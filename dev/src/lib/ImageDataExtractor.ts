import { Snapshot } from './Snapshot';

export class ImageDataExtractor {
  static async fromSrc(src: string): Promise<ImageData> {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(img, 0, 0);
        resolve(ctx.getImageData(0, 0, img.naturalWidth, img.naturalHeight));
      };
      img.src = src;
    });
  }

  static async fromSvg(svg: SVGElement): Promise<ImageData> {
    const src = Snapshot.src(svg);
    return ImageDataExtractor.fromSrc(src);
  }
}
