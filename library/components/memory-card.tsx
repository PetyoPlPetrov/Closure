import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useFontScale } from '@/hooks/use-device-size';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useMemo } from 'react';
import { StyleSheet, TouchableOpacity, View, ViewStyle, Image } from 'react-native';

export type IdealizedMemory = {
  id: string;
  title: string;
  description?: string;
  imageUri?: string;
  hardTruths: Array<{
    id: string;
    text: string;
  }>;
  goodFacts?: Array<{
    id: string;
    text: string;
  }>;
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
  const colorScheme = useColorScheme();
  const fontScale = useFontScale();
  const colors = Colors[colorScheme ?? 'dark'];

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          borderRadius: 12 * fontScale,
          backgroundColor:
            colorScheme === 'dark'
              ? 'rgba(255, 255, 255, 0.05)'
              : '#ffffff',
          padding: 16 * fontScale,
          gap: 12 * fontScale,
          borderWidth: 1,
          borderColor:
            colorScheme === 'dark'
              ? 'rgba(255, 255, 255, 0.1)'
              : 'rgba(0, 0, 0, 0.1)',
          position: 'relative',
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
          color: colors.primary,
        },
        hardTruthTextEmpty: {
          color:
            colorScheme === 'dark'
              ? 'rgba(226, 232, 240, 0.5)'
              : 'rgba(148, 163, 184, 0.8)',
        },
        goodFactText: {
          color: '#FFA500', // Orange color for suns
        },
        goodFactTextEmpty: {
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
    [fontScale, colorScheme, colors.primary]
  );

  const hardTruthCount = memory.hardTruths.length;
  const hasHardTruths = hardTruthCount > 0;
  const goodFactCount = memory.goodFacts?.length || 0;
  const hasGoodFacts = goodFactCount > 0;

  return (
    <View style={[styles.container, containerStyle]}>
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
              resizeMode="cover"
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
                  color={hasHardTruths ? colors.primary : 'rgba(148, 163, 184, 0.5)'}
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
                  {hasHardTruths
                    ? `${hardTruthCount} Hard Truth${hardTruthCount !== 1 ? 's' : ''}`
                    : 'No Hard Truths yet'}
                </ThemedText>
              </View>
              <View style={styles.footerItem}>
                <MaterialIcons
                  name="wb-sunny"
                  size={16 * fontScale}
                  color={hasGoodFacts ? '#FFA500' : 'rgba(148, 163, 184, 0.5)'}
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
                  {hasGoodFacts
                    ? `${goodFactCount} Good Fact${goodFactCount !== 1 ? 's' : ''}`
                    : 'No Good Facts yet'}
                </ThemedText>
              </View>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    </View>
  );
}


