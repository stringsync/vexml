export function downloadSvgAsImage(
  svg: SVGElement,
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
  svg.prepend(styleElement);

  // Serialize the SVG to a string
  const serializer = new XMLSerializer();
  const svgString = serializer.serializeToString(svg);
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
