import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useFontScale } from '@/hooks/use-device-size';
import { TabScreenContainer } from '@/library/components/tab-screen-container';
import type { Friend } from '@/utils/JourneyProvider';
import { useJourney } from '@/utils/JourneyProvider';
import { useTranslate } from '@/utils/languages/use-translate';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';

export default function FriendDetailScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'dark'];
  const fontScale = useFontScale();
  const t = useTranslate();
  const { id } = useLocalSearchParams<{ id: string }>();
  
  const { friends, getIdealizedMemoriesByEntityId } = useJourney();

  const friend = useMemo(() => {
    return friends.find(f => f.id === id);
  }, [friends, id]);

  const memories = useMemo(() => {
    if (!id) return [];
    return getIdealizedMemoriesByEntityId(id, 'friends');
  }, [id, getIdealizedMemoriesByEntityId]);

  // Calculate comparison with other friends
  const comparisonData = useMemo(() => {
    if (!friend || memories.length === 0) return null;

    const allFriends = friends.filter(f => {
      const friendMemories = getIdealizedMemoriesByEntityId(f.id, 'friends');
      return friendMemories.length > 0;
    });

    if (allFriends.length <= 1) return null;

    // Calculate current friend's quality
    let currentSunny = 0;
    let currentCloudy = 0;
    memories.forEach((memory) => {
      currentSunny += (memory.goodFacts || []).length;
      currentCloudy += (memory.hardTruths || []).length;
    });
    const currentTotal = currentSunny + currentCloudy;
    const currentSunnyPercentage = currentTotal > 0 ? (currentSunny / currentTotal) * 100 : 0;

    const currentMemoriesCount = memories.length;
    const otherFriends = allFriends.filter(f => f.id !== friend.id);
    
    const otherData = otherFriends.map(f => {
      const friendMemories = getIdealizedMemoriesByEntityId(f.id, 'friends');
      let sunny = 0;
      let cloudy = 0;
      friendMemories.forEach((memory) => {
        sunny += (memory.goodFacts || []).length;
        cloudy += (memory.hardTruths || []).length;
      });
      const total = sunny + cloudy;
      const sunnyPercentage = total > 0 ? (sunny / total) * 100 : 0;
      return {
        count: friendMemories.length,
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
      message: t(messageKey),
    };
  }, [friend, memories, friends, getIdealizedMemoriesByEntityId, t]);

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
      backgroundColor: '#3b82f640',
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

  if (!friend) {
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
              {t('insights.comparison.friends.title')}
            </ThemedText>
            
            <View style={styles.headerButton} />
          </View>

          <View style={styles.content}>
            <ThemedText size="sm" style={styles.noData}>
              {t('insights.comparison.friends.noData')}
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
            {friend.name}
          </ThemedText>
          
          <View style={styles.headerButton} />
        </View>

        <ScrollView
          contentContainerStyle={{ paddingBottom: 40 * fontScale }}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.content}>
            {/* Friend Header */}
            <View style={styles.profileHeader}>
              <View style={styles.avatarContainer}>
                {friend.imageUri ? (
                  <Image
                    source={{ uri: friend.imageUri }}
                    style={styles.avatar}
                    contentFit="cover"
                  />
                ) : (
                  <View style={styles.avatarPlaceholder}>
                    <MaterialIcons 
                      name="people" 
                      size={32 * fontScale} 
                      color="#3b82f6" 
                    />
                  </View>
                )}
              </View>
              <View style={styles.profileInfo}>
                <ThemedText size="lg" weight="bold" style={styles.profileName}>
                  {friend.name}
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

            {/* Memories Section */}
            <View style={styles.memoriesSection}>
              <ThemedText size="lg" weight="bold" style={{ marginBottom: 16 * fontScale }}>
                {t('insights.detail.family.memories.title')}
              </ThemedText>
              
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
                  
                  return (
                    <TouchableOpacity 
                      key={memory.id} 
                      style={styles.memoryCard}
                      onPress={() => router.push({
                        pathname: '/(tabs)',
                        params: {
                          focusedMemoryId: memory.id,
                          friendId: id,
                          sphere: 'friends',
                          returnTo: 'friend-detail',
                          returnToId: id,
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

