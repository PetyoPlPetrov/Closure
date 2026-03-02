#!/usr/bin/env node

/**
 * Bump only iOS buildNumber and Android versionCode (expo.version unchanged).
 * Use for dev/TestFlight builds so each upload has a unique build number
 * without advancing the marketing version.
 *
 * - ios.buildNumber: increment last segment (e.g. 1.0.133 -> 1.0.134).
 * - android.versionCode: increment by 1.
 *
 * Usage: `node scripts/bump-build.js`
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

function incrementBuildNumber(buildNumber) {
  const segments = String(buildNumber).split('.');
  if (segments.length < 1) throw new Error(`Invalid buildNumber: ${buildNumber}`);
  const last = Number(segments[segments.length - 1]);
  if (Number.isNaN(last)) throw new Error(`Invalid buildNumber: ${buildNumber}`);
  segments[segments.length - 1] = String(last + 1);
  return segments.join('.');
}

function bumpBuild() {
  const config = readAppConfig();
  const expoConfig = config.expo;

  if (!expoConfig) {
    throw new Error('Invalid app.json: missing "expo" config');
  }

  if (!expoConfig.ios) expoConfig.ios = {};
  const currentBuildNumber = expoConfig.ios.buildNumber ?? expoConfig.version ?? '1';
  const nextBuildNumber = incrementBuildNumber(currentBuildNumber);
  expoConfig.ios.buildNumber = nextBuildNumber;

  if (!expoConfig.android) expoConfig.android = {};
  const currentVersionCode = Number(expoConfig.android.versionCode ?? 0);
  if (Number.isNaN(currentVersionCode)) {
    throw new Error(`Invalid android.versionCode "${expoConfig.android.versionCode}". Expected a number.`);
  }
  expoConfig.android.versionCode = currentVersionCode + 1;

  writeAppConfig(config);

  console.log(
    `Bumped build: ios.buildNumber ${currentBuildNumber} -> ${nextBuildNumber}, android.versionCode ${currentVersionCode} -> ${expoConfig.android.versionCode} (expo.version unchanged)`,
  );
}

try {
  bumpBuild();
} catch (error) {
  console.error('[bump-build] Failed to bump build number.');
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
