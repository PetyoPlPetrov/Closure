import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useFontScale } from '@/hooks/use-device-size';
import { TabScreenContainer } from '@/library/components/tab-screen-container';
import type { ExProfile, LifeSphere } from '@/utils/JourneyProvider';
import { useJourney } from '@/utils/JourneyProvider';
import { useTranslate } from '@/utils/languages/use-translate';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import React, { useMemo } from 'react';
import { Dimensions, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function RelationshipsComparisonScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'dark'];
  const fontScale = useFontScale();
  const t = useTranslate();
  
  const { profiles, jobs, getIdealizedMemoriesByProfileId, getEntitiesBySphere, getIdealizedMemoriesByEntityId } = useJourney();

  // Calculate data points for each partner
  const chartData = useMemo(() => {
    // Sort profiles chronologically (by start date, with ongoing first)
    const sortedProfiles = [...profiles]
      .filter(p => p.relationshipStartDate || p.relationshipEndDate !== undefined)
      .sort((a, b) => {
        // Ongoing first
        if (!a.relationshipEndDate && b.relationshipEndDate) return -1;
        if (a.relationshipEndDate && !b.relationshipEndDate) return 1;
        
        // Then by start date (newest first)
        if (a.relationshipStartDate && b.relationshipStartDate) {
          return new Date(b.relationshipStartDate).getTime() - new Date(a.relationshipStartDate).getTime();
        }
        return 0;
      })
      .reverse(); // Reverse to show oldest first

    const mapped = sortedProfiles.map((profile) => {
      const memories = getIdealizedMemoriesByProfileId(profile.id);
      
      let totalSuns = 0;
      let totalClouds = 0;
      
      memories.forEach((memory) => {
        totalSuns += (memory.goodFacts || []).length;
        totalClouds += (memory.hardTruths || []).length;
      });
      
      const total = totalSuns + totalClouds;
      const sunPercentage = total > 0 ? (totalSuns / total) * 100 : 0;
      
      return {
        profile,
        totalSuns,
        totalClouds,
        total,
        sunPercentage,
      };
    }).filter(data => data.total > 0); // Only include profiles with memories
    
    // Sort: ongoing first, then by date
    return mapped.sort((a, b) => {
      if (!a.profile.relationshipEndDate && b.profile.relationshipEndDate) return -1;
      if (a.profile.relationshipEndDate && !b.profile.relationshipEndDate) return 1;
      return 0;
    });
  }, [profiles, getIdealizedMemoriesByProfileId]);

  // Calculate relationships sphere overall data
  const relationshipsSphereData = useMemo(() => {
    let totalSuns = 0;
    let totalClouds = 0;

    chartData.forEach((data) => {
      totalSuns += data.totalSuns;
      totalClouds += data.totalClouds;
    });

    const totalMoments = totalSuns + totalClouds;
    const sunnyPercentage = totalMoments > 0 
      ? (totalSuns / totalMoments) * 100 
      : 0;

    return {
      totalSuns,
      totalClouds,
      totalMoments,
      sunnyPercentage: Math.max(0, Math.min(100, isNaN(sunnyPercentage) ? 0 : sunnyPercentage)),
    };
  }, [chartData]);

  // Calculate career sphere data
  const careerSphereData = useMemo(() => {
    const entities = getEntitiesBySphere('career');
    if (entities.length === 0) return { totalSuns: 0, totalClouds: 0, totalMoments: 0, sunnyPercentage: 0 };

    let totalClouds = 0;
    let totalSuns = 0;

    entities.forEach((entity) => {
      const memories = getIdealizedMemoriesByEntityId(entity.id, 'career');
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
  }, [getEntitiesBySphere, getIdealizedMemoriesByEntityId]);

  // Calculate comparison between relationships and career
  const sphereComparison = useMemo(() => {
    const relationships = relationshipsSphereData;
    const career = careerSphereData;
    const totalAllMoments = relationships.totalMoments + career.totalMoments;

    if (totalAllMoments === 0) {
      return null;
    }

    const timeDifference = relationships.totalMoments - career.totalMoments;
    const qualityDifference = relationships.sunnyPercentage - career.sunnyPercentage;

    // Threshold: 20% of the larger amount
    const largerAmount = Math.max(relationships.totalMoments, career.totalMoments);
    const TIME_THRESHOLD_PERCENTAGE = 0.2; // 20% of larger amount
    const QUALITY_THRESHOLD_SIGNIFICANT = 10; // 10% difference is significant

    const insights: { type: 'warning' | 'kudos' | 'info'; message: string }[] = [];

    // Time comparison insights - check if difference is more than 20% of larger amount
    if (largerAmount > 0) {
      const differencePercentage = Math.abs(timeDifference) / largerAmount;
      
      if (differencePercentage > TIME_THRESHOLD_PERCENTAGE) {
        // One sphere prevails significantly (more than 20% difference)
        if (timeDifference > 0) {
          // Relationships have more moments
          insights.push({
            type: 'info',
            message: t('insights.comparison.relationships.sphereComparison.moreRelationshipTime'),
          });
        } else {
          // Career has more moments
          insights.push({
            type: 'warning',
            message: t('insights.comparison.relationships.sphereComparison.moreCareerTime'),
          });
        }
      } else {
        // Approximately balanced
        insights.push({
          type: 'info',
          message: t('insights.comparison.relationships.sphereComparison.balancedTime'),
        });
      }
    } else {
      // No data
      insights.push({
        type: 'info',
        message: t('insights.comparison.relationships.sphereComparison.balancedTime'),
      });
    }

    // Quality comparison insights
    if (Math.abs(qualityDifference) > QUALITY_THRESHOLD_SIGNIFICANT) {
      if (qualityDifference > QUALITY_THRESHOLD_SIGNIFICANT) {
        insights.push({
          type: 'kudos',
          message: t('insights.comparison.relationships.sphereComparison.betterRelationshipQuality'),
        });
      } else {
        insights.push({
          type: 'info',
          message: t('insights.comparison.relationships.sphereComparison.betterCareerQuality'),
        });
      }
    }

    return {
      relationships,
      career,
      insights,
    };
  }, [relationshipsSphereData, careerSphereData, t]);


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
    subtitle: {
      textAlign: 'center',
      marginBottom: 32 * fontScale,
      opacity: 0.7,
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
      backgroundColor: colors.primary + '40',
    },
    barLabel: {
      flex: 1,
      marginRight: 12 * fontScale,
    },
    nameRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8 * fontScale,
    },
    statusBadgeCurrent: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4 * fontScale,
      paddingHorizontal: 8 * fontScale,
      paddingVertical: 4 * fontScale,
      borderRadius: 10 * fontScale,
      backgroundColor: colors.primaryLight + '20',
    },
    statusBadgeCurrentText: {
      fontSize: 10 * fontScale,
      color: colors.primaryLight,
    },
    statusBadgeEx: {
      paddingHorizontal: 8 * fontScale,
      paddingVertical: 4 * fontScale,
      borderRadius: 10 * fontScale,
      backgroundColor: colorScheme === 'dark' 
        ? 'rgba(255, 255, 255, 0.1)' 
        : 'rgba(0, 0, 0, 0.1)',
    },
    statusBadgeExText: {
      fontSize: 10 * fontScale,
      opacity: 0.7,
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
    divider: {
      height: 1,
      backgroundColor: colorScheme === 'dark' 
        ? 'rgba(255, 255, 255, 0.1)' 
        : 'rgba(0, 0, 0, 0.1)',
      marginVertical: 24 * fontScale,
    },
    comparisonContainer: {
      padding: 16 * fontScale,
      borderRadius: 12 * fontScale,
      marginTop: 8 * fontScale,
    },
    comparisonWarning: {
      backgroundColor: '#ff6b6b20',
      borderWidth: 1,
      borderColor: '#ff6b6b40',
    },
    comparisonKudos: {
      backgroundColor: colors.primaryLight + '20',
      borderWidth: 1,
      borderColor: colors.primaryLight + '40',
    },
    comparisonText: {
      fontSize: 14 * fontScale,
      lineHeight: 20 * fontScale,
    },
    comparisonWarningText: {
      color: '#ff6b6b',
    },
    comparisonKudosText: {
      color: colors.primaryLight,
    },
    comparisonHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 24 * fontScale,
      paddingHorizontal: 4 * fontScale,
    },
    comparisonItem: {
      flex: 1,
      alignItems: 'center',
      gap: 8 * fontScale,
    },
    comparisonValue: {
      fontSize: 24 * fontScale,
      fontWeight: '700',
    },
    comparisonLabel: {
      fontSize: 12 * fontScale,
      opacity: 0.7,
      textAlign: 'center',
    },
    comparisonDivider: {
      width: 1,
      height: 40 * fontScale,
      backgroundColor: colorScheme === 'dark' 
        ? 'rgba(255, 255, 255, 0.2)' 
        : 'rgba(0, 0, 0, 0.2)',
    },
    sphereCard: {
      borderRadius: 16 * fontScale,
      padding: 20 * fontScale,
      backgroundColor: colorScheme === 'dark' 
        ? 'rgba(255, 255, 255, 0.05)' 
        : 'rgba(0, 0, 0, 0.05)',
      marginBottom: 24 * fontScale,
    },
    sphereHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 16 * fontScale,
      gap: 12 * fontScale,
    },
    sphereIcon: {
      width: 48 * fontScale,
      height: 48 * fontScale,
      borderRadius: 24 * fontScale,
      justifyContent: 'center',
      alignItems: 'center',
    },
    totalMomentsBar: {
      height: 48 * fontScale,
      borderRadius: 24 * fontScale,
      overflow: 'hidden',
      flexDirection: 'row',
      backgroundColor: colorScheme === 'dark' 
        ? 'rgba(255, 255, 255, 0.1)' 
        : 'rgba(0, 0, 0, 0.1)',
      marginBottom: 16 * fontScale,
    },
    totalMomentsBarFill: {
      height: '100%',
      justifyContent: 'center',
      alignItems: 'center',
    },
    qualityBar: {
      height: 40 * fontScale,
      borderRadius: 20 * fontScale,
      overflow: 'hidden',
      flexDirection: 'row',
      backgroundColor: colorScheme === 'dark' 
        ? 'rgba(255, 255, 255, 0.1)' 
        : 'rgba(0, 0, 0, 0.1)',
      marginBottom: 8 * fontScale,
    },
    qualitySegment: {
      height: '100%',
    },
    qualityText: {
      fontSize: 12 * fontScale,
      opacity: 0.7,
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
    categoriesContainer: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      paddingTop: 24 * fontScale,
    },
    categoryItem: {
      alignItems: 'center',
      gap: 8 * fontScale,
    },
    categoryIcon: {
      width: 48 * fontScale,
      height: 48 * fontScale,
      borderRadius: 24 * fontScale,
      justifyContent: 'center',
      alignItems: 'center',
    },
    categoryText: {
      fontSize: 12 * fontScale,
    },
  }), [fontScale, colorScheme, colors]);

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
            {t('insights.comparison.relationships.title')}
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
              {t('insights.comparison.relationships.subtitle')}
            </ThemedText>

            {/* Sphere Comparison - Relationships vs Career */}
            {sphereComparison && (() => {
              const { relationships, career, insights } = sphereComparison;
              const totalAllMoments = relationships.totalMoments + career.totalMoments;
              
              // Calculate percentages of total (should add up to 100%)
              const relationshipsPercentage = totalAllMoments > 0 
                ? (relationships.totalMoments / totalAllMoments) * 100 
                : 0;
              const careerPercentage = totalAllMoments > 0 
                ? (career.totalMoments / totalAllMoments) * 100 
                : 0;
              
              return (
                <>
                  {/* Single Stacked Bar Chart */}
                  <View style={styles.comparisonBarChartContainer}>
                    {/* Legend */}
                    <View style={styles.barChartLegend}>
                      <View style={styles.legendItem}>
                        <View style={[styles.legendColor, { backgroundColor: '#f87171' }]} />
                        <ThemedText size="sm" weight="semibold" style={styles.legendLabel}>
                          {t('spheres.relationships')} ({relationships.totalMoments})
                        </ThemedText>
                        <ThemedText size="sm" weight="bold" style={[styles.legendValue, { color: '#f87171' }]}>
                          {Math.round(relationshipsPercentage)}%
                        </ThemedText>
                      </View>
                      <View style={styles.legendItem}>
                        <View style={[styles.legendColor, { backgroundColor: '#3b82f6' }]} />
                        <ThemedText size="sm" weight="semibold" style={styles.legendLabel}>
                          {t('spheres.career')} ({career.totalMoments})
                        </ThemedText>
                        <ThemedText size="sm" weight="bold" style={[styles.legendValue, { color: '#3b82f6' }]}>
                          {Math.round(careerPercentage)}%
                        </ThemedText>
                      </View>
                    </View>
                    
                    {/* Stacked Bar */}
                    <View style={styles.stackedBarWrapper}>
                      <View style={[styles.stackedBarSegment, { 
                        width: `${relationshipsPercentage}%`, 
                        backgroundColor: '#f87171' 
                      }]} />
                      <View style={[styles.stackedBarSegment, { 
                        width: `${careerPercentage}%`, 
                        backgroundColor: '#3b82f6' 
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

                  <View style={styles.divider} />
                </>
              );
            })()}

            {/* Bar Charts for each partner */}
            {chartData.map((data) => {
              // Calculate percentage widths based on total for this partner
              const cloudPercentage = data.total > 0 ? (data.totalClouds / data.total) * 100 : 0;
              const sunPercentage = data.total > 0 ? (data.totalSuns / data.total) * 100 : 0;
              
              return (
                <TouchableOpacity 
                  key={data.profile.id} 
                  style={styles.barContainer}
                  onPress={() => router.push(`/relationship-detail?id=${data.profile.id}`)}
                  activeOpacity={0.7}
                >
                  <View style={styles.barRow}>
                    {/* Avatar */}
                    <View style={styles.avatarContainer}>
                      {data.profile.imageUri ? (
                        <Image
                          source={{ uri: data.profile.imageUri }}
                          style={styles.avatar}
                          contentFit="cover"
                        />
                      ) : (
                        <View style={styles.avatarPlaceholder}>
                          <MaterialIcons 
                            name="person" 
                            size={20 * fontScale} 
                            color={colors.primaryLight} 
                          />
                        </View>
                      )}
                    </View>
                    
                    {/* Partner Name with Status Badge */}
                    <View style={styles.barLabel}>
                      <View style={styles.nameRow}>
                        <ThemedText size="sm" weight="semibold">
                          {data.profile.name}
                        </ThemedText>
                        {!data.profile.relationshipEndDate ? (
                          <View style={styles.statusBadgeCurrent}>
                            <MaterialIcons name="favorite" size={12 * fontScale} color={colors.primaryLight} />
                            <ThemedText size="xs" weight="bold" style={styles.statusBadgeCurrentText}>
                              {t('insights.comparison.label.current')}
                            </ThemedText>
                          </View>
                        ) : (
                          <View style={styles.statusBadgeEx}>
                            <ThemedText size="xs" weight="semibold" style={styles.statusBadgeExText}>
                              {t('insights.comparison.label.ex')}
                            </ThemedText>
                          </View>
                        )}
                      </View>
                    </View>
                    
                    {/* Bar Chart */}
                    <View style={styles.barWrapper}>
                      {/* Cloudy segment (black) - on the left */}
                      {data.totalClouds > 0 && (
                        <View
                          style={[
                            styles.cloudSegment,
                            { 
                              width: `${cloudPercentage}%`,
                              backgroundColor: '#000000'
                            }
                          ]}
                        />
                      )}
                      
                      {/* Sunny segment (yellow/gold) - on the right */}
                      {data.totalSuns > 0 && (
                        <View
                          style={[
                            styles.sunSegment,
                            { 
                              width: `${sunPercentage}%`,
                              backgroundColor: '#FFD700'
                            }
                          ]}
                        />
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



            {/* Categories */}
            <View style={styles.categoriesContainer}>
              <View style={styles.categoryItem}>
                <View style={[styles.categoryIcon, { backgroundColor: '#FFD70020' }]}>
                  <MaterialIcons name="wb-sunny" size={24 * fontScale} color="#FFD700" />
                </View>
                <ThemedText size="sm" style={[styles.categoryText, { color: '#FFD700' }]}>
                  {t('insights.comparison.relationships.goodMoments')}
                </ThemedText>
              </View>
              
              <View style={styles.categoryItem}>
                <View style={[styles.categoryIcon, { backgroundColor: '#00000020' }]}>
                  <MaterialIcons name="cloud" size={24 * fontScale} color="#000000" />
                </View>
                <ThemedText size="sm" style={[styles.categoryText, { color: colorScheme === 'dark' ? '#ffffff' : '#000000' }]}>
                  {t('insights.comparison.relationships.badMoments')}
                </ThemedText>
              </View>
            </View>
          </View>
        </ScrollView>
      </View>
    </TabScreenContainer>
  );
}
