import pixelmatch from 'pixelmatch';

export type SnapshotComparison = {
  match: number;
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
  private imageData: ImageData | null;

  constructor(blob: Blob) {
    this.blob = blob;
    this.imageData = null;
  }

  async upload(filename: string): Promise<void> {
    const formData = new FormData();
    formData.set('image', this.blob, filename);
    const res = await fetch('/snapshot', { method: 'POST', body: formData });
    if (!res.ok) {
      throw new Error(`upload failed, status ${res.status}`);
    }
  }

  async resize(width: number, height: number): Promise<Snapshot> {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;

    const imageData = await this.getImageData();
    const ctx = canvas.getContext('2d')!;
    ctx.putImageData(imageData, 0, 0);

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve);
    });
    if (!blob) {
      throw new Error('could not compute blob');
    }

    return new Snapshot(blob);
  }

  async compare(otherSnapshot: Snapshot): Promise<SnapshotComparison> {
    let [imageData, otherImageData] = await Promise.all([this.getImageData(), otherSnapshot.getImageData()]);
    const width = Math.max(imageData.width, otherImageData.width);
    const height = Math.max(imageData.height, otherImageData.height);

    // Force both snapshots to be the same width and height
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    let snapshot: Snapshot = this;
    if (imageData.width !== width || imageData.height !== height) {
      snapshot = await this.resize(width, height);
    }
    if (otherImageData.width !== width || otherImageData.height !== height) {
      otherSnapshot = await otherSnapshot.resize(width, height);
    }
    [imageData, otherImageData] = await Promise.all([snapshot.getImageData(), otherSnapshot.getImageData()]);

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d')!;
    const diffImageData = ctx.createImageData(width, height);

    const numMismatchPixels = pixelmatch(imageData.data, otherImageData.data, diffImageData.data, width, height);
    const numPixels = width * height;
    const match = (numPixels - numMismatchPixels) / numPixels;

    return { match, imageData: diffImageData, width, height };
  }

  async getImageData(): Promise<ImageData> {
    if (!this.imageData) {
      this.imageData = await new Promise((resolve) => {
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
    return this.imageData!;
  }
}
