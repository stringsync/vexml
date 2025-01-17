export function downloadCanvasAsImage(canvas: HTMLCanvasElement, imageName: string) {
  // Create a new canvas to draw the image with a white background
  const newCanvas = document.createElement('canvas');
  newCanvas.width = canvas.width;
  newCanvas.height = canvas.height;
  const context = newCanvas.getContext('2d')!;

  // Fill the new canvas with a white background
  context.fillStyle = 'white';
  context.fillRect(0, 0, newCanvas.width, newCanvas.height);

  // Draw the original canvas onto the new canvas
  context.drawImage(canvas, 0, 0);

  // Convert the new canvas to a data URL
  const dataUrl = newCanvas.toDataURL('image/png');

  // Create a link element for downloading
  const link = document.createElement('a');
  document.body.appendChild(link); // Firefox requires the link to be in the body
  link.setAttribute('href', dataUrl);
  link.setAttribute('download', imageName);
  link.click();
  document.body.removeChild(link); // Remove the link when done
}
