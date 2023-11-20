export function debounce<F extends (...args: any[]) => void>(
  callback: F,
  delayMs: number
): [debouncedCallback: F, cancel: () => void] {
  let timeout: NodeJS.Timeout | undefined;

  const cancel = () => {
    if (typeof timeout !== 'undefined') {
      clearTimeout(timeout);
    }
  };

  const debounced = (...args: Parameters<F>) => {
    cancel();
    timeout = setTimeout(() => {
      callback(...args);
    }, delayMs);
  };

  return [debounced as F, cancel];
}

export function convertFontToBase64(fontUrl: string) {
  return fetch(fontUrl)
    .then((response) => response.blob())
    .then(
      (blob) =>
        new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            // Convert blob to base64
            const base64data = reader.result as string;
            resolve(base64data.split(',')[1]); // Split to remove data URL prefix and pass only the base64 string to the callback
          };
          reader.readAsDataURL(blob);
        })
    );
}

export function downloadSvgAsImage(
  svgElement: SVGElement,
  opts: {
    imageName: string;
    fontFamily: string;
    fontBase64: string;
  }
) {
  // Inject the base64-encoded font into the SVG
  const styleElement = document.createElement('style');
  const fontFaceRule = `
    @font-face {
      font-family: '${opts.fontFamily}';
      src: url('data:font/opentype;base64,${opts.fontBase64}');
    }
  `;
  styleElement.innerHTML = fontFaceRule;
  svgElement.prepend(styleElement);

  // Serialize the SVG to a string
  const serializer = new XMLSerializer();
  const svgString = serializer.serializeToString(svgElement);
  const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });

  const URL = window.URL || window.webkitURL || window;
  const blobURL = URL.createObjectURL(svgBlob);

  // Create an image and load the SVG data
  const image = new Image();
  image.onload = () => {
    // Once the image is loaded, draw it to a canvas
    const canvas = document.createElement('canvas');
    canvas.width = image.width;
    canvas.height = image.height;
    const context = canvas.getContext('2d')!;
    context.font = 'Bravura';
    context.drawImage(image, 0, 0);

    // Convert the canvas to a data URL
    const dataUrl = canvas.toDataURL('image/png');

    // Create a link element for downloading
    const link = document.createElement('a');
    document.body.appendChild(link); // Firefox requires the link to be in the body
    link.setAttribute('href', dataUrl);
    link.setAttribute('download', opts.imageName);
    link.click();
    document.body.removeChild(link); // Remove the link when done
  };

  // Set the image source to the blob URL
  image.src = blobURL;
}
