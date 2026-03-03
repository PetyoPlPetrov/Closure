/** Thrown when document picker native module is missing (e.g. Expo Go). */
export const BACKUP_NEEDS_DEV_BUILD = "SFERAS_BACKUP_NEEDS_DEV_BUILD";

/**
 * Pick a backup ZIP file. Uses dynamic import so expo-document-picker
 * is only loaded when this function runs. If the native module is missing
 * (Expo Go), throws an error with message BACKUP_NEEDS_DEV_BUILD so the
 * Import screen can show a friendly message instead of a red screen.
 */
export async function pickBackupFileUri(): Promise<string | null> {
  try {
    const DocumentPicker = await import("expo-document-picker");
    const result = await DocumentPicker.getDocumentAsync({
      type: "application/zip",
      copyToCacheDirectory: true,
    });
    if (result.canceled) return null;
    return result.assets[0]?.uri ?? null;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (
      msg.includes("ExpoDocumentPicker") ||
      msg.includes("native module") ||
      msg.includes("Cannot find native module")
    ) {
      throw new Error(BACKUP_NEEDS_DEV_BUILD);
    }
    throw e;
  }
}
