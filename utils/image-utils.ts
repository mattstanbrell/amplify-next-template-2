import convert from "heic-convert";

export async function convertHeicToJpeg(
	buffer: Buffer,
): Promise<{ data: Buffer; mimeType: string }> {
	try {
		const jpegBuffer = await convert({
			buffer: buffer as unknown as ArrayBuffer,
			format: "JPEG",
			quality: 0.9,
		});
		return { data: Buffer.from(jpegBuffer), mimeType: "image/jpeg" };
	} catch (error) {
		console.error("Error converting HEIC to JPEG:", error);
		throw new Error("Failed to convert HEIC image");
	}
}
