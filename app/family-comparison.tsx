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
import { Dimensions, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function FamilyComparisonScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'dark'];
  const fontScale = useFontScale();
  const t = useTranslate();
  
  const { jobs, familyMembers, getEntitiesBySphere, getIdealizedMemoriesByProfileId, getIdealizedMemoriesByEntityId } = useJourney();

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

  // Calculate comparison insights
  const comparisonInsights = useMemo(() => {
    const family = sphereData.family;
    const career = sphereData.career;
    const totalAllMoments = family.totalMoments + career.totalMoments;

    if (totalAllMoments === 0) {
      return null;
    }

    const insights = {
      family,
      career,
      totalAllMoments,
      familyPercentage: totalAllMoments > 0 ? (family.totalMoments / totalAllMoments) * 100 : 0,
      careerPercentage: totalAllMoments > 0 ? (career.totalMoments / totalAllMoments) * 100 : 0,
      qualityDifference: family.sunnyPercentage - career.sunnyPercentage,
      timeBalance: family.totalMoments > career.totalMoments ? 'family' : career.totalMoments > family.totalMoments ? 'career' : 'balanced',
    };

    return insights;
  }, [sphereData]);

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
    comparisonContainer: {
      gap: 32 * fontScale,
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
    sphereTitle: {
      flex: 1,
    },
    totalMomentsContainer: {
      marginBottom: 16 * fontScale,
    },
    totalMomentsLabel: {
      marginBottom: 8 * fontScale,
      opacity: 0.8,
    },
    totalMomentsBar: {
      height: 48 * fontScale,
      borderRadius: 24 * fontScale,
      overflow: 'hidden',
      flexDirection: 'row',
      backgroundColor: colorScheme === 'dark' 
        ? 'rgba(255, 255, 255, 0.1)' 
        : 'rgba(0, 0, 0, 0.1)',
    },
    totalMomentsFill: {
      height: '100%',
      justifyContent: 'center',
      alignItems: 'center',
    },
    totalMomentsText: {
      color: '#ffffff',
      fontWeight: '700',
    },
    qualityContainer: {
      marginTop: 16 * fontScale,
    },
    qualityLabel: {
      marginBottom: 12 * fontScale,
      opacity: 0.8,
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
    qualityInfo: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: 4 * fontScale,
    },
    qualityText: {
      fontSize: 12 * fontScale,
      opacity: 0.7,
    },
    insightCard: {
      borderRadius: 12 * fontScale,
      padding: 16 * fontScale,
      marginTop: 8 * fontScale,
      marginBottom: 24 * fontScale,
    },
    insightCardWarning: {
      backgroundColor: '#ff6b6b20',
      borderWidth: 1,
      borderColor: '#ff6b6b40',
    },
    insightCardInfo: {
      backgroundColor: colors.primaryLight + '20',
      borderWidth: 1,
      borderColor: colors.primaryLight + '40',
    },
    insightCardKudos: {
      backgroundColor: '#10b98120',
      borderWidth: 1,
      borderColor: '#10b98140',
    },
    insightText: {
      fontSize: 14 * fontScale,
      lineHeight: 20 * fontScale,
    },
    insightWarningText: {
      color: '#ff6b6b',
    },
    insightInfoText: {
      color: colors.primaryLight,
    },
    insightKudosText: {
      color: '#10b981',
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
    divider: {
      width: 1,
      height: 40 * fontScale,
      backgroundColor: colorScheme === 'dark' 
        ? 'rgba(255, 255, 255, 0.2)' 
        : 'rgba(0, 0, 0, 0.2)',
    },
    categoriesContainer: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      paddingTop: 24 * fontScale,
      marginTop: 16 * fontScale,
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

  if (!comparisonInsights) {
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

  const { family, career, totalAllMoments, familyPercentage, careerPercentage } = comparisonInsights;
  
  // Calculate bar widths based on total moments
  const maxMoments = Math.max(family.totalMoments, career.totalMoments, 1);
  const familyBarWidth = (family.totalMoments / maxMoments) * 100;
  const careerBarWidth = (career.totalMoments / maxMoments) * 100;

  // Calculate quality segment percentages
  const familyCloudPct = family.totalMoments > 0 ? (family.totalClouds / family.totalMoments) * 100 : 0;
  const familySunPct = family.totalMoments > 0 ? (family.totalSuns / family.totalMoments) * 100 : 0;
  const careerCloudPct = career.totalMoments > 0 ? (career.totalClouds / career.totalMoments) * 100 : 0;
  const careerSunPct = career.totalMoments > 0 ? (career.totalSuns / career.totalMoments) * 100 : 0;

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

            {/* Overall Comparison Summary */}
            <View style={styles.comparisonHeader}>
              <View style={styles.comparisonItem}>
                <ThemedText size="xl" weight="bold" style={[styles.comparisonValue, { color: '#10b981' }]}>
                  {family.totalMoments}
                </ThemedText>
                <ThemedText size="xs" style={styles.comparisonLabel}>
                  {t('insights.comparison.family.totalMoments')} - {t('spheres.family')}
                </ThemedText>
              </View>
              <View style={styles.divider} />
              <View style={styles.comparisonItem}>
                <ThemedText size="xl" weight="bold" style={[styles.comparisonValue, { color: '#3b82f6' }]}>
                  {career.totalMoments}
                </ThemedText>
                <ThemedText size="xs" style={styles.comparisonLabel}>
                  {t('insights.comparison.family.totalMoments')} - {t('spheres.career')}
                </ThemedText>
              </View>
            </View>

            {/* Family Sphere Card */}
            <View style={styles.sphereCard}>
              <View style={styles.sphereHeader}>
                <View style={[styles.sphereIcon, { backgroundColor: '#10b98120' }]}>
                  <MaterialIcons name="family-restroom" size={24 * fontScale} color="#10b981" />
                </View>
                <ThemedText size="lg" weight="bold" style={styles.sphereTitle}>
                  {t('spheres.family')}
                </ThemedText>
                <ThemedText size="sm" weight="bold" style={{ color: '#10b981' }}>
                  {Math.round(family.sunnyPercentage)}%
                </ThemedText>
              </View>

              {/* Total Moments Bar */}
              <View style={styles.totalMomentsContainer}>
                <ThemedText size="xs" style={styles.totalMomentsLabel}>
                  {t('insights.comparison.family.totalMoments')}: {family.totalMoments}
                </ThemedText>
                <View style={styles.totalMomentsBar}>
                  <View 
                    style={[
                      styles.totalMomentsFill, 
                      { 
                        width: `${familyBarWidth}%`,
                        backgroundColor: '#10b981',
                      }
                    ]}
                  >
                    <ThemedText size="sm" weight="bold" style={styles.totalMomentsText}>
                      {family.totalMoments}
                    </ThemedText>
                  </View>
                </View>
              </View>

              {/* Quality Bar */}
              <View style={styles.qualityContainer}>
                <ThemedText size="xs" style={styles.qualityLabel}>
                  {t('insights.comparison.family.quality')}
                </ThemedText>
                <View style={styles.qualityBar}>
                  {family.totalClouds > 0 && (
                    <View
                      style={[
                        styles.qualitySegment,
                        {
                          width: `${familyCloudPct}%`,
                          backgroundColor: '#000000',
                        }
                      ]}
                    />
                  )}
                  {family.totalSuns > 0 && (
                    <View
                      style={[
                        styles.qualitySegment,
                        {
                          width: `${familySunPct}%`,
                          backgroundColor: '#FFD700',
                        }
                      ]}
                    />
                  )}
                </View>
                <View style={styles.qualityInfo}>
                  <ThemedText size="xs" style={styles.qualityText}>
                    {t('insights.comparison.family.cloudy')}: {family.totalClouds}
                  </ThemedText>
                  <ThemedText size="xs" style={styles.qualityText}>
                    {t('insights.comparison.family.sunny')}: {family.totalSuns}
                  </ThemedText>
                </View>
              </View>
            </View>

            {/* Career Sphere Card */}
            <View style={styles.sphereCard}>
              <View style={styles.sphereHeader}>
                <View style={[styles.sphereIcon, { backgroundColor: '#3b82f620' }]}>
                  <MaterialIcons name="work" size={24 * fontScale} color="#3b82f6" />
                </View>
                <ThemedText size="lg" weight="bold" style={styles.sphereTitle}>
                  {t('spheres.career')}
                </ThemedText>
                <ThemedText size="sm" weight="bold" style={{ color: '#3b82f6' }}>
                  {Math.round(career.sunnyPercentage)}%
                </ThemedText>
              </View>

              {/* Total Moments Bar */}
              <View style={styles.totalMomentsContainer}>
                <ThemedText size="xs" style={styles.totalMomentsLabel}>
                  {t('insights.comparison.family.totalMoments')}: {career.totalMoments}
                </ThemedText>
                <View style={styles.totalMomentsBar}>
                  <View 
                    style={[
                      styles.totalMomentsFill, 
                      { 
                        width: `${careerBarWidth}%`,
                        backgroundColor: '#3b82f6',
                      }
                    ]}
                  >
                    <ThemedText size="sm" weight="bold" style={styles.totalMomentsText}>
                      {career.totalMoments}
                    </ThemedText>
                  </View>
                </View>
              </View>

              {/* Quality Bar */}
              <View style={styles.qualityContainer}>
                <ThemedText size="xs" style={styles.qualityLabel}>
                  {t('insights.comparison.family.quality')}
                </ThemedText>
                <View style={styles.qualityBar}>
                  {career.totalClouds > 0 && (
                    <View
                      style={[
                        styles.qualitySegment,
                        {
                          width: `${careerCloudPct}%`,
                          backgroundColor: '#000000',
                        }
                      ]}
                    />
                  )}
                  {career.totalSuns > 0 && (
                    <View
                      style={[
                        styles.qualitySegment,
                        {
                          width: `${careerSunPct}%`,
                          backgroundColor: '#FFD700',
                        }
                      ]}
                    />
                  )}
                </View>
                <View style={styles.qualityInfo}>
                  <ThemedText size="xs" style={styles.qualityText}>
                    {t('insights.comparison.family.cloudy')}: {career.totalClouds}
                  </ThemedText>
                  <ThemedText size="xs" style={styles.qualityText}>
                    {t('insights.comparison.family.sunny')}: {career.totalSuns}
                  </ThemedText>
                </View>
              </View>
            </View>

            {/* Insights Messages */}
            {(() => {
              const insights = [];
              
              // Time balance insight
              if (comparisonInsights.timeBalance === 'family' && family.totalMoments > 0) {
                insights.push({
                  type: 'info',
                  message: t('insights.comparison.family.insight.moreFamilyTime'),
                });
              } else if (comparisonInsights.timeBalance === 'career' && career.totalMoments > 0) {
                insights.push({
                  type: 'warning',
                  message: t('insights.comparison.family.insight.moreCareerTime'),
                });
              } else if (comparisonInsights.timeBalance === 'balanced' && totalAllMoments > 0) {
                insights.push({
                  type: 'kudos',
                  message: t('insights.comparison.family.insight.balancedTime'),
                });
              }

              // Quality comparison
              if (Math.abs(comparisonInsights.qualityDifference) > 10) {
                if (comparisonInsights.qualityDifference > 10) {
                  insights.push({
                    type: 'kudos',
                    message: t('insights.comparison.family.insight.betterFamilyQuality'),
                  });
                } else {
                  insights.push({
                    type: 'info',
                    message: t('insights.comparison.family.insight.betterCareerQuality'),
                  });
                }
              }

              return insights.map((insight, index) => (
                <View
                  key={index}
                  style={[
                    styles.insightCard,
                    insight.type === 'warning' ? styles.insightCardWarning :
                    insight.type === 'kudos' ? styles.insightCardKudos :
                    styles.insightCardInfo
                  ]}
                >
                  <ThemedText
                    size="sm"
                    weight="semibold"
                    style={[
                      styles.insightText,
                      insight.type === 'warning' ? styles.insightWarningText :
                      insight.type === 'kudos' ? styles.insightKudosText :
                      styles.insightInfoText
                    ]}
                  >
                    {insight.message}
                  </ThemedText>
                </View>
              ));
            })()}

            {/* Categories Legend */}
            <View style={styles.categoriesContainer}>
              <View style={styles.categoryItem}>
                <View style={[styles.categoryIcon, { backgroundColor: '#FFD70020' }]}>
                  <MaterialIcons name="wb-sunny" size={24 * fontScale} color="#FFD700" />
                </View>
                <ThemedText size="sm" style={[styles.categoryText, { color: '#FFD700' }]}>
                  {t('insights.comparison.family.sunny')}
                </ThemedText>
              </View>
              
              <View style={styles.categoryItem}>
                <View style={[styles.categoryIcon, { backgroundColor: '#00000020' }]}>
                  <MaterialIcons name="cloud" size={24 * fontScale} color="#000000" />
                </View>
                <ThemedText size="sm" style={[styles.categoryText, { color: colorScheme === 'dark' ? '#ffffff' : '#000000' }]}>
                  {t('insights.comparison.family.cloudy')}
                </ThemedText>
              </View>
            </View>
          </View>
        </ScrollView>
      </View>
    </TabScreenContainer>
  );
}

