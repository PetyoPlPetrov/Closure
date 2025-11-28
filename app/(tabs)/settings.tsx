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
import { Alert, DimensionValue, Modal, Pressable, ScrollView, StyleSheet, TextStyle, TouchableOpacity, View, ViewStyle } from 'react-native';

export default function SettingsScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'dark'];
  const fontScale = useFontScale();
  const { maxContentWidth } = useLargeDevice();
  const { language, setLanguage } = useLanguage();
  const { themeMode, setThemeMode } = useTheme();
  const { addProfile, addIdealizedMemory, profiles } = useJourney();
  const t = useTranslate();
  const [languageDropdownVisible, setLanguageDropdownVisible] = useState(false);
  const [themeDropdownVisible, setThemeDropdownVisible] = useState(false);
  const [isGeneratingFakeData, setIsGeneratingFakeData] = useState(false);

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
      // Max 10 memories per profile
      const fakeProfiles = [
        { name: 'Mark Johnson', description: 'College sweetheart, first love', startDate: '2020-01-15', endDate: '2021-12-31', memoryCount: 10 },
        { name: 'Emma Williams', description: 'High school romance', startDate: '2021-01-01', endDate: '2022-12-31', memoryCount: 10 },
        { name: 'Olivia Brown', description: 'Long distance relationship', startDate: '2023-01-01', endDate: null, memoryCount: 5, ongoing: true },
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

      // Create multiple profiles
      let createdProfiles = 0;
      let createdMemories = 0;
      
      for (const profileData of fakeProfiles) {
        try {
          console.log(`Creating profile: ${profileData.name} with ${profileData.memoryCount} memories`);
          
          const profileId = await addProfile({
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

          console.log(`Profile ${profileData.name} created with ID: ${profileId}`);

          // Create different amounts of memories for each profile
          const numMemories = profileData.memoryCount;
          
          for (let i = 0; i < numMemories; i++) {
            try {
              let numClouds: number;
              let numSuns: number;
              
              // For current partner (ongoing), ensure more suns than clouds overall
              if (profileData.ongoing) {
                // Current partner: create positive memories with more suns than clouds
                // Each memory should have more suns than clouds
                numClouds = Math.floor(Math.random() * 4) + 2;   // 2-5 clouds
                numSuns = Math.floor(Math.random() * 6) + 6;     // 6-11 suns (always more than clouds)
              } else {
                // Ex partners: bias towards more negative moments (more clouds than suns)
                // Use weighted distribution: 60% very negative, 20% negative, 15% balanced, 5% positive
                const random = Math.random();
                
                if (random < 0.6) {
                  // Very negative memories (60%): many clouds, few suns
                  numClouds = Math.floor(Math.random() * 10) + 10; // 10-19 clouds
                  numSuns = Math.floor(Math.random() * 3) + 1;     // 1-3 suns
                } else if (random < 0.8) {
                  // Negative memories (20%): more clouds than suns
                  numClouds = Math.floor(Math.random() * 8) + 8;    // 8-15 clouds
                  numSuns = Math.floor(Math.random() * 5) + 2;     // 2-6 suns
                } else if (random < 0.95) {
                  // Balanced memories (15%): roughly equal
                  numClouds = Math.floor(Math.random() * 6) + 5;    // 5-10 clouds
                  numSuns = Math.floor(Math.random() * 6) + 4;     // 4-9 suns
                } else {
                  // Positive memories (5%): more suns, but still some clouds
                  numClouds = Math.floor(Math.random() * 4) + 2;   // 2-5 clouds
                  numSuns = Math.floor(Math.random() * 8) + 6;     // 6-13 suns
                }
              }
              
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

              await addIdealizedMemory(profileId, {
                title: memoryTitle,
                imageUri: maldivesImageUri,
                hardTruths,
                goodFacts,
              });
              
              createdMemories++;
              console.log(`Created memory ${i + 1}/${numMemories} for ${profileData.name} (${numClouds} clouds, ${numSuns} suns)`);
              
              // Small delay to ensure state updates between memories
              await new Promise(resolve => setTimeout(resolve, 100));
            } catch (memoryError) {
              console.error(`Error creating memory ${i} for ${profileData.name}:`, memoryError);
            }
          }
          
          createdProfiles++;
          console.log(`Completed profile ${profileData.name}: ${numMemories} memories created`);
          
          // Wait a bit longer between profiles to ensure all memories are saved
          await new Promise(resolve => setTimeout(resolve, 300));
        } catch (profileError) {
          console.error(`Error creating profile ${profileData.name}:`, profileError);
        }
      }

      Alert.alert('Success', `Created ${createdProfiles} profiles with ${createdMemories} total memories!`);
    } catch (error) {
      console.error('Error generating fake data:', error);
      Alert.alert('Error', 'Failed to generate fake data. Please try again.');
    } finally {
      setIsGeneratingFakeData(false);
    }
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
                {isGeneratingFakeData ? 'Generating...' : 'Generate Fake Profile & Memories'}
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
        </View>
      </ScrollView>
    </TabScreenContainer>
  );
}
