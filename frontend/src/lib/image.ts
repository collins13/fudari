/**
 * Client-side image normalisation for profile photos.
 *
 * Photos are stored inline as base64 on the user row, so an unprocessed phone
 * upload (4000x3000, ~4MB) becomes ~5MB of base64 that ships with every
 * listing response. Downscaling to a square also removes the aspect-ratio
 * mismatch that was cropping heads out of landscape cards.
 */

/** Downscale and centre-crop an image file to a square JPEG data URL. */
export async function squareImageDataUrl(
  file: File,
  size = 512,
  quality = 0.82,
): Promise<string> {
  // `from-image` applies EXIF orientation, otherwise portrait phone shots land sideways.
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });

  const side = Math.min(bitmap.width, bitmap.height);
  const sx = (bitmap.width - side) / 2;
  // Head-and-shoulders shots put the face above centre, so crop nearer the top.
  const sy = Math.min((bitmap.height - side) / 2, bitmap.height * 0.1);

  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    bitmap.close();
    throw new Error('Your browser cannot process images. Try a different browser.');
  }

  ctx.drawImage(bitmap, sx, sy, side, side, 0, 0, size, size);
  bitmap.close();

  return canvas.toDataURL('image/jpeg', quality);
}
