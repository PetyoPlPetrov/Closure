/**
 * Sferas backup: export all settings, entities, memories and images to a ZIP file,
 * and import from such a file (e.g. when changing phones).
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import * as FileSystem from "expo-file-system/legacy";
import JSZip from "jszip";
import { Platform } from "react-native";

const BACKUP_VERSION = 1;
const IMAGE_PLACEHOLDER_PREFIX = "__SFERAS_IMG__";
const IMAGES_ZIP_FOLDER = "images";

/** AsyncStorage keys to include in backup (order preserved for manifest). */
const STORAGE_KEYS_TO_EXPORT = [
  "@sferas:ex_profiles",
  "@sferas:idealized_memories",
  "@sferas:jobs",
  "@sferas:family_members",
  "@sferas:friends",
  "@sferas:hobbies",
  "@sferas:avatar_positions",
  "@sferas:family_positions",
  "@sferas:friend_positions",
  "@sferas:hobby_positions",
  "@sferas:walkthrough_shown",
  "@sferas:moment_colors",
  "@sferas:recent_custom_colors",
  "@sferas:notification_templates",
  "@sferas:notification_assignments",
  "@sferas:moment_notification_summaries",
  "@sferas:moment_notification_schedules",
  "@sferas:streak_data",
  "@sferas:home_notification_nudge_enabled",
  "@sferas:ai_insights_consent",
  "@sferas:language",
  "@sferas:ai_encouragement_requests",
  "@sferas:ai_encouragement_messages",
] as const;

export type ExportResult = { success: true; fileUri: string } | { success: false; error: string };
export type ImportResult = { success: true } | { success: false; error: string };

/**
 * Collect all image URIs from stored JSON that might contain imageUri.
 */
function collectImageUrisFromStorageValues(
  keyValues: Record<string, string>
): string[] {
  const uris = new Set<string>();
  const keysWithImages = [
    "@sferas:ex_profiles",
    "@sferas:jobs",
    "@sferas:family_members",
    "@sferas:friends",
    "@sferas:hobbies",
    "@sferas:idealized_memories",
  ];

  for (const key of keysWithImages) {
    const raw = keyValues[key];
    if (!raw) continue;
    try {
      const parsed = JSON.parse(raw);
      const visit = (obj: unknown) => {
        if (obj && typeof obj === "object") {
          if (Array.isArray(obj)) {
            obj.forEach(visit);
          } else {
            if ("imageUri" in obj && typeof (obj as { imageUri?: string }).imageUri === "string") {
              const uri = (obj as { imageUri: string }).imageUri;
              if (uri.startsWith("file://") || uri.startsWith("content://") || uri.startsWith("ph://")) {
                uris.add(uri);
              }
            }
            Object.values(obj).forEach(visit);
          }
        }
      };
      visit(parsed);
    } catch {
      // skip invalid JSON
    }
  }
  return Array.from(uris);
}

/**
 * Replace image URIs in a JSON string with placeholders; returns modified string and mapping placeholder -> originalUri.
 */
function replaceImageUrisWithPlaceholders(
  keyValues: Record<string, string>,
  uriToPlaceholder: Map<string, string>
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(keyValues)) {
    let next = value;
    for (const [uri, placeholder] of uriToPlaceholder) {
      const escaped = uri.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      next = next.replace(new RegExp(escaped, "g"), placeholder);
    }
    out[key] = next;
  }
  return out;
}

/**
 * Export all Sferas data and images to a ZIP file; returns local file URI to share.
 */
export async function exportToZip(): Promise<ExportResult> {
  try {
    if (Platform.OS === "web") {
      return { success: false, error: "Export is not available on web. Use the app on a device." };
    }
    const dir = FileSystem.cacheDirectory || FileSystem.documentDirectory;
    if (!dir) {
      return { success: false, error: "No storage directory. Try again or restart the app." };
    }

    const keyValues: Record<string, string> = {};
    for (const key of STORAGE_KEYS_TO_EXPORT) {
      const value = await AsyncStorage.getItem(key);
      if (value != null) keyValues[key] = value;
    }

    const imageUris = collectImageUrisFromStorageValues(keyValues);

    const uriToPlaceholder = new Map<string, string>();
    imageUris.forEach((uri, index) => {
      const ext = uri.split(".").pop()?.toLowerCase() || "jpg";
      const safe = /^[a-z0-9]+$/i.test(ext) ? ext : "jpg";
      uriToPlaceholder.set(uri, `${IMAGE_PLACEHOLDER_PREFIX}${index}.${safe}`);
    });

    const valuesWithPlaceholders = replaceImageUrisWithPlaceholders(keyValues, uriToPlaceholder);

    const zip = new JSZip();
    const manifest = {
      version: BACKUP_VERSION,
      exportedAt: new Date().toISOString(),
      storage: valuesWithPlaceholders,
    };
    zip.file("manifest.json", JSON.stringify(manifest, null, 0));

    for (let i = 0; i < imageUris.length; i++) {
      const uri = imageUris[i];
      const placeholder = uriToPlaceholder.get(uri)!;
      const filename = placeholder.replace(IMAGE_PLACEHOLDER_PREFIX, "");
      const zipPath = `${IMAGES_ZIP_FOLDER}/${filename}`;
      try {
        let base64: string;
        try {
          base64 = await FileSystem.readAsStringAsync(uri, {
            encoding: FileSystem.EncodingType.Base64,
          });
        } catch {
          const tempUri = `${FileSystem.cacheDirectory || FileSystem.documentDirectory}__sferas_export_temp_${i}.jpg`;
          await FileSystem.copyAsync({ from: uri, to: tempUri });
          base64 = await FileSystem.readAsStringAsync(tempUri, {
            encoding: FileSystem.EncodingType.Base64,
          });
          await FileSystem.deleteAsync(tempUri, { idempotent: true });
        }
        zip.file(zipPath, base64, { base64: true });
      } catch {
        // Skip image if unreadable (e.g. deleted file, different app container)
      }
    }

    const zipBase64 = await zip.generateAsync({ type: "base64" });
    const fileName = `sferas-backup-${Date.now()}.zip`;
    const fileUri = `${dir}${fileName}`;
    await FileSystem.writeAsStringAsync(fileUri, zipBase64, {
      encoding: FileSystem.EncodingType.Base64,
    });
    return { success: true, fileUri };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return { success: false, error: message };
  }
}

/**
 * Copy an image from zip (base64) to app document directory and return new file URI.
 */
async function copyImageFromZipToApp(
  zip: JSZip,
  zipPath: string,
  imagesDir: string
): Promise<string> {
  const file = zip.file(zipPath);
  if (!file) throw new Error(`Missing file in zip: ${zipPath}`);
  const base64 = await file.async("base64");
  const ext = zipPath.split(".").pop() || "jpg";
  const uniqueName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const destUri = `${imagesDir}${uniqueName}`;
  await FileSystem.writeAsStringAsync(destUri, base64, {
    encoding: FileSystem.EncodingType.Base64,
  });
  return destUri;
}

/**
 * Replace placeholders in a string with new URIs (placeholder -> newUri).
 */
function replacePlaceholdersWithUris(
  value: string,
  placeholderToNewUri: Map<string, string>
): string {
  let out = value;
  for (const [placeholder, newUri] of placeholderToNewUri) {
    const regex = new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g");
    out = out.replace(regex, newUri);
  }
  return out;
}

/**
 * Import from a Sferas backup ZIP file (e.g. from DocumentPicker).
 * Overwrites existing AsyncStorage keys included in the backup.
 */
export async function importFromZip(pickedFileUri: string): Promise<ImportResult> {
  try {
    const base64 = await FileSystem.readAsStringAsync(pickedFileUri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    const zip = await JSZip.loadAsync(base64, { base64: true });
    const manifestFile = zip.file("manifest.json");
    if (!manifestFile) return { success: false, error: "Invalid backup: missing manifest.json" };
    const manifestText = await manifestFile.async("string");
    const manifest = JSON.parse(manifestText) as {
      version?: number;
      storage?: Record<string, string>;
    };
    if (!manifest.storage || typeof manifest.storage !== "object") {
      return { success: false, error: "Invalid backup: missing storage in manifest" };
    }

    const imagesDir = `${FileSystem.documentDirectory || ""}SferasImages/`;
    try {
      const dirInfo = await FileSystem.getInfoAsync(imagesDir);
      if (!dirInfo.exists) await FileSystem.makeDirectoryAsync(imagesDir, { intermediates: true });
    } catch {
      // ignore
    }

    const placeholderToNewUri = new Map<string, string>();
    const imageNames = zip.folder(IMAGES_ZIP_FOLDER)?.filter((_, f) => !f.dir)?.map((f) => f.name) ?? [];

    for (const name of imageNames) {
      const filenameOnly = name.includes("/") ? name.split("/").pop()! : name;
      const zipPath = name.startsWith(IMAGES_ZIP_FOLDER + "/") ? name : `${IMAGES_ZIP_FOLDER}/${name}`;
      const placeholder = IMAGE_PLACEHOLDER_PREFIX + filenameOnly;
      try {
        const newUri = await copyImageFromZipToApp(zip, zipPath, imagesDir);
        placeholderToNewUri.set(placeholder, newUri);
      } catch {
        // Skip image if copy fails
      }
    }

    for (const key of Object.keys(manifest.storage)) {
      let value = manifest.storage[key];
      value = replacePlaceholdersWithUris(value, placeholderToNewUri);
      await AsyncStorage.setItem(key, value);
    }

    return { success: true };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return { success: false, error: message };
  }
}

/**
 * Share the exported backup file using the system share sheet (e.g. save to Files, send by email).
 * On web this may not be available.
 */
export async function shareExportedFile(fileUri: string): Promise<{ shared: boolean; error?: string }> {
  if (Platform.OS === "web") {
    return { shared: false, error: "Sharing not supported on web" };
  }
  try {
    const Sharing = await import("expo-sharing");
    const available = await Sharing.isAvailableAsync();
    if (!available) return { shared: false, error: "Sharing is not available" };
    await Sharing.shareAsync(fileUri, {
      mimeType: "application/zip",
      dialogTitle: "Export Sferas backup",
    });
    return { shared: true };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return { shared: false, error: message };
  }
}
