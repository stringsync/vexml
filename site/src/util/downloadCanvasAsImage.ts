export function downloadCanvasAsImage(canvas: HTMLCanvasElement, imageName: string) {
  // Convert the canvas to a data URL
  const dataUrl = canvas.toDataURL('image/png');

  // Create a link element for downloading
  const link = document.createElement('a');
  document.body.appendChild(link); // Firefox requires the link to be in the body
  link.setAttribute('href', dataUrl);
  link.setAttribute('download', imageName);
  link.click();
  document.body.removeChild(link); // Remove the link when done
}
