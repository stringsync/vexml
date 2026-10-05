export interface UploadCallbacks {
	onProgress?: (fraction: number) => void;
	onComplete?: (url: string) => void;
	onError?: (error: Error) => void;
}

export function uploadFile(file: File, endpoint: string, callbacks: UploadCallbacks): void {
	const request = new XMLHttpRequest();
	request.open("POST", endpoint);
	request.upload.addEventListener("progress", (event) => {
		if (event.lengthComputable) callbacks.onProgress?.(event.loaded / event.total);
	});
	request.addEventListener("load", () => {
		if (request.status < 300) callbacks.onComplete?.(request.responseText);
		else callbacks.onError?.(new Error(`Upload failed with ${request.status}`));
	});
	request.addEventListener("error", () => callbacks.onError?.(new Error("Network error")));
	request.send(file);
}
