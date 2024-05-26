export async function convertFontToBase64(fontUrl: string) {
  const response = await fetch(fontUrl);
  const blob = await response.blob();

  return new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      // Convert blob to base64
      const base64data = reader.result as string;
      resolve(base64data.split(',')[1]); // Split to remove data URL prefix and pass only the base64 string to the callback
    };
    reader.readAsDataURL(blob);
  });
}
