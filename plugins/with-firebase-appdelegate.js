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

      // Add Firebase import if missing
      if (!hasFirebaseImport) {
        // Add Firebase import right after ReactAppDependencyProvider
        if (appDelegateContent.includes('import ReactAppDependencyProvider')) {
          appDelegateContent = appDelegateContent.replace(
            /(import ReactAppDependencyProvider\n)/,
            '$1import Firebase\n'
          );
          console.log('✓ Firebase AppDelegate: Added import Firebase after ReactAppDependencyProvider');
        } else if (appDelegateContent.includes('import React')) {
          // Fallback: add after React import
          appDelegateContent = appDelegateContent.replace(
            /(import React\n)/,
            '$1import Firebase\n'
          );
          console.log('✓ Firebase AppDelegate: Added import Firebase after React');
        } else {
          // Last resort: add at the top of imports
          appDelegateContent = appDelegateContent.replace(
            /(import\s+\w+\n)/,
            '$1import Firebase\n'
          );
          console.log('✓ Firebase AppDelegate: Added import Firebase');
        }
        modified = true;
      }

      // Ensure FirebaseApp.configure() is at the beginning of didFinishLaunchingWithOptions
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
          
          // Check if FirebaseApp.configure() already exists in the method
          const methodBody = appDelegateContent.substring(methodStart);
          const hasConfigureInMethod = /FirebaseApp\.configure\(\)/.test(methodBody);
          
          // Check if it's already at the beginning (within first 3 lines)
          const firstFewLines = methodBody.split('\n').slice(0, 3).join('\n');
          const isAtBeginning = /FirebaseApp\.configure\(\)/.test(firstFewLines);
          
          if (!hasConfigureInMethod) {
            // Add FirebaseApp.configure() at the beginning
            appDelegateContent = 
              appDelegateContent.substring(0, firstLineStart) +
              `FirebaseApp.configure()\n${indent}` +
              appDelegateContent.substring(firstLineStart);
            modified = true;
            console.log('✓ Firebase AppDelegate: Added FirebaseApp.configure() at beginning of didFinishLaunchingWithOptions');
          } else if (!isAtBeginning) {
            // Remove existing FirebaseApp.configure() (including generated comments)
            appDelegateContent = appDelegateContent.replace(
              /\/\/ @generated begin @react-native-firebase\/app-didFinishLaunchingWithOptions[^]*?\/\/ @generated end @react-native-firebase\/app-didFinishLaunchingWithOptions\s*\n?/g,
              ''
            );
            appDelegateContent = appDelegateContent.replace(/^\s*FirebaseApp\.configure\(\)\s*\n/gm, '');
            
            // Add it at the beginning
            appDelegateContent = 
              appDelegateContent.substring(0, firstLineStart) +
              `FirebaseApp.configure()\n${indent}` +
              appDelegateContent.substring(firstLineStart);
            modified = true;
            console.log('✓ Firebase AppDelegate: Moved FirebaseApp.configure() to beginning of didFinishLaunchingWithOptions');
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

