import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useFontScale } from '@/hooks/use-device-size';
import { useLargeDevice } from '@/hooks/use-large-device';
import { TabScreenContainer } from '@/library/components/tab-screen-container';
import { useJourney } from '@/utils/JourneyProvider';
import { useLanguage } from '@/utils/languages/language-context';
import { useTranslate } from '@/utils/languages/use-translate';
import { useTheme } from '@/utils/ThemeContext';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Asset } from 'expo-asset';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, DimensionValue, Modal, Pressable, ScrollView, StyleSheet, TextStyle, TouchableOpacity, View, ViewStyle } from 'react-native';

export default function SettingsScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'dark'];
  const fontScale = useFontScale();
  const { maxContentWidth } = useLargeDevice();
  const { language, setLanguage } = useLanguage();
  const { themeMode, setThemeMode } = useTheme();
  const { addProfile, addJob, addFamilyMember, addFriend, addHobby, addIdealizedMemory, profiles, jobs, familyMembers, friends, hobbies, getProfile, getIdealizedMemoriesByProfileId, getIdealizedMemoriesByEntityId, idealizedMemories, reloadIdealizedMemories, reloadProfiles, reloadJobs, reloadFamilyMembers, reloadFriends, reloadHobbies, cleanupOrphanedMemories } = useJourney();
  const t = useTranslate();
  const [languageDropdownVisible, setLanguageDropdownVisible] = useState(false);
  const [themeDropdownVisible, setThemeDropdownVisible] = useState(false);
  const [isGeneratingFakeData, setIsGeneratingFakeData] = useState(false);
  const [isDeletingData, setIsDeletingData] = useState(false);
  const [isCleaningMemories, setIsCleaningMemories] = useState(false);

  const styles = useMemo(
    () =>
      StyleSheet.create<{
        content: ViewStyle;
        title: TextStyle;
        section: ViewStyle;
        sectionTitle: TextStyle;
        languageOption: ViewStyle;
        languageOptionSelected: ViewStyle;
        languageOptionContent: ViewStyle;
        languageOptionText: TextStyle;
        checkIcon: ViewStyle;
        dropdown: ViewStyle;
        dropdownContent: ViewStyle;
        dropdownText: TextStyle;
        modalOverlay: ViewStyle;
        modalContent: ViewStyle;
        modalHeader: ViewStyle;
        dropdownOption: ViewStyle;
        dropdownOptionContent: ViewStyle;
        dropdownOptionText: TextStyle;
      }>({
        content: {
          padding: 16 * fontScale,
          paddingBottom: 32 * fontScale,
          gap: 24 * fontScale,
          maxWidth: maxContentWidth as DimensionValue,
          alignSelf: 'center',
          width: '100%',
        },
        title: {
          marginTop: 50,
          marginBottom: 8 * fontScale,
        },
        section: {
          gap: 16 * fontScale,
        },
        sectionTitle: {
          marginBottom: 8 * fontScale,
        },
        languageOption: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: 16 * fontScale,
          borderRadius: 12 * fontScale,
          backgroundColor:
            colorScheme === 'dark'
              ? 'rgba(255, 255, 255, 0.05)'
              : 'rgba(0, 0, 0, 0.05)',
          borderWidth: 1,
          borderColor:
            colorScheme === 'dark'
              ? 'rgba(255, 255, 255, 0.1)'
              : 'rgba(0, 0, 0, 0.1)',
        },
        languageOptionSelected: {
          borderColor: colors.primary,
          borderWidth: 2,
        },
        languageOptionContent: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12 * fontScale,
          flex: 1,
        },
        languageOptionText: {
          flex: 1,
        },
        checkIcon: {
          width: 24 * fontScale,
          height: 24 * fontScale,
          alignItems: 'center',
          justifyContent: 'center',
        },
        dropdown: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: 16 * fontScale,
          borderRadius: 12 * fontScale,
          backgroundColor:
            colorScheme === 'dark'
              ? 'rgba(255, 255, 255, 0.05)'
              : 'rgba(0, 0, 0, 0.05)',
          borderWidth: 1,
          borderColor:
            colorScheme === 'dark'
              ? 'rgba(255, 255, 255, 0.1)'
              : 'rgba(0, 0, 0, 0.1)',
        },
        dropdownContent: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12 * fontScale,
          flex: 1,
        },
        dropdownText: {
          flex: 1,
        },
        modalOverlay: {
          flex: 1,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          justifyContent: 'flex-end',
        },
        modalContent: {
          backgroundColor: colorScheme === 'dark' ? '#1a1a1a' : '#ffffff',
          borderTopLeftRadius: 20 * fontScale,
          borderTopRightRadius: 20 * fontScale,
          paddingTop: 20 * fontScale,
          paddingBottom: 40 * fontScale,
          maxHeight: '50%',
        },
        modalHeader: {
          paddingHorizontal: 20 * fontScale,
          paddingBottom: 16 * fontScale,
          borderBottomWidth: 1,
          borderBottomColor:
            colorScheme === 'dark'
              ? 'rgba(255, 255, 255, 0.1)'
              : 'rgba(0, 0, 0, 0.1)',
        },
        dropdownOption: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: 16 * fontScale,
          paddingHorizontal: 20 * fontScale,
        },
        dropdownOptionContent: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12 * fontScale,
          flex: 1,
        },
        dropdownOptionText: {
          flex: 1,
        },
      }),
    [fontScale, colorScheme, colors.primary, maxContentWidth]
  );

  const handleLanguageChange = async (lang: 'en' | 'bg') => {
    await setLanguage(lang);
    setLanguageDropdownVisible(false);
  };

  const getLanguageLabel = (lang: 'en' | 'bg') => {
    return lang === 'en' ? t('settings.language.english') : t('settings.language.bulgarian');
  };

  const handleThemeChange = async (mode: 'light' | 'dark' | 'system') => {
    await setThemeMode(mode);
    setThemeDropdownVisible(false);
  };

  const getThemeLabel = (mode: 'light' | 'dark' | 'system') => {
    if (mode === 'light') return t('settings.theme.light');
    if (mode === 'dark') return t('settings.theme.dark');
    return t('settings.theme.system');
  };

  const getThemeIcon = (mode: 'light' | 'dark' | 'system') => {
    if (mode === 'light') return 'light-mode';
    if (mode === 'dark') return 'dark-mode';
    return 'brightness-auto';
  };

  const generateFakeData = async () => {
    if (isGeneratingFakeData) return;
    
    setIsGeneratingFakeData(true);
        try {
          // Get image URIs using expo-asset
          const exAsset = Asset.fromModule(require('@/assets/images/ex.jpg'));
          const maldivesAsset = Asset.fromModule(require('@/assets/images/maldives.jpg'));
          
          // Download assets if needed
          await exAsset.downloadAsync();
          await maldivesAsset.downloadAsync();
          
          const exImageUri = exAsset.localUri || exAsset.uri;
          const maldivesImageUri = maldivesAsset.localUri || maldivesAsset.uri;

      // Define multiple fake profiles with different names and characteristics
      // Random number of memories between 1 and 8 per profile
      const fakeProfiles = [
        { name: 'Mark Johnson', description: 'College sweetheart, first love', startDate: '2020-01-15', endDate: '2021-12-31' },
        { name: 'Emma Williams', description: 'High school romance', startDate: '2021-01-01', endDate: '2022-12-31' },
        { name: 'Olivia Brown', description: 'Long distance relationship', startDate: '2023-01-01', endDate: null, ongoing: true },
      ];

      // Define multiple fake jobs with different characteristics
      // Random number of memories between 1 and 8 per job
      const fakeJobs = [
        { name: 'Software Developer at TechCorp', description: 'My first job in tech', startDate: '2020-03-01', endDate: '2022-06-30' },
        { name: 'Senior Developer at StartupXYZ', description: 'Fast-paced startup environment', startDate: '2022-07-01', endDate: '2023-12-31' },
        { name: 'Lead Engineer at CurrentCompany', description: 'Current role, growing my career', startDate: '2024-01-01', endDate: null, ongoing: true },
      ];

      // Define multiple fake family members with different characteristics
      // Random number of memories between 1 and 8 per family member
      const fakeFamilyMembers = [
        { name: 'Sarah Johnson', relationship: 'Sister', description: 'My older sister and best friend' },
        { name: 'Michael Johnson', relationship: 'Brother', description: 'My younger brother' },
        { name: 'Maria Johnson', relationship: 'Mother', description: 'My loving mother' },
      ];

      // Define multiple fake friends with different characteristics
      // Random number of memories between 1 and 8 per friend
      const fakeFriends = [
        { name: 'Alex Thompson', description: 'College roommate and best friend' },
        { name: 'Jessica Martinez', description: 'Childhood friend, always there for me' },
        { name: 'David Chen', description: 'Work friend turned close friend' },
        { name: 'Sophie Anderson', description: 'Gym buddy and confidant' },
      ];

      // Define multiple fake hobbies with different characteristics
      // Random number of memories between 1 and 8 per hobby
      const fakeHobbies = [
        { name: 'Photography', description: 'Capturing beautiful moments' },
        { name: 'Reading', description: 'Exploring new worlds through books' },
        { name: 'Cooking', description: 'Creating delicious meals' },
        { name: 'Hiking', description: 'Exploring nature trails' },
      ];

      const memoryTitles = [
        'Our First Date', 'Summer Vacation', 'Birthday Celebration', 'Anniversary Dinner',
        'Weekend Getaway', 'Holiday Memories', 'Beach Day', 'Movie Night',
        'Cooking Together', 'Morning Coffee', 'Sunset Walk', 'Concert Night',
        'Road Trip', 'Picnic in the Park', 'New Year\'s Eve', 'Valentine\'s Day',
        'Graduation Day', 'Festival Experience', 'Hiking Adventure', 'Dinner Party',
        'First Kiss', 'Surprise Party', 'Camping Trip', 'Art Gallery',
        'Coffee Shop', 'Bookstore Visit', 'Rainy Day', 'Sunny Afternoon',
      ];

      const cloudTexts = [
        'She never really listened to my concerns',
        'Always prioritized her friends over me',
        'Never apologized for her mistakes',
        'Made me feel guilty for having feelings',
        'Was emotionally unavailable',
        'Never made time for our relationship',
        'Took me for granted',
        'Was dismissive of my needs',
        'Never showed appreciation',
        'Was controlling and manipulative',
        'Broke promises repeatedly',
        'Never supported my goals',
        'Was always critical',
        'Never showed vulnerability',
        'Made everything about her',
      ];

      const sunTexts = [
        'She had a beautiful smile',
        'Made me laugh like no one else',
        'Was passionate about her interests',
        'Had great taste in music',
        'Was intelligent and thoughtful',
        'Shared similar values',
        'Was creative and artistic',
        'Had a kind heart',
        'Was adventurous and fun',
        'Made me feel special',
        'Was supportive at times',
        'Had a great sense of humor',
        'Was beautiful inside and out',
        'Shared wonderful memories',
        'Taught me about myself',
      ];

      // Career-specific cloud and sun texts
      const careerCloudTexts = [
        'Poor work-life balance',
        'Toxic management culture',
        'Lack of growth opportunities',
        'Unrealistic deadlines',
        'No recognition for hard work',
        'Limited creativity and autonomy',
        'Poor communication from leadership',
        'No clear career progression',
        'Underpaid for the role',
        'Unhealthy competition between colleagues',
        'No support for learning and development',
        'Constant micromanagement',
        'No work-life boundaries',
        'High stress and burnout',
        'Lack of appreciation',
      ];

      const careerSunTexts = [
        'Great team collaboration',
        'Challenging and interesting projects',
        'Excellent mentorship opportunities',
        'Flexible work arrangements',
        'Good compensation and benefits',
        'Positive company culture',
        'Opportunities for skill growth',
        'Supportive management',
        'Work that aligned with my values',
        'Creative freedom',
        'Impactful projects',
        'Great colleagues and friendships',
        'Recognition for achievements',
        'Work-life balance',
        'Learning new technologies',
      ];

      const careerMemoryTitles = [
        'First Day', 'Major Project Launch', 'Team Offsite', 'Performance Review',
        'Conference Presentation', 'Client Meeting', 'Code Review', 'Sprint Planning',
        'Product Release', 'Company Event', 'Training Session', 'Hackathon',
        'Year End Review', 'Promotion Day', 'Team Lunch', 'Milestone Celebration',
        'Interview Process', 'Onboarding Experience', 'Project Retrospective', 'Company Retreat',
        'Technical Challenge', 'Successful Deployment', 'Client Feedback', 'Team Building',
        'Learning Opportunity', 'Innovation Week', 'Industry Conference', 'Mentorship Session',
      ];

      // Family-specific cloud and sun texts
      const familyCloudTexts = [
        'We often had disagreements that went unresolved',
        'Sometimes felt misunderstood by them',
        'Had difficulty communicating about important matters',
        'Felt judged for my life choices',
        'Struggled with boundaries in our relationship',
        'Felt pressure to meet their expectations',
        'Had conflicting values at times',
        'Felt like they didn\'t respect my independence',
        'Experienced emotional distance',
        'Had unresolved past conflicts',
        'Felt like they favored other siblings',
        'Struggled with generational differences',
        'Had different priorities in life',
        'Felt like my feelings weren\'t validated',
        'Experienced tension during family gatherings',
      ];

      const familySunTexts = [
        'Always there when I needed support',
        'Shared many happy childhood memories',
        'Had great family traditions together',
        'Was a source of wisdom and guidance',
        'Made me feel loved and accepted',
        'Shared similar values and beliefs',
        'Had fun family vacations together',
        'Was always encouraging of my goals',
        'Made family gatherings special',
        'Taught me important life lessons',
        'Had a strong family bond',
        'Was proud of my achievements',
        'Made me laugh with family jokes',
        'Created a warm and welcoming home',
        'Was always there for celebrations',
      ];

      const familyMemoryTitles = [
        'Family Dinner', 'Birthday Celebration', 'Holiday Gathering', 'Summer Vacation',
        'Weekend Visit', 'Family Reunion', 'Graduation Day', 'Wedding Day',
        'Christmas Morning', 'Thanksgiving Dinner', 'Family Game Night', 'Beach Trip',
        'Cooking Together', 'Movie Night', 'Birthday Party', 'Anniversary Celebration',
        'School Event', 'Family Photo Session', 'Outdoor Adventure', 'Holiday Tradition',
        'Sunday Brunch', 'Birthday Surprise', 'Family Road Trip', 'Holiday Decorating',
        'Special Occasion', 'Family Meeting', 'Gift Exchange', 'Memorial Day',
      ];

      // Friends-specific cloud and sun texts
      const friendsCloudTexts = [
        'Sometimes canceled plans last minute',
        'Wasn\'t always reliable when I needed support',
        'Had different priorities that caused distance',
        'Sometimes made me feel left out',
        'Wasn\'t always there during tough times',
        'Had communication issues',
        'Sometimes took our friendship for granted',
        'Had different values that created tension',
        'Wasn\'t always considerate of my feelings',
        'Had conflicts that went unresolved',
        'Sometimes prioritized other friends over me',
        'Wasn\'t always honest with me',
        'Had different expectations of friendship',
        'Sometimes made me feel judged',
        'Wasn\'t always available when I needed them',
      ];

      const friendsSunTexts = [
        'Always made me laugh',
        'Was there for me during tough times',
        'Shared amazing adventures together',
        'Had great conversations',
        'Was supportive of my goals',
        'Made me feel accepted',
        'Had fun together',
        'Was a good listener',
        'Shared similar interests',
        'Was reliable and trustworthy',
        'Made me feel valued',
        'Had great memories together',
        'Was understanding and patient',
        'Made me feel included',
        'Was a true friend',
      ];

      const friendsMemoryTitles = [
        'Coffee Meetup', 'Birthday Party', 'Weekend Hangout', 'Concert Night',
        'Road Trip', 'Movie Night', 'Dinner Out', 'Game Night',
        'Beach Day', 'Hiking Adventure', 'Festival Experience', 'Shopping Spree',
        'Late Night Chat', 'Birthday Celebration', 'Holiday Gathering', 'Sports Event',
        'Picnic in the Park', 'Concert Experience', 'Weekend Getaway', 'Adventure Day',
        'Fun Night Out', 'Relaxing Day', 'Special Occasion', 'Memorable Moment',
        'Great Conversation', 'Fun Activity', 'Shared Experience', 'Friendship Moment',
      ];

      // Hobbies-specific cloud and sun texts
      const hobbiesCloudTexts = [
        'Sometimes felt frustrated with slow progress',
        'Had moments of self-doubt',
        'Struggled to find time for it',
        'Felt like I wasn\'t improving',
        'Had difficulty staying motivated',
        'Sometimes felt overwhelmed',
        'Had setbacks that were discouraging',
        'Felt like I wasn\'t good enough',
        'Had moments of giving up',
        'Struggled with perfectionism',
        'Felt like I was wasting time',
        'Had difficulty balancing with other priorities',
        'Sometimes felt bored',
        'Had moments of frustration',
        'Felt like I wasn\'t making progress',
      ];

      const hobbiesSunTexts = [
        'Felt accomplished and proud',
        'Found joy and relaxation',
        'Learned something new',
        'Felt creative and inspired',
        'Had moments of flow',
        'Felt peaceful and calm',
        'Made progress and improved',
        'Felt energized and motivated',
        'Had fun and enjoyed it',
        'Felt like I was growing',
        'Found it therapeutic',
        'Felt proud of my work',
        'Had moments of clarity',
        'Felt like I was expressing myself',
        'Found it fulfilling',
      ];

      const hobbiesMemoryTitles = [
        'First Attempt', 'Breakthrough Moment', 'Practice Session', 'Creative Project',
        'Learning Experience', 'Achievement Unlocked', 'Fun Activity', 'Relaxing Session',
        'New Technique', 'Personal Best', 'Inspiring Moment', 'Enjoyable Time',
        'Progress Made', 'Fun Experiment', 'Creative Flow', 'Satisfying Result',
        'Learning Curve', 'Moment of Clarity', 'Fun Challenge', 'Rewarding Experience',
        'New Discovery', 'Skill Improvement', 'Enjoyable Moment', 'Personal Growth',
        'Creative Expression', 'Fun Activity', 'Achievement', 'Memorable Session',
      ];

      // Create multiple profiles
      let createdProfiles = 0;
      let createdJobs = 0;
      let createdFamilyMembers = 0;
      let createdFriends = 0;
      let createdHobbies = 0;
      let createdMemories = 0;
      
      for (const profileData of fakeProfiles) {
        try {
          // Check if profile already exists
          let profileId: string;
          const existingProfile = profiles.find(p => p.name === profileData.name);
          
          if (existingProfile) {
            profileId = existingProfile.id;
            // Verify the profile exists by checking if we can get it
            if (!profileId) {
              continue;
            }
            // Brief delay to ensure profile is loaded
            await new Promise(resolve => setTimeout(resolve, 100));
          } else {
            profileId = await addProfile({
            name: profileData.name,
            description: profileData.description,
            relationshipStartDate: profileData.startDate,
            relationshipEndDate: profileData.endDate,
              imageUri: exImageUri,
            setupProgress: 100,
            isCompleted: true,
            sections: {
              realityCheck: {
                idealizedMemories: true,
                emotionalDebtLedger: true,
              },
              processingAccountability: {
                isCompleted: true,
              },
              identityFutureFocus: {
                isCompleted: true,
              },
            },
          });
            if (!profileId) {
              continue;
            }
            // Brief delay after creating profile to ensure it's saved to AsyncStorage
            await new Promise(resolve => setTimeout(resolve, 200));
          }

          // Check if profile already has memories - if not, create them
          const existingMemories = getIdealizedMemoriesByProfileId(profileId);
          
          // Only create memories if the profile doesn't have any yet
          if (existingMemories.length === 0) {
            // Generate random number of memories between 1 and 8
            const numMemories = Math.floor(Math.random() * 8) + 1; // 1-8 memories
          
            let successfullyCreatedCount = 0;
          for (let i = 0; i < numMemories; i++) {
            try {
              let numClouds: number;
              let numSuns: number;
              
              // Each memory should have between 2-8 total moments (clouds + suns)
              const totalMoments = Math.floor(Math.random() * 7) + 2; // 2-8 total moments
              
              // Ensure at least 1 cloudy and 1 sunny moment
              // Distribute remaining moments randomly
              const remainingMoments = totalMoments - 2; // Subtract the guaranteed 1 cloud + 1 sun
              
              if (profileData.ongoing) {
                // Current partner: more suns than clouds
                // Start with 1 cloud and 1 sun, then add more suns
                numClouds = 1;
                numSuns = 1 + remainingMoments; // All remaining go to suns
              } else {
                // Ex partners: more clouds than suns
                // Start with 1 cloud and 1 sun, then add more clouds
                numClouds = 1 + remainingMoments; // All remaining go to clouds
                numSuns = 1;
              }
              
              // Verify we have at least 1 of each (should always be true with above logic)
              if (numClouds < 1) numClouds = 1;
              if (numSuns < 1) numSuns = 1;
              
              const hardTruths = [];
              for (let j = 0; j < numClouds; j++) {
                hardTruths.push({
                  id: `cloud_${profileData.name}_${i}_${j}_${Date.now()}_${Math.random()}`,
                  text: cloudTexts[Math.floor(Math.random() * cloudTexts.length)],
                  x: Math.random() * 300 + 50,
                  y: Math.random() * 400 + 50,
                });
              }

              const goodFacts = [];
              for (let j = 0; j < numSuns; j++) {
                goodFacts.push({
                  id: `sun_${profileData.name}_${i}_${j}_${Date.now()}_${Math.random()}`,
                  text: sunTexts[Math.floor(Math.random() * sunTexts.length)],
                  x: Math.random() * 300 + 50,
                  y: Math.random() * 400 + 50,
                });
              }

              // Use different memory titles for variety
              const memoryTitle = memoryTitles[i % memoryTitles.length] + ` (${i + 1})`;

                // Use explicit sphere parameter to ensure memories are created for relationships
                await addIdealizedMemory(profileId, 'relationships', {
                title: memoryTitle,
                imageUri: maldivesImageUri,
                hardTruths,
                goodFacts,
              });
              
              createdMemories++;
                successfullyCreatedCount++;
              
                // Small delay to allow AsyncStorage write to complete
                await new Promise(resolve => setTimeout(resolve, 50));
            } catch (memoryError) {
                // Don't increment createdMemories if it failed
              }
            }
          } else {
            // Profile already has memories, skip creation
          }
          
          createdProfiles++;
          
          // Brief delay between profiles for AsyncStorage writes
          await new Promise(resolve => setTimeout(resolve, 100));
        } catch (profileError) {
          // Error creating profile
        }
      }

      // Create multiple jobs
      for (const jobData of fakeJobs) {
        try {
          // Check if job already exists
          let jobId: string;
          const existingJob = jobs.find(j => j.name === jobData.name);
          
          if (existingJob) {
            jobId = existingJob.id;
            if (!jobId) {
              continue;
            }
            await new Promise(resolve => setTimeout(resolve, 100));
          } else {
            jobId = await addJob({
              name: jobData.name,
              description: jobData.description,
              startDate: jobData.startDate,
              endDate: jobData.endDate || undefined,
              imageUri: exImageUri,
              setupProgress: 0,
              isCompleted: false,
            });
            if (!jobId) {
              continue;
            }
            await new Promise(resolve => setTimeout(resolve, 200));
          }

          // Check if job already has memories - if not, create them
          const existingMemories = getIdealizedMemoriesByEntityId(jobId, 'career');
          
          // Only create memories if the job doesn't have any yet
          if (existingMemories.length === 0) {
            // Generate random number of memories between 1 and 8
            const numMemories = Math.floor(Math.random() * 8) + 1; // 1-8 memories
          
            for (let i = 0; i < numMemories; i++) {
            try {
              let numClouds: number;
              let numSuns: number;
              
              // Each memory should have between 2-8 total moments (clouds + suns)
              const totalMoments = Math.floor(Math.random() * 7) + 2; // 2-8 total moments
              
              // Ensure at least 1 cloudy and 1 sunny moment
              // Distribute remaining moments randomly
              const remainingMoments = totalMoments - 2; // Subtract the guaranteed 1 cloud + 1 sun
              
              // For current job (ongoing), ensure more suns than clouds
              if (jobData.ongoing) {
                // Current job: more suns than clouds
                // Start with 1 cloud and 1 sun, then add more suns
                numClouds = 1;
                numSuns = 1 + remainingMoments; // All remaining go to suns
              } else {
                // Past jobs: more clouds than suns
                // Start with 1 cloud and 1 sun, then add more clouds
                numClouds = 1 + remainingMoments; // All remaining go to clouds
                numSuns = 1;
              }
              
              // Verify we have at least 1 of each (should always be true with above logic)
              if (numClouds < 1) numClouds = 1;
              if (numSuns < 1) numSuns = 1;
              
              const hardTruths = [];
              for (let j = 0; j < numClouds; j++) {
                hardTruths.push({
                  id: `cloud_${jobData.name}_${i}_${j}_${Date.now()}_${Math.random()}`,
                  text: careerCloudTexts[Math.floor(Math.random() * careerCloudTexts.length)],
                  x: Math.random() * 300 + 50,
                  y: Math.random() * 400 + 50,
                });
              }

              const goodFacts = [];
              for (let j = 0; j < numSuns; j++) {
                goodFacts.push({
                  id: `sun_${jobData.name}_${i}_${j}_${Date.now()}_${Math.random()}`,
                  text: careerSunTexts[Math.floor(Math.random() * careerSunTexts.length)],
                  x: Math.random() * 300 + 50,
                  y: Math.random() * 400 + 50,
                });
              }

              // Use different memory titles for variety
              const memoryTitle = careerMemoryTitles[i % careerMemoryTitles.length] + ` (${i + 1})`;

              // Use new signature for career sphere: (entityId, sphere, memoryData)
              await addIdealizedMemory(jobId, 'career', {
                title: memoryTitle,
                imageUri: maldivesImageUri,
                hardTruths,
                goodFacts,
              });
              
              createdMemories++;
              
              // Brief delay to allow AsyncStorage write to complete
              await new Promise(resolve => setTimeout(resolve, 50));
            } catch (memoryError) {
              // Error creating memory
            }
          }
          } else {
            // Job already has memories, skip creation
          }
          
          createdJobs++;
          
          // Brief delay between jobs for AsyncStorage writes
          await new Promise(resolve => setTimeout(resolve, 100));
        } catch (jobError) {
          // Error creating job
        }
      }

      // Create multiple family members
      for (const memberData of fakeFamilyMembers) {
        try {
          // Check if family member already exists
          let memberId: string;
          const existingMember = familyMembers.find(m => m.name === memberData.name);
          
          if (existingMember) {
            memberId = existingMember.id;
            if (!memberId) {
              continue;
            }
            await new Promise(resolve => setTimeout(resolve, 100));
          } else {
            memberId = await addFamilyMember({
              name: memberData.name,
              description: memberData.description,
              relationship: memberData.relationship,
              imageUri: exImageUri,
              setupProgress: 0,
              isCompleted: false,
            });
            
            if (!memberId) {
              continue;
            }
            // Wait a bit longer to ensure family member is saved to AsyncStorage
            await new Promise(resolve => setTimeout(resolve, 300));
            // Reload family members to update state
            await reloadFamilyMembers();
            // Reload memories to ensure state is up to date
            await reloadIdealizedMemories();
          }

          // Check if family member already has memories - if not, create them
          // Reload memories first to ensure we have the latest state
          await reloadIdealizedMemories();
          const existingMemories = getIdealizedMemoriesByEntityId(memberId, 'family');
          
          if (existingMemories.length === 0) {
            // Generate random number of memories between 1 and 8
            const numMemories = Math.floor(Math.random() * 8) + 1; // 1-8 memories
            
            for (let i = 0; i < numMemories; i++) {
              try {
                let numClouds: number;
                let numSuns: number;
                
                // Each memory should have between 2-8 total moments (clouds + suns)
                const totalMoments = Math.floor(Math.random() * 7) + 2; // 2-8 total moments
                
                // Ensure at least 1 cloudy and 1 sunny moment
                // Distribute remaining moments randomly (slightly more suns for family)
                const remainingMoments = totalMoments - 2; // Subtract the guaranteed 1 cloud + 1 sun
                
                // For family, mix of clouds and suns (slightly more suns)
                // Start with 1 cloud and 1 sun, then distribute remaining 60/40 suns/clouds
                const sunsFromRemaining = Math.floor(remainingMoments * 0.6);
                const cloudsFromRemaining = remainingMoments - sunsFromRemaining;
                
                numClouds = 1 + cloudsFromRemaining;
                numSuns = 1 + sunsFromRemaining;
                
                // Verify we have at least 1 of each (should always be true with above logic)
                if (numClouds < 1) numClouds = 1;
                if (numSuns < 1) numSuns = 1;
                
                const hardTruths = [];
                for (let j = 0; j < numClouds; j++) {
                  hardTruths.push({
                    id: `cloud_${memberData.name}_${i}_${j}_${Date.now()}_${Math.random()}`,
                    text: familyCloudTexts[Math.floor(Math.random() * familyCloudTexts.length)],
                    x: Math.random() * 300 + 50,
                    y: Math.random() * 400 + 50,
                  });
                }

                const goodFacts = [];
                for (let j = 0; j < numSuns; j++) {
                  goodFacts.push({
                    id: `sun_${memberData.name}_${i}_${j}_${Date.now()}_${Math.random()}`,
                    text: familySunTexts[Math.floor(Math.random() * familySunTexts.length)],
                    x: Math.random() * 300 + 50,
                    y: Math.random() * 400 + 50,
                  });
                }

                const memoryTitle = familyMemoryTitles[i % familyMemoryTitles.length] + ` (${i + 1})`;

                await addIdealizedMemory(memberId, 'family', {
                  title: memoryTitle,
                  imageUri: maldivesImageUri,
                  hardTruths,
                  goodFacts,
                });
                
                createdMemories++;
                
                await new Promise(resolve => setTimeout(resolve, 50));
              } catch (memoryError) {
                // Error creating memory
              }
            }
          }
          
          createdFamilyMembers++;
          
          await new Promise(resolve => setTimeout(resolve, 100));
        } catch (memberError) {
          // Error creating family member
        }
      }

      // Create multiple friends
      for (const friendData of fakeFriends) {
        try {
          let friendId: string;
          const existingFriend = friends.find(f => f.name === friendData.name);
          
          if (existingFriend) {
            friendId = existingFriend.id;
            if (!friendId) {
              continue;
            }
            await new Promise(resolve => setTimeout(resolve, 100));
          } else {
            friendId = await addFriend({
              name: friendData.name,
              description: friendData.description,
              imageUri: exImageUri,
              setupProgress: 0,
              isCompleted: false,
            });
            
            if (!friendId) {
              continue;
            }
            await new Promise(resolve => setTimeout(resolve, 300));
            await reloadFriends();
            await reloadIdealizedMemories();
          }

          await reloadIdealizedMemories();
          const existingMemories = getIdealizedMemoriesByEntityId(friendId, 'friends');
          
          if (existingMemories.length === 0) {
            const numMemories = Math.floor(Math.random() * 8) + 1;
            
            for (let i = 0; i < numMemories; i++) {
              try {
                const totalMoments = Math.floor(Math.random() * 7) + 2;
                const remainingMoments = totalMoments - 2;
                const sunsFromRemaining = Math.floor(remainingMoments * 0.6);
                const cloudsFromRemaining = remainingMoments - sunsFromRemaining;
                
                let numClouds = 1 + cloudsFromRemaining;
                let numSuns = 1 + sunsFromRemaining;
                
                if (numClouds < 1) numClouds = 1;
                if (numSuns < 1) numSuns = 1;
                
                const hardTruths = [];
                for (let j = 0; j < numClouds; j++) {
                  hardTruths.push({
                    id: `cloud_${friendData.name}_${i}_${j}_${Date.now()}_${Math.random()}`,
                    text: friendsCloudTexts[Math.floor(Math.random() * friendsCloudTexts.length)],
                    x: Math.random() * 300 + 50,
                    y: Math.random() * 400 + 50,
                  });
                }

                const goodFacts = [];
                for (let j = 0; j < numSuns; j++) {
                  goodFacts.push({
                    id: `sun_${friendData.name}_${i}_${j}_${Date.now()}_${Math.random()}`,
                    text: friendsSunTexts[Math.floor(Math.random() * friendsSunTexts.length)],
                    x: Math.random() * 300 + 50,
                    y: Math.random() * 400 + 50,
                  });
                }

                const memoryTitle = friendsMemoryTitles[i % friendsMemoryTitles.length] + ` (${i + 1})`;

                await addIdealizedMemory(friendId, 'friends', {
                  title: memoryTitle,
                  imageUri: maldivesImageUri,
                  hardTruths,
                  goodFacts,
                });
                
                createdMemories++;
                await new Promise(resolve => setTimeout(resolve, 50));
              } catch (memoryError) {
                // Error creating memory
              }
            }
          }
          
          createdFriends++;
          await new Promise(resolve => setTimeout(resolve, 100));
        } catch (friendError) {
          // Error creating friend
        }
      }

      // Create multiple hobbies
      for (const hobbyData of fakeHobbies) {
        try {
          let hobbyId: string;
          const existingHobby = hobbies.find(h => h.name === hobbyData.name);
          
          if (existingHobby) {
            hobbyId = existingHobby.id;
            if (!hobbyId) {
              continue;
            }
            await new Promise(resolve => setTimeout(resolve, 100));
          } else {
            hobbyId = await addHobby({
              name: hobbyData.name,
              description: hobbyData.description,
              imageUri: exImageUri,
              setupProgress: 0,
              isCompleted: false,
            });
            
            if (!hobbyId) {
              continue;
            }
            await new Promise(resolve => setTimeout(resolve, 300));
            await reloadHobbies();
            await reloadIdealizedMemories();
          }

          await reloadIdealizedMemories();
          const existingMemories = getIdealizedMemoriesByEntityId(hobbyId, 'hobbies');
          
          if (existingMemories.length === 0) {
            const numMemories = Math.floor(Math.random() * 8) + 1;
            
            for (let i = 0; i < numMemories; i++) {
              try {
                const totalMoments = Math.floor(Math.random() * 7) + 2;
                const remainingMoments = totalMoments - 2;
                const sunsFromRemaining = Math.floor(remainingMoments * 0.7);
                const cloudsFromRemaining = remainingMoments - sunsFromRemaining;
                
                let numClouds = 1 + cloudsFromRemaining;
                let numSuns = 1 + sunsFromRemaining;
                
                if (numClouds < 1) numClouds = 1;
                if (numSuns < 1) numSuns = 1;
                
                const hardTruths = [];
                for (let j = 0; j < numClouds; j++) {
                  hardTruths.push({
                    id: `cloud_${hobbyData.name}_${i}_${j}_${Date.now()}_${Math.random()}`,
                    text: hobbiesCloudTexts[Math.floor(Math.random() * hobbiesCloudTexts.length)],
                    x: Math.random() * 300 + 50,
                    y: Math.random() * 400 + 50,
                  });
                }

                const goodFacts = [];
                for (let j = 0; j < numSuns; j++) {
                  goodFacts.push({
                    id: `sun_${hobbyData.name}_${i}_${j}_${Date.now()}_${Math.random()}`,
                    text: hobbiesSunTexts[Math.floor(Math.random() * hobbiesSunTexts.length)],
                    x: Math.random() * 300 + 50,
                    y: Math.random() * 400 + 50,
                  });
                }

                const memoryTitle = hobbiesMemoryTitles[i % hobbiesMemoryTitles.length] + ` (${i + 1})`;

                await addIdealizedMemory(hobbyId, 'hobbies', {
                  title: memoryTitle,
                  imageUri: maldivesImageUri,
                  hardTruths,
                  goodFacts,
                });
                
                createdMemories++;
                await new Promise(resolve => setTimeout(resolve, 50));
              } catch (memoryError) {
                // Error creating memory
              }
            }
          }
          
          createdHobbies++;
          await new Promise(resolve => setTimeout(resolve, 100));
        } catch (hobbyError) {
          // Error creating hobby
        }
      }

      // Reload all data to update React state after generating
      // IMPORTANT: Load profiles, jobs, family members, friends, and hobbies FIRST, then memories (which runs cleanup)
      // This ensures cleanup can find the entities it needs to validate memories
      try {
        // Load profiles, jobs, family members, friends, and hobbies first
        await Promise.all([
          reloadProfiles(),
          reloadJobs(),
          reloadFamilyMembers(),
          reloadFriends(),
          reloadHobbies(),
        ]);
        
        // Then load memories (cleanup will now find all entities in storage)
        await reloadIdealizedMemories();
      } catch (reloadError) {
        // Continue anyway - data is in storage even if state update fails
      }

      Alert.alert(
        t('common.success'), 
        `Created ${createdProfiles} profiles, ${createdJobs} jobs, ${createdFamilyMembers} family members, ${createdFriends} friends, ${createdHobbies} hobbies, and ${createdMemories} total memories`,
        [{ text: t('common.ok') }]
      );
    } catch (error) {
      Alert.alert(t('common.error'), t('settings.devTools.generateData.error'));
    } finally {
      setIsGeneratingFakeData(false);
    }
  };

  const cleanupOrphanedMemoriesHandler = async () => {
    if (isCleaningMemories) return;
    setIsCleaningMemories(true);
    try {
      const cleanedCount = await cleanupOrphanedMemories();
      const message = cleanedCount > 0 
        ? t('settings.devTools.cleanupMemories.success.withCount').replace('{count}', cleanedCount.toString())
        : t('settings.devTools.cleanupMemories.success.noOrphans');
      Alert.alert(
        t('common.success'),
        message,
        [{ text: t('common.ok') }]
      );
    } catch (error) {
      Alert.alert(t('common.error'), t('settings.devTools.cleanupMemories.error'));
    } finally {
      setIsCleaningMemories(false);
    }
  };

  const clearAllMockData = async () => {
    // Show confirmation dialog
    Alert.alert(
      t('settings.devTools.clearData.title'),
      t('settings.devTools.clearData.message'),
      [
        {
          text: t('common.cancel'),
          style: 'cancel',
        },
        {
          text: t('settings.devTools.clearData.deleteButton'),
          style: 'destructive',
          onPress: async () => {
            if (isDeletingData) return;
            setIsDeletingData(true);
            try {
              // Clear ALL data storage keys (keep user preferences like theme and language)
              const STORAGE_KEY = '@sferas:ex_profiles';
              const IDEALIZED_MEMORIES_KEY = '@sferas:idealized_memories';
              const JOBS_STORAGE_KEY = '@sferas:jobs';
              const FAMILY_MEMBERS_STORAGE_KEY = '@sferas:family_members';
              const FRIENDS_STORAGE_KEY = '@sferas:friends';
              const HOBBIES_STORAGE_KEY = '@sferas:hobbies';
              const AVATAR_POSITIONS_KEY = '@sferas:avatar_positions';
              const WALKTHROUGH_SHOWN_KEY = '@sferas:walkthrough_shown';
              
              await Promise.all([
                AsyncStorage.removeItem(STORAGE_KEY),
                AsyncStorage.removeItem(IDEALIZED_MEMORIES_KEY),
                AsyncStorage.removeItem(JOBS_STORAGE_KEY),
                AsyncStorage.removeItem(FAMILY_MEMBERS_STORAGE_KEY),
                AsyncStorage.removeItem(FRIENDS_STORAGE_KEY),
                AsyncStorage.removeItem(HOBBIES_STORAGE_KEY),
                AsyncStorage.removeItem(AVATAR_POSITIONS_KEY),
                AsyncStorage.removeItem(WALKTHROUGH_SHOWN_KEY), // Clear walkthrough flag so it shows again
              ]);
              
              // Reload all data from storage to update state immediately
              await Promise.all([
                reloadIdealizedMemories(),
                reloadProfiles(),
                reloadJobs(),
                reloadFamilyMembers(),
                reloadFriends(),
                reloadHobbies(),
              ]);
              
              // Navigate to spheres tab to show walkthrough
              router.replace('/(tabs)/spheres');
              
              // Show success message
              Alert.alert(
                t('common.success'),
                t('settings.devTools.clearData.success'),
                [{ text: t('common.ok') }]
              );
            } catch (error) {
              Alert.alert(t('common.error'), t('settings.devTools.clearData.error'));
            } finally {
              setIsDeletingData(false);
            }
          },
        },
      ]
    );
  };

  return (
    <TabScreenContainer>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <ThemedText size="xl" weight="bold" style={styles.title}>
          {t('settings.title')}
        </ThemedText>

        <View style={styles.section}>
          <ThemedText size="l" weight="semibold" style={styles.sectionTitle}>
            {t('settings.language')}
          </ThemedText>
    

          <TouchableOpacity
            style={styles.dropdown}
            onPress={() => setLanguageDropdownVisible(true)}
            activeOpacity={0.7}
          >
            <View style={styles.dropdownContent}>
              <MaterialIcons
                name="language"
                size={24 * fontScale}
                color={colors.primary}
              />
              <ThemedText
                size="l"
                weight="medium"
                style={styles.dropdownText}
              >
                {getLanguageLabel(language)}
              </ThemedText>
            </View>
            <MaterialIcons
              name="arrow-drop-down"
              size={24 * fontScale}
              color={colors.text}
            />
          </TouchableOpacity>
        </View>

        <Modal
          visible={languageDropdownVisible}
          transparent
          animationType="slide"
          onRequestClose={() => setLanguageDropdownVisible(false)}
        >
          <Pressable
            style={styles.modalOverlay}
            onPress={() => setLanguageDropdownVisible(false)}
          >
            <View style={styles.modalContent}>
              <Pressable onPress={(e) => e.stopPropagation()}>
                <View style={styles.modalHeader}>
                  <ThemedText size="l" weight="bold">
                    {t('settings.language')}
                  </ThemedText>
                </View>

                <TouchableOpacity
                  style={styles.dropdownOption}
                  onPress={() => handleLanguageChange('en')}
                  activeOpacity={0.7}
                >
                  <View style={styles.dropdownOptionContent}>
                    <MaterialIcons
                      name="language"
                      size={24 * fontScale}
                      color={colors.primary}
                    />
                    <ThemedText
                      size="l"
                      weight={language === 'en' ? 'bold' : 'medium'}
                      style={styles.dropdownOptionText}
                    >
                      {t('settings.language.english')}
                    </ThemedText>
                  </View>
                  {language === 'en' && (
                    <MaterialIcons
                      name="check-circle"
                      size={24 * fontScale}
                      color={colors.primary}
                    />
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.dropdownOption}
                  onPress={() => handleLanguageChange('bg')}
                  activeOpacity={0.7}
                >
                  <View style={styles.dropdownOptionContent}>
                    <MaterialIcons
                      name="language"
                      size={24 * fontScale}
                      color={colors.primary}
                    />
                    <ThemedText
                      size="l"
                      weight={language === 'bg' ? 'bold' : 'medium'}
                      style={styles.dropdownOptionText}
                    >
                      {t('settings.language.bulgarian')}
                    </ThemedText>
                  </View>
                  {language === 'bg' && (
                    <MaterialIcons
                      name="check-circle"
                      size={24 * fontScale}
                      color={colors.primary}
                    />
                  )}
                </TouchableOpacity>
              </Pressable>
            </View>
          </Pressable>
        </Modal>

        <View style={styles.section}>
          <ThemedText size="l" weight="semibold" style={styles.sectionTitle}>
            {t('settings.theme')}
          </ThemedText>

          <TouchableOpacity
            style={styles.dropdown}
            onPress={() => setThemeDropdownVisible(true)}
            activeOpacity={0.7}
          >
            <View style={styles.dropdownContent}>
              <MaterialIcons
                name={getThemeIcon(themeMode)}
                size={24 * fontScale}
                color={colors.primary}
              />
              <ThemedText
                size="l"
                weight="medium"
                style={styles.dropdownText}
              >
                {getThemeLabel(themeMode)}
              </ThemedText>
            </View>
            <MaterialIcons
              name="arrow-drop-down"
              size={24 * fontScale}
              color={colors.text}
            />
          </TouchableOpacity>
        </View>

        <Modal
          visible={themeDropdownVisible}
          transparent
          animationType="slide"
          onRequestClose={() => setThemeDropdownVisible(false)}
        >
          <Pressable
            style={styles.modalOverlay}
            onPress={() => setThemeDropdownVisible(false)}
          >
            <View style={styles.modalContent}>
              <Pressable onPress={(e) => e.stopPropagation()}>
                <View style={styles.modalHeader}>
                  <ThemedText size="l" weight="bold">
                    {t('settings.theme')}
                  </ThemedText>
                </View>

                <TouchableOpacity
                  style={styles.dropdownOption}
                  onPress={() => handleThemeChange('light')}
                  activeOpacity={0.7}
                >
                  <View style={styles.dropdownOptionContent}>
                    <MaterialIcons
                      name="light-mode"
                      size={24 * fontScale}
                      color={colors.primary}
                    />
                    <ThemedText
                      size="l"
                      weight={themeMode === 'light' ? 'bold' : 'medium'}
                      style={styles.dropdownOptionText}
                    >
                      {t('settings.theme.light')}
                    </ThemedText>
                  </View>
                  {themeMode === 'light' && (
                    <MaterialIcons
                      name="check-circle"
                      size={24 * fontScale}
                      color={colors.primary}
                    />
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.dropdownOption}
                  onPress={() => handleThemeChange('dark')}
                  activeOpacity={0.7}
                >
                  <View style={styles.dropdownOptionContent}>
                    <MaterialIcons
                      name="dark-mode"
                      size={24 * fontScale}
                      color={colors.primary}
                    />
                    <ThemedText
                      size="l"
                      weight={themeMode === 'dark' ? 'bold' : 'medium'}
                      style={styles.dropdownOptionText}
                    >
                      {t('settings.theme.dark')}
                    </ThemedText>
                  </View>
                  {themeMode === 'dark' && (
                    <MaterialIcons
                      name="check-circle"
                      size={24 * fontScale}
                      color={colors.primary}
                    />
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.dropdownOption}
                  onPress={() => handleThemeChange('system')}
                  activeOpacity={0.7}
                >
                  <View style={styles.dropdownOptionContent}>
                    <MaterialIcons
                      name="brightness-auto"
                      size={24 * fontScale}
                      color={colors.primary}
                    />
                    <ThemedText
                      size="l"
                      weight={themeMode === 'system' ? 'bold' : 'medium'}
                      style={styles.dropdownOptionText}
                    >
                      {t('settings.theme.system')}
                    </ThemedText>
                  </View>
                  {themeMode === 'system' && (
                    <MaterialIcons
                      name="check-circle"
                      size={24 * fontScale}
                      color={colors.primary}
                    />
                  )}
                </TouchableOpacity>
              </Pressable>
            </View>
          </Pressable>
        </Modal>

        {/* Temporary: Generate Fake Data Button */}
        <View style={styles.section}>
          <ThemedText size="l" weight="semibold" style={styles.sectionTitle}>
            Development Tools
          </ThemedText>
          <TouchableOpacity
            style={[styles.dropdown, isGeneratingFakeData && { opacity: 0.5 }]}
            onPress={generateFakeData}
            activeOpacity={0.7}
            disabled={isGeneratingFakeData}
          >
            <View style={styles.dropdownContent}>
              <MaterialIcons
                name="bug-report"
                size={24 * fontScale}
                color={colors.primary}
              />
              <ThemedText
                size="l"
                weight="medium"
                style={styles.dropdownText}
              >
                {isGeneratingFakeData ? 'Generating...' : 'Generate Fake Data (Profiles & Jobs)'}
              </ThemedText>
            </View>
            {isGeneratingFakeData && (
              <MaterialIcons
                name="hourglass-empty"
                size={24 * fontScale}
                color={colors.text}
              />
            )}
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[
              styles.dropdown,
              isDeletingData && { opacity: 0.5 },
              { borderColor: colors.error || '#ff4444', borderWidth: 1, marginTop: 12 * fontScale }
            ]}
            onPress={clearAllMockData}
            activeOpacity={0.7}
            disabled={isDeletingData}
          >
            <View style={styles.dropdownContent}>
              <MaterialIcons
                name="delete-forever"
                size={24 * fontScale}
                color={colors.error || '#ff4444'}
              />
              <ThemedText
                size="l"
                weight="medium"
                style={[styles.dropdownText, { color: colors.error || '#ff4444' }]}
              >
                {isDeletingData ? 'Deleting...' : 'Clear All App Data'}
              </ThemedText>
            </View>
            {isDeletingData && (
              <MaterialIcons
                name="hourglass-empty"
                size={24 * fontScale}
                color={colors.text}
              />
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </TabScreenContainer>
  );
}
