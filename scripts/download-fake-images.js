#!/usr/bin/env node

/**
 * Script to download fake entity images for the fake data generation
 * Downloads images from Unsplash and saves them to assets/images
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

const outputDir = path.join(__dirname, '../assets/images');

// Ensure directory exists
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Entity image mappings - each entity gets a specific image
const entityImages = {
  // Profiles (Relationships)
  'Mark Johnson': { category: 'couple,romance,people', filename: 'fake-profile-mark.jpg' },
  'Emma Williams': { category: 'couple,romance,people', filename: 'fake-profile-emma.jpg' },
  'Olivia Brown': { category: 'couple,romance,people', filename: 'fake-profile-olivia.jpg' },
  
  // Jobs (Career)
  'Software Developer at TechCorp': { category: 'office,business,workplace', filename: 'fake-job-techcorp.jpg' },
  'Senior Developer at StartupXYZ': { category: 'office,business,workplace', filename: 'fake-job-startup.jpg' },
  'Lead Engineer at CurrentCompany': { category: 'office,business,workplace', filename: 'fake-job-current.jpg' },
  
  // Family Members
  'Sarah Johnson': { category: 'family,people,portrait', filename: 'fake-family-sarah.jpg' },
  'Michael Johnson': { category: 'family,people,portrait', filename: 'fake-family-michael.jpg' },
  'Maria Johnson': { category: 'family,people,portrait', filename: 'fake-family-maria.jpg' },
  
  // Friends
  'Alex Thompson': { category: 'friends,people,group', filename: 'fake-friend-alex.jpg' },
  'Jessica Martinez': { category: 'friends,people,group', filename: 'fake-friend-jessica.jpg' },
  'David Chen': { category: 'friends,people,group', filename: 'fake-friend-david.jpg' },
  'Sophie Anderson': { category: 'friends,people,group', filename: 'fake-friend-sophie.jpg' },
  
  // Hobbies
  'Photography': { category: 'hobby,activity,creative', filename: 'fake-hobby-photography.jpg' },
  'Reading': { category: 'hobby,activity,creative', filename: 'fake-hobby-reading.jpg' },
  'Cooking': { category: 'hobby,activity,creative', filename: 'fake-hobby-cooking.jpg' },
  'Hiking': { category: 'hobby,activity,creative', filename: 'fake-hobby-hiking.jpg' },
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
        https.get(response.headers.location, (redirectResponse) => {
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
 * Generate image URL based on category
 * For people (profiles, family, friends): Use RandomUser.me API for real people faces
 * For jobs and hobbies: Use Picsum Photos for appropriate category images
 */
function getImageUrl(entityName, category) {
  // Create a hash from entity name for consistent image selection
  const hash = entityName.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  
  // For people categories (profiles, family, friends), use RandomUser.me API
  // This provides real people photos with faces
  const peopleCategories = ['couple,romance,people', 'family,people,portrait', 'friends,people,group'];
  
  if (peopleCategories.includes(category)) {
    // Use RandomUser.me API - it provides real people photos with faces
    // Use hash to get consistent person per entity name
    // RandomUser provides portraits in different sizes: thumbnail (128), medium (256), large (512)
    const seed = hash % 100; // RandomUser has portraits 0-99
    const gender = hash % 2 === 0 ? 'men' : 'women';
    // Use 'med' for medium size (256x256) - better quality than thumbnail
    return `https://randomuser.me/api/portraits/${gender}/${seed}.jpg`;
  }
  
  // For jobs and hobbies, use Picsum Photos with category-specific seeds
  const categorySeeds = {
    'office,business,workplace': 200,
    'hobby,activity,creative': 500,
  };
  
  const seed = categorySeeds[category] + (hash % 100);
  return `https://picsum.photos/seed/${seed}/400/400`;
}

/**
 * Download all entity images
 */
async function downloadAllImages() {
  console.log('📥 Downloading fake entity images...\n');
  
  const entries = Object.entries(entityImages);
  let successCount = 0;
  let failCount = 0;
  
  for (const [entityName, config] of entries) {
    const url = getImageUrl(entityName, config.category);
    const filepath = path.join(outputDir, config.filename);
    
    try {
      console.log(`Downloading: ${entityName} -> ${config.filename}`);
      await downloadImage(url, filepath);
      console.log(`✓ Success: ${config.filename}\n`);
      successCount++;
      
      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (error) {
      console.error(`✗ Failed: ${config.filename} - ${error.message}\n`);
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
  }
}

// Run the script
downloadAllImages().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});

