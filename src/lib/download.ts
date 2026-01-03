/**
 * Download Utilities
 * Functions for downloading single images and ZIP archives of carousel images
 */

import JSZip from 'jszip';

/**
 * Download a single image from a URL
 */
export async function downloadImage(
  url: string,
  filename: string
): Promise<void> {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.status}`);
    }

    const blob = await response.blob();
    const blobUrl = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Clean up blob URL
    URL.revokeObjectURL(blobUrl);
  } catch (error) {
    console.error('Download failed:', error);
    throw error;
  }
}

/**
 * Download multiple images as a ZIP file
 */
export async function downloadAllAsZip(
  images: Array<{ url: string; filename: string }>,
  zipFilename: string = 'carousel-images.zip'
): Promise<void> {
  const zip = new JSZip();

  // Download all images in parallel
  const downloadPromises = images.map(async (image, index) => {
    try {
      const response = await fetch(image.url);
      if (!response.ok) {
        throw new Error(`Failed to fetch ${image.filename}: ${response.status}`);
      }
      const blob = await response.blob();

      // Add to zip with original filename or fallback
      const filename = image.filename || `slide-${index + 1}.png`;
      zip.file(filename, blob);
    } catch (error) {
      console.error(`Failed to download ${image.filename}:`, error);
      // Continue with other images even if one fails
    }
  });

  await Promise.all(downloadPromises);

  // Generate and download the ZIP
  const zipBlob = await zip.generateAsync({ type: 'blob' });
  const blobUrl = URL.createObjectURL(zipBlob);

  const link = document.createElement('a');
  link.href = blobUrl;
  link.download = zipFilename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  // Clean up
  URL.revokeObjectURL(blobUrl);
}

/**
 * Download carousel images with proper naming
 */
export async function downloadCarouselImages(
  slides: Array<{ publicUrl: string; slideNumber: number }>,
  contentId: string
): Promise<void> {
  const images = slides.map((slide) => ({
    url: slide.publicUrl,
    filename: `carousel-slide-${slide.slideNumber}.png`,
  }));

  await downloadAllAsZip(images, `carousel-${contentId}.zip`);
}
