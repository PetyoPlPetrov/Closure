/**
 * WCAG 2.0 Accessibility Contrast Checker
 * Checks if color combinations meet WCAG AA standards (4.5:1 for normal text, 3:1 for large text)
 */

// Theme colors from constants/theme.ts
const colors = {
  light: {
    text: '#11181C',
    background: '#F2F2F2',
    tint: '#166E2D',
    icon: '#404548',
    tabIconDefault: '#404548',
    tabIconSelected: '#166E2D',
    primary: '#166E2D',
    primaryLight: '#7dd3fc',
    primaryDark: '#0c4a6e',
    error: '#C41E1E',
  },
  dark: {
    text: '#F8FAFC',
    background: '#060A14',
    textHighEmphasis: '#FFFFFF',
    textMediumEmphasis: '#9CAEC4',
    textDisabled: '#657C95',
    tint: '#34D399',
    primary: '#10B981',
    primaryLight: '#34D399',
    primaryDark: '#059669',
    primaryText: '#060A14',
    icon: '#F8FAFC',
    tabIconDefault: '#657C95',
    tabIconSelected: '#34D399',
    error: '#EF4444',
    surface: '#060A14',
    surfaceElevated1: '#101A2C',
    surfaceElevated2: '#172438',
    surfaceElevated4: '#213048',
    surfaceElevated8: '#2C3E58',
  },
};

/**
 * Convert hex color to RGB
 */
function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
}

/**
 * Convert RGBA string to RGB object
 */
function rgbaToRgb(rgba) {
  const match = rgba.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*[\d.]+)?\)/);
  if (match) {
    return {
      r: parseInt(match[1]),
      g: parseInt(match[2]),
      b: parseInt(match[3]),
    };
  }
  return null;
}

/**
 * Get RGB from any color format
 */
function parseColor(color) {
  if (color.startsWith('#')) {
    return hexToRgb(color);
  } else if (color.startsWith('rgb')) {
    return rgbaToRgb(color);
  }
  return null;
}

/**
 * Calculate relative luminance
 * https://www.w3.org/TR/WCAG20/#relativeluminancedef
 */
function getLuminance(rgb) {
  const rsRGB = rgb.r / 255;
  const gsRGB = rgb.g / 255;
  const bsRGB = rgb.b / 255;

  const r = rsRGB <= 0.03928 ? rsRGB / 12.92 : Math.pow((rsRGB + 0.055) / 1.055, 2.4);
  const g = gsRGB <= 0.03928 ? gsRGB / 12.92 : Math.pow((gsRGB + 0.055) / 1.055, 2.4);
  const b = bsRGB <= 0.03928 ? bsRGB / 12.92 : Math.pow((bsRGB + 0.055) / 1.055, 2.4);

  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * Calculate contrast ratio
 * https://www.w3.org/TR/WCAG20/#contrast-ratiodef
 */
function getContrastRatio(color1, color2) {
  const rgb1 = parseColor(color1);
  const rgb2 = parseColor(color2);

  if (!rgb1 || !rgb2) {
    return 0;
  }

  const lum1 = getLuminance(rgb1);
  const lum2 = getLuminance(rgb2);

  const lighter = Math.max(lum1, lum2);
  const darker = Math.min(lum1, lum2);

  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Check if contrast ratio meets WCAG AA standards
 */
function meetsWCAG_AA(ratio, isLargeText = false) {
  const threshold = isLargeText ? 3.0 : 4.5;
  return ratio >= threshold;
}

/**
 * Check if contrast ratio meets WCAG AAA standards
 */
function meetsWCAG_AAA(ratio, isLargeText = false) {
  const threshold = isLargeText ? 4.5 : 7.0;
  return ratio >= threshold;
}

/**
 * Format contrast check result
 */
function formatResult(fg, bg, ratio, isLargeText = false) {
  const aa = meetsWCAG_AA(ratio, isLargeText);
  const aaa = meetsWCAG_AAA(ratio, isLargeText);

  const passIcon = '✅';
  const failIcon = '❌';

  return {
    foreground: fg,
    background: bg,
    ratio: ratio.toFixed(2),
    aa: aa ? passIcon : failIcon,
    aaa: aaa ? passIcon : failIcon,
    passes: aa,
  };
}

/**
 * Main accessibility check
 */
function checkAccessibility() {
  console.log('\n🎨 WCAG 2.0 Accessibility Contrast Report\n');
  console.log('━'.repeat(100));
  console.log('\nStandards:');
  console.log('  - WCAG AA: 4.5:1 (normal text), 3:1 (large text 18pt+)');
  console.log('  - WCAG AAA: 7:1 (normal text), 4.5:1 (large text 18pt+)');
  console.log('━'.repeat(100));

  const results = {
    light: [],
    dark: [],
  };

  // Test Dark Mode combinations
  console.log('\n🌙 DARK MODE\n');

  const darkTests = [
    { fg: 'textHighEmphasis', bg: 'background', desc: 'High emphasis text on background', large: false },
    { fg: 'textMediumEmphasis', bg: 'background', desc: 'Medium emphasis text on background', large: false },
    { fg: 'textDisabled', bg: 'background', desc: 'Disabled text on background', large: false },
    { fg: 'text', bg: 'background', desc: 'Pure white text on background', large: false },
    { fg: 'primary', bg: 'background', desc: 'Primary color on background', large: false },
    { fg: 'error', bg: 'background', desc: 'Error text on background', large: false },
    { fg: 'textHighEmphasis', bg: 'surface', desc: 'High emphasis text on surface', large: false },
    { fg: 'textHighEmphasis', bg: 'surfaceElevated1', desc: 'High emphasis text on elevated surface 1', large: false },
    { fg: 'textHighEmphasis', bg: 'surfaceElevated2', desc: 'High emphasis text on elevated surface 2', large: false },
    { fg: 'textHighEmphasis', bg: 'surfaceElevated4', desc: 'High emphasis text on elevated surface 4', large: false },
    { fg: 'textHighEmphasis', bg: 'surfaceElevated8', desc: 'High emphasis text on elevated surface 8', large: false },
    { fg: 'background', bg: 'primary', desc: 'Background on primary (buttons)', large: true },
    { fg: 'primaryText', bg: 'primary', desc: 'Dark text on primary (buttons)', large: false },
  ];

  darkTests.forEach(test => {
    const fg = colors.dark[test.fg];
    const bg = colors.dark[test.bg];
    const ratio = getContrastRatio(fg, bg);
    const result = formatResult(fg, bg, ratio, test.large);
    results.dark.push({ ...result, description: test.desc, isLargeText: test.large });

    const size = test.large ? '(large text)' : '(normal text)';
    console.log(`${result.passes ? '✅' : '❌'} ${test.desc} ${size}`);
    console.log(`   Foreground: ${fg}`);
    console.log(`   Background: ${bg}`);
    console.log(`   Ratio: ${result.ratio}:1 | AA: ${result.aa} | AAA: ${result.aaa}`);
    console.log('');
  });

  // Test Light Mode combinations
  console.log('\n☀️  LIGHT MODE\n');

  const lightTests = [
    { fg: 'text', bg: 'background', desc: 'Text on background', large: false },
    { fg: 'primary', bg: 'background', desc: 'Primary color on background', large: false },
    { fg: 'error', bg: 'background', desc: 'Error text on background', large: false },
    { fg: 'icon', bg: 'background', desc: 'Icons on background', large: false },
    { fg: 'background', bg: 'primary', desc: 'Background on primary (buttons)', large: true },
    { fg: 'background', bg: 'primary', desc: 'Light background text on primary (buttons)', large: false },
  ];

  lightTests.forEach(test => {
    const fg = colors.light[test.fg];
    const bg = colors.light[test.bg];
    const ratio = getContrastRatio(fg, bg);
    const result = formatResult(fg, bg, ratio, test.large);
    results.light.push({ ...result, description: test.desc, isLargeText: test.large });

    const size = test.large ? '(large text)' : '(normal text)';
    console.log(`${result.passes ? '✅' : '❌'} ${test.desc} ${size}`);
    console.log(`   Foreground: ${fg}`);
    console.log(`   Background: ${bg}`);
    console.log(`   Ratio: ${result.ratio}:1 | AA: ${result.aa} | AAA: ${result.aaa}`);
    console.log('');
  });

  // Summary
  console.log('━'.repeat(100));
  console.log('\n📊 SUMMARY\n');

  const darkPassed = results.dark.filter(r => r.passes).length;
  const darkTotal = results.dark.length;
  const lightPassed = results.light.filter(r => r.passes).length;
  const lightTotal = results.light.length;

  console.log(`Dark Mode:  ${darkPassed}/${darkTotal} tests passed (${((darkPassed/darkTotal)*100).toFixed(1)}%)`);
  console.log(`Light Mode: ${lightPassed}/${lightTotal} tests passed (${((lightPassed/lightTotal)*100).toFixed(1)}%)`);

  const totalPassed = darkPassed + lightPassed;
  const totalTests = darkTotal + lightTotal;
  console.log(`\nOverall:    ${totalPassed}/${totalTests} tests passed (${((totalPassed/totalTests)*100).toFixed(1)}%)`);

  // Failed tests
  const darkFailed = results.dark.filter(r => !r.passes);
  const lightFailed = results.light.filter(r => !r.passes);

  if (darkFailed.length > 0 || lightFailed.length > 0) {
    console.log('\n⚠️  FAILED TESTS:\n');

    if (darkFailed.length > 0) {
      console.log('Dark Mode:');
      darkFailed.forEach(result => {
        console.log(`  ❌ ${result.description}`);
        console.log(`     Ratio: ${result.ratio}:1 (needs ${result.isLargeText ? '3.0' : '4.5'}:1)`);
      });
      console.log('');
    }

    if (lightFailed.length > 0) {
      console.log('Light Mode:');
      lightFailed.forEach(result => {
        console.log(`  ❌ ${result.description}`);
        console.log(`     Ratio: ${result.ratio}:1 (needs ${result.isLargeText ? '3.0' : '4.5'}:1)`);
      });
    }
  }

  console.log('\n━'.repeat(100));
  console.log('');

  // Exit with error code if any tests failed
  process.exit(totalPassed === totalTests ? 0 : 1);
}

// Run the check
checkAccessibility();
