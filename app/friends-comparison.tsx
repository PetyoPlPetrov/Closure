import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useFontScale } from '@/hooks/use-device-size';
import { TabScreenContainer } from '@/library/components/tab-screen-container';
import type { LifeSphere } from '@/utils/JourneyProvider';
import { useJourney } from '@/utils/JourneyProvider';
import { useTranslate } from '@/utils/languages/use-translate';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';

export default function FriendsComparisonScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'dark'];
  const fontScale = useFontScale();
  const t = useTranslate();
  
  const { friends, profiles, jobs, familyMembers, getEntitiesBySphere, getIdealizedMemoriesByProfileId, getIdealizedMemoriesByEntityId } = useJourney();

  // Statistics should only be enabled when there's at least 1 entity per sphere being compared
  // Friends comparison compares friends vs other spheres, so we need at least 1 friend AND at least 1 entity in other spheres
  const hasOtherSpheresEntities = profiles.length > 0 || jobs.length > 0 || familyMembers.length > 0;
  const hasRequiredEntities = friends.length > 0 && hasOtherSpheresEntities;

  // Calculate sphere data for friends and other spheres (relationships, career, family)
  const sphereData = useMemo(() => {
    const calculateSphereData = (sphereType: LifeSphere) => {
      const entities = getEntitiesBySphere(sphereType);
      if (entities.length === 0) return { totalSuns: 0, totalClouds: 0, totalMoments: 0, sunnyPercentage: 0 };

      let totalClouds = 0;
      let totalSuns = 0;

      entities.forEach((entity) => {
        const memories = sphereType === 'relationships' && 'id' in entity
          ? getIdealizedMemoriesByProfileId(entity.id)
          : getIdealizedMemoriesByEntityId(entity.id, sphereType);

        memories.forEach((memory) => {
          totalClouds += (memory.hardTruths || []).length;
          totalSuns += (memory.goodFacts || []).length;
        });
      });

      const totalMoments = totalClouds + totalSuns;
      const sunnyPercentage = totalMoments > 0 
        ? (totalSuns / totalMoments) * 100 
        : 0;

      return {
        totalSuns,
        totalClouds,
        totalMoments,
        sunnyPercentage: Math.max(0, Math.min(100, isNaN(sunnyPercentage) ? 0 : sunnyPercentage)),
      };
    };

    return {
      friends: calculateSphereData('friends'),
      relationships: calculateSphereData('relationships'),
      career: calculateSphereData('career'),
      family: calculateSphereData('family'),
    };
  }, [getEntitiesBySphere, getIdealizedMemoriesByProfileId, getIdealizedMemoriesByEntityId]);

  // Calculate comparison insights with 20% threshold rule - compare friends with average of other spheres
  const sphereComparison = useMemo(() => {
    const friendsData = sphereData.friends;
    const otherSpheresTotal = sphereData.relationships.totalMoments + 
                             sphereData.career.totalMoments + 
                             sphereData.family.totalMoments;
    const otherSpheresAverage = otherSpheresTotal / 3; // Average of 3 other spheres
    
    const totalAllMoments = friendsData.totalMoments + otherSpheresTotal;

    if (totalAllMoments === 0) {
      return null;
    }

    const timeDifference = friendsData.totalMoments - otherSpheresAverage;

    // Threshold: 20% of the larger amount
    const largerAmount = Math.max(friendsData.totalMoments, otherSpheresAverage);
    const TIME_THRESHOLD_PERCENTAGE = 0.2; // 20% of larger amount

    const insights: { type: 'warning' | 'kudos' | 'info'; message: string }[] = [];

    // Time comparison insights - check if difference is more than 20% of larger amount
    // IMPORTANT: If friends has 0 moments OR other spheres have 0 moments, it's never balanced - just state the fact
    if (largerAmount > 0) {
      // Check if one side has 0 moments - if so, it's definitely not balanced
      const hasZeroMoments = friendsData.totalMoments === 0 || otherSpheresTotal === 0;
      
      if (hasZeroMoments) {
        // One side has no moments - just state the fact, no congratulations
        if (friendsData.totalMoments > 0) {
          insights.push({
            type: 'info',
            message: t('insights.comparison.friends.insight.moreFriendsTime'),
          });
        } else if (otherSpheresTotal > 0) {
          insights.push({
            type: 'info',
            message: t('insights.comparison.friends.insight.moreOtherSpheresTime'),
          });
        }
      } else {
        // Both sides have moments - check if they're approximately balanced
        const differencePercentage = Math.abs(timeDifference) / largerAmount;
        
        if (differencePercentage > TIME_THRESHOLD_PERCENTAGE) {
          // One side prevails significantly (more than 20% difference)
          // Just state the fact, no congratulations
          if (timeDifference > 0) {
            // Friends has more moments than average
            insights.push({
              type: 'info',
              message: t('insights.comparison.friends.insight.moreFriendsTime'),
            });
          } else {
            // Other spheres average has more moments
            insights.push({
              type: 'info',
              message: t('insights.comparison.friends.insight.moreOtherSpheresTime'),
            });
          }
        } else {
          // Approximately balanced - this deserves congratulations
          insights.push({
            type: 'kudos',
            message: t('insights.comparison.friends.insight.balancedTime'),
          });
        }
      }
    } else {
      // No data
      insights.push({
        type: 'info',
        message: t('insights.comparison.friends.insight.balancedTime'),
      });
    }

    return {
      friends: friendsData,
      otherSpheresAverage,
      otherSpheresTotal,
      insights,
    };
  }, [sphereData, t]);

  // Calculate friends comparison
  const friendsComparison = useMemo(() => {
    if (friends.length === 0) return null;

    const friendsData = friends.map((friend) => {
      const memories = getIdealizedMemoriesByEntityId(friend.id, 'friends');
      
      let totalClouds = 0;
      let totalSuns = 0;
      
      memories.forEach((memory) => {
        totalClouds += (memory.hardTruths || []).length;
        totalSuns += (memory.goodFacts || []).length;
      });
      
      const totalMoments = totalClouds + totalSuns;
      const sunnyPercentage = totalMoments > 0 
        ? (totalSuns / totalMoments) * 100 
        : 0;

      return {
        friend,
        totalMoments,
        totalClouds,
        totalSuns,
        sunnyPercentage: Math.max(0, Math.min(100, isNaN(sunnyPercentage) ? 0 : sunnyPercentage)),
      };
    }).filter(data => data.totalMoments > 0); // Only include friends with memories

    if (friendsData.length === 0) return null;

    // Calculate average moments
    const totalAllMoments = friendsData.reduce((sum, data) => sum + data.totalMoments, 0);
    const averageMoments = totalAllMoments / friendsData.length;
    const maxMoments = Math.max(...friendsData.map(d => d.totalMoments));
    
    // Threshold: 20% of the larger amount
    const THRESHOLD_PERCENTAGE = 0.2;
    const threshold = maxMoments * THRESHOLD_PERCENTAGE;

    // Find who has most moments
    const mostMomentsFriend = friendsData.reduce((max, current) => 
      current.totalMoments > max.totalMoments ? current : max
    );

    // Find who has least moments
    const leastMomentsFriend = friendsData.reduce((min, current) => 
      current.totalMoments < min.totalMoments ? current : min
    );

    // Check if balanced (all friends within 20% of max)
    const isBalanced = friendsData.every(data => {
      const difference = maxMoments - data.totalMoments;
      return difference <= threshold;
    });

    // Calculate average quality for comparison
    const averageSunnyPercentage = friendsData.length > 0
      ? friendsData.reduce((sum, data) => sum + data.sunnyPercentage, 0) / friendsData.length
      : 0;

    // Find friends with more cloudy moments (lower sunny percentage)
    const cloudyThreshold = 50; // Less than 50% sunny means more cloudy
    const qualityThreshold = 10; // 10% difference is significant
    const needsQualityTime = friendsData
      .filter(data => data.sunnyPercentage < cloudyThreshold)
      .sort((a, b) => a.sunnyPercentage - b.sunnyPercentage); // Sort by worst quality first

    const insights: { type: 'kudos' | 'info' | 'warning'; message: string }[] = [];

    // Balance insight
    if (isBalanced) {
      insights.push({
        type: 'kudos',
        message: t('insights.comparison.friends.members.balanced'),
      });
    } else {
      // Someone needs to catch up - consider both quantity and quality
      if (leastMomentsFriend && mostMomentsFriend && leastMomentsFriend.friend.id !== mostMomentsFriend.friend.id) {
        const difference = maxMoments - leastMomentsFriend.totalMoments;
        const differencePercentage = (difference / maxMoments) * 100;
        
        if (differencePercentage > 20) { // 20% threshold
          // Check quality difference
          const qualityDifference = averageSunnyPercentage - leastMomentsFriend.sunnyPercentage;
          
          // Build message considering both quantity and quality
          let message = `${t('insights.comparison.friends.members.catchUp')} ${leastMomentsFriend.friend.name}`;
          
          if (qualityDifference > qualityThreshold) {
            // They have fewer moments AND worse quality
            message += ` ${t('insights.comparison.friends.members.andQuality')}`;
          }
          
          message += '.';
          
          insights.push({
            type: qualityDifference > qualityThreshold ? 'warning' : 'info',
            message,
          });
        }
      }
    }

    // Quality insights - for friends who need quality time but aren't the least moments
    if (needsQualityTime.length > 0) {
      needsQualityTime.forEach((data) => {
        // Skip if we already mentioned them in the catch up message
        if (leastMomentsFriend && data.friend.id === leastMomentsFriend.friend.id) {
          return;
        }
        
        const qualityDifference = averageSunnyPercentage - data.sunnyPercentage;
        if (qualityDifference > qualityThreshold) {
          insights.push({
            type: 'warning',
            message: `${t('insights.comparison.friends.members.qualityTime')} ${data.friend.name}.`,
          });
        }
      });
    }

    // Most moments insight
    if (mostMomentsFriend && !isBalanced) {
      insights.push({
        type: 'info',
        message: `${t('insights.comparison.friends.members.mostTime')} ${mostMomentsFriend.friend.name}.`,
      });
    }

    return {
      friendsData,
      totalAllMoments,
      averageMoments,
      isBalanced,
      insights,
    };
  }, [friends, getIdealizedMemoriesByEntityId, t]);

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
    subtitle: {
      textAlign: 'center',
      marginBottom: 32 * fontScale,
      opacity: 0.7,
    },
    comparisonBarChartContainer: {
      marginBottom: 24 * fontScale,
    },
    barChartLegend: {
      marginBottom: 16 * fontScale,
      gap: 12 * fontScale,
    },
    legendItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8 * fontScale,
    },
    legendColor: {
      width: 16 * fontScale,
      height: 16 * fontScale,
      borderRadius: 8 * fontScale,
    },
    legendLabel: {
      flex: 1,
    },
    legendValue: {
      fontSize: 14 * fontScale,
    },
    stackedBarWrapper: {
      height: 48 * fontScale,
      borderRadius: 24 * fontScale,
      overflow: 'hidden',
      flexDirection: 'row',
      backgroundColor: colorScheme === 'dark' 
        ? 'rgba(255, 255, 255, 0.1)' 
        : 'rgba(0, 0, 0, 0.1)',
    },
    stackedBarSegment: {
      height: '100%',
    },
    insightsContainer: {
      marginTop: 8 * fontScale,
    },
    insightCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12 * fontScale,
      borderRadius: 12 * fontScale,
      padding: 16 * fontScale,
      marginBottom: 12 * fontScale,
    },
    insightWarning: {
      backgroundColor: '#ff6b6b20',
      borderWidth: 1,
      borderColor: '#ff6b6b40',
    },
    insightInfo: {
      backgroundColor: colors.primaryLight + '20',
      borderWidth: 1,
      borderColor: colors.primaryLight + '40',
    },
    insightKudos: {
      backgroundColor: '#10b98120',
      borderWidth: 1,
      borderColor: '#10b98140',
    },
    insightText: {
      flex: 1,
      fontSize: 14 * fontScale,
      lineHeight: 20 * fontScale,
    },
    friendsSection: {
      marginTop: 32 * fontScale,
    },
    sectionTitle: {
      marginBottom: 16 * fontScale,
    },
    divider: {
      height: 1,
      backgroundColor: colorScheme === 'dark' 
        ? 'rgba(255, 255, 255, 0.1)' 
        : 'rgba(0, 0, 0, 0.1)',
      marginVertical: 24 * fontScale,
    },
    barContainer: {
      marginBottom: 16 * fontScale,
      borderRadius: 12 * fontScale,
      padding: 16 * fontScale,
      backgroundColor: colorScheme === 'dark' 
        ? 'rgba(255, 255, 255, 0.05)' 
        : 'rgba(0, 0, 0, 0.05)',
      borderWidth: 1,
      borderColor: colorScheme === 'dark' 
        ? 'rgba(255, 255, 255, 0.1)' 
        : 'rgba(0, 0, 0, 0.1)',
    },
    barRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    chevronIcon: {
      marginLeft: 12 * fontScale,
    },
    avatarContainer: {
      width: 40 * fontScale,
      height: 40 * fontScale,
      borderRadius: 20 * fontScale,
      overflow: 'hidden',
      marginRight: 12 * fontScale,
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
    barLabel: {
      flex: 1,
      marginRight: 12 * fontScale,
    },
    barWrapper: {
      width: 100 * fontScale,
      height: 32 * fontScale,
      borderRadius: 16 * fontScale,
      overflow: 'hidden',
      flexDirection: 'row',
      backgroundColor: colorScheme === 'dark' 
        ? 'rgba(255, 255, 255, 0.1)' 
        : 'rgba(0, 0, 0, 0.1)',
      marginRight: 12 * fontScale,
    },
    cloudSegment: {
      height: '100%',
    },
    sunSegment: {
      height: '100%',
    },
  }), [fontScale, colorScheme, colors]);

  // If not enough entities, show message and return early
  if (!hasRequiredEntities) {
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
            <ThemedText size="sm" style={styles.subtitle}>
              {t('insights.comparison.requiresEntities')}
            </ThemedText>
          </View>
        </View>
      </TabScreenContainer>
    );
  }

  if (!sphereComparison) {
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
            <ThemedText size="sm" style={styles.subtitle}>
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
            {t('insights.comparison.friends.title')}
          </ThemedText>
          
          <View style={styles.headerButton} />
        </View>

        <ScrollView
          contentContainerStyle={{ paddingBottom: 40 * fontScale }}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.content}>
            {/* Subtitle */}
            <ThemedText size="sm" style={styles.subtitle}>
              {t('insights.comparison.friends.subtitle')}
            </ThemedText>

            {/* Sphere Comparison - Friends vs Average of Other Spheres */}
            {(() => {
              const { friends: friendsData, otherSpheresAverage, otherSpheresTotal, insights } = sphereComparison;
              const totalAllMoments = friendsData.totalMoments + otherSpheresTotal;
              
              // Calculate percentages of total
              const friendsPercentage = totalAllMoments > 0 
                ? (friendsData.totalMoments / totalAllMoments) * 100 
                : 0;
              const otherSpheresPercentage = totalAllMoments > 0 
                ? (otherSpheresTotal / totalAllMoments) * 100 
                : 0;
              
              return (
                <>
                  {/* Single Stacked Bar Chart */}
                  <View style={styles.comparisonBarChartContainer}>
                    {/* Legend */}
                    <View style={styles.barChartLegend}>
                      <View style={styles.legendItem}>
                        <View style={[styles.legendColor, { backgroundColor: '#3b82f6' }]} />
                        <ThemedText size="sm" weight="semibold" style={styles.legendLabel}>
                          {t('spheres.friends')} ({friendsData.totalMoments})
                        </ThemedText>
                        <ThemedText size="sm" weight="bold" style={[styles.legendValue, { color: '#3b82f6' }]}>
                          {Math.round(friendsPercentage)}%
                        </ThemedText>
                      </View>
                      <View style={styles.legendItem}>
                        <View style={[styles.legendColor, { backgroundColor: '#8b5cf6' }]} />
                        <ThemedText size="sm" weight="semibold" style={styles.legendLabel}>
                          {t('insights.comparison.friends.otherSpheres')} ({Math.round(otherSpheresTotal)})
                        </ThemedText>
                        <ThemedText size="sm" weight="bold" style={[styles.legendValue, { color: '#8b5cf6' }]}>
                          {Math.round(otherSpheresPercentage)}%
                        </ThemedText>
                      </View>
                    </View>
                    
                    {/* Stacked Bar */}
                    <View style={styles.stackedBarWrapper}>
                      <View style={[styles.stackedBarSegment, { 
                        width: `${friendsPercentage}%`, 
                        backgroundColor: '#3b82f6' 
                      }]} />
                      <View style={[styles.stackedBarSegment, { 
                        width: `${otherSpheresPercentage}%`, 
                        backgroundColor: '#8b5cf6' 
                      }]} />
                    </View>
                  </View>

                  {/* Comparison Insights */}
                  {insights.length > 0 && (
                    <View style={styles.insightsContainer}>
                      {insights.map((insight, index) => (
                        <View
                          key={index}
                          style={[
                            styles.insightCard,
                            insight.type === 'warning' && styles.insightWarning,
                            insight.type === 'kudos' && styles.insightKudos,
                            insight.type === 'info' && styles.insightInfo,
                          ]}
                        >
                          <MaterialIcons
                            name={
                              insight.type === 'warning' ? 'warning' :
                              insight.type === 'kudos' ? 'celebration' :
                              'info'
                            }
                            size={20 * fontScale}
                            color={
                              insight.type === 'warning' ? '#ff6b6b' :
                              insight.type === 'kudos' ? '#10b981' :
                              colors.icon
                            }
                          />
                          <ThemedText size="sm" style={styles.insightText}>
                            {insight.message}
                          </ThemedText>
                        </View>
                      ))}
                      
                      {/* General Balance Suggestion */}
                      <View style={[styles.insightCard, styles.insightInfo]}>
                        <MaterialIcons
                          name="balance"
                          size={20 * fontScale}
                          color={colors.primaryLight}
                        />
                        <ThemedText size="sm" style={styles.insightText}>
                          {t('insights.comparison.general.balance')}
                        </ThemedText>
                      </View>
                    </View>
                  )}
                </>
              );
            })()}

            {/* Friends Comparison Section */}
            {friendsComparison && (
              <>
                <View style={styles.divider} />
                <View style={styles.friendsSection}>
                  <ThemedText size="l" weight="bold" style={styles.sectionTitle}>
                    {t('insights.comparison.friends.members.title')}
                  </ThemedText>

                  {/* Friends Insights */}
                  {friendsComparison.insights.length > 0 && (
                    <View style={styles.insightsContainer}>
                      {friendsComparison.insights.map((insight, index) => (
                        <View
                          key={index}
                          style={[
                            styles.insightCard,
                            insight.type === 'warning' && styles.insightWarning,
                            insight.type === 'kudos' && styles.insightKudos,
                            insight.type === 'info' && styles.insightInfo,
                          ]}
                        >
                          <MaterialIcons
                            name={
                              insight.type === 'warning' ? 'warning' :
                              insight.type === 'kudos' ? 'celebration' :
                              'info'
                            }
                            size={20 * fontScale}
                            color={
                              insight.type === 'warning' ? '#ff6b6b' :
                              insight.type === 'kudos' ? '#10b981' :
                              colors.icon
                            }
                          />
                          <ThemedText size="sm" style={styles.insightText}>
                            {insight.message}
                          </ThemedText>
                        </View>
                      ))}
                    </View>
                  )}

                  {/* Individual Friend Records */}
                  {friendsComparison.friendsData
                    .sort((a, b) => b.totalMoments - a.totalMoments) // Sort by most moments first
                    .map((data) => {
                      const cloudPercentage = data.totalMoments > 0 
                        ? (data.totalClouds / data.totalMoments) * 100 
                        : 0;
                      const sunPercentage = data.totalMoments > 0 
                        ? (data.totalSuns / data.totalMoments) * 100 
                        : 0;

                      return (
                        <TouchableOpacity
                          key={data.friend.id}
                          style={styles.barContainer}
                          onPress={() => router.push({
                            pathname: '/friend-detail',
                            params: { id: data.friend.id },
                          })}
                          activeOpacity={0.7}
                        >
                          <View style={styles.barRow}>
                            {/* Avatar */}
                            <View style={styles.avatarContainer}>
                              {data.friend.imageUri ? (
                                <Image
                                  source={{ uri: data.friend.imageUri }}
                                  style={styles.avatar}
                                  contentFit="cover"
                                />
                              ) : (
                                <View style={styles.avatarPlaceholder}>
                                  <MaterialIcons 
                                    name="people" 
                                    size={20 * fontScale} 
                                    color="#3b82f6" 
                                  />
                                </View>
                              )}
                            </View>
                            
                            {/* Friend Name */}
                            <View style={styles.barLabel}>
                              <ThemedText size="sm" weight="semibold">
                                {data.friend.name}
                              </ThemedText>
                            </View>
                            
                            {/* Bar Chart with inline icons */}
                            <View style={styles.barWrapper}>
                              {/* Cloudy segment (black) - on the left */}
                              {data.totalClouds > 0 && (
                                <View
                                  style={[
                                    styles.cloudSegment,
                                    {
                                      width: `${cloudPercentage}%`,
                                      backgroundColor: '#000000',
                                      justifyContent: 'center',
                                      alignItems: 'center',
                                    }
                                  ]}
                                >
                                  {cloudPercentage > 20 && (
                                    <MaterialIcons
                                      name="cloud"
                                      size={14 * fontScale}
                                      color="#FFFFFF"
                                      style={{ opacity: 0.8 }}
                                    />
                                  )}
                                </View>
                              )}

                              {/* Sunny segment (yellow/gold) - on the right */}
                              {data.totalSuns > 0 && (
                                <View
                                  style={[
                                    styles.sunSegment,
                                    {
                                      width: `${sunPercentage}%`,
                                      backgroundColor: '#FFD700',
                                      justifyContent: 'center',
                                      alignItems: 'center',
                                    }
                                  ]}
                                >
                                  {sunPercentage > 20 && (
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
                            
                            {/* Chevron Icon */}
                            <MaterialIcons 
                              name="chevron-right" 
                              size={24 * fontScale} 
                              color={colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.5)' : 'rgba(0, 0, 0, 0.5)'}
                              style={styles.chevronIcon}
                            />
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                </View>
              </>
            )}
          </View>
        </ScrollView>
      </View>
    </TabScreenContainer>
  );
}

