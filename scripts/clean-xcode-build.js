#!/usr/bin/env node
/**
 * Cleans Xcode build artifacts to prevent database lock errors
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');

const PROJECT_NAME = 'Sferas';
const DERIVED_DATA_PATH = path.join(
  os.homedir(),
  'Library/Developer/Xcode/DerivedData'
);

function cleanDerivedData() {
  console.log('🧹 Cleaning Xcode DerivedData...');
  
  try {
    // Find all DerivedData folders for this project
    if (fs.existsSync(DERIVED_DATA_PATH)) {
      const entries = fs.readdirSync(DERIVED_DATA_PATH, { withFileTypes: true });
      let cleanedCount = 0;
      
      entries.forEach(entry => {
        if (entry.isDirectory() && entry.name.startsWith(`${PROJECT_NAME}-`)) {
          const fullPath = path.join(DERIVED_DATA_PATH, entry.name);
          try {
            fs.rmSync(fullPath, { recursive: true, force: true });
            console.log(`  ✓ Removed: ${entry.name}`);
            cleanedCount++;
          } catch (error) {
            console.warn(`  ⚠ Could not remove ${entry.name}: ${error.message}`);
          }
        }
      });
      
      if (cleanedCount === 0) {
        console.log('  ℹ No DerivedData folders found to clean');
      }
    } else {
      console.log('  ℹ DerivedData directory does not exist');
    }
    
    console.log('✅ DerivedData cleaned');
  } catch (error) {
    console.warn(`⚠️  Warning: Could not clean DerivedData: ${error.message}`);
  }
}

function killStaleXcodeProcesses() {
  console.log('🔍 Checking for stale Xcode processes...');
  
  try {
    // Kill xcodebuild processes
    try {
      const result = execSync('pgrep -x xcodebuild', { encoding: 'utf8', stdio: 'pipe' });
      if (result.trim()) {
        execSync('pkill -9 xcodebuild', { stdio: 'ignore' });
        console.log('  ✓ Killed stale xcodebuild processes');
      } else {
        console.log('  ℹ No xcodebuild processes found');
      }
    } catch (error) {
      // No processes to kill, that's fine
      console.log('  ℹ No xcodebuild processes found');
    }
    
    // Kill simctl processes (sometimes they hold locks)
    try {
      const result = execSync('pgrep -f simctl', { encoding: 'utf8', stdio: 'pipe' });
      if (result.trim()) {
        execSync('pkill -9 -f simctl', { stdio: 'ignore' });
        console.log('  ✓ Killed stale simctl processes');
      }
    } catch (error) {
      // No processes to kill, that's fine
    }
    
  } catch (error) {
    console.warn(`⚠️  Warning: Could not kill processes: ${error.message}`);
  }
}

function checkXcodeRunning() {
  try {
    const result = execSync('pgrep -x Xcode', { encoding: 'utf8', stdio: 'pipe' });
    if (result.trim()) {
      console.warn('⚠️  Warning: Xcode is currently running.');
      console.warn('   Consider closing it to avoid potential lock issues.');
      return true;
    }
  } catch (error) {
    // Xcode not running, that's fine
  }
  return false;
}

function main() {
  console.log('🚀 Starting Xcode build cleanup...\n');
  
  killStaleXcodeProcesses();
  const xcodeRunning = checkXcodeRunning();
  cleanDerivedData();
  
  console.log('\n✅ Cleanup complete!');
  
  if (xcodeRunning) {
    console.log('\n💡 Tip: Close Xcode before building to prevent lock issues.\n');
  } else {
    console.log('');
  }
}

if (require.main === module) {
  main();
}

module.exports = { cleanDerivedData, killStaleXcodeProcesses, checkXcodeRunning };

