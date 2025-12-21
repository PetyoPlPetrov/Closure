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

export default function HobbiesComparisonScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'dark'];
  const fontScale = useFontScale();
  const t = useTranslate();
  
  const { hobbies, profiles, jobs, familyMembers, getEntitiesBySphere, getIdealizedMemoriesByProfileId, getIdealizedMemoriesByEntityId } = useJourney();

  // Statistics should only be enabled when there's at least 1 entity per sphere being compared
  // Hobbies comparison compares hobbies vs other spheres, so we need at least 1 hobby AND at least 1 entity in other spheres
  const hasOtherSpheresEntities = profiles.length > 0 || jobs.length > 0 || familyMembers.length > 0;
  const hasRequiredEntities = hobbies.length > 0 && hasOtherSpheresEntities;

  // Calculate sphere data for hobbies and other spheres (relationships, career, family)
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
      hobbies: calculateSphereData('hobbies'),
      relationships: calculateSphereData('relationships'),
      career: calculateSphereData('career'),
      family: calculateSphereData('family'),
    };
  }, [getEntitiesBySphere, getIdealizedMemoriesByProfileId, getIdealizedMemoriesByEntityId]);

  // Calculate comparison insights with 20% threshold rule - compare hobbies with average of other spheres
  const sphereComparison = useMemo(() => {
    const hobbiesData = sphereData.hobbies;
    const otherSpheresTotal = sphereData.relationships.totalMoments + 
                             sphereData.career.totalMoments + 
                             sphereData.family.totalMoments;
    const otherSpheresAverage = otherSpheresTotal / 3; // Average of 3 other spheres
    
    const totalAllMoments = hobbiesData.totalMoments + otherSpheresTotal;

    if (totalAllMoments === 0) {
      return null;
    }

    const timeDifference = hobbiesData.totalMoments - otherSpheresAverage;

    // Threshold: 20% of the larger amount
    const largerAmount = Math.max(hobbiesData.totalMoments, otherSpheresAverage);
    const TIME_THRESHOLD_PERCENTAGE = 0.2; // 20% of larger amount

    const insights: { type: 'warning' | 'kudos' | 'info'; message: string }[] = [];

    // Time comparison insights - check if difference is more than 20% of larger amount
    // IMPORTANT: If hobbies has 0 moments OR other spheres have 0 moments, it's never balanced - just state the fact
    if (largerAmount > 0) {
      // Check if one side has 0 moments - if so, it's definitely not balanced
      const hasZeroMoments = hobbiesData.totalMoments === 0 || otherSpheresTotal === 0;
      
      if (hasZeroMoments) {
        // One side has no moments - just state the fact, no congratulations
        if (hobbiesData.totalMoments > 0) {
          insights.push({
            type: 'info',
            message: t('insights.comparison.hobbies.insight.moreHobbiesTime'),
          });
        } else if (otherSpheresTotal > 0) {
          insights.push({
            type: 'info',
            message: t('insights.comparison.hobbies.insight.moreOtherSpheresTime'),
          });
        }
      } else {
        // Both sides have moments - check if they're approximately balanced
        const differencePercentage = Math.abs(timeDifference) / largerAmount;
        
        if (differencePercentage > TIME_THRESHOLD_PERCENTAGE) {
          // One side prevails significantly (more than 20% difference)
          // Just state the fact, no congratulations
          if (timeDifference > 0) {
            // Hobbies has more moments than average
            insights.push({
              type: 'info',
              message: t('insights.comparison.hobbies.insight.moreHobbiesTime'),
            });
          } else {
            // Other spheres average has more moments
            insights.push({
              type: 'info',
              message: t('insights.comparison.hobbies.insight.moreOtherSpheresTime'),
            });
          }
        } else {
          // Approximately balanced - this deserves congratulations
          insights.push({
            type: 'kudos',
            message: t('insights.comparison.hobbies.insight.balancedTime'),
          });
        }
      }
    } else {
      // No data
      insights.push({
        type: 'info',
        message: t('insights.comparison.hobbies.insight.balancedTime'),
      });
    }

    return {
      hobbies: hobbiesData,
      otherSpheresAverage,
      otherSpheresTotal,
      insights,
    };
  }, [sphereData, t]);

  // Calculate hobbies comparison - compare between hobbies
  const hobbiesComparison = useMemo(() => {
    if (hobbies.length === 0) return null;

    const hobbiesData = hobbies.map((hobby) => {
      const memories = getIdealizedMemoriesByEntityId(hobby.id, 'hobbies');
      
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
        hobby,
        totalMoments,
        totalClouds,
        totalSuns,
        memoryCount: memories.length,
        sunnyPercentage: Math.max(0, Math.min(100, isNaN(sunnyPercentage) ? 0 : sunnyPercentage)),
      };
    }).filter(data => data.totalMoments > 0); // Only include hobbies with memories

    if (hobbiesData.length === 0) return null;

    // Calculate average moments and memory count
    const totalAllMoments = hobbiesData.reduce((sum, data) => sum + data.totalMoments, 0);
    const averageMoments = totalAllMoments / hobbiesData.length;
    const maxMoments = Math.max(...hobbiesData.map(d => d.totalMoments));
    
    const totalAllMemories = hobbiesData.reduce((sum, data) => sum + data.memoryCount, 0);
    const averageMemories = totalAllMemories / hobbiesData.length;
    const maxMemories = Math.max(...hobbiesData.map(d => d.memoryCount));
    
    // Threshold: 20% of the larger amount
    const THRESHOLD_PERCENTAGE = 0.2;
    const momentsThreshold = maxMoments * THRESHOLD_PERCENTAGE;
    const memoriesThreshold = maxMemories * THRESHOLD_PERCENTAGE;

    // Find who has most moments
    const mostMomentsHobby = hobbiesData.reduce((max, current) => 
      current.totalMoments > max.totalMoments ? current : max
    );

    // Find who has least moments
    const leastMomentsHobby = hobbiesData.reduce((min, current) => 
      current.totalMoments < min.totalMoments ? current : min
    );

    // Check if balanced (all hobbies within 20% of max for moments)
    const isBalancedMoments = hobbiesData.every(data => {
      const difference = maxMoments - data.totalMoments;
      return difference <= momentsThreshold;
    });

    // Check if balanced for memories (roughly same amount)
    const isBalancedMemories = hobbiesData.every(data => {
      const difference = maxMemories - data.memoryCount;
      return difference <= memoriesThreshold;
    });

    const insights: { type: 'kudos' | 'info' | 'warning'; message: string }[] = [];

    // Balance insights
    if (isBalancedMoments && isBalancedMemories) {
      insights.push({
        type: 'kudos',
        message: t('insights.comparison.hobbies.members.balanced'),
      });
    } else {
      // Someone needs attention
      if (leastMomentsHobby && mostMomentsHobby && leastMomentsHobby.hobby.id !== mostMomentsHobby.hobby.id) {
        const difference = maxMoments - leastMomentsHobby.totalMoments;
        const differencePercentage = (difference / maxMoments) * 100;
        
        if (differencePercentage > 20) { // 20% threshold
          insights.push({
            type: 'info',
            message: `${t('insights.comparison.hobbies.members.catchUp')} ${leastMomentsHobby.hobby.name}.`,
          });
        }
      }
    }

    // Most moments insight
    if (mostMomentsHobby && !isBalancedMoments) {
      insights.push({
        type: 'info',
        message: `${t('insights.comparison.hobbies.members.mostTime')} ${mostMomentsHobby.hobby.name}.`,
      });
    }

    return {
      hobbiesData,
      totalAllMoments,
      averageMoments,
      isBalancedMoments,
      isBalancedMemories,
      insights,
    };
  }, [hobbies, getIdealizedMemoriesByEntityId, t]);

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
    hobbiesSection: {
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
      backgroundColor: '#8b5cf640',
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
              {t('insights.comparison.hobbies.title')}
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
              {t('insights.comparison.hobbies.title')}
            </ThemedText>
            
            <View style={styles.headerButton} />
          </View>

          <View style={styles.content}>
            <ThemedText size="sm" style={styles.subtitle}>
              {t('insights.comparison.hobbies.noData')}
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
            {t('insights.comparison.hobbies.title')}
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
              {t('insights.comparison.hobbies.subtitle')}
            </ThemedText>

            {/* Sphere Comparison - Hobbies vs Average of Other Spheres */}
            {(() => {
              const { hobbies: hobbiesData, otherSpheresAverage, otherSpheresTotal, insights } = sphereComparison;
              const totalAllMoments = hobbiesData.totalMoments + otherSpheresTotal;
              
              // Calculate percentages of total
              const hobbiesPercentage = totalAllMoments > 0 
                ? (hobbiesData.totalMoments / totalAllMoments) * 100 
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
                        <View style={[styles.legendColor, { backgroundColor: '#8b5cf6' }]} />
                        <ThemedText size="sm" weight="semibold" style={styles.legendLabel}>
                          {t('spheres.hobbies')} ({hobbiesData.totalMoments})
                        </ThemedText>
                        <ThemedText size="sm" weight="bold" style={[styles.legendValue, { color: '#8b5cf6' }]}>
                          {Math.round(hobbiesPercentage)}%
                        </ThemedText>
                      </View>
                      <View style={styles.legendItem}>
                        <View style={[styles.legendColor, { backgroundColor: '#a855f7' }]} />
                        <ThemedText size="sm" weight="semibold" style={styles.legendLabel}>
                          {t('insights.comparison.hobbies.otherSpheres')} ({Math.round(otherSpheresTotal)})
                        </ThemedText>
                        <ThemedText size="sm" weight="bold" style={[styles.legendValue, { color: '#a855f7' }]}>
                          {Math.round(otherSpheresPercentage)}%
                        </ThemedText>
                      </View>
                    </View>
                    
                    {/* Stacked Bar */}
                    <View style={styles.stackedBarWrapper}>
                      <View style={[styles.stackedBarSegment, { 
                        width: `${hobbiesPercentage}%`, 
                        backgroundColor: '#8b5cf6' 
                      }]} />
                      <View style={[styles.stackedBarSegment, { 
                        width: `${otherSpheresPercentage}%`, 
                        backgroundColor: '#a855f7' 
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

            {/* Hobbies Comparison Section */}
            {hobbiesComparison && (
              <>
                <View style={styles.divider} />
                <View style={styles.hobbiesSection}>
                  <ThemedText size="l" weight="bold" style={styles.sectionTitle}>
                    {t('insights.comparison.hobbies.members.title')}
                  </ThemedText>

                  {/* Hobbies Insights */}
                  {hobbiesComparison.insights.length > 0 && (
                    <View style={styles.insightsContainer}>
                      {hobbiesComparison.insights.map((insight, index) => (
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

                  {/* Individual Hobby Records */}
                  {hobbiesComparison.hobbiesData
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
                          key={data.hobby.id}
                          style={styles.barContainer}
                          onPress={() => router.push({
                            pathname: '/hobby-detail',
                            params: { id: data.hobby.id },
                          })}
                          activeOpacity={0.7}
                        >
                          <View style={styles.barRow}>
                            {/* Avatar */}
                            <View style={styles.avatarContainer}>
                              {data.hobby.imageUri ? (
                                <Image
                                  source={{ uri: data.hobby.imageUri }}
                                  style={styles.avatar}
                                  contentFit="cover"
                                />
                              ) : (
                                <View style={styles.avatarPlaceholder}>
                                  <MaterialIcons 
                                    name="sports-esports" 
                                    size={20 * fontScale} 
                                    color="#8b5cf6" 
                                  />
                                </View>
                              )}
                            </View>
                            
                            {/* Hobby Name */}
                            <View style={styles.barLabel}>
                              <ThemedText size="sm" weight="semibold">
                                {data.hobby.name}
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

