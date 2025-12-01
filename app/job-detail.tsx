import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useFontScale } from '@/hooks/use-device-size';
import { TabScreenContainer } from '@/library/components/tab-screen-container';
import type { Job } from '@/utils/JourneyProvider';
import { useJourney } from '@/utils/JourneyProvider';
import { useTranslate } from '@/utils/languages/use-translate';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';

export default function JobDetailScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'dark'];
  const fontScale = useFontScale();
  const t = useTranslate();
  const { id } = useLocalSearchParams<{ id: string }>();
  
  const { jobs, getIdealizedMemoriesByEntityId } = useJourney();

  const job = useMemo(() => {
    return jobs.find(j => j.id === id);
  }, [jobs, id]);

  const memories = useMemo(() => {
    if (!id) return [];
    return getIdealizedMemoriesByEntityId(id, 'career');
  }, [id, getIdealizedMemoriesByEntityId]);

  // Calculate comparison with other jobs
  const comparisonData = useMemo(() => {
    if (!job || memories.length === 0) return null;

    const allJobs = jobs.filter(j => {
      const jobMemories = getIdealizedMemoriesByEntityId(j.id, 'career');
      return jobMemories.length > 0;
    });

    if (allJobs.length <= 1) return null;

    // Calculate current job's quality
    let currentSunny = 0;
    let currentCloudy = 0;
    memories.forEach((memory) => {
      currentSunny += (memory.goodFacts || []).length;
      currentCloudy += (memory.hardTruths || []).length;
    });
    const currentTotal = currentSunny + currentCloudy;
    const currentSunnyPercentage = currentTotal > 0 ? (currentSunny / currentTotal) * 100 : 0;

    const currentMemoriesCount = memories.length;
    const otherJobs = allJobs.filter(j => j.id !== job.id);
    
    const otherData = otherJobs.map(j => {
      const jobMemories = getIdealizedMemoriesByEntityId(j.id, 'career');
      let sunny = 0;
      let cloudy = 0;
      jobMemories.forEach((memory) => {
        sunny += (memory.goodFacts || []).length;
        cloudy += (memory.hardTruths || []).length;
      });
      const total = sunny + cloudy;
      const sunnyPercentage = total > 0 ? (sunny / total) * 100 : 0;
      return {
        count: jobMemories.length,
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
    const messageKey = `insights.detail.job.memories.${countComparison}.${qualityComparison}`;
    return {
      type: countComparison,
      message: t(messageKey),
    };
  }, [job, memories, jobs, getIdealizedMemoriesByEntityId, t]);

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
    jobHeader: {
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
    jobInfo: {
      flex: 1,
    },
    jobName: {
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

  if (!job) {
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
              {t('insights.detail.job.title')}
            </ThemedText>
            
            <View style={styles.headerButton} />
          </View>

          <View style={styles.content}>
            <ThemedText size="sm" style={styles.noData}>
              {t('insights.detail.job.noData')}
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
            {job.name}
          </ThemedText>
          
          <View style={styles.headerButton} />
        </View>

        <ScrollView
          contentContainerStyle={{ paddingBottom: 40 * fontScale }}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.content}>
            {/* Job Header */}
            <View style={styles.jobHeader}>
              <View style={styles.avatarContainer}>
                {job.imageUri ? (
                  <Image
                    source={{ uri: job.imageUri }}
                    style={styles.avatar}
                    contentFit="cover"
                  />
                ) : (
                  <View style={styles.avatarPlaceholder}>
                    <MaterialIcons 
                      name="work" 
                      size={32 * fontScale} 
                      color="#3b82f6" 
                    />
                  </View>
                )}
              </View>
              <View style={styles.jobInfo}>
                <ThemedText size="lg" weight="bold" style={styles.jobName}>
                  {job.name}
                </ThemedText>
                {!job.endDate ? (
                  <ThemedText size="xs" style={{ opacity: 0.7 }}>
                    {t('insights.comparison.label.current')}
                  </ThemedText>
                ) : (
                  <ThemedText size="xs" style={{ opacity: 0.7 }}>
                    {t('insights.comparison.label.past')}
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
                {t('insights.detail.job.memories.title')}
              </ThemedText>
              
              {memories.length === 0 ? (
                <ThemedText size="sm" style={styles.noData}>
                  {t('insights.detail.job.memories.noData')}
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
                    <View key={memory.id} style={styles.memoryCard}>
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

