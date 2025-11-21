const { withDangerousMod, withPlugins } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

/**
 * Expo config plugin to create a transparent splashscreen_logo drawable
 * This ensures the splash screen doesn't show any logo image
 */
const withTransparentSplashLogo = (config) => {
  // Function to create the splash logo file
  const createSplashLogo = (platformProjectRoot) => {
    const drawableDir = path.join(
      platformProjectRoot,
      'app',
      'src',
      'main',
      'res',
      'drawable'
    );

    const splashLogoPath = path.join(drawableDir, 'splashscreen_logo.xml');
    const splashLogoContent = `<?xml version="1.0" encoding="utf-8"?>
<shape xmlns:android="http://schemas.android.com/apk/res/android">
    <solid android:color="@android:color/transparent"/>
</shape>
`;

    try {
      // Ensure parent directories exist
      if (!fs.existsSync(drawableDir)) {
        fs.mkdirSync(drawableDir, { recursive: true });
      }
      
      // Write the file (overwrite if exists)
      fs.writeFileSync(splashLogoPath, splashLogoContent, 'utf8');
      console.log('✓ Created transparent splash logo:', splashLogoPath);
    } catch (error) {
      console.error('✗ Failed to create splash logo:', error.message);
      // Don't throw - just log the error to avoid breaking prebuild
    }
  };

  // Create transparent splash logo drawable
  // Use withDangerousMod to run at the very end, after all other plugins
  config = withDangerousMod(config, [
    'android',
    async (config) => {
      const platformProjectRoot = config.modRequest.platformProjectRoot;
      createSplashLogo(platformProjectRoot);
      return config;
    },
  ]);

  // Also create it again at the very end using a second hook
  // This ensures it persists even if something removes it during prebuild
  config = withDangerousMod(config, [
    'android',
    async (config) => {
      const platformProjectRoot = config.modRequest.platformProjectRoot;
      // Wait a bit longer to ensure this runs absolutely last
      await new Promise(resolve => setTimeout(resolve, 200));
      createSplashLogo(platformProjectRoot);
      
      // Also set up a file watcher/ensure it exists one more time after a delay
      setTimeout(() => {
        try {
          createSplashLogo(platformProjectRoot);
        } catch (e) {
          // Ignore errors in setTimeout
        }
      }, 500);
      
      return config;
    },
  ]);

  return config;
};

module.exports = withTransparentSplashLogo;

