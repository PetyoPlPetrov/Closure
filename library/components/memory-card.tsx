import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useFontScale } from '@/hooks/use-device-size';
import { useTranslate } from '@/utils/languages/use-translate';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useMemo, useState } from 'react';
import { LayoutChangeEvent, StyleSheet, TouchableOpacity, View, ViewStyle } from 'react-native';
import Svg, { Path } from 'react-native-svg';

export type IdealizedMemory = {
  id: string;
  title: string;
  description?: string;
  imageUri?: string;
  hardTruths: {
    id: string;
    text: string;
  }[];
  goodFacts?: {
    id: string;
    text: string;
  }[];
  lessonsLearned?: {
    id: string;
    text: string;
  }[];
  createdAt: string;
};

type MemoryCardProps = {
  memory: IdealizedMemory;
  onPress?: () => void;
  onMorePress?: () => void;
  containerStyle?: ViewStyle;
};

export function MemoryCard({
  memory,
  onPress,
  onMorePress,
  containerStyle,
}: MemoryCardProps) {
  const t = useTranslate();
  const colorScheme = useColorScheme();
  const fontScale = useFontScale();
  const colors = Colors[colorScheme ?? 'dark'];

  const hardTruthCount = memory.hardTruths.length;
  const hasHardTruths = hardTruthCount > 0;
  const goodFactCount = memory.goodFacts?.length || 0;
  const hasGoodFacts = goodFactCount > 0;
  const lessonCount = memory.lessonsLearned?.length || 0;
  const hasLessons = lessonCount > 0;
  
  // Determine if memory is "sunny" (more good facts than hard truths) or "cloudy" (more hard truths than good facts)
  const isSunny = goodFactCount > hardTruthCount;
  const isCloudy = hardTruthCount > goodFactCount;
  const totalMoments = hardTruthCount + goodFactCount;
  const hasMoments = totalMoments > 0;
  
  // Calculate percentages for segmented border
  const sunnyPercentage = hasMoments ? (goodFactCount / totalMoments) * 100 : 0;
  const cloudyPercentage = hasMoments ? (hardTruthCount / totalMoments) * 100 : 0;
  
  const [containerDimensions, setContainerDimensions] = useState({ width: 0, height: 0 });
  
  const handleLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    if (width > 0 && height > 0) {
      setContainerDimensions({ width, height });
    }
  };

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          borderRadius: 12 * fontScale,
          backgroundColor: 'transparent', // Transparent to show gradient
          padding: 16 * fontScale,
          gap: 12 * fontScale,
          // Remove border when hasMoments is true - SVG handles the segmented border
          borderWidth: hasMoments ? 0 : 1,
          borderColor: colorScheme === 'dark'
            ? 'rgba(255, 255, 255, 0.1)'
            : 'rgba(0, 0, 0, 0.1)',
          position: 'relative',
          overflow: 'hidden', // Required for gradient to respect borderRadius
          ...(isSunny && hasMoments && {
            shadowColor: '#FFD700',
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 0.6,
            shadowRadius: 10,
            elevation: 5,
          }),
          ...(isCloudy && hasMoments && {
            shadowColor: '#000000',
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 0.4,
            shadowRadius: 8,
            elevation: 4,
          }),
        },
        containerGradient: {
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          borderRadius: 12 * fontScale,
        },
        cardContent: {
          flex: 1,
        },
        header: {
          flexDirection: 'row',
          alignItems: 'flex-start',
          gap: 12 * fontScale,
        },
        image: {
          width: 80 * fontScale,
          height: 80 * fontScale,
          borderRadius: 8 * fontScale,
          backgroundColor:
            colorScheme === 'dark'
              ? 'rgba(255, 255, 255, 0.1)'
              : 'rgba(0, 0, 0, 0.05)',
        },
        imagePlaceholder: {
          width: 80 * fontScale,
          height: 80 * fontScale,
          borderRadius: 8 * fontScale,
          backgroundColor:
            colorScheme === 'dark'
              ? 'rgba(255, 255, 255, 0.1)'
              : 'rgba(0, 0, 0, 0.05)',
          alignItems: 'center',
          justifyContent: 'center',
        },
        content: {
          flex: 1,
          gap: 4 * fontScale,
        },
        titleRow: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8 * fontScale,
        },
        title: {
          flex: 1,
        },
        moreButton: {
          width: 32 * fontScale,
          height: 32 * fontScale,
          alignItems: 'center',
          justifyContent: 'center',
        },
        description: {
          marginTop: 4 * fontScale,
        },
        footer: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 6 * fontScale,
          marginTop: 8 * fontScale,
        },
        hardTruthText: {
          color: colorScheme === 'dark' 
            ? '#9CA3AF' // Dark grey for dark mode
            : '#4B5563', // Dark grey for light mode (darker than clouds)
        },
        hardTruthTextEmpty: {
          color:
            colorScheme === 'dark'
              ? 'rgba(226, 232, 240, 0.5)'
              : 'rgba(148, 163, 184, 0.8)',
        },
        goodFactText: {
          color: colorScheme === 'dark' 
            ? '#FFD700' // Bright yellow/gold for dark mode (good contrast)
            : '#D97706', // Darker amber/yellow for light mode (good contrast)
        },
        goodFactTextEmpty: {
          color:
            colorScheme === 'dark'
              ? 'rgba(226, 232, 240, 0.5)'
              : 'rgba(148, 163, 184, 0.8)',
        },
        lessonText: {
          color: colorScheme === 'dark' 
            ? '#FFD700' // Yellow/gold for dark mode (same as good facts)
            : '#D97706', // Darker amber/yellow for light mode
        },
        lessonTextEmpty: {
          color:
            colorScheme === 'dark'
              ? 'rgba(226, 232, 240, 0.5)'
              : 'rgba(148, 163, 184, 0.8)',
        },
        footerItem: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 4 * fontScale,
        },
      }),
    [fontScale, colorScheme, colors.primary, isSunny, isCloudy, hasMoments]
  );

  return (
    <View 
      style={[styles.container, containerStyle]}
      onLayout={handleLayout}
    >
      {colorScheme === 'dark' ? (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(255, 255, 255, 0.05)', borderRadius: 12 * fontScale }]} />
      ) : (
        <LinearGradient
          colors={['#FFFFFF', '#F0F0F0', '#E0E0E0']}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={styles.containerGradient}
        />
      )}
      {/* Segmented border SVG - shows black and yellow proportionally */}
      {hasMoments && containerDimensions.width > 0 && containerDimensions.height > 0 && (
        <Svg
          width={containerDimensions.width}
          height={containerDimensions.height}
          style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none' }}
        >
          {(() => {
            const borderRadius = 12 * fontScale;
            const borderWidth = 3;
            const w = containerDimensions.width;
            const h = containerDimensions.height;
            const r = borderRadius;
            
            // Calculate perimeter of rounded rectangle
            const straightSides = 2 * (w + h) - 8 * r;
            const cornerArcs = 2 * Math.PI * r;
            const perimeter = straightSides + cornerArcs;
            
            // Black border for cloudy portion
            const blackLength = (cloudyPercentage / 100) * perimeter;
            const blackDashArray = `${blackLength} ${perimeter}`;
            const blackDashOffset = perimeter - blackLength;
            
            // Yellow border for sunny portion
            const yellowLength = (sunnyPercentage / 100) * perimeter;
            const yellowDashArray = `${yellowLength} ${perimeter}`;
            const yellowDashOffset = perimeter - yellowLength;
            const yellowStartOffset = blackLength; // Yellow starts where black ends
            
            // Create rounded rectangle path
            const path = `M ${r} 0 L ${w - r} 0 Q ${w} 0 ${w} ${r} L ${w} ${h - r} Q ${w} ${h} ${w - r} ${h} L ${r} ${h} Q 0 ${h} 0 ${h - r} L 0 ${r} Q 0 0 ${r} 0 Z`;
            
            return (
              <>
                {/* Black border for cloudy moments */}
                {cloudyPercentage > 0 && (
                  <Path
                    d={path}
                    stroke="#000000"
                    strokeWidth={borderWidth}
                    fill="none"
                    strokeDasharray={blackDashArray}
                    strokeDashoffset={blackDashOffset}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                )}
                {/* Yellow border for sunny moments */}
                {sunnyPercentage > 0 && (
                  <Path
                    d={path}
                    stroke="#FFD700"
                    strokeWidth={borderWidth}
                    fill="none"
                    strokeDasharray={yellowDashArray}
                    strokeDashoffset={yellowDashOffset - yellowStartOffset}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                )}
              </>
            );
          })()}
        </Svg>
      )}
      <TouchableOpacity
        style={styles.cardContent}
        onPress={onPress}
        activeOpacity={0.7}
        disabled={!onPress}
      >
        <View style={styles.header}>
          {memory.imageUri ? (
            <Image
              source={{ uri: memory.imageUri }}
              style={styles.image}
              contentFit="cover"
            />
          ) : (
            <View style={styles.imagePlaceholder}>
              <MaterialIcons
                name="broken-image"
                size={32 * fontScale}
                color={
                  colorScheme === 'dark'
                    ? 'rgba(226, 232, 240, 0.5)'
                    : 'rgba(148, 163, 184, 0.5)'
                }
              />
            </View>
          )}
          <View style={styles.content}>
            <View style={styles.titleRow}>
              <ThemedText size="l" weight="bold" style={styles.title} numberOfLines={1}>
                {memory.title}
              </ThemedText>
              {onMorePress && (
                <TouchableOpacity
                  style={styles.moreButton}
                  onPress={(e) => {
                    e.stopPropagation();
                    onMorePress();
                  }}
                  activeOpacity={0.7}
                >
                  <MaterialIcons
                    name="more-vert"
                    size={20 * fontScale}
                    color={
                      colorScheme === 'dark'
                        ? colors.text
                        : colors.tabIconDefault
                    }
                  />
                </TouchableOpacity>
              )}
            </View>
            {memory.description && (
              <ThemedText
                size="sm"
                weight="normal"
                style={styles.description}
                numberOfLines={2}
              >
                {memory.description}
              </ThemedText>
            )}
            <View style={styles.footer}>
              <View style={styles.footerItem}>
                <MaterialIcons
                  name="cloud"
                  size={16 * fontScale}
                  color={hasHardTruths 
                    ? (colorScheme === 'dark' ? '#9CA3AF' : '#4B5563') // Dark grey to match text
                    : 'rgba(148, 163, 184, 0.5)'}
                />
                <ThemedText
                  size="xs"
                  weight="medium"
                  style={
                    hasHardTruths
                      ? styles.hardTruthText
                      : styles.hardTruthTextEmpty
                  }
                >
                  {hardTruthCount}
                </ThemedText>
              </View>
              <View style={styles.footerItem}>
                <MaterialIcons
                  name="wb-sunny"
                  size={16 * fontScale}
                  color={hasGoodFacts 
                    ? (colorScheme === 'dark' ? '#FFD700' : '#D97706') // Yellow to match text
                    : 'rgba(148, 163, 184, 0.5)'}
                />
                <ThemedText
                  size="xs"
                  weight="medium"
                  style={
                    hasGoodFacts
                      ? styles.goodFactText
                      : styles.goodFactTextEmpty
                  }
                >
                  {goodFactCount}
                </ThemedText>
              </View>
              <View style={styles.footerItem}>
                <MaterialIcons
                  name="lightbulb"
                  size={16 * fontScale}
                  color={hasLessons 
                    ? (colorScheme === 'dark' ? '#FFD700' : '#D97706') // Yellow to match lessons
                    : 'rgba(148, 163, 184, 0.5)'}
                />
                <ThemedText
                  size="xs"
                  weight="medium"
                  style={
                    hasLessons
                      ? styles.lessonText
                      : styles.lessonTextEmpty
                  }
                >
                  {lessonCount}
                </ThemedText>
              </View>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    </View>
  );
}


