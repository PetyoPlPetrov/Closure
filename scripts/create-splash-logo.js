#!/usr/bin/env node
/**
 * Post-build script to create transparent splash logo drawable
 * This ensures the file exists after prebuild completes
 */

const fs = require('fs');
const path = require('path');

const androidDrawableDir = path.join(
  __dirname,
  '..',
  'android',
  'app',
  'src',
  'main',
  'res',
  'drawable'
);

const splashLogoPath = path.join(androidDrawableDir, 'splashscreen_logo.xml');
const splashLogoContent = `<?xml version="1.0" encoding="utf-8"?>
<shape xmlns:android="http://schemas.android.com/apk/res/android">
    <solid android:color="@android:color/transparent"/>
</shape>
`;

// Only create if android directory exists
if (fs.existsSync(path.join(__dirname, '..', 'android'))) {
  // Ensure directory exists
  if (!fs.existsSync(androidDrawableDir)) {
    fs.mkdirSync(androidDrawableDir, { recursive: true });
  }
  
  // Create or update the file
  fs.writeFileSync(splashLogoPath, splashLogoContent, 'utf8');
  console.log('✓ Created transparent splash logo:', splashLogoPath);
} else {
  console.log('ℹ Android directory does not exist yet. Run "npx expo prebuild" first.');
}

