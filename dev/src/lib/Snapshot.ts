import pixelmatch from 'pixelmatch';

export type SnapshotComparison = {
  diff: number;
  imageData: ImageData;
  width: number;
  height: number;
};

export class Snapshot {
  static fromSvg(svg: SVGElement): Promise<Snapshot> {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        canvas.getContext('2d')!.drawImage(img, 0, 0);
        canvas.toBlob((blob) => resolve(new Snapshot(blob!)));
      };
      img.src = Snapshot.src(svg);
    });
  }

  static src(svg: SVGElement): string {
    const clone = svg.cloneNode(true) as SVGElement;
    clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    return `data:image/svg+xml;base64,${btoa(clone.outerHTML)}`;
  }

  static url(exampleId: string): string {
    return `/public/snapshots/${exampleId.split('.')[0]}.png`;
  }

  readonly blob: Blob;

  constructor(blob: Blob) {
    this.blob = blob;
  }

  async upload(filename: string): Promise<void> {
    const formData = new FormData();
    formData.set('image', this.blob, filename);
    const res = await fetch('/snapshot', { method: 'POST', body: formData });
    if (!res.ok) {
      throw new Error(`upload failed, status ${res.status}`);
    }
  }

  async compare(otherSnapshot: Snapshot): Promise<SnapshotComparison> {
    const [imageData, otherImageData] = await Promise.all([this.getImageData(), otherSnapshot.getImageData()]);
    if (imageData.width !== otherImageData.width) {
      throw new Error(`images must be the same width, got: ${imageData.width}px, ${otherImageData.width}px`);
    }
    if (imageData.height !== otherImageData.height) {
      throw new Error(`images must be the same height, got: ${imageData.height}px, ${otherImageData.height}px`);
    }

    const width = imageData.width;
    const height = imageData.height;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d')!;
    const diffImageData = ctx.createImageData(width, height);

    const numMismatchPixels = pixelmatch(imageData.data, otherImageData.data, diffImageData.data, width, height);
    const numPixels = width * height;
    const diff = (numPixels - numMismatchPixels) / numPixels;

    return { diff, imageData: diffImageData, width, height };
  }

  async getImageData(): Promise<ImageData> {
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
      img.src = URL.createObjectURL(this.blob);
    });
  }
}
