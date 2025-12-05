const { withDangerousMod, createRunOncePlugin } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const ANALYTICS_HEADER_PATH = path.join(
  'node_modules',
  '@react-native-firebase',
  'analytics',
  'ios',
  'RNFBAnalytics',
  'RNFBAnalyticsModule.h' // This is the file throwing the error
);

function patchAnalyticsHeader(fileContent) {
  // 1. Target the Modular Import (which is failing):
  const targetPattern = /#import <React-Core\/RCTBridgeModule.h>/g;
  
  // 2. Replace with the Quoted Import (as shown in your first image)
  // This forces the compiler to look in the relative include paths, which often works.
  const replacement = '#import "RCTBridgeModule.h"'; 

  if (fileContent.match(targetPattern)) {
    console.log('[RNFBAnalyticsPatch] Patching RNFBAnalyticsModule.h import path.');
    return fileContent.replace(targetPattern, replacement);
  }
  
  // If the file is still using the old path (unlikely, but a good check):
  const oldTargetPattern = /#import <React\/RCTBridgeModule.h>/g;
  if (fileContent.match(oldTargetPattern)) {
    console.log('[RNFBAnalyticsPatch] Patching legacy RNFBAnalyticsModule.h import path.');
    return fileContent.replace(oldTargetPattern, replacement);
  }

  return fileContent;
}

const withAnalyticsSourcePatch = (config) =>
  withDangerousMod(config, [
    'ios',
    async (cfg) => {
      const root = cfg.modRequest.projectRoot;
      const headerPath = path.join(root, ANALYTICS_HEADER_PATH);
      
      if (!fs.existsSync(headerPath)) {
        console.warn(`[RNFBAnalyticsPatch] Could not find file at: ${headerPath}. Skipping patch.`);
        return cfg;
      }
      
      const original = fs.readFileSync(headerPath, 'utf8');
      const updated = patchAnalyticsHeader(original);
      
      if (updated !== original) {
        fs.writeFileSync(headerPath, updated);
        console.log(`[RNFBAnalyticsPatch] Successfully applied source code patch to ${path.basename(headerPath)}.`);
      }
      return cfg;
    },
  ]);

module.exports = createRunOncePlugin(
  withAnalyticsSourcePatch,
  'with-rnfb-analytics-source-patch',
  '1.0.0'
);