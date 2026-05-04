import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useFontScale } from '@/hooks/use-device-size';
import { useTranslate } from '@/utils/languages/use-translate';
import { useMomentColors } from '@/utils/MomentColorsProvider';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useMemo, useState } from 'react';
import { LayoutChangeEvent, StyleSheet, TouchableOpacity, View, ViewStyle } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import {
  roundedRectBorderClosedD,
  roundedRectBorderPerimeter,
  roundedRectBorderSubpathD,
} from '@/library/components/memory-card-segmented-border';

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
  const { momentColors } = useMomentColors();
  const colors = Colors[colorScheme ?? 'dark'];
  const footerIconMuted =
    colorScheme === 'dark'
      ? 'rgba(226, 232, 240, 0.55)'
      : 'rgba(46, 46, 46, 0.42)';

  const hardTruthCount = memory.hardTruths.length;
  const hasHardTruths = hardTruthCount > 0;
  const goodFactCount = memory.goodFacts?.length || 0;
  const hasGoodFacts = goodFactCount > 0;
  const lessonCount = memory.lessonsLearned?.length || 0;
  const hasLessons = lessonCount > 0;
  
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
          color: colors.text,
        },
        hardTruthTextEmpty: {
          color:
            colorScheme === 'dark'
              ? 'rgba(226, 232, 240, 0.5)'
              : 'rgba(148, 163, 184, 0.8)',
        },
        goodFactText: {
          color: colors.text,
        },
        goodFactTextEmpty: {
          color:
            colorScheme === 'dark'
              ? 'rgba(226, 232, 240, 0.5)'
              : 'rgba(148, 163, 184, 0.8)',
        },
        lessonText: {
          color: colors.text,
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
    [fontScale, colorScheme, colors, momentColors, hasMoments]
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

            const perimeter = roundedRectBorderPerimeter(w, h, r);
            const splitDist = (cloudyPercentage / 100) * perimeter;

            const onlyCloudy = hardTruthCount > 0 && goodFactCount === 0;
            const onlySunny = goodFactCount > 0 && hardTruthCount === 0;

            if (onlyCloudy) {
              return (
                <Path
                  d={roundedRectBorderClosedD(w, h, r)}
                  stroke={momentColors.cloudy.background}
                  strokeWidth={borderWidth}
                  fill="none"
                  strokeLinecap="butt"
                  strokeLinejoin="miter"
                />
              );
            }
            if (onlySunny) {
              return (
                <Path
                  d={roundedRectBorderClosedD(w, h, r)}
                  stroke={momentColors.sunny.background}
                  strokeWidth={borderWidth}
                  fill="none"
                  strokeLinecap="butt"
                  strokeLinejoin="miter"
                />
              );
            }

            const cloudyD = roundedRectBorderSubpathD(w, h, r, 0, splitDist);
            const sunnyD = roundedRectBorderSubpathD(
              w,
              h,
              r,
              splitDist,
              perimeter,
            );

            return (
              <>
                {cloudyD.length > 0 && (
                  <Path
                    d={cloudyD}
                    stroke={momentColors.cloudy.background}
                    strokeWidth={borderWidth}
                    fill="none"
                    strokeLinecap="butt"
                    strokeLinejoin="miter"
                  />
                )}
                {sunnyD.length > 0 && (
                  <Path
                    d={sunnyD}
                    stroke={momentColors.sunny.background}
                    strokeWidth={borderWidth}
                    fill="none"
                    strokeLinecap="butt"
                    strokeLinejoin="miter"
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
                  color={
                    hasHardTruths
                      ? momentColors.cloudy.background
                      : footerIconMuted
                  }
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
                  color={
                    hasGoodFacts
                      ? momentColors.sunny.background
                      : footerIconMuted
                  }
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
                  color={
                    hasLessons
                      ? momentColors.lesson.background
                      : footerIconMuted
                  }
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


