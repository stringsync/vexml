export class Snapshot {
  static fromSvg(svg: SVGElement): Promise<Snapshot> {
    const clone = svg.cloneNode(true) as SVGElement;
    clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    const imgSrc = `data:image/svg+xml;base64,${btoa(clone.outerHTML)}`;
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        canvas.getContext('2d')!.drawImage(img, 0, 0);
        canvas.toBlob((blob) => resolve(new Snapshot(blob!)));
      };
      img.src = imgSrc;
    });
  }

  static filename(exampleId: string): string {
    return `${exampleId.split('.')[0]}.png`;
  }

  readonly blob: Blob;

  private constructor(blob: Blob) {
    this.blob = blob;
  }

  async upload(filename: string): Promise<void> {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/snapshot', true);
    const formData = new FormData();
    formData.append('image', this.blob, filename);
    xhr.send(formData);
    return new Promise((resolve, reject) => {
      xhr.onload = () => {
        if (xhr.status === 200) {
          resolve();
        } else {
          reject(new Error(`upload failed, status ${xhr.status}`));
        }
      };
      xhr.onerror = () => {
        reject();
      };
    });
  }
}
