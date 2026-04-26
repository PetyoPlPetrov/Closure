#!/usr/bin/env node
/**
 * Disk space cleanup utility for macOS dev caches (outside this repo).
 *
 * Cleans:
 * - Xcode DerivedData
 * - Xcode iOS DeviceSupport (old SDK support files)
 * - Xcode Archives older than N days
 * - Unavailable simulators
 * - Shutdown simulators older than N days (or never booted)
 *
 * Usage:
 *   node scripts/cleanup-disk-space.js
 *   node scripts/cleanup-disk-space.js --days=30
 *   node scripts/cleanup-disk-space.js --dry-run
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const HOME = os.homedir();
const PATHS = {
  derivedData: path.join(HOME, 'Library', 'Developer', 'Xcode', 'DerivedData'),
  archives: path.join(HOME, 'Library', 'Developer', 'Xcode', 'Archives'),
  deviceSupport: path.join(
    HOME,
    'Library',
    'Developer',
    'Xcode',
    'iOS DeviceSupport'
  ),
};

function parseNumberArg(name, defaultValue) {
  const match = process.argv.find((arg) => arg.startsWith(`--${name}=`));
  if (!match) return defaultValue;
  const parsed = Number.parseInt(match.split('=')[1], 10);
  if (!Number.isFinite(parsed) || parsed < 0) return defaultValue;
  return parsed;
}

function hasFlag(flag) {
  return process.argv.includes(flag);
}

function isXcodeBuildRunning() {
  try {
    const output = execFileSync('pgrep', ['-x', 'xcodebuild'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    return Boolean(output.trim());
  } catch {
    return false;
  }
}

function safeStat(filePath) {
  try {
    return fs.statSync(filePath);
  } catch {
    return null;
  }
}

function removePath(targetPath, dryRun) {
  if (!fs.existsSync(targetPath)) return false;
  if (dryRun) return true;
  fs.rmSync(targetPath, { recursive: true, force: true });
  return true;
}

function listDirectories(basePath) {
  if (!fs.existsSync(basePath)) return [];
  return fs
    .readdirSync(basePath, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => path.join(basePath, d.name));
}

function cleanDerivedData(dryRun) {
  const deleted = removePath(PATHS.derivedData, dryRun);
  console.log(
    deleted
      ? `- ${dryRun ? 'Would remove' : 'Removed'} DerivedData`
      : '- DerivedData not found'
  );
}

function cleanDeviceSupport(dryRun) {
  const deleted = removePath(PATHS.deviceSupport, dryRun);
  console.log(
    deleted
      ? `- ${dryRun ? 'Would remove' : 'Removed'} iOS DeviceSupport`
      : '- iOS DeviceSupport not found'
  );
}

function cleanOldArchives(daysOld, dryRun) {
  const cutoffMs = daysOld * 24 * 60 * 60 * 1000;
  const now = Date.now();
  const archiveFolders = listDirectories(PATHS.archives);
  let removedCount = 0;

  for (const dateFolder of archiveFolders) {
    const buildFolders = listDirectories(dateFolder);
    for (const buildFolder of buildFolders) {
      const stat = safeStat(buildFolder);
      if (!stat) continue;
      const ageMs = now - stat.mtimeMs;
      if (ageMs < cutoffMs) continue;

      if (removePath(buildFolder, dryRun)) {
        removedCount += 1;
      }
    }
  }

  console.log(
    `- ${dryRun ? 'Would remove' : 'Removed'} ${removedCount} archive(s) older than ${daysOld} day(s)`
  );
}

function listDevicesJson() {
  const output = execFileSync('xcrun', ['simctl', 'list', 'devices', '-j'], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  return JSON.parse(output);
}

function deleteUnavailableSimulators(dryRun) {
  let payload;
  try {
    payload = listDevicesJson();
  } catch (error) {
    console.warn(`- Failed to list simulators: ${error.message}`);
    return;
  }

  const devices = Object.values(payload.devices || {}).flat();
  const unavailable = devices.filter((d) => d && d.isAvailable === false);
  let deleted = 0;

  for (const device of unavailable) {
    try {
      if (!dryRun) {
        execFileSync('xcrun', ['simctl', 'delete', device.udid], {
          stdio: ['ignore', 'pipe', 'pipe'],
        });
      }
      deleted += 1;
    } catch (error) {
      console.warn(
        `  ! Failed deleting unavailable simulator ${device.name} (${device.udid}): ${error.message}`
      );
    }
  }

  console.log(
    `- ${dryRun ? 'Would delete' : 'Deleted'} ${deleted} unavailable simulator(s)`
  );
}

function deleteOldShutdownSimulators(daysOld, dryRun) {
  let payload;
  try {
    payload = listDevicesJson();
  } catch (error) {
    console.warn(`- Failed to list simulators: ${error.message}`);
    return;
  }

  const now = Date.now();
  const cutoffMs = daysOld * 24 * 60 * 60 * 1000;
  const devices = Object.values(payload.devices || {}).flat();
  const toDelete = [];

  for (const device of devices) {
    if (!device?.isAvailable) continue;
    if (device.state === 'Booted') continue;

    const lastBootedAt = device.lastBootedAt
      ? Date.parse(device.lastBootedAt)
      : Number.NaN;
    const neverBooted = Number.isNaN(lastBootedAt);
    const oldEnough = !neverBooted && now - lastBootedAt > cutoffMs;

    if (neverBooted || oldEnough) toDelete.push(device);
  }

  let deleted = 0;
  for (const device of toDelete) {
    try {
      if (!dryRun) {
        execFileSync('xcrun', ['simctl', 'delete', device.udid], {
          stdio: ['ignore', 'pipe', 'pipe'],
        });
      }
      deleted += 1;
    } catch (error) {
      console.warn(
        `  ! Failed deleting simulator ${device.name} (${device.udid}): ${error.message}`
      );
    }
  }

  console.log(
    `- ${dryRun ? 'Would delete' : 'Deleted'} ${deleted} old shutdown simulator(s)`
  );
}

function main() {
  const daysOld = parseNumberArg('days', 30);
  const dryRun = hasFlag('--dry-run');

  console.log('Disk cleanup started');
  console.log(`Mode: ${dryRun ? 'dry-run' : 'apply'}`);
  console.log(`Threshold: ${daysOld} day(s)`);

  if (isXcodeBuildRunning()) {
    console.log('Active xcodebuild detected. Stop build and run cleanup again.');
    process.exit(1);
  }

  cleanDerivedData(dryRun);
  cleanDeviceSupport(dryRun);
  cleanOldArchives(daysOld, dryRun);
  deleteUnavailableSimulators(dryRun);
  deleteOldShutdownSimulators(daysOld, dryRun);

  console.log('Disk cleanup complete');
}

if (require.main === module) {
  main();
}
