/**
 * Ensures entity images are stored in app Documents (SferasImages/) so they
 * survive app updates, OTA reloads, and can be read during backup export.
 *
 * iOS cache paths (ExponentAsset-*, Library/Caches) are not readable by
 * FileSystem.readAsStringAsync, and can point to a different app container
 * after OTA updates. Storing in Documents/SferasImages/ avoids both issues.
 */

import * as FileSystem from "expo-file-system/legacy";

const SFERAS_IMAGES_DIR = "SferasImages";

/**
 * Returns true if the URI is already in our stable Documents/SferasImages directory.
 */
function isInSferasImages(uri: string): boolean {
  const docDir = FileSystem.documentDirectory || "";
  const imagesDir = `${docDir}${SFERAS_IMAGES_DIR}/`;
  return uri.startsWith(imagesDir);
}

/**
 * Copy an image to Documents/SferasImages/ and return the new file URI.
 * If the URI is already in SferasImages, returns it unchanged.
 * If copy fails (e.g. source in different app container), returns the original URI.
 *
 * Call this before saving imageUri to AsyncStorage so backup export can read the file.
 */
export async function ensureImageInAppDocuments(uri: string): Promise<string> {
  if (!uri || typeof uri !== "string") return uri;

  const docDir = FileSystem.documentDirectory;
  if (!docDir) return uri;

  const imagesDir = `${docDir}${SFERAS_IMAGES_DIR}/`;
  if (isInSferasImages(uri)) return uri;

  // Skip remote URLs - we don't persist them for backup (export doesn't include them)
  if (uri.startsWith("http://") || uri.startsWith("https://")) return uri;

  try {
    const dirInfo = await FileSystem.getInfoAsync(imagesDir);
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(imagesDir, { intermediates: true });
    }

    const ext = uri.split(".").pop()?.toLowerCase() || "jpg";
    const safeExt = /^[a-z0-9]+$/i.test(ext) ? ext : "jpg";
    const destUri = `${imagesDir}${Date.now()}-${Math.random().toString(36).slice(2)}.${safeExt}`;

    await FileSystem.copyAsync({ from: uri, to: destUri });
    return destUri;
  } catch {
    return uri;
  }
}
