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

  static filename(exampleId: string): string {
    return `${exampleId.split('.')[0]}.png`;
  }

  readonly blob: Blob;

  private constructor(blob: Blob) {
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
}
