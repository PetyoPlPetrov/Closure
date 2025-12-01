import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useFontScale } from '@/hooks/use-device-size';
import { TabScreenContainer } from '@/library/components/tab-screen-container';
import type { LifeSphere } from '@/utils/JourneyProvider';
import { useJourney } from '@/utils/JourneyProvider';
import { useTranslate } from '@/utils/languages/use-translate';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { router } from 'expo-router';
import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';

export default function FamilyComparisonScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'dark'];
  const fontScale = useFontScale();
  const t = useTranslate();
  
  const { getEntitiesBySphere, getIdealizedMemoriesByProfileId, getIdealizedMemoriesByEntityId } = useJourney();

  // Calculate sphere data for family and career
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
      family: calculateSphereData('family'),
      career: calculateSphereData('career'),
    };
  }, [getEntitiesBySphere, getIdealizedMemoriesByProfileId, getIdealizedMemoriesByEntityId]);

  // Calculate comparison insights with 20% threshold rule
  const sphereComparison = useMemo(() => {
    const family = sphereData.family;
    const career = sphereData.career;
    const totalAllMoments = family.totalMoments + career.totalMoments;

    if (totalAllMoments === 0) {
      return null;
    }

    const timeDifference = family.totalMoments - career.totalMoments;

    // Threshold: 20% of the larger amount
    const largerAmount = Math.max(family.totalMoments, career.totalMoments);
    const TIME_THRESHOLD_PERCENTAGE = 0.2; // 20% of larger amount

    const insights: { type: 'warning' | 'kudos' | 'info'; message: string }[] = [];

    // Time comparison insights - check if difference is more than 20% of larger amount
    if (largerAmount > 0) {
      const differencePercentage = Math.abs(timeDifference) / largerAmount;
      
      if (differencePercentage > TIME_THRESHOLD_PERCENTAGE) {
        // One sphere prevails significantly (more than 20% difference)
        if (timeDifference > 0) {
          // Family has more moments
          insights.push({
            type: 'kudos',
            message: t('insights.comparison.family.insight.moreFamilyTime'),
          });
        } else {
          // Career has more moments
          insights.push({
            type: 'warning',
            message: t('insights.comparison.family.insight.moreCareerTime'),
          });
        }
      } else {
        // Approximately balanced
        insights.push({
          type: 'kudos',
          message: t('insights.comparison.family.insight.balancedTime'),
        });
      }
    } else {
      // No data
      insights.push({
        type: 'info',
        message: t('insights.comparison.family.insight.balancedTime'),
      });
    }

    return {
      family,
      career,
      insights,
    };
  }, [sphereData, t]);

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
  }), [fontScale, colorScheme, colors]);

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
              {t('insights.comparison.family.title')}
            </ThemedText>
            
            <View style={styles.headerButton} />
          </View>

          <View style={styles.content}>
            <ThemedText size="sm" style={styles.subtitle}>
              {t('insights.comparison.family.noData')}
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
            {t('insights.comparison.family.title')}
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
              {t('insights.comparison.family.subtitle')}
            </ThemedText>

            {/* Sphere Comparison - Family vs Career */}
            {(() => {
              const { family, career, insights } = sphereComparison;
              const totalAllMoments = family.totalMoments + career.totalMoments;
              
              // Calculate percentages of total (should add up to 100%)
              const familyPercentage = totalAllMoments > 0 
                ? (family.totalMoments / totalAllMoments) * 100 
                : 0;
              const careerPercentage = totalAllMoments > 0 
                ? (career.totalMoments / totalAllMoments) * 100 
                : 0;
              
              return (
                <>
                  {/* Overall Comparison Summary */}
                  <View style={styles.comparisonHeader}>
                    <View style={styles.comparisonItem}>
                      <ThemedText size="xl" weight="bold" style={[styles.comparisonValue, { color: '#10b981' }]}>
                        {family.totalMoments}
                      </ThemedText>
                      <ThemedText size="xs" style={styles.comparisonLabel}>
                        {t('insights.comparison.family.totalMoments')}
                      </ThemedText>
                    </View>
                    <View style={styles.comparisonDivider} />
                    <View style={styles.comparisonItem}>
                      <ThemedText size="xl" weight="bold" style={[styles.comparisonValue, { color: '#3b82f6' }]}>
                        {career.totalMoments}
                      </ThemedText>
                      <ThemedText size="xs" style={styles.comparisonLabel}>
                        {t('insights.comparison.family.totalMoments')}
                      </ThemedText>
                    </View>
                  </View>

                  {/* Single Stacked Bar Chart */}
                  <View style={styles.comparisonBarChartContainer}>
                    {/* Legend */}
                    <View style={styles.barChartLegend}>
                      <View style={styles.legendItem}>
                        <View style={[styles.legendColor, { backgroundColor: '#10b981' }]} />
                        <ThemedText size="sm" weight="semibold" style={styles.legendLabel}>
                          {t('spheres.family')}
                        </ThemedText>
                        <ThemedText size="sm" weight="bold" style={[styles.legendValue, { color: '#10b981' }]}>
                          {Math.round(familyPercentage)}%
                        </ThemedText>
                      </View>
                      <View style={styles.legendItem}>
                        <View style={[styles.legendColor, { backgroundColor: '#3b82f6' }]} />
                        <ThemedText size="sm" weight="semibold" style={styles.legendLabel}>
                          {t('spheres.career')}
                        </ThemedText>
                        <ThemedText size="sm" weight="bold" style={[styles.legendValue, { color: '#3b82f6' }]}>
                          {Math.round(careerPercentage)}%
                        </ThemedText>
                      </View>
                    </View>
                    
                    {/* Stacked Bar */}
                    <View style={styles.stackedBarWrapper}>
                      <View style={[styles.stackedBarSegment, { 
                        width: `${familyPercentage}%`, 
                        backgroundColor: '#10b981' 
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
                    </View>
                  )}
                </>
              );
            })()}
          </View>
        </ScrollView>
      </View>
    </TabScreenContainer>
  );
}

