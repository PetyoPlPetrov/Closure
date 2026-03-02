# Versioning: Store builds vs OTA updates

## Rule of thumb

| When | Bump version in app.json? | Command / action |
|------|---------------------------|------------------|
| **New store submission** (App Store / Play Store) | **Yes** | `npm run bump:version` then build & submit |
| **OTA update only** (JS/assets fix, no native change) | **No** | `npm run update:production -- "Description"` |

The **app version** (e.g. `1.0.131`) is the **native build** version. It only changes when you ship a new binary. All OTA updates between those builds keep the same version number; what changes is the **update** (bundle) served by EAS Update.

## How to avoid losing track

1. **Store version**  
   Bump only when creating a new binary:
   - Run `npm run bump:version` (updates `version`, `buildNumber`, `versionCode`).
   - Then run your build (e.g. `npm run build:ios`).

2. **OTA updates**  
   Don’t touch `app.json` version. Publish with:
   ```bash
   npm run update:production -- "Fix settings crash"
   ```
   EAS stores each update with a unique **update ID** and **channel**. You can see history in [expo.dev](https://expo.dev) → your project → Updates.

3. **What users are running**  
   - **Version** = from the binary (e.g. `1.0.131`). Same for everyone on that store build.
   - **Update** = which OTA bundle they have. Shown in Settings (e.g. update ID or “up to date”) for support.

4. **Changelog / release notes**  
   - For **store releases**: note version `1.0.132` and what’s in that binary.
   - For **OTA**: keep a simple log (e.g. in Notion/GitHub/Docs): “2024-03-02: Fix settings crash (production channel).” No need to bump app version for these.

## Summary

- **Version in app.json** = “which store build” (bump only for new store submissions).
- **OTA** = “which JS bundle” (no version bump; track via EAS dashboard + optional update ID in Settings).

This matches current best practice: one version number per binary, many OTA updates per version.
