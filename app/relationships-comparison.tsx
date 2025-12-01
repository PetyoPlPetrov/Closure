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
  
  const { profiles, getIdealizedMemoriesByProfileId } = useJourney();

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

  // Calculate comparison message and current percentage
  const comparisonData = useMemo(() => {
    const currentPartner = chartData.find(d => !d.profile.relationshipEndDate);
    const pastPartners = chartData.filter(d => d.profile.relationshipEndDate);
    
    if (!currentPartner) {
      return null;
    }
    
    const currentSunPercentage = currentPartner.sunPercentage;
    
    // If there are no past partners, only return the percentage
    if (pastPartners.length === 0) {
      return {
        currentSunPercentage,
        message: null,
        messageType: null as 'warning' | 'kudos' | null,
      };
    }
    
    const avgPastSunPercentage = pastPartners.reduce((sum, p) => sum + p.sunPercentage, 0) / pastPartners.length;
    const difference = currentSunPercentage - avgPastSunPercentage;
    
    // Thresholds for warnings/kudos
    const THRESHOLD_WARNING_LOWER = -3; // 3% worse
    const THRESHOLD_CLOSE = 5; // Within 5% (considered close/not much improvement)
    const THRESHOLD_KUDOS = 5; // 5% better (considered doing better)
    
    let message = null;
    let messageType: 'warning' | 'kudos' | null = null;
    
    if (difference < THRESHOLD_WARNING_LOWER) {
      // Warning: current partner has lower sunny percentage
      message = t('insights.comparison.relationships.warning.lower');
      messageType = 'warning';
    } else if (difference >= THRESHOLD_WARNING_LOWER && difference <= THRESHOLD_CLOSE) {
      // Warning: close to past partners (not much improvement)
      message = t('insights.comparison.relationships.warning.close');
      messageType = 'warning';
    } else if (difference > THRESHOLD_KUDOS) {
      // Kudos: doing better
      message = t('insights.comparison.relationships.kudos');
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
      marginBottom: 24 * fontScale,
    },
    barRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 16 * fontScale,
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
    barWrapper: {
      flex: 1,
      height: 32 * fontScale,
      borderRadius: 16 * fontScale,
      overflow: 'hidden',
      flexDirection: 'row',
      backgroundColor: colorScheme === 'dark' 
        ? 'rgba(255, 255, 255, 0.1)' 
        : 'rgba(0, 0, 0, 0.1)',
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
    percentageExplanation: {
      marginTop: 16 * fontScale,
      marginBottom: 24 * fontScale,
      paddingHorizontal: 16 * fontScale,
      paddingVertical: 16 * fontScale,
      backgroundColor: colorScheme === 'dark' 
        ? 'rgba(255, 255, 255, 0.08)' 
        : 'rgba(0, 0, 0, 0.08)',
      borderRadius: 12 * fontScale,
      borderWidth: 1,
      borderColor: colorScheme === 'dark' 
        ? 'rgba(255, 255, 255, 0.1)' 
        : 'rgba(0, 0, 0, 0.1)',
    },
    percentageExplanationTitle: {
      marginBottom: 8 * fontScale,
      textAlign: 'center',
    },
    percentageText: {
      opacity: 0.8,
      lineHeight: 20 * fontScale,
      textAlign: 'center',
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

            {/* Percentage Explanation - Always show if there's data */}
            {chartData.length > 0 && (() => {
              // Calculate overall relationships sphere score (same as Wheel of Life)
              let totalSuns = 0;
              let totalClouds = 0;
              
              chartData.forEach((data) => {
                totalSuns += data.totalSuns;
                totalClouds += data.totalClouds;
              });
              
              const total = totalSuns + totalClouds;
              const overallPercentage = total > 0 
                ? Math.round((totalSuns / total) * 100)
                : 0;
              
              return (
                <View style={styles.percentageExplanation}>
                  <ThemedText size="sm" weight="semibold" style={styles.percentageExplanationTitle}>
                    {t('insights.comparison.relationships.percentageExplanationTitle')}
                  </ThemedText>
                  <ThemedText size="xs" style={styles.percentageText}>
                    {t('insights.comparison.relationships.percentageExplanation').replace('{percentage}', overallPercentage.toString())}
                  </ThemedText>
                </View>
              );
            })()}

            {/* Bar Charts for each partner */}
            {chartData.map((data) => {
              // Calculate percentage widths based on total for this partner
              const cloudPercentage = data.total > 0 ? (data.totalClouds / data.total) * 100 : 0;
              const sunPercentage = data.total > 0 ? (data.totalSuns / data.total) * 100 : 0;
              
              return (
                <View key={data.profile.id} style={styles.barContainer}>
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
                    
                    {/* Partner Name */}
                    <ThemedText size="sm" weight="semibold" style={styles.barLabel}>
                      {data.profile.name}
                    </ThemedText>
                    
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
                  </View>
                </View>
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
