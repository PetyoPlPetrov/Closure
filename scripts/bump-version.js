#!/usr/bin/env node

/**
 * Bump Expo app version, iOS buildNumber, and Android versionCode.
 *
 * - Increments the patch component of expo.version (major.minor.patch).
 * - Mirrors the new semantic version into ios.buildNumber (string).
 * - Increments android.versionCode (numeric).
 *
 * Usage: `node scripts/bump-version.js`
 */

const fs = require('fs');
const path = require('path');

const APP_JSON_PATH = path.resolve(__dirname, '..', 'app.json');

function readAppConfig() {
  const raw = fs.readFileSync(APP_JSON_PATH, 'utf8');
  return JSON.parse(raw);
}

function writeAppConfig(config) {
  const serialized = JSON.stringify(config, null, 2);
  fs.writeFileSync(APP_JSON_PATH, `${serialized}\n`, 'utf8');
}

function incrementSemver(version) {
  const segments = version.split('.');
  if (segments.length !== 3 || segments.some((segment) => Number.isNaN(Number(segment)))) {
    throw new Error(`Cannot bump version "${version}". Expected format x.y.z`);
  }

  const [major, minor, patch] = segments.map((segment) => Number(segment));
  const nextPatch = patch + 1;
  return `${major}.${minor}.${nextPatch}`;
}

function bumpVersion() {
  const config = readAppConfig();
  const expoConfig = config.expo;

  if (!expoConfig) {
    throw new Error('Invalid app.json: missing "expo" config');
  }

  const currentVersion = expoConfig.version;
  if (!currentVersion) {
    throw new Error('Invalid app.json: missing "expo.version"');
  }

  const nextVersion = incrementSemver(currentVersion);

  // iOS buildNumber mirrors semantic versioning (string)
  if (!expoConfig.ios) {
    expoConfig.ios = {};
  }
  expoConfig.ios.buildNumber = nextVersion;

  // Android versionCode increments numerically
  if (!expoConfig.android) {
    expoConfig.android = {};
  }
  const currentVersionCode = Number(expoConfig.android.versionCode ?? 0);
  if (Number.isNaN(currentVersionCode)) {
    throw new Error(
      `Invalid android.versionCode "${expoConfig.android.versionCode}". Expected a number.`,
    );
  }
  expoConfig.android.versionCode = currentVersionCode + 1;

  // Update Expo version (applies to both stores)
  expoConfig.version = nextVersion;

  writeAppConfig(config);

  console.log(
    `Bumped version: ${currentVersion} -> ${nextVersion} (android.versionCode ${currentVersionCode} -> ${expoConfig.android.versionCode})`,
  );
}

try {
  bumpVersion();
} catch (error) {
  console.error('[bump-version] Failed to bump app version.');
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}

