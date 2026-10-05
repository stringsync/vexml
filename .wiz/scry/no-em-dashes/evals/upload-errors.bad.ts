export type UploadError = "too-large" | "bad-type" | "network";

const messages: Record<UploadError, string> = {
	"too-large": "That file is over 25 MB. Choose a smaller one.",
	"bad-type": "Only PNG, JPEG and WebP images are supported.",
	network: "Upload failed – check your connection and try again.",
};

export function uploadErrorMessage(error: UploadError): string {
	return messages[error];
}
