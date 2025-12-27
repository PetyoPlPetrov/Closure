#!/usr/bin/env node

/**
 * Script to download fake entity images for Sferas app
 * Downloads realistic placeholder images for people, companies, and life moments
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

const outputDir = path.join(__dirname, '../assets/images');

// Ensure directory exists
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Entity image mappings with appropriate image sources
const entityImages = {
  // Profiles (Relationships) - Use portraits of people
  'Mark Johnson': { type: 'person', gender: 'male', id: 22, filename: 'fake-profile-mark.jpg' },
  'Emma Williams': { type: 'person', gender: 'female', id: 47, filename: 'fake-profile-emma.jpg' },
  'Olivia Brown': { type: 'person', gender: 'female', id: 65, filename: 'fake-profile-olivia.jpg' },
  'Sophia Martinez': { type: 'person', gender: 'female', id: 8, filename: 'fake-profile-sophia.jpg' },
  'James Wilson': { type: 'person', gender: 'male', id: 91, filename: 'fake-profile-james.jpg' },

  // Jobs (Career) - Use company/tech office images
  'Software Developer at TechCorp': { type: 'tech-logo', id: 1, filename: 'fake-job-techcorp.jpg' },
  'Senior Developer at StartupXYZ': { type: 'tech-logo', id: 2, filename: 'fake-job-startup.jpg' },
  'Lead Engineer at CurrentCompany': { type: 'tech-logo', id: 3, filename: 'fake-job-current.jpg' },
  'Junior Developer at WebSolutions': { type: 'tech-logo', id: 4, filename: 'fake-job-websolutions.jpg' },
  'Full Stack Developer at DigitalAgency': { type: 'tech-logo', id: 5, filename: 'fake-job-digitalagency.jpg' },

  // Family Members - Use portraits
  'Sarah Johnson': { type: 'person', gender: 'female', id: 31, filename: 'fake-family-sarah.jpg' },
  'Michael Johnson': { type: 'person', gender: 'male', id: 58, filename: 'fake-family-michael.jpg' },
  'Maria Johnson': { type: 'person', gender: 'female', id: 12, filename: 'fake-family-maria.jpg' },
  'Robert Johnson': { type: 'person', gender: 'male', id: 76, filename: 'fake-family-robert.jpg' },
  'Emily Johnson': { type: 'person', gender: 'female', id: 44, filename: 'fake-family-emily.jpg' },

  // Friends - Use portraits
  'Alex Thompson': { type: 'person', gender: 'male', id: 33, filename: 'fake-friend-alex.jpg' },
  'Jessica Martinez': { type: 'person', gender: 'female', id: 19, filename: 'fake-friend-jessica.jpg' },
  'David Chen': { type: 'person', gender: 'male', id: 52, filename: 'fake-friend-david.jpg' },
  'Sophie Anderson': { type: 'person', gender: 'female', id: 81, filename: 'fake-friend-sophie.jpg' },
  'Ryan Taylor': { type: 'person', gender: 'male', id: 67, filename: 'fake-friend-ryan.jpg' },
  'Maya Patel': { type: 'person', gender: 'female', id: 25, filename: 'fake-friend-maya.jpg' },

  // Hobbies - Use activity-specific images
  'Photography': { type: 'hobby', activity: 'camera', id: 1, filename: 'fake-hobby-photography.jpg' },
  'Reading': { type: 'hobby', activity: 'book', id: 2, filename: 'fake-hobby-reading.jpg' },
  'Cooking': { type: 'hobby', activity: 'cooking', id: 3, filename: 'fake-hobby-cooking.jpg' },
  'Hiking': { type: 'hobby', activity: 'nature', id: 4, filename: 'fake-hobby-hiking.jpg' },
  'Yoga': { type: 'hobby', activity: 'yoga', id: 5, filename: 'fake-hobby-yoga.jpg' },
  'Painting': { type: 'hobby', activity: 'art', id: 6, filename: 'fake-hobby-painting.jpg' },

  // Life Moment/Memory Images - diverse life experiences
  'memory-1': { type: 'moment', theme: 'travel', id: 1, filename: 'fake-memory-1.jpg' },
  'memory-2': { type: 'moment', theme: 'celebration', id: 2, filename: 'fake-memory-2.jpg' },
  'memory-3': { type: 'moment', theme: 'nature', id: 3, filename: 'fake-memory-3.jpg' },
  'memory-4': { type: 'moment', theme: 'food', id: 4, filename: 'fake-memory-4.jpg' },
  'memory-5': { type: 'moment', theme: 'urban', id: 5, filename: 'fake-memory-5.jpg' },
  'memory-6': { type: 'moment', theme: 'sunset', id: 6, filename: 'fake-memory-6.jpg' },
  'memory-7': { type: 'moment', theme: 'indoor', id: 7, filename: 'fake-memory-7.jpg' },
  'memory-8': { type: 'moment', theme: 'outdoor', id: 8, filename: 'fake-memory-8.jpg' },
  'memory-9': { type: 'moment', theme: 'beach', id: 9, filename: 'fake-memory-9.jpg' },
  'memory-10': { type: 'moment', theme: 'mountain', id: 10, filename: 'fake-memory-10.jpg' },
  'memory-11': { type: 'moment', theme: 'city', id: 11, filename: 'fake-memory-11.jpg' },
  'memory-12': { type: 'moment', theme: 'night', id: 12, filename: 'fake-memory-12.jpg' },
};

/**
 * Download an image from URL with proper error handling
 */
function downloadImage(url, filepath) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(filepath);

    https.get(url, (response) => {
      // Check if response is actually an image
      const contentType = response.headers['content-type'];
      if (contentType && !contentType.startsWith('image/')) {
        fs.unlink(filepath, () => {});
        reject(new Error(`Invalid content type: ${contentType}`));
        return;
      }

      if (response.statusCode === 302 || response.statusCode === 301) {
        // Follow redirect
        const redirectUrl = response.headers.location;
        https.get(redirectUrl, (redirectResponse) => {
          const redirectContentType = redirectResponse.headers['content-type'];
          if (redirectContentType && !redirectContentType.startsWith('image/')) {
            fs.unlink(filepath, () => {});
            reject(new Error(`Invalid redirect content type: ${redirectContentType}`));
            return;
          }
          redirectResponse.pipe(file);
          file.on('finish', () => {
            file.close();
            resolve();
          });
        }).on('error', reject);
      } else if (response.statusCode === 200) {
        response.pipe(file);
        file.on('finish', () => {
          file.close();
          resolve();
        });
      } else {
        fs.unlink(filepath, () => {});
        reject(new Error(`HTTP ${response.statusCode}`));
      }
    }).on('error', (err) => {
      fs.unlink(filepath, () => {}); // Delete the file on error
      reject(err);
    });
  });
}

/**
 * Generate image URL based on entity type
 */
function getImageUrl(config) {
  if (config.type === 'person') {
    // Use RandomUser.me API for realistic person portraits
    // It provides high-quality portraits with natural faces
    const gender = config.gender === 'male' ? 'men' : 'women';
    const id = config.id % 100; // RandomUser has portraits 0-99
    return `https://randomuser.me/api/portraits/${gender}/${id}.jpg`;
  }

  if (config.type === 'tech-logo') {
    // Use UI Avatars for company logos - generates letter-based logos
    // This creates consistent, professional-looking company logos
    const companyNames = {
      1: 'TechCorp',
      2: 'StartupXYZ',
      3: 'CurrentCo',
      4: 'WebSolutions',
      5: 'DigitalAgency',
    };
    const companyName = companyNames[config.id] || 'Company';
    // UI Avatars API creates letter-based logos (like Slack, Google Workspace)
    // Format: background color / text color / bold / size / name
    const colors = [
      { bg: '3498db', fg: 'fff' }, // Blue
      { bg: 'e74c3c', fg: 'fff' }, // Red
      { bg: '2ecc71', fg: 'fff' }, // Green
      { bg: '9b59b6', fg: 'fff' }, // Purple
      { bg: 'f39c12', fg: 'fff' }, // Orange
    ];
    const color = colors[config.id - 1] || colors[0];
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(companyName)}&size=400&background=${color.bg}&color=${color.fg}&bold=true&format=png`;
  }

  if (config.type === 'hobby') {
    // Use Picsum Photos with activity-themed images
    // Seeds 500-599 tend to have creative/activity imagery
    const activitySeeds = {
      'camera': 550,
      'book': 525,
      'cooking': 575,
      'nature': 510,
      'yoga': 540,
      'art': 560,
    };
    const baseSeed = activitySeeds[config.activity] || 500;
    const seed = baseSeed + (config.id % 10);
    return `https://picsum.photos/seed/${seed}/400/400`;
  }

  if (config.type === 'moment') {
    // Use Picsum Photos with life moment themed images
    // Different themes for diverse memory types
    const themeSeeds = {
      'travel': 100,
      'celebration': 120,
      'nature': 140,
      'food': 160,
      'urban': 180,
      'sunset': 200,
      'indoor': 220,
      'outdoor': 240,
      'beach': 260,
      'mountain': 280,
      'city': 300,
      'night': 320,
    };
    const baseSeed = themeSeeds[config.theme] || 100;
    const seed = baseSeed + (config.id % 20);
    return `https://picsum.photos/seed/${seed}/400/400`;
  }

  // Fallback
  return `https://picsum.photos/seed/${config.id || 0}/400/400`;
}

/**
 * Download all entity images
 */
async function downloadAllImages() {
  console.log('📥 Downloading fake entity images for Sferas...\n');
  console.log('   - Person portraits from RandomUser.me');
  console.log('   - Company/hobby images from Picsum Photos\n');

  const entries = Object.entries(entityImages);
  let successCount = 0;
  let failCount = 0;

  for (const [entityName, config] of entries) {
    const url = getImageUrl(config);
    const filepath = path.join(outputDir, config.filename);

    try {
      console.log(`Downloading: ${entityName}`);
      console.log(`  → ${config.filename} (${config.type})`);
      await downloadImage(url, filepath);
      console.log(`  ✓ Success\n`);
      successCount++;

      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (error) {
      console.error(`  ✗ Failed: ${error.message}\n`);
      failCount++;
    }
  }

  console.log('\n📊 Summary:');
  console.log(`✓ Successfully downloaded: ${successCount}`);
  console.log(`✗ Failed: ${failCount}`);
  console.log(`\n📁 Images saved to: ${outputDir}`);

  if (failCount > 0) {
    console.log('\n⚠️  Some images failed to download. You may need to run the script again.');
    process.exit(1);
  } else {
    console.log('\n✅ All images downloaded successfully!');
  }
}

// Run the script
downloadAllImages().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
