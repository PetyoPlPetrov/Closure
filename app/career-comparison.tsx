import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useFontScale } from '@/hooks/use-device-size';
import { TabScreenContainer } from '@/library/components/tab-screen-container';
import type { Job, LifeSphere } from '@/utils/JourneyProvider';
import { useJourney } from '@/utils/JourneyProvider';
import { useTranslate } from '@/utils/languages/use-translate';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import React, { useMemo } from 'react';
import { Dimensions, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function CareerComparisonScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'dark'];
  const fontScale = useFontScale();
  const t = useTranslate();
  
  const { jobs, profiles, getIdealizedMemoriesByEntityId, getEntitiesBySphere, getIdealizedMemoriesByProfileId } = useJourney();

  // Calculate data points for each job
  const chartData = useMemo(() => {
    // Sort jobs chronologically (by start date, with ongoing first)
    const sortedJobs = [...jobs]
      .filter(j => j.startDate)
      .sort((a, b) => {
        // Ongoing first
        if (!a.endDate && b.endDate) return -1;
        if (a.endDate && !b.endDate) return 1;
        
        // Then by start date (newest first)
        if (a.startDate && b.startDate) {
          return new Date(b.startDate).getTime() - new Date(a.startDate).getTime();
        }
        return 0;
      })
      .reverse(); // Reverse to show oldest first

    const mapped = sortedJobs.map((job) => {
      const memories = getIdealizedMemoriesByEntityId(job.id, 'career');
      
      let totalSuns = 0;
      let totalClouds = 0;
      
      memories.forEach((memory) => {
        totalSuns += (memory.goodFacts || []).length;
        totalClouds += (memory.hardTruths || []).length;
      });
      
      const total = totalSuns + totalClouds;
      const sunPercentage = total > 0 ? (totalSuns / total) * 100 : 0;
      
      return {
        job,
        totalSuns,
        totalClouds,
        total,
        sunPercentage,
      };
    }).filter(data => data.total > 0); // Only include jobs with memories
    
    // Sort: ongoing first, then by date
    return mapped.sort((a, b) => {
      if (!a.job.endDate && b.job.endDate) return -1;
      if (a.job.endDate && !b.job.endDate) return 1;
      return 0;
    });
  }, [jobs, getIdealizedMemoriesByEntityId]);

  // Calculate career sphere overall data
  const careerSphereData = useMemo(() => {
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

  // Calculate relationships sphere data
  const relationshipsSphereData = useMemo(() => {
    const entities = getEntitiesBySphere('relationships');
    if (entities.length === 0) return { totalSuns: 0, totalClouds: 0, totalMoments: 0, sunnyPercentage: 0 };

    let totalClouds = 0;
    let totalSuns = 0;

    entities.forEach((entity) => {
      const memories = 'id' in entity
        ? getIdealizedMemoriesByProfileId(entity.id)
        : [];

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
  }, [getEntitiesBySphere, getIdealizedMemoriesByProfileId]);

  // Calculate comparison between career and relationships
  const sphereComparison = useMemo(() => {
    const career = careerSphereData;
    const relationships = relationshipsSphereData;
    const totalAllMoments = career.totalMoments + relationships.totalMoments;

    if (totalAllMoments === 0) {
      return null;
    }

    const timeDifference = career.totalMoments - relationships.totalMoments;

    // Threshold: 20% of the larger amount
    const largerAmount = Math.max(career.totalMoments, relationships.totalMoments);
    const TIME_THRESHOLD_PERCENTAGE = 0.2; // 20% of larger amount

    const insights: { type: 'warning' | 'kudos' | 'info'; message: string }[] = [];

    // Time comparison insights - check if difference is more than 20% of larger amount
    if (largerAmount > 0) {
      const differencePercentage = Math.abs(timeDifference) / largerAmount;
      
      if (differencePercentage > TIME_THRESHOLD_PERCENTAGE) {
        // One sphere prevails significantly (more than 20% difference)
        if (timeDifference > 0) {
          // Career has more moments - warning
          insights.push({
            type: 'warning',
            message: t('insights.comparison.career.sphereComparison.moreCareerTime'),
          });
        } else {
          // Relationships have more moments
          insights.push({
            type: 'info',
            message: t('insights.comparison.career.sphereComparison.moreRelationshipTime'),
          });
        }
      } else {
        // Approximately balanced
        insights.push({
          type: 'info',
          message: t('insights.comparison.career.sphereComparison.balancedTime'),
        });
      }
    } else {
      // No data
      insights.push({
        type: 'info',
        message: t('insights.comparison.career.sphereComparison.balancedTime'),
      });
    }

    // Quality comparison insights removed - not appropriate to congratulate about better work quality vs relationships

    return {
      career,
      relationships,
      insights,
    };
  }, [careerSphereData, relationshipsSphereData, t]);

  // Calculate comparison message and current percentage
  const comparisonData = useMemo(() => {
    const currentJob = chartData.find(d => !d.job.endDate);
    const pastJobs = chartData.filter(d => d.job.endDate);
    
    if (!currentJob) {
      return null;
    }
    
    const currentSunPercentage = currentJob.sunPercentage;
    
    // If there are no past jobs, only return the percentage
    if (pastJobs.length === 0) {
      return {
        currentSunPercentage,
        message: null,
        messageType: null as 'warning' | 'kudos' | null,
      };
    }
    
    const avgPastSunPercentage = pastJobs.reduce((sum, j) => sum + j.sunPercentage, 0) / pastJobs.length;
    const difference = currentSunPercentage - avgPastSunPercentage;
    
    // Thresholds for warnings/kudos
    const THRESHOLD_WARNING_LOWER = -3; // 3% worse
    const THRESHOLD_CLOSE = 5; // Within 5% (considered close/not much improvement)
    const THRESHOLD_KUDOS = 5; // 5% better (considered doing better)
    
    let message = null;
    let messageType: 'warning' | 'kudos' | null = null;
    
    if (difference < THRESHOLD_WARNING_LOWER) {
      // Warning: current job has lower sunny percentage
      message = t('insights.comparison.career.warning.lower');
      messageType = 'warning';
    } else if (difference >= THRESHOLD_WARNING_LOWER && difference <= THRESHOLD_CLOSE) {
      // Warning: close to past jobs (not much improvement)
      message = t('insights.comparison.career.warning.close');
      messageType = 'warning';
    } else if (difference > THRESHOLD_KUDOS) {
      // Kudos: doing better
      message = t('insights.comparison.career.kudos');
      messageType = 'kudos';
    }
    
    return {
      currentSunPercentage,
      message,
      messageType,
    };
  }, [chartData, t]);

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
      backgroundColor: '#3b82f620',
    },
    statusBadgeCurrentText: {
      fontSize: 10 * fontScale,
      color: '#3b82f6',
    },
    statusBadgePast: {
      paddingHorizontal: 8 * fontScale,
      paddingVertical: 4 * fontScale,
      borderRadius: 10 * fontScale,
      backgroundColor: colorScheme === 'dark' 
        ? 'rgba(255, 255, 255, 0.1)' 
        : 'rgba(0, 0, 0, 0.1)',
    },
    statusBadgePastText: {
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
            {t('insights.comparison.career.title')}
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
              {t('insights.comparison.career.subtitle')}
            </ThemedText>

            {/* Sphere Comparison - Career vs Relationships */}
            {sphereComparison && (() => {
              const { career, relationships, insights } = sphereComparison;
              const totalAllMoments = career.totalMoments + relationships.totalMoments;
              
              // Calculate percentages of total (should add up to 100%)
              const careerPercentage = totalAllMoments > 0 
                ? (career.totalMoments / totalAllMoments) * 100 
                : 0;
              const relationshipsPercentage = totalAllMoments > 0 
                ? (relationships.totalMoments / totalAllMoments) * 100 
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
                          {t('spheres.career')} ({career.totalMoments})
                        </ThemedText>
                        <ThemedText size="sm" weight="bold" style={[styles.legendValue, { color: '#3b82f6' }]}>
                          {Math.round(careerPercentage)}%
                        </ThemedText>
                      </View>
                      <View style={styles.legendItem}>
                        <View style={[styles.legendColor, { backgroundColor: '#f87171' }]} />
                        <ThemedText size="sm" weight="semibold" style={styles.legendLabel}>
                          {t('spheres.relationships')} ({relationships.totalMoments})
                        </ThemedText>
                        <ThemedText size="sm" weight="bold" style={[styles.legendValue, { color: '#f87171' }]}>
                          {Math.round(relationshipsPercentage)}%
                        </ThemedText>
                      </View>
                    </View>
                    
                    {/* Stacked Bar */}
                    <View style={styles.stackedBarWrapper}>
                      <View style={[styles.stackedBarSegment, { 
                        width: `${careerPercentage}%`, 
                        backgroundColor: '#3b82f6' 
                      }]} />
                      <View style={[styles.stackedBarSegment, { 
                        width: `${relationshipsPercentage}%`, 
                        backgroundColor: '#f87171' 
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

            {/* Bar Charts for each job */}
            {chartData.map((data) => {
              // Calculate percentage widths based on total for this job
              const cloudPercentage = data.total > 0 ? (data.totalClouds / data.total) * 100 : 0;
              const sunPercentage = data.total > 0 ? (data.totalSuns / data.total) * 100 : 0;
              
              return (
                <TouchableOpacity 
                  key={data.job.id} 
                  style={styles.barContainer}
                  onPress={() => router.push(`/job-detail?id=${data.job.id}`)}
                  activeOpacity={0.7}
                >
                  <View style={styles.barRow}>
                    {/* Avatar/Icon */}
                    <View style={styles.avatarContainer}>
                      {data.job.imageUri ? (
                        <Image
                          source={{ uri: data.job.imageUri }}
                          style={styles.avatar}
                          contentFit="cover"
                        />
                      ) : (
                        <View style={styles.avatarPlaceholder}>
                          <MaterialIcons 
                            name="work" 
                            size={20 * fontScale} 
                            color="#3b82f6" 
                          />
                        </View>
                      )}
                    </View>
                    
                    {/* Job Name with Status Badge */}
                    <View style={styles.barLabel}>
                      <View style={styles.nameRow}>
                        <ThemedText size="sm" weight="semibold">
                          {data.job.name}
                        </ThemedText>
                        {!data.job.endDate ? (
                          <View style={styles.statusBadgeCurrent}>
                            <MaterialIcons name="work" size={12 * fontScale} color="#3b82f6" />
                            <ThemedText size="xs" weight="bold" style={styles.statusBadgeCurrentText}>
                              {t('insights.comparison.label.current')}
                            </ThemedText>
                          </View>
                        ) : (
                          <View style={styles.statusBadgePast}>
                            <ThemedText size="xs" weight="semibold" style={styles.statusBadgePastText}>
                              {t('insights.comparison.label.past')}
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

            {/* Divider */}
            <View style={styles.divider} />

            {/* Comparison Message */}
            {comparisonData && comparisonData.message && comparisonData.messageType && (
              <View style={[
                styles.comparisonContainer,
                comparisonData.messageType === 'warning' 
                  ? styles.comparisonWarning 
                  : styles.comparisonKudos
              ]}>
                <ThemedText 
                  size="sm" 
                  weight="semibold"
                  style={[
                    styles.comparisonText,
                    comparisonData.messageType === 'warning' 
                      ? styles.comparisonWarningText 
                      : styles.comparisonKudosText
                  ]}
                >
                  {comparisonData.message}
                </ThemedText>
              </View>
            )}


            {/* Categories */}
            <View style={styles.categoriesContainer}>
              <View style={styles.categoryItem}>
                <View style={[styles.categoryIcon, { backgroundColor: '#FFD70020' }]}>
                  <MaterialIcons name="wb-sunny" size={24 * fontScale} color="#FFD700" />
                </View>
                <ThemedText size="sm" style={[styles.categoryText, { color: '#FFD700' }]}>
                  {t('insights.comparison.career.goodMoments')}
                </ThemedText>
              </View>
              
              <View style={styles.categoryItem}>
                <View style={[styles.categoryIcon, { backgroundColor: '#00000020' }]}>
                  <MaterialIcons name="cloud" size={24 * fontScale} color="#000000" />
                </View>
                <ThemedText size="sm" style={[styles.categoryText, { color: colorScheme === 'dark' ? '#ffffff' : '#000000' }]}>
                  {t('insights.comparison.career.badMoments')}
                </ThemedText>
              </View>
            </View>
          </View>
        </ScrollView>
      </View>
    </TabScreenContainer>
  );
}

