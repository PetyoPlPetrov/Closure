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
import { Asset } from 'expo-asset';
import { useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert, DimensionValue, Modal, Pressable, ScrollView, StyleSheet, TextStyle, TouchableOpacity, View, ViewStyle } from 'react-native';

export default function SettingsScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'dark'];
  const fontScale = useFontScale();
  const { maxContentWidth } = useLargeDevice();
  const { language, setLanguage } = useLanguage();
  const { themeMode, setThemeMode } = useTheme();
  const { addProfile, addJob, addIdealizedMemory, profiles, getProfile, getIdealizedMemoriesByProfileId, idealizedMemories, reloadIdealizedMemories, reloadProfiles, reloadJobs } = useJourney();
  const t = useTranslate();
  const [languageDropdownVisible, setLanguageDropdownVisible] = useState(false);
  const [themeDropdownVisible, setThemeDropdownVisible] = useState(false);
  const [isGeneratingFakeData, setIsGeneratingFakeData] = useState(false);
  const [isDeletingData, setIsDeletingData] = useState(false);

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
      // Two ex partners with consecutive years, one current partner with 5 memories (more suns than clouds)
      // At least 5 memories, max 10 memories per profile
      // Each memory should have between 5-10 total moments (clouds + suns)
      const fakeProfiles = [
        { name: 'Mark Johnson', description: 'College sweetheart, first love', startDate: '2020-01-15', endDate: '2021-12-31', memoryCount: 10 },
        { name: 'Emma Williams', description: 'High school romance', startDate: '2021-01-01', endDate: '2022-12-31', memoryCount: 10 },
        { name: 'Olivia Brown', description: 'Long distance relationship', startDate: '2023-01-01', endDate: null, memoryCount: 5, ongoing: true },
      ];

      // Define multiple fake jobs with different characteristics
      // Two past jobs with consecutive years, one current job with 5 memories (more suns than clouds)
      const fakeJobs = [
        { name: 'Software Developer at TechCorp', description: 'My first job in tech', startDate: '2020-03-01', endDate: '2022-06-30', memoryCount: 8 },
        { name: 'Senior Developer at StartupXYZ', description: 'Fast-paced startup environment', startDate: '2022-07-01', endDate: '2023-12-31', memoryCount: 10 },
        { name: 'Lead Engineer at CurrentCompany', description: 'Current role, growing my career', startDate: '2024-01-01', endDate: null, memoryCount: 5, ongoing: true },
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

      // Create multiple profiles
      let createdProfiles = 0;
      let createdJobs = 0;
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
              console.error(`[MOCK DATA] ⚠️ WARNING: Found existing profile but ID is empty!`);
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
              console.error(`[MOCK DATA] ⚠️ ERROR: Profile creation returned empty ID!`);
              continue;
            }
            // Brief delay after creating profile to ensure it's saved to AsyncStorage
            await new Promise(resolve => setTimeout(resolve, 200));
          }

          // Check if profile already has memories - if not, create them
          const existingMemories = getIdealizedMemoriesByProfileId(profileId);
          
          // Only create memories if the profile doesn't have any yet
          if (existingMemories.length === 0) {
            // Create different amounts of memories for each profile
            const numMemories = profileData.memoryCount;
          
            let successfullyCreatedCount = 0;
          for (let i = 0; i < numMemories; i++) {
            try {
              let numClouds: number;
              let numSuns: number;
              
              // Each memory should have between 5-10 total moments (clouds + suns)
              const totalMoments = Math.floor(Math.random() * 6) + 5; // 5-10 total moments
              
              // For current partner (ongoing), ensure more suns than clouds
              if (profileData.ongoing) {
                // Current partner: more suns than clouds
                // Use 2 clouds max, rest are suns (ensures suns > clouds when totalMoments >= 5)
                numClouds = 2; // Fixed at 2 clouds
                numSuns = totalMoments - numClouds; // Rest are suns (will be 3-8, always more than clouds)
              } else {
                // Ex partners: more clouds than suns
                // Use 2 suns max, rest are clouds (ensures clouds > suns when totalMoments >= 5)
                numSuns = 2; // Fixed at 2 suns
                numClouds = totalMoments - numSuns; // Rest are clouds (will be 3-8, always more than suns)
              }
              
              // Verify we have at least 1 of each
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
                console.error(`[MOCK DATA] ✗ Error creating memory ${i} for ${profileData.name}:`, memoryError);
                // Log the full error details for debugging
                if (memoryError instanceof Error) {
                  console.error(`[MOCK DATA] Error details:`, memoryError.message, memoryError.stack);
                } else {
                  console.error(`[MOCK DATA] Error object:`, JSON.stringify(memoryError, null, 2));
                }
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
          console.error(`Error creating profile ${profileData.name}:`, profileError);
        }
      }

      // Create multiple jobs
      for (const jobData of fakeJobs) {
        try {
          const jobId = await addJob({
            name: jobData.name,
            description: jobData.description,
            startDate: jobData.startDate,
            endDate: jobData.endDate || undefined,
            isOngoing: jobData.ongoing || false,
            setupProgress: 100,
            isCompleted: true,
          });


          // Create different amounts of memories for each job
          const numMemories = jobData.memoryCount;
          
          for (let i = 0; i < numMemories; i++) {
            try {
              let numClouds: number;
              let numSuns: number;
              
              // Each memory should have between 5-10 total moments (clouds + suns)
              const totalMoments = Math.floor(Math.random() * 6) + 5; // 5-10 total moments
              
              // For current job (ongoing), ensure more suns than clouds
              if (jobData.ongoing) {
                // Current job: more suns than clouds
                numClouds = 2; // Fixed at 2 clouds
                numSuns = totalMoments - numClouds; // Rest are suns (will be 3-8, always more than clouds)
              } else {
                // Past jobs: more clouds than suns
                numSuns = 2; // Fixed at 2 suns
                numClouds = totalMoments - numSuns; // Rest are clouds (will be 3-8, always more than suns)
              }
              
              // Verify we have at least 1 of each
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
              console.error(`Error creating memory ${i} for ${jobData.name}:`, memoryError);
            }
          }
          
          createdJobs++;
          
          // Brief delay between jobs for AsyncStorage writes
          await new Promise(resolve => setTimeout(resolve, 100));
        } catch (jobError) {
          console.error(`Error creating job ${jobData.name}:`, jobError);
        }
      }

      // Reload all data to update React state after generating
      // IMPORTANT: Load profiles and jobs FIRST, then memories (which runs cleanup)
      // This ensures cleanup can find the entities it needs to validate memories
      try {
        // Load profiles and jobs first
        await Promise.all([
          reloadProfiles(),
          reloadJobs(),
        ]);
        
        // Then load memories (cleanup will now find the profiles/jobs in storage)
        await reloadIdealizedMemories();
      } catch (reloadError) {
        console.error('[MOCK DATA] Error reloading data:', reloadError);
        // Continue anyway - data is in storage even if state update fails
      }

      Alert.alert(
        t('common.success'), 
        t('settings.devTools.generateData.success')
          .replace('{profiles}', createdProfiles.toString())
          .replace('{jobs}', createdJobs.toString())
          .replace('{memories}', createdMemories.toString()),
        [{ text: t('common.ok') }]
      );
    } catch (error) {
      console.error('Error generating fake data:', error);
      Alert.alert(t('common.error'), t('settings.devTools.generateData.error'));
    } finally {
      setIsGeneratingFakeData(false);
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
              const STORAGE_KEY = '@closure:ex_profiles';
              const IDEALIZED_MEMORIES_KEY = '@closure:idealized_memories';
              const JOBS_STORAGE_KEY = '@closure:jobs';
              const FAMILY_MEMBERS_STORAGE_KEY = '@closure:family_members';
              const AVATAR_POSITIONS_KEY = '@closure:avatar_positions';
              
              await Promise.all([
                AsyncStorage.removeItem(STORAGE_KEY),
                AsyncStorage.removeItem(IDEALIZED_MEMORIES_KEY),
                AsyncStorage.removeItem(JOBS_STORAGE_KEY),
                AsyncStorage.removeItem(FAMILY_MEMBERS_STORAGE_KEY),
                AsyncStorage.removeItem(AVATAR_POSITIONS_KEY),
              ]);
              
              // Reload all data from storage to update state immediately
              await Promise.all([
                reloadIdealizedMemories(),
                reloadProfiles(),
                reloadJobs(),
              ]);
              
              // Show success message
              Alert.alert(
                t('common.success'),
                t('settings.devTools.clearData.success'),
                [{ text: t('common.ok') }]
              );
            } catch (error) {
              console.error('[Settings] Error clearing app data:', error);
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
