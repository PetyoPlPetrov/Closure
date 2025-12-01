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
import { useMemo } from 'react';
import { Dimensions, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import Svg, { Circle, Path, Text as SvgText } from 'react-native-svg';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Wheel of Life Visualization Component
function WheelOfLifeVisualization({
  distribution,
  quality,
  colors,
  colorScheme,
  fontScale,
}: {
  distribution: { relationships: number; career: number; family: number }; // Percentage of total moments
  quality: { relationships: number; career: number; family: number }; // Sunny percentage for gradient
  colors: typeof Colors.dark;
  colorScheme: 'light' | 'dark' | null;
  fontScale: number;
}) {
  const size = Math.min(280 * fontScale, SCREEN_WIDTH - 80);
  const center = size / 2;
  const radius = size / 2 - 20;
  const gapAngle = 5; // Gap in degrees between slices

  // Normalize distribution percentages
  const totalDistribution = distribution.relationships + distribution.career + distribution.family;
  const normalizedDist = {
    relationships: totalDistribution > 0 ? (distribution.relationships / totalDistribution) * 100 : 33.33,
    career: totalDistribution > 0 ? (distribution.career / totalDistribution) * 100 : 33.33,
    family: totalDistribution > 0 ? (distribution.family / totalDistribution) * 100 : 33.33,
  };

  // Calculate available angle (360 minus gaps between 3 slices)
  const totalGaps = gapAngle * 3; // 3 gaps between 3 slices
  const availableAngle = 360 - totalGaps;

  // Calculate pie slice angles (start from top, clockwise)
  let currentAngle = -90; // Start at top

  const relStartAngle = currentAngle;
  const relSweepAngle = (normalizedDist.relationships / 100) * availableAngle;
  currentAngle += relSweepAngle + gapAngle;

  const careerStartAngle = currentAngle;
  const careerSweepAngle = (normalizedDist.career / 100) * availableAngle;
  currentAngle += careerSweepAngle + gapAngle;

  const familyStartAngle = currentAngle;
  const familySweepAngle = (normalizedDist.family / 100) * availableAngle;

  // Helper function to create pie slice path (triangle from center)
  const createPieSlice = (startAngle: number, sweepAngle: number) => {
    if (sweepAngle <= 0) return '';

    const startRad = (startAngle * Math.PI) / 180;
    const endRad = ((startAngle + sweepAngle) * Math.PI) / 180;

    const x1 = center + Math.cos(startRad) * radius;
    const y1 = center + Math.sin(startRad) * radius;
    const x2 = center + Math.cos(endRad) * radius;
    const y2 = center + Math.sin(endRad) * radius;

    const largeArcFlag = sweepAngle > 180 ? 1 : 0;

    return `M ${center} ${center} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2} Z`;
  };

  const relationshipsPath = createPieSlice(relStartAngle, relSweepAngle);
  const careerPath = createPieSlice(careerStartAngle, careerSweepAngle);
  const familyPath = createPieSlice(familyStartAngle, familySweepAngle);

  // Calculate label positions (middle of each slice)
  const getLabelPosition = (startAngle: number, sweepAngle: number) => {
    const midAngle = startAngle + sweepAngle / 2;
    const midRad = (midAngle * Math.PI) / 180;
    const labelRadius = radius * 0.65; // Position label at 65% of radius
    return {
      x: center + Math.cos(midRad) * labelRadius,
      y: center + Math.sin(midRad) * labelRadius,
    };
  };

  const relLabelPos = getLabelPosition(relStartAngle, relSweepAngle);
  const careerLabelPos = getLabelPosition(careerStartAngle, careerSweepAngle);
  const familyLabelPos = getLabelPosition(familyStartAngle, familySweepAngle);

  // Get distinct fixed colors for each sphere
  const relationshipsColor = '#f87171'; // Red/pink for relationships
  const careerColor = '#3b82f6'; // Blue for career
  const familyColor = '#10b981'; // Green for family

  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {/* Background circle */}
      <Circle cx={center} cy={center} r={radius} fill="none" stroke={colorScheme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'} strokeWidth={2} />

      {/* Relationships slice */}
      {relationshipsPath && (
        <>
          <Path
            d={relationshipsPath}
            fill={relationshipsColor}
            opacity={0.6}
          />
          {relSweepAngle > 5 && (
            <SvgText
              x={relLabelPos.x}
              y={relLabelPos.y}
              fontSize={14 * fontScale}
              fill={colors.text}
              textAnchor="middle"
              alignmentBaseline="middle"
              fontWeight="bold"
            >
              {Math.round(normalizedDist.relationships)}%
            </SvgText>
          )}
        </>
      )}

      {/* Career slice */}
      {careerPath && (
        <>
          <Path
            d={careerPath}
            fill={careerColor}
            opacity={0.6}
          />
          {careerSweepAngle > 5 && (
            <SvgText
              x={careerLabelPos.x}
              y={careerLabelPos.y}
              fontSize={14 * fontScale}
              fill={colors.text}
              textAnchor="middle"
              alignmentBaseline="middle"
              fontWeight="bold"
            >
              {Math.round(normalizedDist.career)}%
            </SvgText>
          )}
        </>
      )}

      {/* Family slice */}
      {familyPath && (
        <>
          <Path
            d={familyPath}
            fill={familyColor}
            opacity={0.6}
          />
          {familySweepAngle > 5 && (
            <SvgText
              x={familyLabelPos.x}
              y={familyLabelPos.y}
              fontSize={14 * fontScale}
              fill={colors.text}
              textAnchor="middle"
              alignmentBaseline="middle"
              fontWeight="bold"
            >
              {Math.round(normalizedDist.family)}%
            </SvgText>
          )}
        </>
      )}
    </Svg>
  );
}

export default function InsightsScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'dark'];
  const fontScale = useFontScale();
  const { profiles, jobs, familyMembers, getEntitiesBySphere, getIdealizedMemoriesByProfileId, getIdealizedMemoriesByEntityId } = useJourney();
  const t = useTranslate();

  // Calculate sphere data: total moments (for distribution) and sunny percentage (for quality)
  const sphereData = useMemo(() => {
    const calculateSphereData = (sphereType: LifeSphere) => {
      const entities = getEntitiesBySphere(sphereType);
      if (entities.length === 0) return { totalMoments: 0, sunnyPercentage: 0 };

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
        totalMoments,
        sunnyPercentage: Math.max(0, Math.min(100, isNaN(sunnyPercentage) ? 0 : sunnyPercentage)),
      };
    };

    return {
      relationships: calculateSphereData('relationships'),
      career: calculateSphereData('career'),
      family: calculateSphereData('family'),
    };
  }, [getEntitiesBySphere, getIdealizedMemoriesByProfileId, getIdealizedMemoriesByEntityId]);

  // Calculate distribution percentages (for segment sizes)
  const sphereDistribution = useMemo(() => {
    const totalAllMoments = sphereData.relationships.totalMoments + 
                           sphereData.career.totalMoments + 
                           sphereData.family.totalMoments;
    
    if (totalAllMoments === 0) {
      return {
        relationships: 33.33,
        career: 33.33,
        family: 33.33,
      };
    }

    return {
      relationships: (sphereData.relationships.totalMoments / totalAllMoments) * 100,
      career: (sphereData.career.totalMoments / totalAllMoments) * 100,
      family: (sphereData.family.totalMoments / totalAllMoments) * 100,
    };
  }, [sphereData]);

  // Keep sphereScores for insights (sunny percentage)
  const sphereScores = useMemo(() => ({
    relationships: sphereData.relationships.sunnyPercentage,
    career: sphereData.career.sunnyPercentage,
    family: sphereData.family.sunnyPercentage,
  }), [sphereData]);

  const spheres: { type: LifeSphere; icon: string; label: string; entities: any[] }[] = useMemo(() => [
    {
      type: 'relationships',
      icon: 'favorite',
      label: t('spheres.relationships'),
      entities: getEntitiesBySphere('relationships'),
    },
    {
      type: 'career',
      icon: 'work',
      label: t('spheres.career'),
      entities: getEntitiesBySphere('career'),
    },
    {
      type: 'family',
      icon: 'family-restroom',
      label: t('spheres.family'),
      entities: getEntitiesBySphere('family'),
    },
  ], [getEntitiesBySphere, t]);

  const styles = useMemo(() => StyleSheet.create({
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16 * fontScale,
      paddingTop: 8 * fontScale,
      paddingBottom: 8 * fontScale,
      marginTop: 50,
    },
    headerButton: {
      width: 48 * fontScale,
      height: 48 * fontScale,
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerTitle: {
      flex: 1,
      textAlign: 'center',
    },
    content: {
      flex: 1,
      padding: 16 * fontScale,
      gap: 24 * fontScale,
    },
    wheelContainer: {
      marginBottom: 32 * fontScale,
      padding: 20 * fontScale,
      borderRadius: 16 * fontScale,
      backgroundColor: colorScheme === 'dark' 
        ? 'rgba(255, 255, 255, 0.05)' 
        : 'rgba(0, 0, 0, 0.05)',
    },
    wheelTitle: {
      textAlign: 'center',
      marginBottom: 8 * fontScale,
    },
    wheelSubtitle: {
      textAlign: 'center',
      opacity: 0.7,
      marginBottom: 24 * fontScale,
    },
    wheelWrapper: {
      alignItems: 'center',
      justifyContent: 'center',
      marginVertical: 20 * fontScale,
    },
    distributionExplanation: {
      marginTop: 16 * fontScale,
      marginBottom: 8 * fontScale,
      paddingHorizontal: 20 * fontScale,
      paddingVertical: 12 * fontScale,
      backgroundColor: colorScheme === 'dark' 
        ? 'rgba(255, 255, 255, 0.05)' 
        : 'rgba(0, 0, 0, 0.05)',
      borderRadius: 8 * fontScale,
    },
    distributionExplanationText: {
      opacity: 0.7,
      lineHeight: 18 * fontScale,
      textAlign: 'center',
    },
    scoresContainer: {
      marginTop: 24 * fontScale,
      gap: 16 * fontScale,
    },
    scoreItem: {
      marginBottom: 12 * fontScale,
      borderRadius: 12 * fontScale,
      padding: 12 * fontScale,
      backgroundColor: colorScheme === 'dark' 
        ? 'rgba(255, 255, 255, 0.03)' 
        : 'rgba(0, 0, 0, 0.03)',
    },
    scoreRowTouchable: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12 * fontScale,
      marginBottom: 8 * fontScale,
    },
    scoreLabel: {
      flex: 1,
    },
    scoreValue: {
      minWidth: 50 * fontScale,
      textAlign: 'right',
    },
    scoreBarContainer: {
      height: 6 * fontScale,
      backgroundColor: colorScheme === 'dark' 
        ? 'rgba(255, 255, 255, 0.1)' 
        : 'rgba(0, 0, 0, 0.1)',
      borderRadius: 3 * fontScale,
      overflow: 'hidden',
    },
    scoreBar: {
      height: '100%',
      borderRadius: 3 * fontScale,
    },
    percentageExplanation: {
      marginTop: 16 * fontScale,
      marginBottom: 8 * fontScale,
      paddingHorizontal: 20 * fontScale,
      paddingVertical: 12 * fontScale,
      backgroundColor: colorScheme === 'dark' 
        ? 'rgba(255, 255, 255, 0.05)' 
        : 'rgba(0, 0, 0, 0.05)',
      borderRadius: 8 * fontScale,
    },
    percentageExplanationText: {
      opacity: 0.7,
      lineHeight: 18 * fontScale,
      textAlign: 'center',
    },
  }), [fontScale, colorScheme, colors]);

  return (
    <TabScreenContainer>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerButton}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <MaterialIcons name="arrow-back" size={24 * fontScale} color={colors.text} />
        </TouchableOpacity>
        <ThemedText size="xl" weight="bold" letterSpacing="s" style={styles.headerTitle}>
          {t('insights.wheelOfLife.title')}
        </ThemedText>
        <View style={styles.headerButton} />
      </View>

      <ScrollView 
        style={styles.content}
        contentContainerStyle={{ paddingBottom: 100 * fontScale }}
        showsVerticalScrollIndicator={false}
      >
        {/* Wheel of Life Visualization */}
        <View style={styles.wheelContainer}>
          <ThemedText size="l" weight="bold" style={styles.wheelTitle}>
            {t('insights.wheelOfLife.title')}
          </ThemedText>
          <ThemedText size="sm" style={styles.wheelSubtitle}>
            {t('insights.wheelOfLife.subtitle')}
          </ThemedText>
          
          <View style={styles.wheelWrapper}>
            <WheelOfLifeVisualization
              distribution={sphereDistribution}
              quality={sphereScores}
              colors={colors}
              colorScheme={colorScheme}
              fontScale={fontScale}
            />
          </View>

          {/* Distribution Explanation */}
          <View style={styles.distributionExplanation}>
            <ThemedText size="xs" style={styles.distributionExplanationText}>
              {t('insights.wheelOfLife.distributionExplanation')}
            </ThemedText>
          </View>

          {/* Sphere Scores */}
          <View style={styles.scoresContainer}>
            {spheres.map((sphere) => {
              const score = sphereScores[sphere.type];
              // Use fixed colors matching the wheel of life pie chart
              const sphereColor = sphere.type === 'relationships' ? '#f87171' : 
                                 sphere.type === 'career' ? '#3b82f6' : 
                                 '#10b981'; // family
              
              const hasEntities = sphere.entities.length > 0;
              const isClickable = (sphere.type === 'relationships' || sphere.type === 'career' || sphere.type === 'family') && hasEntities;
              
              return (
                <TouchableOpacity
                  key={sphere.type}
                  style={styles.scoreItem}
                  onPress={() => {
                    if (sphere.type === 'relationships' && hasEntities) {
                      router.push('/relationships-comparison');
                    } else if (sphere.type === 'career' && hasEntities) {
                      router.push('/career-comparison');
                    } else if (sphere.type === 'family' && hasEntities) {
                      router.push('/family-comparison');
                    }
                  }}
                  activeOpacity={isClickable ? 0.7 : 1}
                  disabled={!isClickable}
                >
                  <View style={styles.scoreRowTouchable}>
                    <MaterialIcons
                      name={sphere.icon as any}
                      size={20 * fontScale}
                      color={sphereColor}
                    />
                    <ThemedText size="sm" weight="semibold" style={styles.scoreLabel}>
                      {sphere.label}
                    </ThemedText>
                    <MaterialIcons
                      name={isClickable ? 'arrow-forward' : 'expand-more'}
                      size={24 * fontScale}
                      color={colors.icon}
                    />
                  </View>
                  <View style={styles.scoreBarContainer}>
                    <View style={[styles.scoreBar, { width: `${score}%`, backgroundColor: sphereColor }]} />
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Percentage Explanation */}
          <View style={styles.percentageExplanation}>
            <ThemedText size="xs" style={styles.percentageExplanationText}>
              {t('insights.wheelOfLife.percentageExplanation')}
            </ThemedText>
          </View>
        </View>
      </ScrollView>
    </TabScreenContainer>
  );
}

