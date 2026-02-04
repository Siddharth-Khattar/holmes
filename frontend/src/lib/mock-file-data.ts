/**
 * Mock file data for testing the redaction feature
 */

export const MOCK_FILES = {
  image: {
    original: "https://images.unsplash.com/photo-1560179707-f14e90ef3623?w=800&h=600&fit=crop",
    redacted: "https://images.unsplash.com/photo-1560179707-f14e90ef3623?w=800&h=600&fit=crop&blur=100",
  },
  video: {
    original: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
    redacted: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4",
  },
  pdf: {
    original: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
    redacted: "data:application/pdf;base64,JVBERi0xLjQKJeLjz9MKMSAwIG9iago8PC9UeXBlL0NhdGFsb2cvUGFnZXMgMiAwIFI+PgplbmRvYmoKMiAwIG9iago8PC9UeXBlL1BhZ2VzL0tpZHNbMyAwIFJdL0NvdW50IDE+PgplbmRvYmoKMyAwIG9iago8PC9UeXBlL1BhZ2UvTWVkaWFCb3hbMCAwIDYxMiA3OTJdL1BhcmVudCAyIDAgUi9SZXNvdXJjZXM8PC9Gb250PDwvRjEgNCAwIFI+Pj4+L0NvbnRlbnRzIDUgMCBSPj4KZW5kb2JqCjQgMCBvYmoKPDwvVHlwZS9Gb250L1N1YnR5cGUvVHlwZTEvQmFzZUZvbnQvSGVsdmV0aWNhPj4KZW5kb2JqCjUgMCBvYmoKPDwvTGVuZ3RoIDQ0Pj4Kc3RyZWFtCkJUCi9GMSA0OCBUZgoxMDAgNzAwIFRkCihSRURBQ1RFRCkgVGoKRVQKZW5kc3RyZWFtCmVuZG9iagp4cmVmCjAgNgowMDAwMDAwMDAwIDY1NTM1IGYgCjAwMDAwMDAwMTUgMDAwMDAgbiAKMDAwMDAwMDA2NiAwMDAwMCBuIAowMDAwMDAwMTI1IDAwMDAwIG4gCjAwMDAwMDAyNDQgMDAwMDAgbiAKMDAwMDAwMDMxNyAwMDAwMCBuIAp0cmFpbGVyCjw8L1NpemUgNi9Sb290IDEgMCBSPj4Kc3RhcnR4cmVmCjQxMAolJUVPRgo=",
  },
  audio: {
    original: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
    redacted: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3",
  },
};

/**
 * Simulate redaction processing with realistic delays
 */
export async function simulateRedaction(
  fileType: string,
): Promise<string> {
  // Simulate processing time based on file type
  const processingTime = {
    image: 1500,
    video: 3000,
    pdf: 2000,
    audio: 2500,
  }[fileType] || 2000;

  await new Promise((resolve) => setTimeout(resolve, processingTime));

  // Return mock redacted URL based on file type
  switch (fileType) {
    case "image":
      return MOCK_FILES.image.redacted;
    case "video":
      return MOCK_FILES.video.redacted;
    case "pdf":
      return MOCK_FILES.pdf.redacted;
    case "audio":
      return MOCK_FILES.audio.redacted;
    default:
      return "";
  }
}
