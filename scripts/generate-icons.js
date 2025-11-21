const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const iconSvgPath = path.join(__dirname, '../assets/images/icon-logo.svg');
const outputDir = path.join(__dirname, '../assets/images');

// Ensure output directory exists
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

async function generateIcon(size, filename) {
  try {
    await sharp(iconSvgPath)
      .resize(size, size)
      .png()
      .toFile(path.join(outputDir, filename));
    console.log(`✓ Generated ${filename} (${size}x${size})`);
  } catch (error) {
    console.error(`✗ Error generating ${filename}:`, error.message);
  }
}

async function generateAndroidForeground() {
  // Android adaptive icon foreground (should be 1024x1024, with safe zone of 768x768)
  try {
    // Create a transparent background with the circles centered in the safe zone
    const svg = `
      <svg width="1024" height="1024" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <radialGradient id="circle1Grad" cx="40%" cy="50%">
            <stop offset="0%" style="stop-color:#F0F4F8;stop-opacity:0.6" />
            <stop offset="70%" style="stop-color:#D0E0F0;stop-opacity:0.4" />
            <stop offset="100%" style="stop-color:#A8C5E2;stop-opacity:0.2" />
          </radialGradient>
          <radialGradient id="circle2Grad" cx="60%" cy="50%">
            <stop offset="0%" style="stop-color:#F0F4F8;stop-opacity:0.6" />
            <stop offset="70%" style="stop-color:#D0E0F0;stop-opacity:0.4" />
            <stop offset="100%" style="stop-color:#A8C5E2;stop-opacity:0.2" />
          </radialGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="8" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
        <circle cx="420" cy="512" r="280" fill="url(#circle1Grad)" filter="url(#glow)" opacity="0.85"/>
        <circle cx="604" cy="512" r="280" fill="url(#circle2Grad)" filter="url(#glow)" opacity="0.75"/>
      </svg>
    `;
    
    await sharp(Buffer.from(svg))
      .resize(1024, 1024)
      .png()
      .toFile(path.join(outputDir, 'android-icon-foreground.png'));
    console.log('✓ Generated android-icon-foreground.png (1024x1024)');
  } catch (error) {
    console.error('✗ Error generating android-icon-foreground.png:', error.message);
  }
}

async function generateAndroidBackground() {
  // Android adaptive icon background (solid color)
  try {
    const svg = `
      <svg width="1024" height="1024" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="bgGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:#101A3D;stop-opacity:1" />
            <stop offset="100%" style="stop-color:#1a2a5c;stop-opacity:1" />
          </linearGradient>
        </defs>
        <rect width="1024" height="1024" fill="url(#bgGradient)"/>
      </svg>
    `;
    
    await sharp(Buffer.from(svg))
      .resize(1024, 1024)
      .png()
      .toFile(path.join(outputDir, 'android-icon-background.png'));
    console.log('✓ Generated android-icon-background.png (1024x1024)');
  } catch (error) {
    console.error('✗ Error generating android-icon-background.png:', error.message);
  }
}

async function generateAndroidMonochrome() {
  // Android monochrome icon (simplified version)
  try {
    const svg = `
      <svg width="1024" height="1024" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <filter id="glow">
            <feGaussianBlur stdDeviation="8" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
        <circle cx="420" cy="512" r="280" fill="white" filter="url(#glow)" opacity="0.6"/>
        <circle cx="604" cy="512" r="280" fill="white" filter="url(#glow)" opacity="0.5"/>
      </svg>
    `;
    
    await sharp(Buffer.from(svg))
      .resize(1024, 1024)
      .png()
      .toFile(path.join(outputDir, 'android-icon-monochrome.png'));
    console.log('✓ Generated android-icon-monochrome.png (1024x1024)');
  } catch (error) {
    console.error('✗ Error generating android-icon-monochrome.png:', error.message);
  }
}

async function generateAllIcons() {
  console.log('Generating app icons...\n');
  
  // Main app icon (1024x1024)
  await generateIcon(1024, 'icon.png');
  
  // Splash icon (if needed, same as main icon)
  await generateIcon(1024, 'splash-icon.png');
  
  // Android icons
  await generateAndroidForeground();
  await generateAndroidBackground();
  await generateAndroidMonochrome();
  
  // Favicon (512x512)
  await generateIcon(512, 'favicon.png');
  
  console.log('\n✓ All icons generated successfully!');
}

generateAllIcons().catch(console.error);

