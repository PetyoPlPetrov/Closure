import { ConstellationBackground } from '@/components/constellation-background';
import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useFontScale } from '@/hooks/use-device-size';
import { TabScreenContainer } from '@/library/components/tab-screen-container';
import { useVisualSettings } from '@/utils/VisualSettingsProvider';
import {
  ENTITIES_DISPLAY_MODE_STORAGE_KEY,
  type EntitiesDisplayMode,
} from '@/utils/entities-display-mode-storage';
import type { Hobby } from '@/utils/JourneyProvider';
import { useJourney } from '@/utils/JourneyProvider';
import { useTranslate } from '@/utils/languages/use-translate';
import { useMomentColors } from '@/utils/MomentColorsProvider';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Dimensions, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function HobbyDetailScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'dark'];
  const fontScale = useFontScale();
  const t = useTranslate();
  const { momentColors } = useMomentColors();
  const { constellationAmount, constellationOpacity } = useVisualSettings();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [displayMode, setDisplayMode] = useState<EntitiesDisplayMode>('orbit');
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const raw = await AsyncStorage.getItem(ENTITIES_DISPLAY_MODE_STORAGE_KEY);
      if (cancelled) return;
      if (raw === 'orbit' || raw === 'list') setDisplayMode(raw);
    })();
    return () => { cancelled = true; };
  }, []);
  const toggleDisplayMode = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setDisplayMode((prev) => {
      const next = prev === 'orbit' ? 'list' : 'orbit';
      void AsyncStorage.setItem(ENTITIES_DISPLAY_MODE_STORAGE_KEY, next);
      return next;
    });
  }, []);
  const isListMode = displayMode === 'list';

  const { hobbies, getIdealizedMemoriesByEntityId } = useJourney();

  const hobby = useMemo(() => {
    return hobbies.find(h => h.id === id);
  }, [hobbies, id]);

  const memories = useMemo(() => {
    if (!id) return [];
    return getIdealizedMemoriesByEntityId(id, 'hobbies');
  }, [id, getIdealizedMemoriesByEntityId]);

  // Calculate comparison with other hobbies
  const comparisonData = useMemo(() => {
    if (!hobby || memories.length === 0) return null;

    const allHobbies = hobbies.filter(h => {
      const hobbyMemories = getIdealizedMemoriesByEntityId(h.id, 'hobbies');
      return hobbyMemories.length > 0;
    });

    if (allHobbies.length <= 1) return null;

    // Calculate current hobby's quality
    let currentSunny = 0;
    let currentCloudy = 0;
    memories.forEach((memory) => {
      currentSunny += (memory.goodFacts || []).length;
      currentCloudy += (memory.hardTruths || []).length;
    });
    const currentTotal = currentSunny + currentCloudy;
    const currentSunnyPercentage = currentTotal > 0 ? (currentSunny / currentTotal) * 100 : 0;

    const currentMemoriesCount = memories.length;
    const otherHobbies = allHobbies.filter(h => h.id !== hobby.id);
    
    const otherData = otherHobbies.map(h => {
      const hobbyMemories = getIdealizedMemoriesByEntityId(h.id, 'hobbies');
      let sunny = 0;
      let cloudy = 0;
      hobbyMemories.forEach((memory) => {
        sunny += (memory.goodFacts || []).length;
        cloudy += (memory.hardTruths || []).length;
      });
      const total = sunny + cloudy;
      const sunnyPercentage = total > 0 ? (sunny / total) * 100 : 0;
      return {
        count: hobbyMemories.length,
        sunnyPercentage,
      };
    });

    const averageOtherMemories = otherData.reduce((sum, data) => sum + data.count, 0) / otherData.length;
    const averageOtherSunnyPercentage = otherData.reduce((sum, data) => sum + data.sunnyPercentage, 0) / otherData.length;
    
    const countDifference = currentMemoriesCount - averageOtherMemories;
    const countThreshold = averageOtherMemories * 0.2; // 20% threshold
    
    const qualityDifference = currentSunnyPercentage - averageOtherSunnyPercentage;
    const qualityThreshold = 10; // 10% difference is significant

    // Determine count comparison
    let countComparison: 'more' | 'less' | 'same';
    if (Math.abs(countDifference) <= countThreshold) {
      countComparison = 'same';
    } else if (countDifference > countThreshold) {
      countComparison = 'more';
    } else {
      countComparison = 'less';
    }

    // Determine quality comparison
    let qualityComparison: 'better' | 'worse' | 'same';
    if (Math.abs(qualityDifference) <= qualityThreshold) {
      qualityComparison = 'same';
    } else if (qualityDifference > qualityThreshold) {
      qualityComparison = 'better';
    } else {
      qualityComparison = 'worse';
    }

    // Generate message - use family messages as template since structure is similar
    const messageKey = `insights.detail.family.memories.${countComparison}.${qualityComparison}`;
    return {
      type: countComparison,
      message: t(messageKey as keyof import('@/utils/languages/translations').Translations),
    };
  }, [hobby, memories, hobbies, getIdealizedMemoriesByEntityId, t]);

  const styles = useMemo(() => StyleSheet.create({
    container: {
      flex: 1,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20 * fontScale,
      paddingTop: 32 * fontScale,
      paddingBottom: 16 * fontScale,
      marginTop: 50,
      borderBottomWidth: 1,
      borderBottomColor: colorScheme === 'dark' 
        ? 'rgba(255, 255, 255, 0.1)' 
        : 'rgba(0, 0, 0, 0.1)',
    },
    headerButton: {
      minWidth: 44,
      minHeight: 44,
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerTitle: {
      flex: 1,
      textAlign: 'center',
      marginHorizontal: 16 * fontScale,
    },
    content: {
      paddingHorizontal: 20 * fontScale,
      paddingTop: 24 * fontScale,
    },
    profileHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 24 * fontScale,
      gap: 16 * fontScale,
    },
    avatarContainer: {
      width: 64 * fontScale,
      height: 64 * fontScale,
      borderRadius: 32 * fontScale,
      overflow: 'hidden',
      backgroundColor: colorScheme === 'dark' 
        ? 'rgba(255, 255, 255, 0.1)' 
        : 'rgba(0, 0, 0, 0.1)',
    },
    avatar: {
      width: '100%',
      height: '100%',
    },
    avatarPlaceholder: {
      width: '100%',
      height: '100%',
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: '#8b5cf640',
    },
    profileInfo: {
      flex: 1,
    },
    profileName: {
      marginBottom: 4 * fontScale,
    },
    comparisonCard: {
      borderRadius: 12 * fontScale,
      padding: 16 * fontScale,
      marginBottom: 24 * fontScale,
      backgroundColor: colorScheme === 'dark' 
        ? 'rgba(255, 255, 255, 0.05)' 
        : 'rgba(0, 0, 0, 0.05)',
    },
    comparisonText: {
      fontSize: 14 * fontScale,
      lineHeight: 20 * fontScale,
    },
    memoriesSection: {
      marginTop: 8 * fontScale,
    },
    memoryCard: {
      borderRadius: 12 * fontScale,
      padding: 16 * fontScale,
      marginBottom: 16 * fontScale,
      backgroundColor: colorScheme === 'dark' 
        ? 'rgba(255, 255, 255, 0.05)' 
        : 'rgba(0, 0, 0, 0.05)',
      borderWidth: 1,
      borderColor: colorScheme === 'dark' 
        ? 'rgba(255, 255, 255, 0.1)' 
        : 'rgba(0, 0, 0, 0.1)',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    memoryCardContent: {
      flex: 1,
      marginRight: 12 * fontScale,
    },
    memoryTitle: {
      marginBottom: 12 * fontScale,
    },
    memoryBar: {
      height: 32 * fontScale,
      borderRadius: 16 * fontScale,
      overflow: 'hidden',
      flexDirection: 'row',
      backgroundColor: colorScheme === 'dark' 
        ? 'rgba(255, 255, 255, 0.1)' 
        : 'rgba(0, 0, 0, 0.1)',
    },
    memoryBarSegment: {
      height: '100%',
    },
    noData: {
      textAlign: 'center',
      opacity: 0.7,
      marginTop: 40 * fontScale,
    },
    // Compact list mode styles
    compactProfileHeader: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      marginBottom: 12 * fontScale,
      gap: 10 * fontScale,
    },
    compactAvatarContainer: {
      width: 36 * fontScale,
      height: 36 * fontScale,
      borderRadius: 18 * fontScale,
      overflow: 'hidden' as const,
      backgroundColor: colorScheme === 'dark'
        ? 'rgba(255, 255, 255, 0.1)'
        : 'rgba(0, 0, 0, 0.1)',
    },
    compactMemoryRow: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      paddingVertical: 10 * fontScale,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colorScheme === 'dark'
        ? 'rgba(255, 255, 255, 0.08)'
        : 'rgba(0, 0, 0, 0.08)',
    },
    compactMemoryBar: {
      height: 14 * fontScale,
      borderRadius: 7 * fontScale,
      overflow: 'hidden' as const,
      flexDirection: 'row' as const,
      backgroundColor: colorScheme === 'dark'
        ? 'rgba(255, 255, 255, 0.1)'
        : 'rgba(0, 0, 0, 0.1)',
      width: 80,
    },
  }), [fontScale, colorScheme, colors]);

  const handleBack = useCallback(() => router.back(), []);
  const handleMemoryPress = useCallback((memoryId: string) => {
    router.push({
      pathname: '/(tabs)',
      params: {
        focusedMemoryId: memoryId,
        hobbyId: id,
        sphere: 'hobbies',
        returnTo: 'hobby-detail',
        returnToId: id,
      },
    });
  }, [id]);

  if (!hobby) {
    return (
      <TabScreenContainer>
        <ConstellationBackground
          width={SCREEN_WIDTH}
          height={SCREEN_HEIGHT}
          constellationAmount={constellationAmount}
          constellationOpacity={constellationOpacity}
        />
        <View style={styles.container}>
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.headerButton}
              onPress={handleBack}
              activeOpacity={0.7}
              hitSlop={12}
            >
              <MaterialIcons name="arrow-back" size={26 * fontScale} color={colors.text} />
            </TouchableOpacity>
            
            <ThemedText size="l" weight="bold" style={styles.headerTitle}>
              {t('insights.comparison.hobbies.title')}
            </ThemedText>
            
            <View style={styles.headerButton} />
          </View>

          <View style={styles.content}>
            <ThemedText size="sm" style={styles.noData}>
              {t('insights.comparison.hobbies.noData')}
            </ThemedText>
          </View>
        </View>
      </TabScreenContainer>
    );
  }

  return (
    <TabScreenContainer>
      <ConstellationBackground
        width={SCREEN_WIDTH}
        height={SCREEN_HEIGHT}
        constellationAmount={constellationAmount}
        constellationOpacity={constellationOpacity}
      />
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={handleBack}
            activeOpacity={0.7}
              hitSlop={12}
          >
            <MaterialIcons name="arrow-back" size={26 * fontScale} color={colors.text} />
          </TouchableOpacity>
          
          <ThemedText size="l" weight="bold" style={styles.headerTitle}>
            {hobby.name}
          </ThemedText>

          <TouchableOpacity
            style={styles.headerButton}
            onPress={toggleDisplayMode}
            activeOpacity={0.7}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel={isListMode ? t('displayMode.switchToOrbit') : t('displayMode.switchToList')}
          >
            <MaterialIcons
              name={isListMode ? 'blur-circular' : 'view-list'}
              size={24 * fontScale}
              color={colors.text}
            />
          </TouchableOpacity>
        </View>

        <ScrollView
          contentContainerStyle={{ paddingBottom: 40 * fontScale }}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.content}>
            {/* Hobby Header */}
            {isListMode ? (
              <View style={styles.compactProfileHeader}>
                <View style={styles.compactAvatarContainer}>
                  {hobby.imageUri ? (
                    <Image source={{ uri: hobby.imageUri }} style={styles.avatar} contentFit="cover" />
                  ) : (
                    <View style={styles.avatarPlaceholder}>
                      <MaterialIcons name="sports-esports" size={18 * fontScale} color="#8b5cf6" />
                    </View>
                  )}
                </View>
                <View style={{ flex: 1 }}>
                  <ThemedText size="sm" weight="semibold" numberOfLines={1}>{hobby.name}</ThemedText>
                  {comparisonData && (
                    <ThemedText size="xs" emphasis="medium" numberOfLines={2} style={{ marginTop: 2 }}>
                      {comparisonData.message}
                    </ThemedText>
                  )}
                </View>
              </View>
            ) : (
              <>
                <View style={styles.profileHeader}>
                  <View style={styles.avatarContainer}>
                    {hobby.imageUri ? (
                      <Image
                        source={{ uri: hobby.imageUri }}
                        style={styles.avatar}
                        contentFit="cover"
                      />
                    ) : (
                      <View style={styles.avatarPlaceholder}>
                        <MaterialIcons
                          name="sports-esports"
                          size={32 * fontScale}
                          color="#8b5cf6"
                        />
                      </View>
                    )}
                  </View>
                  <View style={styles.profileInfo}>
                    <ThemedText size="lg" weight="bold" style={styles.profileName}>
                      {hobby.name}
                    </ThemedText>
                  </View>
                </View>

                {/* Comparison Message */}
                {comparisonData && (
                  <View style={styles.comparisonCard}>
                    <ThemedText size="sm" style={styles.comparisonText}>
                      {comparisonData.message}
                    </ThemedText>
                  </View>
                )}
              </>
            )}

            {/* Memories Section */}
            <View style={styles.memoriesSection}>
              {!isListMode && (
                <ThemedText size="lg" weight="bold" style={{ marginBottom: 16 * fontScale }}>
                  {t('insights.detail.family.memories.title')}
                </ThemedText>
              )}

              {memories.length === 0 ? (
                <ThemedText size="sm" style={styles.noData}>
                  {t('insights.detail.family.memories.noData')}
                </ThemedText>
              ) : (
                memories.map((memory) => {
                  const cloudyCount = (memory.hardTruths || []).length;
                  const sunnyCount = (memory.goodFacts || []).length;
                  const total = cloudyCount + sunnyCount;

                  if (total === 0) return null;

                  const cloudyPercentage = (cloudyCount / total) * 100;
                  const sunnyPercentage = (sunnyCount / total) * 100;

                  if (isListMode) {
                    return (
                      <TouchableOpacity
                        key={memory.id}
                        style={styles.compactMemoryRow}
                        onPress={() => handleMemoryPress(memory.id)}
                        activeOpacity={0.7}
                      >
                        <View style={{ flex: 1, marginRight: 8 * fontScale }}>
                          <ThemedText size="xs" weight="semibold" numberOfLines={1}>
                            {memory.title}
                          </ThemedText>
                        </View>
                        <View style={styles.compactMemoryBar}>
                          {cloudyCount > 0 && (
                            <View style={[styles.memoryBarSegment, { width: `${cloudyPercentage}%`, backgroundColor: '#000000' }]} />
                          )}
                          {sunnyCount > 0 && (
                            <View style={[styles.memoryBarSegment, { width: `${sunnyPercentage}%`, backgroundColor: momentColors.sunny.background }]} />
                          )}
                        </View>
                        <MaterialIcons name="chevron-right" size={18 * fontScale} color={colors.textMediumEmphasis} style={{ marginLeft: 4 }} />
                      </TouchableOpacity>
                    );
                  }

                  return (
                    <TouchableOpacity
                      key={memory.id}
                      style={styles.memoryCard}
                      onPress={() => handleMemoryPress(memory.id)}
                      activeOpacity={0.7}
                      hitSlop={12}
                    >
                      <View style={styles.memoryCardContent}>
                        <ThemedText size="sm" weight="semibold" style={styles.memoryTitle}>
                          {memory.title}
                        </ThemedText>

                        <View style={styles.memoryBar}>
                        {cloudyCount > 0 && (
                          <View
                            style={[
                              styles.memoryBarSegment,
                              {
                                width: `${cloudyPercentage}%`,
                                backgroundColor: '#000000',
                                justifyContent: 'center',
                                alignItems: 'center',
                              }
                            ]}
                          >
                            {cloudyPercentage > 20 && (
                              <MaterialIcons
                                name="cloud"
                                size={14 * fontScale}
                                color="#FFFFFF"
                                style={{ opacity: 0.8 }}
                              />
                            )}
                          </View>
                        )}
                        {sunnyCount > 0 && (
                          <View
                            style={[
                              styles.memoryBarSegment,
                              {
                                width: `${sunnyPercentage}%`,
                                backgroundColor: momentColors.sunny.background,
                                justifyContent: 'center',
                                alignItems: 'center',
                              }
                            ]}
                          >
                            {sunnyPercentage > 20 && (
                              <MaterialIcons
                                name="wb-sunny"
                                size={14 * fontScale}
                                color="#000000"
                                style={{ opacity: 0.7 }}
                              />
                            )}
                          </View>
                        )}
                      </View>
                      </View>
                      <MaterialIcons
                        name="chevron-right"
                        size={24 * fontScale}
                        color={colors.textMediumEmphasis}
                      />
                    </TouchableOpacity>
                  );
                })
              )}
            </View>
          </View>
        </ScrollView>
      </View>
    </TabScreenContainer>
  );
}

