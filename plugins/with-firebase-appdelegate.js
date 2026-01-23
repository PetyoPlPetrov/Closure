// plugins/with-firebase-appdelegate.js
const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

/**
 * Expo config plugin to ensure Firebase import and FirebaseApp.configure() 
 * are present in AppDelegate.swift at the correct locations
 */
const withFirebaseAppDelegate = (config) => {
  return withDangerousMod(config, [
    'ios',
    async (config) => {
      const platformProjectRoot = config.modRequest.platformProjectRoot;
      const appDelegatePath = path.join(
        platformProjectRoot,
        config.modRequest.projectName || 'Sferas',
        'AppDelegate.swift'
      );

      if (!fs.existsSync(appDelegatePath)) {
        console.warn(`⚠️  Firebase AppDelegate: File not found at ${appDelegatePath}`);
        return config;
      }

      let appDelegateContent = fs.readFileSync(appDelegatePath, 'utf8');
      let modified = false;

      // Check if Firebase import exists
      const hasFirebaseImport = /import\s+Firebase/.test(appDelegateContent);
      const hasRNFBAppCheckImport = /import\s+RNFBAppCheck/.test(appDelegateContent);
      const hasFirebaseCoreImport = /import\s+FirebaseCore/.test(appDelegateContent);

      // Add Firebase imports if missing
      if (!hasFirebaseImport || !hasRNFBAppCheckImport || !hasFirebaseCoreImport) {
        // Add imports right after UIKit import
        if (appDelegateContent.includes('import UIKit')) {
          let importsToAdd = '';
          if (!hasRNFBAppCheckImport) {
            importsToAdd += 'import RNFBAppCheck\n';
          }
          if (!hasFirebaseCoreImport) {
            importsToAdd += 'import FirebaseCore\n';
          }
          if (!hasFirebaseImport) {
            importsToAdd += 'import Firebase\n';
          }
          
          if (importsToAdd) {
            appDelegateContent = appDelegateContent.replace(
              /(import UIKit\n)/,
              `$1${importsToAdd}`
            );
            console.log('✓ Firebase AppDelegate: Added App Check imports');
            modified = true;
          }
        } else if (appDelegateContent.includes('import ReactAppDependencyProvider')) {
          // Fallback: add after ReactAppDependencyProvider
          let importsToAdd = '';
          if (!hasRNFBAppCheckImport) {
            importsToAdd += 'import RNFBAppCheck\n';
          }
          if (!hasFirebaseCoreImport) {
            importsToAdd += 'import FirebaseCore\n';
          }
      if (!hasFirebaseImport) {
            importsToAdd += 'import Firebase\n';
          }
          
          if (importsToAdd) {
          appDelegateContent = appDelegateContent.replace(
            /(import ReactAppDependencyProvider\n)/,
              `$1${importsToAdd}`
          );
            console.log('✓ Firebase AppDelegate: Added App Check imports after ReactAppDependencyProvider');
            modified = true;
          }
        }
      }

      // Ensure App Check initialization and FirebaseApp.configure() are at the beginning of didFinishLaunchingWithOptions
      const methodPattern = /(override func application\s*\([^)]+didFinishLaunchingWithOptions[^)]+\)\s*->\s*Bool\s*\{)/;
      const methodMatch = appDelegateContent.match(methodPattern);
      
      if (methodMatch) {
        const methodStart = methodMatch.index + methodMatch[0].length;
        const afterMethodStart = appDelegateContent.substring(methodStart);
        
        // Find the first non-whitespace line after method start
        const firstLineMatch = afterMethodStart.match(/^(\s*)/);
        if (firstLineMatch) {
          const indent = firstLineMatch[1];
          const firstLineStart = methodStart + firstLineMatch[0].length;
          
          // Check if initialization code already exists in the method
          const methodBody = appDelegateContent.substring(methodStart);
          const hasRNFBAppCheckInit = /RNFBAppCheckModule\.sharedInstance\(\)/.test(methodBody);
          const hasConfigureInMethod = /FirebaseApp\.configure\(\)/.test(methodBody);
          
          // Check if they're already at the beginning (within first 5 lines)
          const firstFewLines = methodBody.split('\n').slice(0, 5).join('\n');
          const isRNFBAppCheckAtBeginning = /RNFBAppCheckModule\.sharedInstance\(\)/.test(firstFewLines);
          const isConfigureAtBeginning = /FirebaseApp\.configure\(\)/.test(firstFewLines);
          
          // Build initialization code
          let initCode = '';
          if (!hasRNFBAppCheckInit) {
            initCode += `RNFBAppCheckModule.sharedInstance()\n${indent}`;
          }
          if (!hasConfigureInMethod) {
            initCode += `FirebaseApp.configure()\n${indent}`;
          }
          
          if (initCode) {
            // Add initialization code at the beginning
            appDelegateContent = 
              appDelegateContent.substring(0, firstLineStart) +
              initCode +
              appDelegateContent.substring(firstLineStart);
            modified = true;
            console.log('✓ Firebase AppDelegate: Added App Check initialization at beginning of didFinishLaunchingWithOptions');
          } else if (!isRNFBAppCheckAtBeginning || !isConfigureAtBeginning) {
            // Remove existing initialization code (including generated comments)
            appDelegateContent = appDelegateContent.replace(
              /\/\/ @generated begin @react-native-firebase\/app-didFinishLaunchingWithOptions[^]*?\/\/ @generated end @react-native-firebase\/app-didFinishLaunchingWithOptions\s*\n?/g,
              ''
            );
            appDelegateContent = appDelegateContent.replace(/^\s*RNFBAppCheckModule\.sharedInstance\(\)\s*\n/gm, '');
            appDelegateContent = appDelegateContent.replace(/^\s*FirebaseApp\.configure\(\)\s*\n/gm, '');
            
            // Add them at the beginning in correct order
            const reorderedInitCode = `RNFBAppCheckModule.sharedInstance()\n${indent}FirebaseApp.configure()\n${indent}`;
            appDelegateContent = 
              appDelegateContent.substring(0, firstLineStart) +
              reorderedInitCode +
              appDelegateContent.substring(firstLineStart);
            modified = true;
            console.log('✓ Firebase AppDelegate: Reordered App Check initialization at beginning of didFinishLaunchingWithOptions');
          }
        }
      }

      if (modified) {
        fs.writeFileSync(appDelegatePath, appDelegateContent, 'utf8');
        console.log('✓ Firebase AppDelegate: Updated AppDelegate.swift');
      }

      return config;
    },
  ]);
};

module.exports = withFirebaseAppDelegate;

