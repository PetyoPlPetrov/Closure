import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useFontScale } from '@/hooks/use-device-size';
import { useLargeDevice } from '@/hooks/use-large-device';
import { OnboardingStepper } from '@/library/components/onboarding-stepper';
import { TabScreenContainer } from '@/library/components/tab-screen-container';
import { useJourney } from '@/utils/JourneyProvider';
import { useLanguage } from '@/utils/languages/language-context';
import { useTranslate } from '@/utils/languages/use-translate';
import { resetStreakData } from '@/utils/streak-manager';
import { useSubscription } from '@/utils/SubscriptionProvider';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Asset } from 'expo-asset';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Alert, DimensionValue, Modal, Pressable, ScrollView, StyleSheet, TextStyle, TouchableOpacity, View, ViewStyle } from 'react-native';

export default function SettingsScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'dark'];
  const fontScale = useFontScale();
  const { maxContentWidth } = useLargeDevice();
  const { language, setLanguage } = useLanguage();
  const { addProfile, addJob, addFamilyMember, addFriend, addHobby, addIdealizedMemory, profiles, jobs, familyMembers, friends, hobbies, getIdealizedMemoriesByProfileId, getIdealizedMemoriesByEntityId, reloadIdealizedMemories, reloadProfiles, reloadJobs, reloadFamilyMembers, reloadFriends, reloadHobbies, cleanupOrphanedMemories } = useJourney();
  const { presentPaywall } = useSubscription();
  const t = useTranslate();
  const [languageDropdownVisible, setLanguageDropdownVisible] = useState(false);
  const [isGeneratingFakeData, setIsGeneratingFakeData] = useState(false);
  const [isDeletingData, setIsDeletingData] = useState(false);
  const [isCleaningMemories, setIsCleaningMemories] = useState(false);
  const [onboardingVisible, setOnboardingVisible] = useState(false);

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


  const handleNotificationsPress = async () => {
    router.push('/notifications');
  };

  const handlePresentPaywall = useCallback(async () => {
    try {
      const success = await presentPaywall();
      if (success) {
        Alert.alert(
          t('subscription.success.title'),
          t('subscription.success.message'),
          [{ text: t('common.ok') }]
        );
      }
      // If cancelled or error, just return without showing alert
    } catch (error: any) {
      Alert.alert(
        t('subscription.error.title'),
        error.message || t('subscription.error.message'),
        [{ text: t('common.ok') }]
      );
    }
  }, [presentPaywall, t]);

  const generateFakeData = async () => {
    if (isGeneratingFakeData) return;
    
    setIsGeneratingFakeData(true);
        try {
          // Load memory/moment images
          const memoryImages = [
            require('@/assets/images/fake-memory-1.jpg'),
            require('@/assets/images/fake-memory-2.jpg'),
            require('@/assets/images/fake-memory-3.jpg'),
            require('@/assets/images/fake-memory-4.jpg'),
            require('@/assets/images/fake-memory-5.jpg'),
            require('@/assets/images/fake-memory-6.jpg'),
            require('@/assets/images/fake-memory-7.jpg'),
            require('@/assets/images/fake-memory-8.jpg'),
            require('@/assets/images/fake-memory-9.jpg'),
            require('@/assets/images/fake-memory-10.jpg'),
            require('@/assets/images/fake-memory-11.jpg'),
            require('@/assets/images/fake-memory-12.jpg'),
          ];

          // Preload all memory images
          const memoryImageUris: string[] = [];
          for (const memoryImg of memoryImages) {
            const asset = Asset.fromModule(memoryImg);
            await asset.downloadAsync();
            memoryImageUris.push(asset.localUri || asset.uri);
          }

          // Helper to get a random memory image
          const getRandomMemoryImage = () => {
            const randomIndex = Math.floor(Math.random() * memoryImageUris.length);
            return memoryImageUris[randomIndex];
          };

          // Map entity names to their local asset images
          // Using try-catch for each require to handle missing images gracefully
          const getEntityImageAsset = (entityName: string, category: 'profile' | 'job' | 'family' | 'friend' | 'hobby') => {
            try {
              const imageMap: Record<string, any> = {
                // Profiles (Relationships)
                'Mark Johnson': require('@/assets/images/fake-profile-mark.jpg'),
                'Emma Williams': require('@/assets/images/fake-profile-emma.jpg'),
                'Olivia Brown': require('@/assets/images/fake-profile-olivia.jpg'),
                'Sophia Martinez': require('@/assets/images/fake-profile-sophia.jpg'),
                'James Wilson': require('@/assets/images/fake-profile-james.jpg'),

                // Jobs (Career)
                'Software Developer at TechCorp': require('@/assets/images/fake-job-techcorp.jpg'),
                'Senior Developer at StartupXYZ': require('@/assets/images/fake-job-startup.jpg'),
                'Lead Engineer at CurrentCompany': require('@/assets/images/fake-job-current.jpg'),
                'Junior Developer at WebSolutions': require('@/assets/images/fake-job-websolutions.jpg'),
                'Full Stack Developer at DigitalAgency': require('@/assets/images/fake-job-digitalagency.jpg'),

                // Family Members
                'Sarah Johnson': require('@/assets/images/fake-family-sarah.jpg'),
                'Michael Johnson': require('@/assets/images/fake-family-michael.jpg'),
                'Maria Johnson': require('@/assets/images/fake-family-maria.jpg'),
                'Robert Johnson': require('@/assets/images/fake-family-robert.jpg'),
                'Emily Johnson': require('@/assets/images/fake-family-emily.jpg'),

                // Friends
                'Alex Thompson': require('@/assets/images/fake-friend-alex.jpg'),
                'Jessica Martinez': require('@/assets/images/fake-friend-jessica.jpg'),
                'David Chen': require('@/assets/images/fake-friend-david.jpg'),
                'Sophie Anderson': require('@/assets/images/fake-friend-sophie.jpg'),
                'Ryan Taylor': require('@/assets/images/fake-friend-ryan.jpg'),
                'Maya Patel': require('@/assets/images/fake-friend-maya.jpg'),

                // Hobbies
                'Photography': require('@/assets/images/fake-hobby-photography.jpg'),
                'Reading': require('@/assets/images/fake-hobby-reading.jpg'),
                'Cooking': require('@/assets/images/fake-hobby-cooking.jpg'),
                'Hiking': require('@/assets/images/fake-hobby-hiking.jpg'),
                'Yoga': require('@/assets/images/fake-hobby-yoga.jpg'),
                'Painting': require('@/assets/images/fake-hobby-painting.jpg'),
              };
              
              return imageMap[entityName] || null;
            } catch (_error) {
              // If require fails, return null to fall back to Unsplash
              return null;
            }
          };

          // Get entity image URI from local asset
          const getEntityImageUri = async (entityName: string, category: 'profile' | 'job' | 'family' | 'friend' | 'hobby'): Promise<string> => {
            const asset = getEntityImageAsset(entityName, category);
            if (asset) {
              const imageAsset = Asset.fromModule(asset);
              await imageAsset.downloadAsync();
              return imageAsset.localUri || imageAsset.uri;
            }
            // Fallback to Unsplash if local asset not found
            const hash = entityName.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
            const categoryTerms: Record<string, string> = {
              profile: 'couple,romance,people',
              job: 'office,business,workplace',
              family: 'family,people,portrait',
              friend: 'friends,people,group',
              hobby: 'hobby,activity,creative',
            };
            return `https://source.unsplash.com/400x400/?${categoryTerms[category]}&sig=${hash}`;
          };

      // Define multiple fake profiles with different names and characteristics
      // Random number of memories between 1 and 8 per profile
      const fakeProfiles = [
        { name: 'Mark Johnson', description: 'College sweetheart, first love', startDate: '2020-01-15', endDate: '2021-12-31' },
        { name: 'Emma Williams', description: 'High school romance', startDate: '2021-01-01', endDate: '2022-12-31' },
        { name: 'Olivia Brown', description: 'Long distance relationship', startDate: '2023-01-01', endDate: null, ongoing: true },
        { name: 'Sophia Martinez', description: 'Met at a coffee shop, instant connection', startDate: '2019-06-01', endDate: '2020-05-31' },
        { name: 'James Wilson', description: 'University classmate, shared interests', startDate: '2022-03-15', endDate: '2023-08-30' },
      ];

      // Define multiple fake jobs with different characteristics
      // Random number of memories between 1 and 8 per job
      const fakeJobs = [
        { name: 'Software Developer at TechCorp', description: 'My first job in tech', startDate: '2020-03-01', endDate: '2022-06-30' },
        { name: 'Senior Developer at StartupXYZ', description: 'Fast-paced startup environment', startDate: '2022-07-01', endDate: '2023-12-31' },
        { name: 'Lead Engineer at CurrentCompany', description: 'Current role, growing my career', startDate: '2024-01-01', endDate: null, ongoing: true },
        { name: 'Junior Developer at WebSolutions', description: 'Started my career journey here', startDate: '2019-01-15', endDate: '2020-02-28' },
        { name: 'Full Stack Developer at DigitalAgency', description: 'Creative projects and diverse clients', startDate: '2021-09-01', endDate: '2022-06-15' },
      ];

      // Define multiple fake family members with different characteristics
      // Random number of memories between 1 and 8 per family member
      const fakeFamilyMembers = [
        { name: 'Sarah Johnson', relationship: 'Sister', description: 'My older sister and best friend' },
        { name: 'Michael Johnson', relationship: 'Brother', description: 'My younger brother' },
        { name: 'Maria Johnson', relationship: 'Mother', description: 'My loving mother' },
        { name: 'Robert Johnson', relationship: 'Father', description: 'My supportive father' },
        { name: 'Emily Johnson', relationship: 'Sister', description: 'My youngest sister' },
      ];

      // Define multiple fake friends with different characteristics
      // Random number of memories between 1 and 8 per friend
      const fakeFriends = [
        { name: 'Alex Thompson', description: 'College roommate and best friend' },
        { name: 'Jessica Martinez', description: 'Childhood friend, always there for me' },
        { name: 'David Chen', description: 'Work friend turned close friend' },
        { name: 'Sophie Anderson', description: 'Gym buddy and confidant' },
        { name: 'Ryan Taylor', description: 'High school friend, shared many adventures' },
        { name: 'Maya Patel', description: 'Book club friend, deep conversations' },
      ];

      // Define multiple fake hobbies with different characteristics
      // Random number of memories between 1 and 8 per hobby
      const fakeHobbies = [
        { name: 'Photography', description: 'Capturing beautiful moments' },
        { name: 'Reading', description: 'Exploring new worlds through books' },
        { name: 'Cooking', description: 'Creating delicious meals' },
        { name: 'Hiking', description: 'Exploring nature trails' },
        { name: 'Yoga', description: 'Finding peace and balance' },
        { name: 'Painting', description: 'Expressing creativity through art' },
      ];

      // Prefetch all entity images before creating entities
      const prefetchEntityImages = async () => {
        const imagePromises: Promise<string>[] = [];
        
        // Collect all image URIs that will be used
        for (const profile of fakeProfiles) {
          imagePromises.push(getEntityImageUri(profile.name, 'profile'));
        }
        for (const job of fakeJobs) {
          imagePromises.push(getEntityImageUri(job.name, 'job'));
        }
        for (const member of fakeFamilyMembers) {
          imagePromises.push(getEntityImageUri(member.name, 'family'));
        }
        for (const friend of fakeFriends) {
          imagePromises.push(getEntityImageUri(friend.name, 'friend'));
        }
        for (const hobby of fakeHobbies) {
          imagePromises.push(getEntityImageUri(hobby.name, 'hobby'));
        }
        
        // Get all image URIs
        const imageUrls = await Promise.all(imagePromises);
        
        // Prefetch all images in parallel (only for remote URLs)
        try {
          await Promise.all(imageUrls.map(url => {
            if (url.startsWith('http')) {
              return Image.prefetch(url).catch(() => {
                // Ignore individual prefetch errors - images will still load when needed
              });
            }
            return Promise.resolve(); // Local assets don't need prefetching
          }));
        } catch (_error) {
          // Prefetch errors are non-critical - images will load on demand
        }
      };

      // Prefetch all entity images before starting entity creation
      await prefetchEntityImages();

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

      const lessonTexts = [
        'I learned to set better boundaries',
        'Communication is key in relationships',
        'Trust must be earned and maintained',
        'Self-love comes before everything',
        'Red flags should never be ignored',
        'I deserve someone who values me',
        'Honesty is non-negotiable',
        'I grew stronger through this',
        'Time reveals true character',
        'My needs matter just as much',
        'Compatibility goes beyond attraction',
        'Actions speak louder than words',
        'I learned what I truly need',
        'Healing takes time and patience',
        'I am worthy of genuine love',
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

      const careerLessonTexts = [
        'Work-life balance is essential',
        'Value yourself and your skills',
        'Company culture matters more than perks',
        'Growth opportunities are crucial',
        'Know when to move on',
        'Build relationships, not just skills',
        'Stand up for your worth',
        'Continuous learning is key',
        'Choose alignment over prestige',
        'Your career, your rules',
        'Feedback helps you grow',
        'Mentorship is invaluable',
        'Take calculated risks',
        'Celebrate your achievements',
        'Find work that fulfills you',
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

      const familyLessonTexts = [
        'Family bonds can withstand challenges',
        'Setting boundaries is healthy',
        'Communication is essential',
        'Accept differences with love',
        'Family shapes who we become',
        'Forgiveness brings peace',
        'Quality time matters most',
        'Express love and appreciation',
        'Everyone shows love differently',
        'Create your own traditions',
        'Respect goes both ways',
        'Be present for each other',
        'Cherish the moments together',
        'Family is chosen too',
        'Growth requires understanding',
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

      const friendsLessonTexts = [
        'True friends show up when it matters',
        'Quality over quantity in friendships',
        'Communication keeps friendships strong',
        'Mutual respect is essential',
        'Friendships require effort from both sides',
        'Be the friend you want to have',
        'Some friendships are for a season',
        'Vulnerability deepens connection',
        'Celebrate your friends\' successes',
        'Forgiveness strengthens bonds',
        'Make time for important people',
        'Authenticity attracts real friends',
        'Distance tests true friendship',
        'Choose friends who lift you up',
        'Friendship is a two-way street',
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

      const hobbiesLessonTexts = [
        'Progress matters more than perfection',
        'Enjoy the journey, not just results',
        'Make time for what brings joy',
        'Creativity requires practice',
        'It\'s okay to be a beginner',
        'Hobbies recharge your soul',
        'Growth happens gradually',
        'Passion fuels persistence',
        'Self-expression is valuable',
        'Challenge yourself regularly',
        'Find balance in life',
        'Celebrate small wins',
        'Learning never stops',
        'Enjoy the process',
        'Hobbies define who you are',
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
              imageUri: await getEntityImageUri(profileData.name, 'profile'),
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
                // Ex partners: sunny moments prevail (80% suns, 20% clouds)
                const sunsFromRemaining = Math.floor(remainingMoments * 0.8);
                numSuns = 1 + sunsFromRemaining;
                numClouds = 1 + (remainingMoments - sunsFromRemaining);
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

              // Add 1-3 lessons learned per memory
              const numLessons = Math.floor(Math.random() * 3) + 1; // 1-3 lessons
              const lessonsLearned = [];
              for (let j = 0; j < numLessons; j++) {
                lessonsLearned.push({
                  id: `lesson_${profileData.name}_${i}_${j}_${Date.now()}_${Math.random()}`,
                  text: lessonTexts[Math.floor(Math.random() * lessonTexts.length)],
                  x: Math.random() * 300 + 50,
                  y: Math.random() * 400 + 50,
                });
              }

              // Use different memory titles for variety
              const memoryTitle = memoryTitles[i % memoryTitles.length] + ` (${i + 1})`;

                // Use explicit sphere parameter to ensure memories are created for relationships
                await addIdealizedMemory(profileId, 'relationships', {
                title: memoryTitle,
                imageUri: getRandomMemoryImage(),
                hardTruths,
                goodFacts,
                lessonsLearned,
              });
              
              createdMemories++;
                successfullyCreatedCount++;

                // Small delay to allow AsyncStorage write to complete
                await new Promise(resolve => setTimeout(resolve, 50));
            } catch (_memoryError) {
                // Don't increment createdMemories if it failed
              }
            }
          } else {
            // Profile already has memories, skip creation
          }
          
          createdProfiles++;

          // Brief delay between profiles for AsyncStorage writes
          await new Promise(resolve => setTimeout(resolve, 100));
        } catch (_profileError) {
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
              imageUri: await getEntityImageUri(jobData.name, 'job'),
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
                // Past jobs: sunny moments prevail (80% suns, 20% clouds)
                const sunsFromRemaining = Math.floor(remainingMoments * 0.8);
                numSuns = 1 + sunsFromRemaining;
                numClouds = 1 + (remainingMoments - sunsFromRemaining);
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

              // Add 1-3 lessons learned per memory
              const numLessons = Math.floor(Math.random() * 3) + 1;
              const lessonsLearned = [];
              for (let j = 0; j < numLessons; j++) {
                lessonsLearned.push({
                  id: `lesson_${jobData.name}_${i}_${j}_${Date.now()}_${Math.random()}`,
                  text: careerLessonTexts[Math.floor(Math.random() * careerLessonTexts.length)],
                  x: Math.random() * 300 + 50,
                  y: Math.random() * 400 + 50,
                });
              }

              // Use new signature for career sphere: (entityId, sphere, memoryData)
              await addIdealizedMemory(jobId, 'career', {
                title: memoryTitle,
                imageUri: getRandomMemoryImage(),
                hardTruths,
                goodFacts,
                lessonsLearned,
              });
              
              createdMemories++;

              // Brief delay to allow AsyncStorage write to complete
              await new Promise(resolve => setTimeout(resolve, 50));
            } catch (_memoryError) {
              // Error creating memory
            }
          }
          } else {
            // Job already has memories, skip creation
          }
          
          createdJobs++;

          // Brief delay between jobs for AsyncStorage writes
          await new Promise(resolve => setTimeout(resolve, 100));
        } catch (_jobError) {
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
              imageUri: await getEntityImageUri(memberData.name, 'family'),
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
                
                // For family, sunny moments strongly prevail (85% suns, 15% clouds)
                const sunsFromRemaining = Math.floor(remainingMoments * 0.85);
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

                // Add 1-3 lessons learned per memory
                const numLessons = Math.floor(Math.random() * 3) + 1;
                const lessonsLearned = [];
                for (let j = 0; j < numLessons; j++) {
                  lessonsLearned.push({
                    id: `lesson_${memberData.name}_${i}_${j}_${Date.now()}_${Math.random()}`,
                    text: familyLessonTexts[Math.floor(Math.random() * familyLessonTexts.length)],
                    x: Math.random() * 300 + 50,
                    y: Math.random() * 400 + 50,
                  });
                }

                await addIdealizedMemory(memberId, 'family', {
                  title: memoryTitle,
                  imageUri: getRandomMemoryImage(),
                  hardTruths,
                  goodFacts,
                  lessonsLearned,
                });
                
                createdMemories++;

                await new Promise(resolve => setTimeout(resolve, 50));
              } catch (_memoryError) {
                // Error creating memory
              }
            }
          }
          
          createdFamilyMembers++;

          await new Promise(resolve => setTimeout(resolve, 100));
        } catch (_memberError) {
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
              imageUri: await getEntityImageUri(friendData.name, 'friend'),
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
                // For friends, sunny moments strongly prevail (85% suns, 15% clouds)
                const sunsFromRemaining = Math.floor(remainingMoments * 0.85);
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

                // Add 1-3 lessons learned per memory
                const numLessons = Math.floor(Math.random() * 3) + 1;
                const lessonsLearned = [];
                for (let j = 0; j < numLessons; j++) {
                  lessonsLearned.push({
                    id: `lesson_${friendData.name}_${i}_${j}_${Date.now()}_${Math.random()}`,
                    text: friendsLessonTexts[Math.floor(Math.random() * friendsLessonTexts.length)],
                    x: Math.random() * 300 + 50,
                    y: Math.random() * 400 + 50,
                  });
                }

                await addIdealizedMemory(friendId, 'friends', {
                  title: memoryTitle,
                  imageUri: getRandomMemoryImage(),
                  hardTruths,
                  goodFacts,
                  lessonsLearned,
                });

                createdMemories++;
                await new Promise(resolve => setTimeout(resolve, 50));
              } catch (_memoryError) {
                // Error creating memory
              }
            }
          }

          createdFriends++;
          await new Promise(resolve => setTimeout(resolve, 100));
        } catch (_friendError) {
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
              imageUri: await getEntityImageUri(hobbyData.name, 'hobby'),
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
                // For hobbies, sunny moments very strongly prevail (90% suns, 10% clouds)
                const sunsFromRemaining = Math.floor(remainingMoments * 0.9);
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

                // Add 1-3 lessons learned per memory
                const numLessons = Math.floor(Math.random() * 3) + 1;
                const lessonsLearned = [];
                for (let j = 0; j < numLessons; j++) {
                  lessonsLearned.push({
                    id: `lesson_${hobbyData.name}_${i}_${j}_${Date.now()}_${Math.random()}`,
                    text: hobbiesLessonTexts[Math.floor(Math.random() * hobbiesLessonTexts.length)],
                    x: Math.random() * 300 + 50,
                    y: Math.random() * 400 + 50,
                  });
                }

                await addIdealizedMemory(hobbyId, 'hobbies', {
                  title: memoryTitle,
                  imageUri: getRandomMemoryImage(),
                  hardTruths,
                  goodFacts,
                  lessonsLearned,
                });

                createdMemories++;
                await new Promise(resolve => setTimeout(resolve, 50));
              } catch (_memoryError) {
                // Error creating memory
              }
            }
          }

          createdHobbies++;
          await new Promise(resolve => setTimeout(resolve, 100));
        } catch (_hobbyError) {
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
      } catch (_reloadError) {
        // Continue anyway - data is in storage even if state update fails
      }

      Alert.alert(
        t('common.success'), 
        `Created ${createdProfiles} profiles, ${createdJobs} jobs, ${createdFamilyMembers} family members, ${createdFriends} friends, ${createdHobbies} hobbies, and ${createdMemories} total memories`,
        [{ text: t('common.ok') }]
      );
    } catch (_error) {
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
    } catch (_error) {
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
                resetStreakData(), // Reset streak data
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
              
              // Note: After clearing data, the walkthrough will appear automatically
              // when the user navigates to the spheres tab (handled in spheres.tsx)
              
              // Show success message
              Alert.alert(
                t('common.success'),
                t('settings.devTools.clearData.success'),
                [{ text: t('common.ok') }]
              );
            } catch (_error) {
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
            {t('settings.notifications.title')}
          </ThemedText>

          <TouchableOpacity
            style={styles.dropdown}
            onPress={handleNotificationsPress}
            activeOpacity={0.7}
          >
            <View style={styles.dropdownContent}>
              <MaterialIcons
                name="notifications-active"
                size={24 * fontScale}
                color={colors.primary}
              />
              <ThemedText
                size="l"
                weight="medium"
                style={styles.dropdownText}
              >
                {t('settings.notifications.manage')}
              </ThemedText>
            </View>
            <MaterialIcons
              name="arrow-forward-ios"
              size={20 * fontScale}
              color={colors.text}
            />
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <ThemedText size="l" weight="semibold" style={styles.sectionTitle}>
            {t('settings.subscriptions.title')}
          </ThemedText>

          <TouchableOpacity
            style={styles.dropdown}
            onPress={handlePresentPaywall}
            activeOpacity={0.7}
          >
            <View style={styles.dropdownContent}>
              <MaterialIcons
                name="star"
                size={24 * fontScale}
                color={colors.primary}
              />
              <ThemedText
                size="l"
                weight="medium"
                style={styles.dropdownText}
              >
                {t('settings.subscriptions.premium')}
              </ThemedText>
            </View>
            <MaterialIcons
              name="arrow-forward-ios"
              size={20 * fontScale}
              color={colors.text}
            />
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <ThemedText size="l" weight="semibold" style={styles.sectionTitle}>
            {t('settings.help.title')}
          </ThemedText>

          <TouchableOpacity
            style={styles.dropdown}
            onPress={() => setOnboardingVisible(true)}
            activeOpacity={0.7}
          >
            <View style={styles.dropdownContent}>
              <MaterialIcons
                name="help-outline"
                size={24 * fontScale}
                color={colors.primary}
              />
              <ThemedText
                size="l"
                weight="medium"
                style={styles.dropdownText}
              >
                {t('settings.help.viewGuide')}
              </ThemedText>
            </View>
            <MaterialIcons
              name="arrow-forward-ios"
              size={20 * fontScale}
              color={colors.text}
            />
          </TouchableOpacity>
        </View>

        {/* Development Tools Section */}
        <View style={styles.section}>
          {/* Generate Fake Data Button - Only visible in development */}
          {__DEV__ && (
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
                  {isGeneratingFakeData ? t('settings.devTools.generateData.generating') : t('settings.devTools.generateData.button')}
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
          )}

          <TouchableOpacity
            style={[
              styles.dropdown,
              isDeletingData && { opacity: 0.5 },
              { borderColor: colors.error || '#ff4444', borderWidth: 1, marginTop: __DEV__ ? 12 * fontScale : 0 }
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
                {isDeletingData ? t('settings.devTools.clearData.deleting') : t('settings.devTools.clearData.button')}
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

      <OnboardingStepper
        visible={onboardingVisible}
        onDismiss={() => setOnboardingVisible(false)}
      />
    </TabScreenContainer>
  );
}
