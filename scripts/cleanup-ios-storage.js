#!/usr/bin/env node
/**
 * Cleanup utility for local iOS build storage.
 *
 * - Removes Xcode DerivedData entirely
 * - Deletes available shutdown simulators that are older than N days (or never booted)
 *
 * Usage:
 *   node scripts/cleanup-ios-storage.js
 *   node scripts/cleanup-ios-storage.js --days=14
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const DERIVED_DATA_PATH = path.join(
  os.homedir(),
  'Library',
  'Developer',
  'Xcode',
  'DerivedData'
);

function parseDaysArg(defaultDays = 7) {
  const match = process.argv.find((arg) => arg.startsWith('--days='));
  if (!match) return defaultDays;
  const parsed = Number.parseInt(match.split('=')[1], 10);
  if (!Number.isFinite(parsed) || parsed < 0) return defaultDays;
  return parsed;
}

function bytesToGB(value) {
  return (value / 1024 / 1024 / 1024).toFixed(2);
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

function cleanDerivedData() {
  console.log('🧹 Cleaning Xcode DerivedData...');
  if (isXcodeBuildRunning()) {
    console.log(
      '  ℹ Skipped: active xcodebuild process detected (stop the build and run again)'
    );
    return;
  }

  if (!fs.existsSync(DERIVED_DATA_PATH)) {
    console.log('  ℹ DerivedData directory does not exist');
    return;
  }

  try {
    fs.rmSync(DERIVED_DATA_PATH, { recursive: true, force: true });
    console.log(`  ✓ Removed: ${DERIVED_DATA_PATH}`);
  } catch (error) {
    console.warn(`  ⚠ Failed to remove DerivedData: ${error.message}`);
  }
}

function listDevicesJson() {
  const output = execFileSync('xcrun', ['simctl', 'list', 'devices', '-j'], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  return JSON.parse(output);
}

function deleteOldSimulators(daysOld) {
  console.log(`📱 Removing shutdown simulators older than ${daysOld} day(s)...`);

  let payload;
  try {
    payload = listDevicesJson();
  } catch (error) {
    console.warn(`  ⚠ Failed to list simulators: ${error.message}`);
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

    if (neverBooted || oldEnough) {
      toDelete.push(device);
    }
  }

  if (toDelete.length === 0) {
    console.log('  ℹ No old simulators found');
    return;
  }

  let estimatedFreedBytes = 0;
  for (const device of toDelete) {
    try {
      execFileSync('xcrun', ['simctl', 'delete', device.udid], {
        stdio: ['ignore', 'pipe', 'pipe'],
      });
      estimatedFreedBytes += Number(device.dataPathSize || 0);
      console.log(`  ✓ Deleted: ${device.name} (${device.udid})`);
    } catch (error) {
      console.warn(
        `  ⚠ Failed to delete ${device.name} (${device.udid}): ${error.message}`
      );
    }
  }

  console.log(
    `  ✓ Deleted ${toDelete.length} simulator(s), estimated data reclaimed: ${bytesToGB(
      estimatedFreedBytes
    )} GB`
  );
}

function main() {
  const daysOld = parseDaysArg(7);
  console.log('🚀 iOS local storage cleanup started\n');
  cleanDerivedData();
  deleteOldSimulators(daysOld);
  console.log('\n✅ iOS local storage cleanup complete');
}

if (require.main === module) {
  main();
}
