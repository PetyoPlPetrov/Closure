import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useFontScale } from '@/hooks/use-device-size';
import { TabScreenContainer } from '@/library/components/tab-screen-container';
import type { ExProfile } from '@/utils/JourneyProvider';
import { useJourney } from '@/utils/JourneyProvider';
import { useTranslate } from '@/utils/languages/use-translate';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';

export default function RelationshipDetailScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'dark'];
  const fontScale = useFontScale();
  const t = useTranslate();
  const { id } = useLocalSearchParams<{ id: string }>();
  
  const { profiles, getIdealizedMemoriesByProfileId } = useJourney();

  const profile = useMemo(() => {
    return profiles.find(p => p.id === id);
  }, [profiles, id]);

  const memories = useMemo(() => {
    if (!id) return [];
    return getIdealizedMemoriesByProfileId(id);
  }, [id, getIdealizedMemoriesByProfileId]);

  // Calculate comparison with other relationships
  const comparisonData = useMemo(() => {
    if (!profile || memories.length === 0) return null;

    const allProfiles = profiles.filter(p => {
      const profileMemories = getIdealizedMemoriesByProfileId(p.id);
      return profileMemories.length > 0;
    });

    if (allProfiles.length <= 1) return null;

    // Calculate current relationship's quality
    let currentSunny = 0;
    let currentCloudy = 0;
    memories.forEach((memory) => {
      currentSunny += (memory.goodFacts || []).length;
      currentCloudy += (memory.hardTruths || []).length;
    });
    const currentTotal = currentSunny + currentCloudy;
    const currentSunnyPercentage = currentTotal > 0 ? (currentSunny / currentTotal) * 100 : 0;

    const currentMemoriesCount = memories.length;
    const otherProfiles = allProfiles.filter(p => p.id !== profile.id);
    
    const otherData = otherProfiles.map(p => {
      const profileMemories = getIdealizedMemoriesByProfileId(p.id);
      let sunny = 0;
      let cloudy = 0;
      profileMemories.forEach((memory) => {
        sunny += (memory.goodFacts || []).length;
        cloudy += (memory.hardTruths || []).length;
      });
      const total = sunny + cloudy;
      const sunnyPercentage = total > 0 ? (sunny / total) * 100 : 0;
      return {
        count: profileMemories.length,
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

    // Generate combined message
    const messageKey = `insights.detail.relationship.memories.${countComparison}.${qualityComparison}`;
    return {
      type: countComparison,
      message: t(messageKey),
    };
  }, [profile, memories, profiles, getIdealizedMemoriesByProfileId, t]);

  const styles = useMemo(() => StyleSheet.create({
    container: {
      flex: 1,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20 * fontScale,
      paddingTop: 20 * fontScale,
      paddingBottom: 16 * fontScale,
      borderBottomWidth: 1,
      borderBottomColor: colorScheme === 'dark' 
        ? 'rgba(255, 255, 255, 0.1)' 
        : 'rgba(0, 0, 0, 0.1)',
    },
    headerButton: {
      padding: 8 * fontScale,
      minWidth: 42 * fontScale,
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
      backgroundColor: colors.primary + '40',
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
  }), [fontScale, colorScheme, colors]);

  if (!profile) {
    return (
      <TabScreenContainer>
        <View style={styles.container}>
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.headerButton}
              onPress={() => router.back()}
              activeOpacity={0.7}
            >
              <MaterialIcons name="arrow-back" size={26 * fontScale} color={colors.text} />
            </TouchableOpacity>
            
            <ThemedText size="l" weight="bold" style={styles.headerTitle}>
              {t('insights.detail.relationship.title')}
            </ThemedText>
            
            <View style={styles.headerButton} />
          </View>

          <View style={styles.content}>
            <ThemedText size="sm" style={styles.noData}>
              {t('insights.detail.relationship.noData')}
            </ThemedText>
          </View>
        </View>
      </TabScreenContainer>
    );
  }

  return (
    <TabScreenContainer>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <MaterialIcons name="arrow-back" size={26 * fontScale} color={colors.text} />
          </TouchableOpacity>
          
          <ThemedText size="l" weight="bold" style={styles.headerTitle}>
            {profile.name}
          </ThemedText>
          
          <View style={styles.headerButton} />
        </View>

        <ScrollView
          contentContainerStyle={{ paddingBottom: 40 * fontScale }}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.content}>
            {/* Profile Header */}
            <View style={styles.profileHeader}>
              <View style={styles.avatarContainer}>
                {profile.imageUri ? (
                  <Image
                    source={{ uri: profile.imageUri }}
                    style={styles.avatar}
                    contentFit="cover"
                  />
                ) : (
                  <View style={styles.avatarPlaceholder}>
                    <MaterialIcons 
                      name="person" 
                      size={32 * fontScale} 
                      color={colors.primaryLight} 
                    />
                  </View>
                )}
              </View>
              <View style={styles.profileInfo}>
                <ThemedText size="lg" weight="bold" style={styles.profileName}>
                  {profile.name}
                </ThemedText>
                {!profile.relationshipEndDate ? (
                  <ThemedText size="xs" style={{ opacity: 0.7 }}>
                    {t('insights.comparison.label.current')}
                  </ThemedText>
                ) : (
                  <ThemedText size="xs" style={{ opacity: 0.7 }}>
                    {t('insights.comparison.label.ex')}
                  </ThemedText>
                )}
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

            {/* Memories Section */}
            <View style={styles.memoriesSection}>
              <ThemedText size="lg" weight="bold" style={{ marginBottom: 16 * fontScale }}>
                {t('insights.detail.relationship.memories.title')}
              </ThemedText>
              
              {memories.length === 0 ? (
                <ThemedText size="sm" style={styles.noData}>
                  {t('insights.detail.relationship.memories.noData')}
                </ThemedText>
              ) : (
                memories.map((memory) => {
                  const cloudyCount = (memory.hardTruths || []).length;
                  const sunnyCount = (memory.goodFacts || []).length;
                  const total = cloudyCount + sunnyCount;
                  
                  if (total === 0) return null;
                  
                  const cloudyPercentage = (cloudyCount / total) * 100;
                  const sunnyPercentage = (sunnyCount / total) * 100;
                  
                  return (
                    <TouchableOpacity 
                      key={memory.id} 
                      style={styles.memoryCard}
                      onPress={() => router.push({
                        pathname: '/(tabs)',
                        params: {
                          focusedMemoryId: memory.id,
                          profileId: profile.id,
                          sphere: 'relationships',
                          returnTo: 'relationship-detail',
                          returnToId: profile.id,
                        },
                      })}
                      activeOpacity={0.7}
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
                              }
                            ]}
                          />
                        )}
                        {sunnyCount > 0 && (
                          <View
                            style={[
                              styles.memoryBarSegment,
                              {
                                width: `${sunnyPercentage}%`,
                                backgroundColor: '#FFD700',
                              }
                            ]}
                          />
                        )}
                      </View>
                      </View>
                      <MaterialIcons 
                        name="chevron-right" 
                        size={24 * fontScale} 
                        color={colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.5)' : 'rgba(0, 0, 0, 0.5)'}
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

